import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatDate, fullName, shortRef, toQueryString, lgaOptions, wardOptions } from '../utils/format';
import DataTable from '../components/ui/Table';
import Pagination from '../components/ui/Pagination';
import StatusPill from '../components/ui/StatusPill';
import { ControlledSelect, SelectField, TextField } from '../components/ui/FormField';

function DetailSection({ title, children }) {
  return (
    <div className="detail-section">
      <div className="detail-section-title">{title}</div>
      {children}
    </div>
  );
}

function DetailTable({ rows }) {
  return (
    <table className="detail-table">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td className="detail-table-label">{label}</td>
            <td className="detail-table-value">{value ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function fetchReferralPdf(uuid, token, showToast) {
  return fetch(`/api/v1/referrals/${uuid}/pdf`, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => { if (!r.ok) throw new Error('PDF generation failed.'); return r.blob(); })
    .catch((err) => { showToast(err.message, 'error'); return null; });
}

function ReferralDetail({ referral, metadata, token, showToast, onStatusSaved }) {
  const { apiRequest } = useApp();

  const handleDownloadPdf = async () => {
    const blob = await fetchReferralPdf(referral.uuid, token, showToast);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `referral-${referral.uuid}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = async () => {
    const blob = await fetchReferralPdf(referral.uuid, token, showToast);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const win = window.open(url);
    win?.addEventListener('load', () => { win.print(); });
  };

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
    <div className="detail-modal-body">
      <div className="detail-modal-actions" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="btn-outline btn-sm" onClick={handlePrint}>🖨 Print</button>
        <button className="btn-outline btn-sm" onClick={handleDownloadPdf}>⬇ Download PDF</button>
      </div>

      <DetailSection title="Patient Summary">
        <DetailTable rows={[
          ['Patient Name', fullName(referral.patient)],
          ['Patient Ref', shortRef(referral.patient?.uuid)],
          ['Sex', referral.patient?.sex],
          ['Age', referral.patient?.estimated_age_years ? `${referral.patient.estimated_age_years} years` : null],
          ['NHIS Status', referral.patient?.nhis_status],
          ['LGA', referral.lga?.name],
          ['Ward', referral.ward?.name],
        ]} />
      </DetailSection>

      <DetailSection title="Encounter Summary">
        <DetailTable rows={[
          ['Encounter Ref', referral.encounter?.uuid ? shortRef(referral.encounter.uuid) : null],
          ['Encounter Date', referral.encounter?.encounter_date ? formatDate(referral.encounter.encounter_date) : null],
        ]} />
      </DetailSection>

      <DetailSection title="Referral Details">
        <DetailTable rows={[
          ['Referral Ref', shortRef(referral.uuid)],
          ['Referred To Facility', referral.referred_to_facility],
          ['Urgency', referral.urgency ? referral.urgency.charAt(0).toUpperCase() + referral.urgency.slice(1) : null],
          ['Referral Status', <StatusPill key="status" value={referral.status} />],
          ['Workflow Status', <StatusPill key="wf" value={referral.workflow_status} />],
          ['Follow-up Date', referral.follow_up_date ? formatDate(referral.follow_up_date) : null],
          ['Completed Date', referral.completed_at ? formatDate(referral.completed_at, true) : null],
          ['Completed By', referral.completed_by],
        ]} />
      </DetailSection>

      {referral.referral_reason && (
        <DetailSection title="Referral Reason">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, padding: '8px 0' }}>{referral.referral_reason}</p>
        </DetailSection>
      )}

      <DetailSection title="Capture & Sync">
        <DetailTable rows={[
          ['Created By', referral.creator?.name],
          ['Created At', formatDate(referral.created_at, true)],
          ['Sync Status', <StatusPill key="sync" value={referral.sync_status} />],
        ]} />
      </DetailSection>

      <DetailSection title="Update Status">
        <form className="filters compact" style={{ padding: 0, background: 'none', border: 'none', marginBottom: 0 }} onSubmit={handleStatusSubmit}>
          <SelectField name="status" label="New Status" options={metadata?.referral_statuses || []} defaultValue={referral.workflow_status} />
          <div className="field">
            <label>&nbsp;</label>
            <button className="btn" type="submit">Save Status</button>
          </div>
        </form>
      </DetailSection>
    </div>
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
  const { auth, metadata, apiRequest, downloadExport, openModal, closeModal, showToast } = useApp();
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
      const token = auth.token;
      openModal({
        title: 'Referral Details',
        subtitle: shortRef(referral.uuid),
        content: (
          <ReferralDetail
            referral={referral}
            metadata={metadata}
            token={token}
            showToast={showToast}
            onStatusSaved={() => { closeModal(); load(query); }}
          />
        ),
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
