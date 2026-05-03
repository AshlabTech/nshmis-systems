import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  formatDate,
  formatLabel,
  fullName,
  shortRef,
  toQueryString,
  roleScopeCopy,
  lgaOptions,
  wardOptions,
  categoryOptions,
} from '../utils/format';
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

const findingLabels = {
  presenting_complaint: 'Presenting Complaint',
  symptoms: 'Symptoms',
  disease_program_category: 'Disease / Program',
  preliminary_diagnosis: 'Preliminary Diagnosis',
  services_provided: 'Services Provided',
  drugs_commodities_issued: 'Drugs / Commodities Issued',
  health_education: 'Health Education',
  service_notes: 'Service Notes',
  outcome_status: 'Outcome',
  referral_required: 'Referral Required',
};

function formatFindingValue(value) {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || '—';
  if (value && typeof value === 'object') return Object.entries(value)
    .map(([key, item]) => `${formatLabel(key)}: ${formatFindingValue(item)}`)
    .join('; ');
  return value || '—';
}

function fetchEncounterPdf(uuid, token, showToast) {
  return fetch(`/api/v1/encounters/${uuid}/pdf`, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => { if (!r.ok) throw new Error('PDF generation failed.'); return r.blob(); })
    .catch((err) => { showToast(err.message, 'error'); return null; });
}

function EncounterDetail({ encounter, token, showToast }) {
  const handleDownloadPdf = async () => {
    const blob = await fetchEncounterPdf(encounter.uuid, token, showToast);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `encounter-${encounter.uuid}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = async () => {
    const blob = await fetchEncounterPdf(encounter.uuid, token, showToast);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const win = window.open(url);
    win?.addEventListener('load', () => { win.print(); });
  };

  const findings = encounter.findings || {};
  const orderedKeys = Object.keys(findingLabels).filter((k) => findings[k] !== undefined && findings[k] !== null && findings[k] !== '');
  const extraKeys = Object.keys(findings).filter((k) => !findingLabels[k] && findings[k] !== undefined && findings[k] !== null && findings[k] !== '');
  const findingRows = [...orderedKeys, ...extraKeys].map((k) => [findingLabels[k] || formatLabel(k), formatFindingValue(findings[k])]);

  return (
    <div className="detail-modal-body">
      <div className="detail-modal-actions" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="btn-outline btn-sm" onClick={handlePrint}>🖨 Print</button>
        <button className="btn-outline btn-sm" onClick={handleDownloadPdf}>⬇ Download PDF</button>
      </div>

      <DetailSection title="Encounter Metadata">
        <DetailTable rows={[
          ['Reference', shortRef(encounter.uuid)],
          ['Encounter Type', encounter.encounter_type],
          ['Service Point', encounter.service_point],
          ['Date', formatDate(encounter.encounter_date)],
          ['Version', encounter.version_stamp ?? 1],
        ]} />
      </DetailSection>

      <DetailSection title="Patient Summary">
        <DetailTable rows={[
          ['Patient Name', fullName(encounter.patient)],
          ['Patient Ref', shortRef(encounter.patient?.uuid)],
          ['Sex', encounter.patient?.sex],
          ['Age', encounter.patient?.estimated_age_years ? `${encounter.patient.estimated_age_years} years` : null],
          ['NHIS Status', encounter.patient?.nhis_status],
        ]} />
      </DetailSection>

      <DetailSection title="Location">
        <DetailTable rows={[
          ['LGA', encounter.lga?.name],
          ['Ward', encounter.ward?.name],
        ]} />
      </DetailSection>

      {findingRows.length > 0 && (
        <DetailSection title="Clinical Information & Services">
          <DetailTable rows={findingRows} />
        </DetailSection>
      )}

      {encounter.notes && (
        <DetailSection title="Notes">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, padding: '8px 0' }}>{encounter.notes}</p>
        </DetailSection>
      )}

      <DetailSection title="Capture & Sync">
        <DetailTable rows={[
          ['Captured By', encounter.creator?.name],
          ['Sync Status', <StatusPill key="sync" value={encounter.sync_status} />],
          ['Synced At', encounter.synced_at ? formatDate(encounter.synced_at, true) : null],
        ]} />
      </DetailSection>

      {(encounter.referrals?.length > 0) && (
        <DetailSection title="Referral Information">
          <DataTable
            headers={['Ref', 'Facility', 'Urgency', 'Status', 'Reason']}
            rows={encounter.referrals || []}
            renderRow={(item) => (
              <tr key={item.uuid}>
                <td>{shortRef(item.uuid)}</td>
                <td>{item.referred_to_facility || '—'}</td>
                <td>{item.urgency || '—'}</td>
                <td><StatusPill value={item.workflow_status} /></td>
                <td style={{ maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.referral_reason || '—'}</td>
              </tr>
            )}
          />
        </DetailSection>
      )}
    </div>
  );
}

export default function Encounters() {
  const { auth, metadata, apiRequest, downloadExport, openModal, showToast } = useApp();
  const [result, setResult] = useState(null);
  const [query, setQuery] = useState({ page: 1, per_page: 20 });
  const [lgaFilter, setLgaFilter] = useState('');
  const [loading, setLoading] = useState(true);

  function load(q) {
    setLoading(true);
    apiRequest(`/encounters?${toQueryString({ per_page: 20, ...q })}`)
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
      const enc = await apiRequest(`/encounters/${uuid}`);
      const token = auth.token;
      openModal({
        title: 'Encounter',
        subtitle: shortRef(enc.uuid),
        content: <EncounterDetail encounter={enc} token={token} showToast={showToast} />,
      });
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  const userOptions = (metadata?.users || []).map((u) => ({ value: String(u.id), label: u.name }));

  return (
    <>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>
        {roleScopeCopy(auth.user?.role)}
      </p>
      <div className="panel">
        <form className="filters wide" onSubmit={handleFilter}>
          <TextField name="search" label="Search encounter or patient" defaultValue={query.search} />
          <ControlledSelect name="lga_uuid" label="LGA" options={lgaOptions(metadata)} value={lgaFilter} onChange={(v) => setLgaFilter(v)} />
          <SelectField name="ward_uuid" label="Ward" options={wardOptions(metadata, lgaFilter)} defaultValue={query.ward_uuid} />
          <SelectField name="disease_program" label="Disease / Program" options={categoryOptions(metadata, 'disease_categories')} defaultValue={query.disease_program} />
          <SelectField name="user_id" label="Data Clerk" options={userOptions} defaultValue={query.user_id} />
          <TextField name="date_from" label="From" defaultValue={query.date_from} type="date" />
          <TextField name="date_to" label="To" defaultValue={query.date_to} type="date" />
          <div className="field">
            <label>&nbsp;</label>
            <button className="btn" type="submit">Apply</button>
          </div>
        </form>

        <div className="toolbar">
          <div className="toolbar-group">
            <button
              className="btn-outline btn-sm"
              onClick={() => downloadExport('encounters', toQueryString(query)).catch((err) => showToast(err.message, 'error'))}
            >
              Export CSV
            </button>
          </div>
          <span className="table-meta">{result?.total?.toLocaleString() ?? 0} encounters</span>
        </div>

        {loading ? (
          <div className="loading">Loading encounters…</div>
        ) : (
          <DataTable
            headers={['Encounter', 'Patient', 'Disease / Program', 'Location', 'Data Clerk', 'Sync', '']}
            rows={result?.data || []}
            renderRow={(enc) => (
              <tr key={enc.uuid}>
                <td>
                  <strong>{shortRef(enc.uuid)}</strong>
                  <div className="mini-note">{formatDate(enc.encounter_date)}</div>
                </td>
                <td>
                  {fullName(enc.patient)}
                  <div className="mini-note">{shortRef(enc.patient?.uuid)}</div>
                </td>
                <td>
                  {enc.encounter_type || '—'}
                  <div className="mini-note">{enc.service_point || '—'}</div>
                </td>
                <td>
                  {enc.lga?.name || '—'}
                  <div className="mini-note">{enc.ward?.name || '—'}</div>
                </td>
                <td>{enc.creator?.name || '—'}</td>
                <td><StatusPill value={enc.sync_status} /></td>
                <td><button className="link-btn" onClick={() => openDetail(enc.uuid)}>View →</button></td>
              </tr>
            )}
          />
        )}
        <Pagination result={result} onPage={handlePage} />
      </div>
    </>
  );
}
