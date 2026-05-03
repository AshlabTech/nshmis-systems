const DEFAULT_TIMEOUT_MS = 15000;

export const debugFetch = async (url: string, init?: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> => {
  if (__DEV__) {
    console.log('[HTTP]', (init?.method ?? 'GET').toUpperCase(), url);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Check that the API URL is reachable from this device.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (__DEV__) {
    console.log('[HTTP]', response.status, url);
  }
  return response;
};
