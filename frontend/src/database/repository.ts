import * as Crypto from 'expo-crypto';
import { v4 as uuidv4 } from 'uuid';
import { execute, rowsToArray } from './sqlite';
import { getLocalIdentity } from '../services/localMetadata';
import {
  EncounterRecord,
  FacilityRecord,
  LgaRecord,
  PatientRecord,
  ReferralRecord,
  SyncLogRecord,
  SyncQueueRecord,
  WardRecord,
} from '../types/models';

const touch = () => new Date().toISOString();

const parseName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] ?? '',
    middle_name: parts.length > 2 ? parts.slice(1, -1).join(' ') : '',
    last_name: parts.length > 1 ? parts[parts.length - 1] ?? '' : '',
  };
};

const digest = async (input: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);

const withIdentity = async () => {
  const { deviceId, userId } = await getLocalIdentity();
  return { deviceId, userId, createdOfflineAt: touch() };
};

const truthy = (value: unknown) => (value ? 1 : 0);

export const ensureUuid = (value?: string) => value ?? uuidv4();

export const savePatientDraft = async (patient: PatientRecord) => {
  const now = touch();
  const meta = await withIdentity();
  const names = patient.is_anonymized || !patient.full_name ? { first_name: '', middle_name: '', last_name: '' } : parseName(patient.full_name);
  const temporaryIdHash = patient.is_anonymized
    ? await digest([patient.uuid, meta.deviceId, meta.userId].join('|'))
    : null;
  const fullName = patient.is_anonymized ? null : (patient.full_name?.trim() ?? '');

  await execute(
    `INSERT INTO patients (
      uuid, server_id, device_id, user_id, created_offline_at, full_name, first_name, middle_name, last_name,
      is_anonymized, age_years, is_estimated_age, sex, phone, nhis_status, lga_uuid, ward_uuid,
      consent_confirmed, temporary_id_hash, sync_status, synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(uuid) DO UPDATE SET
      server_id=excluded.server_id,
      device_id=excluded.device_id,
      user_id=excluded.user_id,
      created_offline_at=COALESCE(patients.created_offline_at, excluded.created_offline_at),
      full_name=excluded.full_name,
      first_name=excluded.first_name,
      middle_name=excluded.middle_name,
      last_name=excluded.last_name,
      is_anonymized=excluded.is_anonymized,
      age_years=excluded.age_years,
      is_estimated_age=excluded.is_estimated_age,
      sex=excluded.sex,
      phone=excluded.phone,
      nhis_status=excluded.nhis_status,
      lga_uuid=excluded.lga_uuid,
      ward_uuid=excluded.ward_uuid,
      consent_confirmed=excluded.consent_confirmed,
      temporary_id_hash=excluded.temporary_id_hash,
      sync_status=excluded.sync_status,
      synced_at=excluded.synced_at,
      updated_at=excluded.updated_at`,
    [
      patient.uuid,
      patient.id ?? null,
      meta.deviceId,
      meta.userId,
      meta.createdOfflineAt,
      fullName,
      names.first_name || null,
      names.middle_name || null,
      names.last_name || null,
      truthy(patient.is_anonymized),
      patient.age_years ?? null,
      truthy(patient.is_estimated_age),
      patient.sex ?? null,
      patient.phone ?? null,
      patient.nhis_status ?? null,
      patient.lga_uuid ?? null,
      patient.ward_uuid ?? null,
      truthy(patient.consent_confirmed),
      temporaryIdHash,
      patient.sync_status,
      patient.sync_status === 'synced' ? now : null,
      now,
      now,
    ]
  );

  return {
    ...patient,
    full_name: fullName ?? '',
    first_name: names.first_name || undefined,
    middle_name: names.middle_name || undefined,
    last_name: names.last_name || undefined,
    temporary_id_hash: temporaryIdHash,
    created_offline_at: meta.createdOfflineAt,
    device_id: meta.deviceId,
    user_id: meta.userId,
  };
};

export const saveEncounterDraft = async (encounter: EncounterRecord) => {
  const now = touch();
  const meta = await withIdentity();

  const patientExists = await execute<{ uuid: string }>(`SELECT uuid FROM patients WHERE uuid = ? LIMIT 1`, [encounter.patient_uuid]);
  if (!rowsToArray(patientExists).length) {
    throw new Error('Encounter cannot be saved before the patient exists locally.');
  }

  await execute(
    `INSERT INTO encounters (
      uuid, server_id, patient_uuid, version_stamp, encounter_date, outreach_location, presenting_complaint,
      symptoms_json, disease_program_category, preliminary_diagnosis, notes, services_provided_json,
      drugs_commodities_json, health_education_json, service_notes, outcome_status, referral_required,
      referral_uuid, referral_facility, referral_reason, urgency_level, follow_up_date, referral_notes,
      device_id, user_id, created_offline_at, sync_status, synced_at, current_step, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(uuid) DO UPDATE SET
      server_id=excluded.server_id,
      patient_uuid=excluded.patient_uuid,
      version_stamp=excluded.version_stamp,
      encounter_date=excluded.encounter_date,
      outreach_location=excluded.outreach_location,
      presenting_complaint=excluded.presenting_complaint,
      symptoms_json=excluded.symptoms_json,
      disease_program_category=excluded.disease_program_category,
      preliminary_diagnosis=excluded.preliminary_diagnosis,
      notes=excluded.notes,
      services_provided_json=excluded.services_provided_json,
      drugs_commodities_json=excluded.drugs_commodities_json,
      health_education_json=excluded.health_education_json,
      service_notes=excluded.service_notes,
      outcome_status=excluded.outcome_status,
      referral_required=excluded.referral_required,
      referral_uuid=excluded.referral_uuid,
      referral_facility=excluded.referral_facility,
      referral_reason=excluded.referral_reason,
      urgency_level=excluded.urgency_level,
      follow_up_date=excluded.follow_up_date,
      referral_notes=excluded.referral_notes,
      device_id=excluded.device_id,
      user_id=excluded.user_id,
      created_offline_at=COALESCE(encounters.created_offline_at, excluded.created_offline_at),
      sync_status=excluded.sync_status,
      synced_at=excluded.synced_at,
      current_step=excluded.current_step,
      updated_at=excluded.updated_at`,
    [
      encounter.uuid,
      encounter.id ?? null,
      encounter.patient_uuid,
      encounter.version_stamp,
      encounter.encounter_date ?? null,
      encounter.outreach_location ?? null,
      encounter.presenting_complaint ?? null,
      encounter.symptoms_json ?? null,
      encounter.disease_program_category ?? null,
      encounter.preliminary_diagnosis ?? null,
      encounter.notes ?? null,
      encounter.services_provided_json ?? null,
      encounter.drugs_commodities_json ?? null,
      encounter.health_education_json ?? null,
      encounter.service_notes ?? null,
      encounter.outcome_status ?? null,
      truthy(encounter.referral_required),
      encounter.referral_uuid ?? null,
      encounter.referral_facility ?? null,
      encounter.referral_reason ?? null,
      encounter.urgency_level ?? null,
      encounter.follow_up_date ?? null,
      encounter.referral_notes ?? null,
      meta.deviceId,
      meta.userId,
      meta.createdOfflineAt,
      encounter.sync_status,
      encounter.sync_status === 'synced' ? now : null,
      encounter.current_step,
      now,
      now,
    ]
  );

  return {
    ...encounter,
    device_id: meta.deviceId,
    user_id: meta.userId,
    created_offline_at: meta.createdOfflineAt,
  };
};

export const saveReferralDraft = async (referral: ReferralRecord) => {
  const now = touch();
  const meta = await withIdentity();

  const patientExists = await execute<{ uuid: string }>(`SELECT uuid FROM patients WHERE uuid = ? LIMIT 1`, [referral.patient_uuid]);
  if (!rowsToArray(patientExists).length) {
    throw new Error('Referral cannot be saved before the patient exists locally.');
  }

  const encounterExists = await execute<{ uuid: string }>(`SELECT uuid FROM encounters WHERE uuid = ? LIMIT 1`, [referral.encounter_uuid]);
  if (!rowsToArray(encounterExists).length) {
    throw new Error('Referral cannot be saved before the encounter exists locally.');
  }

  await execute(
    `INSERT INTO referrals (
      uuid, server_id, patient_uuid, encounter_uuid, referral_facility, referral_reason, urgency_level,
      follow_up_date, notes, status, device_id, user_id, created_offline_at, sync_status, synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(uuid) DO UPDATE SET
      server_id=excluded.server_id,
      patient_uuid=excluded.patient_uuid,
      encounter_uuid=excluded.encounter_uuid,
      referral_facility=excluded.referral_facility,
      referral_reason=excluded.referral_reason,
      urgency_level=excluded.urgency_level,
      follow_up_date=excluded.follow_up_date,
      notes=excluded.notes,
      status=excluded.status,
      device_id=excluded.device_id,
      user_id=excluded.user_id,
      created_offline_at=COALESCE(referrals.created_offline_at, excluded.created_offline_at),
      sync_status=excluded.sync_status,
      synced_at=excluded.synced_at,
      updated_at=excluded.updated_at`,
    [
      referral.uuid,
      referral.id ?? null,
      referral.patient_uuid,
      referral.encounter_uuid,
      referral.referral_facility ?? null,
      referral.referral_reason,
      referral.urgency_level,
      referral.follow_up_date ?? null,
      referral.notes ?? null,
      referral.status,
      meta.deviceId,
      meta.userId,
      meta.createdOfflineAt,
      referral.sync_status,
      referral.sync_status === 'synced' ? now : null,
      now,
      now,
    ]
  );

  return {
    ...referral,
    device_id: meta.deviceId,
    user_id: meta.userId,
    created_offline_at: meta.createdOfflineAt,
  };
};

export const upsertSyncQueue = async (queue: SyncQueueRecord) => {
  const now = touch();
  const meta = await withIdentity();

  await execute(
    `INSERT INTO sync_queue (
      entity_type, entity_uuid, payload_json, device_id, user_id, status, retry_count, next_retry_at,
      last_error, backend_response_json, synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(entity_type, entity_uuid) DO UPDATE SET
      payload_json=excluded.payload_json,
      device_id=excluded.device_id,
      user_id=excluded.user_id,
      status=excluded.status,
      retry_count=excluded.retry_count,
      next_retry_at=excluded.next_retry_at,
      last_error=excluded.last_error,
      backend_response_json=excluded.backend_response_json,
      synced_at=excluded.synced_at,
      updated_at=excluded.updated_at`,
    [
      queue.entity_type,
      queue.entity_uuid,
      queue.payload_json,
      meta.deviceId,
      meta.userId,
      queue.status,
      queue.retry_count,
      queue.next_retry_at ?? null,
      queue.last_error ?? null,
      queue.backend_response_json ?? null,
      queue.synced_at ?? null,
      now,
      now,
    ]
  );
};

export const insertSyncLog = async (log: SyncLogRecord) => {
  const meta = await withIdentity();

  await execute(
    `INSERT INTO sync_logs (
      queue_id, entity_type, entity_uuid, action, status, request_json,
      response_json, error_message, device_id, user_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      log.queue_id ?? null,
      log.entity_type,
      log.entity_uuid,
      log.action,
      log.status,
      log.request_json ?? null,
      log.response_json ?? null,
      log.error_message ?? null,
      meta.deviceId,
      meta.userId,
      log.created_at ?? touch(),
    ]
  );
};

export const setEntitySyncStatus = async (entity: 'patient' | 'encounter' | 'referral', uuid: string, status: string, syncedAt?: string, serverId?: number | null) => {
  const table = entity === 'patient' ? 'patients' : entity === 'encounter' ? 'encounters' : 'referrals';
  await execute(
    `UPDATE ${table}
     SET sync_status = ?, synced_at = COALESCE(?, synced_at), server_id = COALESCE(?, server_id), updated_at = ?
     WHERE uuid = ?`,
    [status, syncedAt ?? null, serverId ?? null, touch(), uuid]
  );
};

export const touchQueueSyncState = async (
  entityType: 'patient' | 'encounter' | 'referral',
  entityUuid: string,
  status: SyncQueueRecord['status'],
  retryCount: number,
  lastError?: string | null,
  nextRetryAt?: string | null,
  backendResponseJson?: string | null,
  syncedAt?: string | null
) => {
  await execute(
    `UPDATE sync_queue
     SET status = ?, retry_count = ?, last_error = ?, next_retry_at = ?, backend_response_json = ?, synced_at = ?, updated_at = ?
     WHERE entity_type = ? AND entity_uuid = ?`,
    [status, retryCount, lastError ?? null, nextRetryAt ?? null, backendResponseJson ?? null, syncedAt ?? null, touch(), entityType, entityUuid]
  );
};

export const listPatients = async (limit = 20, offset = 0) => {
  const result = await execute<PatientRecord>(`SELECT * FROM patients ORDER BY created_at DESC LIMIT ? OFFSET ?`, [limit, offset]);
  return rowsToArray<PatientRecord>(result);
};

export const listEncounters = async (limit = 20, offset = 0) => {
  const result = await execute<EncounterRecord>(`SELECT * FROM encounters ORDER BY created_at DESC LIMIT ? OFFSET ?`, [limit, offset]);
  return rowsToArray<EncounterRecord>(result);
};

export const listDraftEncounters = async (limit = 20, offset = 0) => {
  const result = await execute<EncounterRecord>(
    `SELECT * FROM encounters WHERE sync_status IN ('draft', 'failed', 'conflict') ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return rowsToArray<EncounterRecord>(result);
};

export const listQueueItems = async () => {
  const result = await execute<SyncQueueRecord>(`SELECT * FROM sync_queue ORDER BY created_at ASC`);
  return rowsToArray<SyncQueueRecord>(result);
};

export const listSyncLogs = async (limit = 100, offset = 0) => {
  const result = await execute<SyncLogRecord>(`SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT ? OFFSET ?`, [limit, offset]);
  return rowsToArray<SyncLogRecord>(result);
};

export const listLgas = async () => {
  const result = await execute<LgaRecord>(`SELECT * FROM lgas ORDER BY name ASC`);
  return rowsToArray<LgaRecord>(result);
};

export const searchLgas = async (query: string) => {
  const result = await execute<LgaRecord>(`SELECT * FROM lgas WHERE name LIKE ? ORDER BY name ASC`, [`%${query}%`]);
  return rowsToArray<LgaRecord>(result);
};

export const upsertAdministrativeMetadata = async (payload: { lgas: LgaRecord[]; wards: WardRecord[] }) => {
  await execute(`DELETE FROM wards WHERE lga_uuid LIKE 'lga-%'`);
  await execute(`DELETE FROM lgas WHERE uuid LIKE 'lga-%'`);

  for (const lga of payload.lgas) {
    await execute(
      `INSERT INTO lgas (uuid, name, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(uuid) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at`,
      [lga.uuid, lga.name, touch()]
    );
  }

  for (const ward of payload.wards) {
    await execute(
      `INSERT INTO wards (uuid, lga_uuid, name, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(uuid) DO UPDATE SET lga_uuid = excluded.lga_uuid, name = excluded.name, updated_at = excluded.updated_at`,
      [ward.uuid, ward.lga_uuid, ward.name, touch()]
    );
  }
};

export const listWardsByLga = async (lgaUuid: string, query = '') => {
  const result = await execute<WardRecord>(
    `SELECT * FROM wards WHERE lga_uuid = ? AND name LIKE ? ORDER BY name ASC`,
    [lgaUuid, `%${query}%`]
  );
  return rowsToArray<WardRecord>(result);
};

export const getQueuedPayloads = async (statusFilter: Array<SyncQueueRecord['status']> = ['pending', 'failed']) => {
  const placeholders = statusFilter.map(() => '?').join(',');
  const result = await execute<SyncQueueRecord>(
    `SELECT * FROM sync_queue WHERE status IN (${placeholders}) AND (next_retry_at IS NULL OR next_retry_at <= CURRENT_TIMESTAMP) ORDER BY created_at ASC`,
    statusFilter
  );
  return rowsToArray<SyncQueueRecord>(result);
};

export const getQueuedPayloadsByType = async (entityType: 'patient' | 'encounter' | 'referral', statusFilter: Array<SyncQueueRecord['status']> = ['pending', 'failed']) => {
  const placeholders = statusFilter.map(() => '?').join(',');
  const result = await execute<SyncQueueRecord>(
    `SELECT * FROM sync_queue WHERE entity_type = ? AND status IN (${placeholders}) AND (next_retry_at IS NULL OR next_retry_at <= CURRENT_TIMESTAMP) ORDER BY created_at ASC`,
    [entityType, ...statusFilter]
  );
  return rowsToArray<SyncQueueRecord>(result);
};

export const getLocalDraftByEncounterUuid = async (uuid: string) => {
  const encounterResult = await execute<EncounterRecord>(`SELECT * FROM encounters WHERE uuid = ? LIMIT 1`, [uuid]);
  const encounter = rowsToArray<EncounterRecord>(encounterResult)[0] ?? null;
  if (!encounter) return null;

  const patientResult = await execute<PatientRecord>(`SELECT * FROM patients WHERE uuid = ? LIMIT 1`, [encounter.patient_uuid]);
  const patient = rowsToArray<PatientRecord>(patientResult)[0] ?? null;

  const referralResult = await execute<ReferralRecord>(`SELECT * FROM referrals WHERE encounter_uuid = ? LIMIT 1`, [uuid]);
  const referral = rowsToArray<ReferralRecord>(referralResult)[0] ?? null;

  return { patient, encounter, referral };
};

export const getPatientByUuid = async (uuid: string) => {
  const result = await execute<PatientRecord>(`SELECT * FROM patients WHERE uuid = ? LIMIT 1`, [uuid]);
  return rowsToArray<PatientRecord>(result)[0] ?? null;
};

export const getEncounterByUuid = async (uuid: string) => {
  const result = await execute<EncounterRecord>(`SELECT * FROM encounters WHERE uuid = ? LIMIT 1`, [uuid]);
  return rowsToArray<EncounterRecord>(result)[0] ?? null;
};

export const getReferralByUuid = async (uuid: string) => {
  const result = await execute<ReferralRecord>(`SELECT * FROM referrals WHERE uuid = ? LIMIT 1`, [uuid]);
  return rowsToArray<ReferralRecord>(result)[0] ?? null;
};

export const listFacilities = async (query = '') => {
  const result = await execute<FacilityRecord>(
    `SELECT * FROM facilities WHERE name LIKE ? ORDER BY name ASC`,
    [`%${query}%`]
  );
  return rowsToArray<FacilityRecord>(result);
};

export const upsertFacilities = async (facilities: FacilityRecord[]) => {
  for (const facility of facilities) {
    await execute(
      `INSERT INTO facilities (uuid, name, facility_type, lga_uuid, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(uuid) DO UPDATE SET
         name = excluded.name,
         facility_type = excluded.facility_type,
         lga_uuid = excluded.lga_uuid,
         updated_at = excluded.updated_at`,
      [facility.uuid, facility.name, facility.facility_type ?? null, facility.lga_uuid ?? null, touch()]
    );
  }
};

export const getPatientsPageCount = async () => {
  const result = await execute<{ count: number }>(`SELECT COUNT(*) as count FROM patients`);
  const row = rowsToArray<{ count: number }>(result)[0];
  return row?.count ?? 0;
};

export const getEncountersPageCount = async () => {
  const result = await execute<{ count: number }>(`SELECT COUNT(*) as count FROM encounters`);
  const row = rowsToArray<{ count: number }>(result)[0];
  return row?.count ?? 0;
};
