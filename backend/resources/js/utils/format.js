export function formatDate(value, includeTime = false) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return includeTime ? date.toLocaleString() : date.toLocaleDateString();
}

export function formatLabel(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatRole(role) {
  return formatLabel(role);
}

export function fullName(record) {
  return (
    [record?.first_name, record?.middle_name, record?.last_name].filter(Boolean).join(' ') ||
    'Unnamed'
  );
}

export function shortRef(value, fallback = 'No reference') {
  if (!value) return fallback;
  return `Ref ${String(value).replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

export function toQueryString(object) {
  const params = new URLSearchParams();
  Object.entries(object || {}).forEach(([key, value]) => {
    if (value !== '' && value != null) {
      params.set(key, value);
    }
  });
  return params.toString();
}

export function roleScopeCopy(role) {
  if (role === 'data_clerk') return 'Scoped to records submitted by the currently signed-in data clerk.';
  if (role === 'supervisor') return "Scoped to the supervisor's assigned LGA, ward, and team footprint.";
  return 'State-wide access across all outreach records and administration tools.';
}

export function lgaOptions(metadata) {
  return (metadata?.lgas || []).map((item) => ({ value: item.uuid, label: item.name }));
}

export function wardOptions(metadata, lgaUuid = '') {
  return (metadata?.wards || [])
    .filter((item) => {
      if (!lgaUuid) return true;
      const matchingLga = (metadata?.lgas || []).find((l) => l.uuid === lgaUuid);
      return matchingLga ? item.lga_id === matchingLga.id : item.lga?.uuid === lgaUuid;
    })
    .map((item) => ({ value: item.uuid, label: item.name }));
}

export function categoryOptions(metadata, key) {
  return (metadata?.[key] || [])
    .filter((item) => item.status !== 'inactive')
    .map((item) => ({ value: item.name, label: item.name }));
}

export function labelForLga(metadata, uuid) {
  return (metadata?.lgas || []).find((item) => item.uuid === uuid)?.name || '';
}

export function labelForWard(metadata, uuid) {
  return (metadata?.wards || []).find((item) => item.uuid === uuid)?.name || '';
}
