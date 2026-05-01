import { API_BASE_URL } from '../config/appConfig';
import { tokenStore } from './tokenStore';
import { debugFetch } from './debugFetch';
import {
  getEncounterByUuid,
  getPatientByUuid,
  getReferralByUuid,
  getQueuedPayloadsByType,
  insertSyncLog,
  setEntitySyncStatus,
  touchQueueSyncState,
} from '../database/repository';
import type { SyncQueueRecord } from '../types/models';

const MAX_RETRY_COUNT = 5;
const BACKOFF_MS = [1000, 3000, 10000, 30000, 60000];

type SyncOptions = {
  forceFull?: boolean;
  retryFailedOnly?: boolean;
};

type SyncableQueueStatus = Exclude<SyncQueueRecord['status'], 'synced'>;

type SyncResponseSummary = {
  results?: Array<{
    uuid?: string;
    entity?: 'patient' | 'encounter' | 'referral';
    status?: 'success' | 'failed';
    message?: string;
    server_id?: number | null;
    updated_at?: string | null;
  }>;
  results_by_uuid?: Record<
    string,
    {
      uuid?: string;
      entity?: 'patient' | 'encounter' | 'referral';
      status?: 'success' | 'failed';
      message?: string;
      server_id?: number | null;
      updated_at?: string | null;
    }
  >;
  summary?: {
    success?: number;
    failed?: number;
    errors?: Array<{ message?: string }>;
  };
  message?: string;
};

const delayFromRetry = (retryCount: number) => BACKOFF_MS[Math.min(Math.max(retryCount, 0), BACKOFF_MS.length - 1)] ?? 60000;

const isValidationError = (status: number, body: SyncResponseSummary) => {
  if (status === 422) return true;
  const text = JSON.stringify(body ?? {}).toLowerCase();
  return text.includes('validation') || text.includes('invalid');
};

const isNetworkError = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('network') || message.includes('failed to fetch') || message.includes('timeout') || message.includes('load failed');
};

const isDuplicateUuid = (status: number, body: SyncResponseSummary) => {
  const text = JSON.stringify(body ?? {}).toLowerCase();
  return status === 409 || text.includes('duplicate') || text.includes('already exists');
};

const nextRetryAtFor = (retryCount: number) => {
  const delay = delayFromRetry(retryCount);
  return new Date(Date.now() + delay).toISOString();
};

const getQueueStatuses = (options?: SyncOptions): Array<SyncableQueueStatus> => {
  if (options?.forceFull) return ['pending', 'failed', 'conflict', 'syncing'];
  if (options?.retryFailedOnly) return ['failed'];
  return ['pending', 'failed'];
};

const parseQueuedPayload = (payloadJson: string) => {
  const payload = JSON.parse(payloadJson) as Record<string, unknown>;
  if (payload.data && typeof payload.data === 'object') {
    return payload.data as Record<string, unknown>;
  }
  return payload;
};

const buildItems = (queue: Array<{ entity_type: 'patient' | 'encounter' | 'referral'; entity_uuid: string; payload_json: string }>) =>
  queue.map((item) => ({
    entity: item.entity_type,
    uuid: item.entity_uuid,
    data: parseQueuedPayload(item.payload_json),
  }));

const normalizeBackendErrors = (body: SyncResponseSummary) => {
  const list = body.results?.filter((result) => result.status === 'failed') ?? [];
  return list.map((error) => `${error.entity ?? 'record'} ${error.uuid ?? ''} ${error.message ?? ''}`.trim());
};

const syncBatch = async (
  token: string | null,
  entityType: 'patient' | 'encounter' | 'referral',
  statusFilter: Array<SyncableQueueStatus>
) => {
  const queue = await getQueuedPayloadsByType(entityType, statusFilter);

  const eligible = [] as typeof queue;
  for (const item of queue) {
    if (entityType === 'encounter') {
      const encounter = await getEncounterByUuid(item.entity_uuid);
      if (!encounter) continue;
      const patient = await getPatientByUuid(encounter.patient_uuid);
      if (!patient || patient.sync_status !== 'synced') continue;
    }
    if (entityType === 'referral') {
      const referralResult = await getReferralByUuid(item.entity_uuid);
      if (!referralResult) continue;
      const encounter = await getEncounterByUuid(referralResult.encounter_uuid);
      if (!encounter || encounter.sync_status !== 'synced') continue;
    }
    eligible.push(item);
  }

  if (!eligible.length) {
    return { synced: 0, failed: 0, skipped: 0, message: `${entityType} queue empty or blocked by dependencies.` };
  }

  const syncingAt = new Date().toISOString();
  for (const item of eligible) {
    await touchQueueSyncState(entityType, item.entity_uuid, 'syncing', item.retry_count, null, item.next_retry_at ?? null, item.backend_response_json ?? null, item.synced_at ?? null);
    await insertSyncLog({
      queue_id: item.id,
      entity_type: item.entity_type,
      entity_uuid: item.entity_uuid,
      action: 'sync_attempt',
      status: 'syncing',
      request_json: item.payload_json,
      created_at: syncingAt,
    });
  }

  const items = buildItems(eligible);

  let response: Response;
  let body: SyncResponseSummary = {};
  try {
    response = await debugFetch(`${API_BASE_URL}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ items }),
    });

    try {
      body = (await response.json()) as SyncResponseSummary;
    } catch {
      body = {};
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Network sync error';
    const networkRetryable = isNetworkError(error);

    for (const item of eligible) {
      const retryCount = Math.min(item.retry_count + 1, MAX_RETRY_COUNT);
      const nextRetryAt = networkRetryable && retryCount < MAX_RETRY_COUNT ? nextRetryAtFor(retryCount) : null;
      const nextStatus = retryCount >= MAX_RETRY_COUNT || !networkRetryable ? 'failed' : 'pending';
      await touchQueueSyncState(entityType, item.entity_uuid, nextStatus, retryCount, errorMessage, nextRetryAt, item.backend_response_json ?? null, null);
      await setEntitySyncStatus(entityType, item.entity_uuid, nextStatus);
      await insertSyncLog({
        queue_id: item.id,
        entity_type: item.entity_type,
        entity_uuid: item.entity_uuid,
        action: 'failed',
        status: nextStatus,
        request_json: item.payload_json,
        error_message: errorMessage,
      });
    }

    return { synced: 0, failed: eligible.length, skipped: 0, message: networkRetryable ? 'Network unavailable. Retry later.' : errorMessage };
  }

  if (!response.ok) {
    if (isDuplicateUuid(response.status, body)) {
      for (const item of eligible) {
        const syncedAt = new Date().toISOString();
        await touchQueueSyncState(entityType, item.entity_uuid, 'synced', item.retry_count, null, null, JSON.stringify(body), syncedAt);
        await setEntitySyncStatus(entityType, item.entity_uuid, 'synced', syncedAt);
        await insertSyncLog({
          queue_id: item.id,
          entity_type: item.entity_type,
          entity_uuid: item.entity_uuid,
          action: 'synced',
          status: 'synced',
          request_json: item.payload_json,
          response_json: JSON.stringify(body),
          error_message: 'Duplicate UUID accepted as synced.',
        });
      }

      return { synced: eligible.length, failed: 0, skipped: 0, message: 'Duplicate UUIDs treated as synced.' };
    }

    if (isValidationError(response.status, body)) {
      const errors = normalizeBackendErrors(body).join(' | ') || body.message || 'Validation failed';
      for (const item of eligible) {
        const retryCount = Math.min(item.retry_count + 1, MAX_RETRY_COUNT);
        await touchQueueSyncState(entityType, item.entity_uuid, 'failed', retryCount, errors, null, JSON.stringify(body), null);
        await setEntitySyncStatus(entityType, item.entity_uuid, 'failed');
        await insertSyncLog({
          queue_id: item.id,
          entity_type: item.entity_type,
          entity_uuid: item.entity_uuid,
          action: 'failed',
          status: 'failed',
          request_json: item.payload_json,
          response_json: JSON.stringify(body),
          error_message: errors,
        });
      }

      return { synced: 0, failed: eligible.length, skipped: 0, message: errors };
    }

    const message = body.message || `Sync failed with status ${response.status}`;
    const errorMessage = body.summary?.errors?.[0]?.message || message;

    for (const item of eligible) {
      const retryCount = Math.min(item.retry_count + 1, MAX_RETRY_COUNT);
      const nextRetryAt = retryCount >= MAX_RETRY_COUNT ? null : nextRetryAtFor(retryCount);
      const nextStatus = retryCount >= MAX_RETRY_COUNT ? 'failed' : 'pending';
      await touchQueueSyncState(entityType, item.entity_uuid, nextStatus, retryCount, errorMessage, nextRetryAt, JSON.stringify(body), null);
      await setEntitySyncStatus(entityType, item.entity_uuid, nextStatus === 'failed' ? 'failed' : 'pending');
      await insertSyncLog({
        queue_id: item.id,
        entity_type: item.entity_type,
        entity_uuid: item.entity_uuid,
        action: 'failed',
        status: nextStatus,
        request_json: item.payload_json,
        response_json: JSON.stringify(body),
        error_message: errorMessage,
      });
    }

    return { synced: 0, failed: eligible.length, skipped: 0, message };
  }

  const syncedAt = new Date().toISOString();
  const resultsByUuid = new Map<string, NonNullable<SyncResponseSummary['results']>[number]>();

  for (const result of body.results ?? []) {
    if (result.uuid) {
      resultsByUuid.set(result.uuid, result);
    }
  }

  for (const [uuid, result] of Object.entries(body.results_by_uuid ?? {})) {
    resultsByUuid.set(uuid, result);
  }

  let synced = 0;
  let failed = 0;

  for (const item of eligible) {
    const result = resultsByUuid.get(item.entity_uuid);
    const success = result?.status !== 'failed';
    const serverId = typeof result?.server_id === 'number' ? result.server_id : null;
    const resultMessage = result?.message ?? body.message ?? `${entityType} sync completed.`;

    if (success) {
      synced += 1;
      await touchQueueSyncState(entityType, item.entity_uuid, 'synced', item.retry_count, null, null, JSON.stringify(body), syncedAt);
      await setEntitySyncStatus(entityType, item.entity_uuid, 'synced', syncedAt, serverId);
      await insertSyncLog({
        queue_id: item.id,
        entity_type: item.entity_type,
        entity_uuid: item.entity_uuid,
        action: 'synced',
        status: 'synced',
        request_json: item.payload_json,
        response_json: JSON.stringify(body),
      });
      continue;
    }

    failed += 1;
    await touchQueueSyncState(entityType, item.entity_uuid, 'failed', item.retry_count + 1, resultMessage, null, JSON.stringify(body), null);
    await setEntitySyncStatus(entityType, item.entity_uuid, 'failed');
    await insertSyncLog({
      queue_id: item.id,
      entity_type: item.entity_type,
      entity_uuid: item.entity_uuid,
      action: 'failed',
      status: 'failed',
      request_json: item.payload_json,
      response_json: JSON.stringify(body),
      error_message: resultMessage,
    });
  }

  return { synced, failed, skipped: queue.length - eligible.length, message: body.message || `${entityType} sync completed.` };
};

export const syncService = {
  flushPendingSync: async (options?: SyncOptions) => {
    const token = await tokenStore.get();
    const statusFilter = getQueueStatuses(options);

    const patients = await syncBatch(token, 'patient', statusFilter);
    const encounters = await syncBatch(token, 'encounter', statusFilter);
    const referrals = await syncBatch(token, 'referral', statusFilter);

    const synced = patients.synced + encounters.synced + referrals.synced;
    const failed = patients.failed + encounters.failed + referrals.failed;
    const skipped = patients.skipped + encounters.skipped + referrals.skipped;

    if (!synced && !failed && !skipped) {
      return { synced: 0, failed: 0, skipped: 0, message: 'No pending records.' };
    }

    if (failed > 0 && synced === 0) {
      return { synced, failed, skipped, message: 'Some records failed to sync.' };
    }

    return { synced, failed, skipped, message: 'Sync completed.' };
  },
  retryFailedOnly: async () => syncService.flushPendingSync({ retryFailedOnly: true }),
  forceFullSync: async () => syncService.flushPendingSync({ forceFull: true }),
};
