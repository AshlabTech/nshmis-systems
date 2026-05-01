export default function DataTable({ headers = [], rows = [], renderRow, emptyMessage }) {
  if (!rows.length) {
    return (
      <div className="empty-state">
        {emptyMessage || 'No records matched the current filters.'}
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{rows.map((row, i) => renderRow(row, i))}</tbody>
      </table>
    </div>
  );
}
