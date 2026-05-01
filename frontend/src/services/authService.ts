import { API_BASE_URL } from '../config/appConfig';
import { debugFetch } from './debugFetch';

export type LoginResult = {
  token: string;
  userId: string;
};

type RawLoginBody = {
  token?: string;
  access_token?: string;
  user?: { id?: number | string; name?: string; email?: string };
  message?: string;
};

export const authService = {
  login: async (identifier: string, password: string): Promise<LoginResult> => {
    const response = await debugFetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: identifier, password }),
    });

    const body = (await response.json().catch(() => ({}))) as RawLoginBody;

    if (!response.ok) {
      throw new Error(body.message ?? `Login failed (${response.status})`);
    }

    const token = body.token ?? body.access_token ?? '';
    if (!token) throw new Error('Server did not return an auth token.');

    const userId =
      (body.user?.name?.trim()) ||
      (body.user?.email?.trim()) ||
      identifier;

    return { token, userId };
  },
};
