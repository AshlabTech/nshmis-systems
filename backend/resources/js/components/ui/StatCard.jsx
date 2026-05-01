const Icon = ({ d, size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const STAT_ICONS = {
  patients:    ['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 11a4 4 0 100-8 4 4 0 000 8'],
  encounters:  ['M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8'],
  referrals:   ['M7 17L17 7', 'M7 7h10v10'],
  pending:     'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2',
  failed:      ['M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z', 'M12 9v4', 'M12 17h.01'],
  completion:  ['M22 11.08V12a10 10 0 11-5.93-9.14', 'M22 4L12 14.01l-3-3'],
};

const STAT_COLORS = [
  'stat-icon-teal',
  'stat-icon-indigo',
  'stat-icon-amber',
  'stat-icon-rose',
  'stat-icon-emerald',
  'stat-icon-violet',
];

export default function StatCard({ label, value, iconKey, colorIndex = 0 }) {
  const iconPaths = STAT_ICONS[iconKey] || STAT_ICONS.patients;
  const colorClass = STAT_COLORS[colorIndex % STAT_COLORS.length];

  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <p>{label}</p>
        <div className={`stat-icon ${colorClass}`}>
          <Icon d={iconPaths} size={18} />
        </div>
      </div>
      <strong>{String(value ?? 0)}</strong>
    </div>
  );
}
