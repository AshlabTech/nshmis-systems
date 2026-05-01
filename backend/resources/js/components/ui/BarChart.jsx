export default function BarChart({ items = [], labelKey = 'label' }) {
  if (!items.length) {
    return <div className="empty-state">No data available for this chart yet.</div>;
  }

  const max = Math.max(...items.map((item) => Number(item.total || 0)), 1);

  return (
    <div className="chart-bars">
      {items.map((item, i) => (
        <div key={i} className="bar-row">
          <div>{item[labelKey] || 'Unknown'}</div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${Math.max(8, (Number(item.total || 0) / max) * 100)}%` }}
            />
          </div>
          <strong>{String(item.total || 0)}</strong>
        </div>
      ))}
    </div>
  );
}
