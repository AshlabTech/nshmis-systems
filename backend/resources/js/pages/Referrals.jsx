import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatDate, fullName, shortRef, toQueryString, lgaOptions, wardOptions } from '../utils/format';
import DataTable from '../components/ui/Table';
import Pagination from '../components/ui/Pagination';
import StatusPill from '../components/ui/StatusPill';
import { ControlledSelect, SelectField, TextField } from '../components/ui/FormField';

function DetailGrid({ rows }) {
  return (
    <div className="detail-grid">
      {rows.map(([label, value]) => (
        <div key={label} className="detail-cell">
          <span className="detail-cell-label">{label}</span>
          <span className="detail-cell-value">{String(value || '—')}</span>
        </div>
      ))}
    </div>
  );
}

function ReferralDetail({ referral, metadata, onStatusSaved }) {
  const { apiRequest, showToast } = useApp();

  async function handleStatusSubmit(e) {
    e.preventDefault();
    const data = new FormData(e.target);
    try {
      await apiRequest(`/referrals/${referral.uuid}/status`, {
        method: 'PATCH',
        body: { status: data.get('status') },
      });
      showToast('Referral status updated.', 'success');
      onStatusSaved();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  return (
    <>
      <DetailGrid
        rows={[
          ['Patient', fullName(referral.patient)],
          ['Linked Encounter', shortRef(referral.encounter?.uuid)],
          ['Referred To', referral.referred_to_facility || '—'],
          ['Urgency', referral.urgency || '—'],
          ['Workflow Status', referral.workflow_status || '—'],
          ['Operational Status', referral.status || '—'],
          ['LGA', referral.lga?.name],
          ['Ward', referral.ward?.name],
        ]}
      />
      {referral.referral_reason && (
        <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
          <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Referral Reason</span>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{referral.referral_reason}</p>
        </div>
      )}
      <div style={{ marginTop: 14, padding: 16, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Update Status</p>
        <form className="filters compact" style={{ padding: 0, background: 'none', border: 'none', marginBottom: 0 }} onSubmit={handleStatusSubmit}>
          <SelectField name="status" label="New Status" options={metadata?.referral_statuses || []} defaultValue={referral.workflow_status} />
          <div className="field">
            <label>&nbsp;</label>
            <button className="btn" type="submit">Save</button>
          </div>
        </form>
      </div>
    </>
  );
}

function StatusUpdateForm({ uuid, currentStatus, metadata, onSaved }) {
  const { apiRequest, showToast } = useApp();

  async function handleSubmit(e) {
    e.preventDefault();
    const data = new FormData(e.target);
    try {
      await apiRequest(`/referrals/${uuid}/status`, { method: 'PATCH', body: { status: data.get('status') } });
      showToast('Referral status updated.', 'success');
      onSaved();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  return (
    <form className="filters compact" style={{ padding: 0, background: 'none', border: 'none' }} onSubmit={handleSubmit}>
      <SelectField name="status" label="Status" options={metadata?.referral_statuses || []} defaultValue={currentStatus} />
      <div className="field">
        <label>&nbsp;</label>
        <button className="btn" type="submit">Save Status</button>
      </div>
    </form>
  );
}

export default function Referrals() {
  const { metadata, apiRequest, downloadExport, openModal, closeModal, showToast } = useApp();
  const [result, setResult] = useState(null);
  const [query, setQuery] = useState({ page: 1, per_page: 20 });
  const [lgaFilter, setLgaFilter] = useState('');
  const [loading, setLoading] = useState(true);

  function load(q) {
    setLoading(true);
    apiRequest(`/referrals?${toQueryString({ per_page: 20, ...q })}`)
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

  async function openDetail(uuid) {
    try {
      const referral = await apiRequest(`/referrals/${uuid}`);
      openModal({
        title: 'Referral Details',
        subtitle: shortRef(referral.uuid),
        content: <ReferralDetail referral={referral} metadata={metadata} onStatusSaved={() => { closeModal(); load(query); }} />,
      });
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function openStatusModal(uuid, currentStatus) {
    openModal({
      title: 'Update Referral Status',
      subtitle: 'Change the workflow state for this referral',
      content: <StatusUpdateForm uuid={uuid} currentStatus={currentStatus} metadata={metadata} onSaved={() => { closeModal(); load(query); }} />,
    });
  }

  return (
    <>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>
        Track referral progression, triage urgency, destination facilities, and completion rates.
      </p>
      <div className="panel">
        <form className="filters wide" onSubmit={handleFilter}>
          <TextField name="search" label="Search referral, patient, reason" defaultValue={query.search} />
          <SelectField name="status" label="Status" options={metadata?.referral_statuses || []} defaultValue={query.status} />
          <SelectField name="urgency" label="Urgency" options={metadata?.urgency_levels || []} defaultValue={query.urgency} />
          <TextField name="facility" label="Facility" defaultValue={query.facility} />
          <ControlledSelect name="lga_uuid" label="LGA" options={lgaOptions(metadata)} value={lgaFilter} onChange={(v) => setLgaFilter(v)} />
          <SelectField name="ward_uuid" label="Ward" options={wardOptions(metadata, lgaFilter)} defaultValue={query.ward_uuid} />
          <TextField name="date_from" label="From" defaultValue={query.date_from} type="date" />
          <TextField name="date_to" label="To" defaultValue={query.date_to} type="date" />
          <div className="field">
            <label>&nbsp;</label>
            <button className="btn" type="submit">Apply</button>
          </div>
        </form>

        <div className="toolbar">
          <div className="toolbar-group">
            <button className="btn-outline btn-sm" onClick={() => downloadExport('referrals', toQueryString(query)).catch((err) => showToast(err.message, 'error'))}>
              Export CSV
            </button>
          </div>
          <span className="table-meta">{result?.total?.toLocaleString() ?? 0} referrals</span>
        </div>

        {loading ? (
          <div className="loading">Loading referrals…</div>
        ) : (
          <DataTable
            headers={['Referral', 'Patient', 'Facility', 'Urgency', 'Status', 'Location', '']}
            rows={result?.data || []}
            renderRow={(ref) => (
              <tr key={ref.uuid}>
                <td>
                  <strong>{shortRef(ref.uuid)}</strong>
                  <div className="mini-note">{formatDate(ref.created_at, true)}</div>
                </td>
                <td>
                  {fullName(ref.patient)}
                  <div className="mini-note">{shortRef(ref.patient?.uuid)}</div>
                </td>
                <td>{ref.referred_to_facility || '—'}</td>
                <td>{ref.urgency || '—'}</td>
                <td><StatusPill value={ref.workflow_status} /></td>
                <td>
                  {ref.lga?.name || '—'}
                  <div className="mini-note">{ref.ward?.name || '—'}</div>
                </td>
                <td className="row-actions">
                  <button className="link-btn" onClick={() => openDetail(ref.uuid)}>View</button>
                  <button className="link-btn" onClick={() => openStatusModal(ref.uuid, ref.workflow_status || '')}>Update</button>
                </td>
              </tr>
            )}
          />
        )}
        <Pagination result={result} onPage={handlePage} />
      </div>
    </>
  );
}


