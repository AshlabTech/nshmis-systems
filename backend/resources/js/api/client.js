const BASE_URL = '/api/v1';

export async function rawRequest(path, options = {}, token = '') {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401) {
    const err = new Error('Authentication required.');
    err.status = 401;
    throw err;
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'string'
        ? payload
        : payload.message || payload.error || extractValidationErrors(payload.errors) || 'Request failed.';
    throw new Error(message);
  }

  return payload;
}

export async function rawExport(path, token = '') {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'text/csv',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Export failed.');
  }

  return response;
}

function extractValidationErrors(errors) {
  if (!errors || typeof errors !== 'object') return '';
  const values = Object.values(errors).flat();
  return values[0] || '';
}
