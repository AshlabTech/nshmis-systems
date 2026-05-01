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

function FindingsPanel({ findings = {} }) {
  const orderedKeys = Object.keys(findingLabels).filter((key) => findings[key] !== undefined && findings[key] !== null && findings[key] !== '');
  const extraKeys = Object.keys(findings).filter((key) => !findingLabels[key] && findings[key] !== undefined && findings[key] !== null && findings[key] !== '');
  const rows = [...orderedKeys, ...extraKeys].map((key) => [findingLabels[key] || formatLabel(key), formatFindingValue(findings[key])]);

  if (!rows.length) {
    return <div className="empty-state">No findings recorded for this encounter.</div>;
  }

  return <DetailGrid rows={rows} />;
}

function EncounterDetail({ encounter }) {
  return (
    <>
      <DetailGrid
        rows={[
          ['Patient', fullName(encounter.patient)],
          ['Encounter Type', encounter.encounter_type],
          ['Service Point', encounter.service_point],
          ['Date', formatDate(encounter.encounter_date)],
          ['LGA', encounter.lga?.name],
          ['Ward', encounter.ward?.name],
          ['Data Clerk', encounter.creator?.name],
          ['Sync Status', encounter.sync_status],
        ]}
      />
      <div className="panel" style={{ marginTop: 16 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700 }}>Findings</h3>
        <FindingsPanel findings={encounter.findings || {}} />
        {encounter.notes && (
          <>
            <h3 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700 }}>Notes</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{encounter.notes}</p>
          </>
        )}
        {(encounter.referrals?.length > 0) && (
          <>
            <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700 }}>Referrals</h3>
            <DataTable
              headers={['Referral', 'Facility', 'Urgency', 'Status']}
              rows={encounter.referrals || []}
              renderRow={(item) => (
                <tr key={item.uuid}>
                  <td>{shortRef(item.uuid)}</td>
                  <td>{item.referred_to_facility || '—'}</td>
                  <td>{item.urgency || '—'}</td>
                  <td><StatusPill value={item.workflow_status} /></td>
                </tr>
              )}
            />
          </>
        )}
      </div>
    </>
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
      openModal({
        title: `Encounter`,
        subtitle: shortRef(enc.uuid),
        content: <EncounterDetail encounter={enc} />,
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


