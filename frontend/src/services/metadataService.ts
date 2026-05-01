import { API_BASE_URL } from '../config/appConfig';
import { upsertAdministrativeMetadata, upsertFacilities } from '../database/repository';
import type { FacilityRecord, LgaRecord, WardRecord } from '../types/models';

type MetadataResponse = {
  lgas?: LgaRecord[];
  wards?: WardRecord[];
  facilities?: FacilityRecord[];
};

export const metadataService = {
  refreshAdministrativeMetadata: async (token: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/metadata`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return;

    const body = (await response.json().catch(() => ({}))) as MetadataResponse;

    if (body.lgas?.length && body.wards) {
      await upsertAdministrativeMetadata({ lgas: body.lgas, wards: body.wards });
    }

    if (body.facilities?.length) {
      await upsertFacilities(body.facilities);
    }
  },
};
