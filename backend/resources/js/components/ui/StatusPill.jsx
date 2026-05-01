import { formatLabel } from '../../utils/format';

export default function StatusPill({ value }) {
  const str = String(value || '').toLowerCase();
  return (
    <span className={`pill status-${str}`}>{formatLabel(value || '-')}</span>
  );
}
