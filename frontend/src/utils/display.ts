export const titleCase = (value: string) =>
  value
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const shortRef = (uuid?: string | null) => {
  if (!uuid) return 'No reference';
  const compact = uuid.replace(/-/g, '');
  return `Ref ${compact.slice(0, 6).toUpperCase()}`;
};

export const formatDateTime = (value?: string | null) => {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
