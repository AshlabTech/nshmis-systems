export default function TrendChart({ items = [] }) {
  if (!items.length) {
    return <div className="empty-state">No trend data available yet.</div>;
  }

  const slice = items.slice(-16);
  const max = Math.max(...slice.map((item) => Number(item.total || 0)), 1);

  return (
    <div className="trend-chart">
      {slice.map((item, i) => (
        <div key={i} className="trend-column">
          <strong>{String(item.total || 0)}</strong>
          <div
            className="trend-bar"
            style={{ height: `${Math.max(10, (Number(item.total || 0) / max) * 180)}px` }}
          />
          <span>{String(item.period)}</span>
        </div>
      ))}
    </div>
  );
}
