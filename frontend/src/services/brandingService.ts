import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/appConfig';
import { debugFetch } from './debugFetch';

const CACHE_KEY = 'niger_hmis_branding';

export type Branding = {
  appName: string;
  logoUrl: string | null;
};

const DEFAULT: Branding = {
  appName: 'Niger State HMIS Outreach',
  logoUrl: null,
};

type RawSettings = {
  app_name?: string;
  logo_url?: string | null;
};

export const brandingService = {
  fetch: async (): Promise<Branding> => {
    try {
      const response = await debugFetch(`${API_BASE_URL}/settings`);
      if (!response.ok) return brandingService.getCached();
      const body = (await response.json()) as RawSettings;
      const branding: Branding = {
        appName: body.app_name?.trim() || DEFAULT.appName,
        logoUrl: body.logo_url ?? null,
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(branding));
      return branding;
    } catch {
      return brandingService.getCached();
    }
  },

  getCached: async (): Promise<Branding> => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (!raw) return DEFAULT;
      return { ...DEFAULT, ...(JSON.parse(raw) as Partial<Branding>) };
    } catch {
      return DEFAULT;
    }
  },
};
