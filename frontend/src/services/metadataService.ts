import { API_BASE_URL } from '../config/appConfig';
import { upsertAdministrativeMetadata, replaceFacilities } from '../database/repository';
import type { FacilityRecord, LgaRecord, WardRecord } from '../types/models';
import { debugFetch } from './debugFetch';

// The backend Ward model has lga_id (integer FK) not lga_uuid.
// We receive lga_id from the API and must resolve it to lga_uuid before storing.
type RawWard = { id?: number; uuid: string; lga_id?: number; lga_uuid?: string; name: string };
type RawLga = { id: number; uuid: string; name: string };

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
      // Build lga_id → lga_uuid lookup so we can store the correct UUID on each ward.
      const lgaIdToUuid = new Map<number, string>(body.lgas.map((l) => [l.id, l.uuid]));

      const wards: WardRecord[] = body.wards.map((w) => ({
        uuid: w.uuid,
        name: w.name,
        lga_uuid: w.lga_uuid ?? lgaIdToUuid.get(w.lga_id ?? -1) ?? '',
      }));

      await upsertAdministrativeMetadata({ lgas: body.lgas as LgaRecord[], wards });
    }

    // Use replace so facilities from previously-assigned LGAs are cleared.
    // Array.isArray guard handles both populated and empty arrays correctly.
    if (Array.isArray(body.facilities)) {
      await replaceFacilities(body.facilities);
    }
  },
};
