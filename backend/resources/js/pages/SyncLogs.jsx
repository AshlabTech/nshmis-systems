import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatDate, shortRef, toQueryString, formatLabel } from '../utils/format';
import DataTable from '../components/ui/Table';
import Pagination from '../components/ui/Pagination';
import StatusPill from '../components/ui/StatusPill';
import { SelectField, TextField } from '../components/ui/FormField';

export default function SyncLogs() {
  const { metadata, apiRequest, showToast } = useApp();
  const [result, setResult] = useState(null);
  const [query, setQuery] = useState({ page: 1, per_page: 20 });
  const [loading, setLoading] = useState(true);

  function load(q) {
    setLoading(true);
    apiRequest(`/sync-logs?${toQueryString({ per_page: 20, ...q })}`)
      .then(setResult)
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(query); }, []); // eslint-disable-line

  function handleFilter(e) {
    e.preventDefault();
    const data = new FormData(e.target);
    const next = { page: 1 };
    for (const [k, v] of data.entries()) if (v) next[k] = v;
    setQuery(next);
    load(next);
  }

  function handlePage(page) {
    const next = { ...query, page };
    setQuery(next);
    load(next);
  }

  const userOptions = (metadata?.users || []).map((u) => ({ value: String(u.id), label: u.name }));

  return (
    <>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>
        Monitor mobile sync attempts, failures, and per-batch entity counts.
      </p>
      <div className="panel">
        <form className="filters compact" onSubmit={handleFilter}>
          <SelectField name="user_id" label="User" options={userOptions} defaultValue={query.user_id} />
          <TextField name="device_id" label="Device ID" defaultValue={query.device_id} />
          <SelectField name="status" label="Status" options={metadata?.sync_statuses || []} defaultValue={query.status} />
          <TextField name="date_from" label="From" defaultValue={query.date_from} type="date" />
          <TextField name="date_to" label="To" defaultValue={query.date_to} type="date" />
          <div className="field">
            <label>&nbsp;</label>
            <button className="btn" type="submit">Apply</button>
          </div>
        </form>

        <div className="toolbar">
          <span className="table-meta">{result?.total?.toLocaleString() ?? 0} sync log entries</span>
        </div>

        {loading ? (
          <div className="loading">Loading sync logs…</div>
        ) : (
          <DataTable
            headers={['Record', 'User / Device', 'Status', 'Entity Counts', 'Message', 'Time']}
            rows={result?.data || []}
            renderRow={(log) => (
              <tr key={`${log.batch_uuid}-${log.entity_uuid}`}>
                <td>
                  <strong>{shortRef(log.entity_uuid)}</strong>
                  <div className="mini-note">{formatLabel(log.entity_type)} - Batch {shortRef(log.batch_uuid)}</div>
                </td>
                <td>
                  {log.user?.name || '—'}
                  <div className="mini-note">{log.device_id || 'No device ID'}</div>
                </td>
                <td><StatusPill value={log.status} /></td>
                <td>
                  <div className="mini-note">Patients: {log.entity_counts?.patient || 0}</div>
                  <div className="mini-note">Encounters: {log.entity_counts?.encounter || 0}</div>
                  <div className="mini-note">Referrals: {log.entity_counts?.referral || 0}</div>
                </td>
                <td style={{ maxWidth: 260, color: log.status === 'failed' ? 'var(--danger-fg)' : undefined }}>
                  {log.error_message || log.message || '—'}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>{formatDate(log.created_at, true)}</td>
              </tr>
            )}
          />
        )}
        <Pagination result={result} onPage={handlePage} />
      </div>
    </>
  );
}


