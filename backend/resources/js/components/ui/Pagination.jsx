export default function Pagination({ result, onPage }) {
  if (!result) return null;

  const { current_page, last_page, total, from, to } = result;

  return (
    <div className="pagination">
      <span className="page-info">
        {from && to
          ? `Showing ${from}–${to} of ${total?.toLocaleString() ?? 0}`
          : `Page ${current_page} of ${last_page}`}
      </span>
      <div className="pagination-controls">
        <button
          className="btn-outline btn-sm"
          disabled={current_page <= 1}
          onClick={() => onPage(current_page - 1)}
        >
          ← Previous
        </button>
        <span
          style={{
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-muted)',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
          }}
        >
          {current_page} / {last_page}
        </span>
        <button
          className="btn-outline btn-sm"
          disabled={current_page >= last_page}
          onClick={() => onPage(current_page + 1)}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
