export const debugFetch = async (url: string, init?: RequestInit): Promise<Response> => {
  if (__DEV__) {
    console.log('[HTTP]', (init?.method ?? 'GET').toUpperCase(), url);
  }
  const response = await fetch(url, init);
  if (__DEV__) {
    console.log('[HTTP]', response.status, url);
  }
  return response;
};
