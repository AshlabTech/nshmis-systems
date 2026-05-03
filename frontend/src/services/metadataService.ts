import { API_BASE_URL } from '../config/appConfig';
import { upsertAdministrativeMetadata, replaceFacilities } from '../database/repository';
import type { FacilityRecord, LgaRecord, WardRecord } from '../types/models';
import { debugFetch } from './debugFetch';

// Older API responses only include lga_id; newer ones include lga_uuid directly.
// Normalize both shapes before storing wards locally because the wizard filters by lga_uuid.
type RawWard = { id?: number | string; uuid: string; lga_id?: number | string; lga_uuid?: string | null; lga?: { uuid?: string | null }; name: string };
type RawLga = { id: number | string; uuid: string; name: string };

type MetadataResponse = {
  lgas?: RawLga[];
  wards?: RawWard[];
  facilities?: FacilityRecord[];
};

export const metadataService = {
  refreshAdministrativeMetadata: async (token: string): Promise<void> => {
    const response = await debugFetch(`${API_BASE_URL}/metadata`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return;

    const body = (await response.json().catch(() => ({}))) as MetadataResponse;

    if (body.lgas?.length && Array.isArray(body.wards)) {
      const lgaIdToUuid = new Map<string, string>(body.lgas.map((l) => [String(l.id), l.uuid]));

      const wards: WardRecord[] = body.wards
        .map((w) => ({
          uuid: w.uuid,
          name: w.name,
          lga_uuid: w.lga_uuid ?? w.lga?.uuid ?? (w.lga_id === undefined ? undefined : lgaIdToUuid.get(String(w.lga_id))),
        }))
        .filter((w): w is WardRecord => Boolean(w.lga_uuid));

      await upsertAdministrativeMetadata({ lgas: body.lgas as LgaRecord[], wards });
    }

    // Use replace so facilities from previously-assigned LGAs are cleared.
    // Array.isArray guard handles both populated and empty arrays correctly.
    if (Array.isArray(body.facilities)) {
      await replaceFacilities(body.facilities);
    }
  },
};
