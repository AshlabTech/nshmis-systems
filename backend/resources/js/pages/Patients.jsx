import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  formatDate,
  fullName,
  shortRef,
  toQueryString,
  roleScopeCopy,
  lgaOptions,
  wardOptions,
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

function fetchPdfBlob(uuid, token, showToast) {
  return fetch(`/api/v1/patients/${uuid}/pdf`, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => { if (!r.ok) throw new Error('PDF generation failed.'); return r.blob(); })
    .catch((err) => { showToast(err.message, 'error'); return null; });
}

function PatientDetail({ patient, token, showToast }) {
  const handleDownloadPdf = async () => {
    const blob = await fetchPdfBlob(patient.uuid, token, showToast);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `patient-${patient.uuid}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = async () => {
    const blob = await fetchPdfBlob(patient.uuid, token, showToast);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const win = window.open(url);
    win?.addEventListener('load', () => { win.print(); });
  };

  return (
    <div className="detail-modal-body">
      <div className="detail-modal-actions" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="btn-outline btn-sm" onClick={handlePrint}>🖨 Print</button>
        <button className="btn-outline btn-sm" onClick={handleDownloadPdf}>⬇ Download PDF</button>
      </div>

      <DetailSection title="Patient Identity">
        <DetailTable rows={[
          ['Reference', shortRef(patient.uuid)],
          ['Full Name', fullName(patient)],
        ]} />
      </DetailSection>

      <DetailSection title="Demographics">
        <DetailTable rows={[
          ['Sex', patient.sex ? patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1) : null],
          ['Date of Birth', formatDate(patient.date_of_birth)],
          ['Estimated Age', patient.estimated_age_years ? `${patient.estimated_age_years} years` : null],
          ['Age Estimated', patient.is_estimated_age ? 'Yes' : 'No'],
        ]} />
      </DetailSection>

      <DetailSection title="Contact Information">
        <DetailTable rows={[
          ['Phone Number', patient.phone_number],
          ['Address', patient.address_line],
        ]} />
      </DetailSection>

      <DetailSection title="Location & Facility">
        <DetailTable rows={[
          ['LGA', patient.lga?.name],
          ['Ward', patient.ward?.name],
          ['Primary Facility', patient.primary_facility?.name
            ? `${patient.primary_facility.name}${patient.primary_facility.type ? ` (${patient.primary_facility.type})` : ''}`
            : null],
        ]} />
      </DetailSection>

      <DetailSection title="Program Information">
        <DetailTable rows={[
          ['NHIS Status', patient.nhis_status ? patient.nhis_status.charAt(0).toUpperCase() + patient.nhis_status.slice(1) : null],
          ['Enrollment Date', formatDate(patient.created_at)],
          ['Created By', patient.creator?.name],
          ['Sync Status', <StatusPill key="sync" value={patient.sync_status} />],
          ['Synced At', patient.synced_at ? formatDate(patient.synced_at, true) : null],
        ]} />
      </DetailSection>

      {(patient.encounters?.length > 0) && (
        <DetailSection title={`Encounter History (${patient.encounters.length})`}>
          <DataTable
            headers={['Ref', 'Type', 'Date', 'Data Clerk', 'Sync']}
            rows={patient.encounters || []}
            renderRow={(item) => (
              <tr key={item.uuid}>
                <td>{shortRef(item.uuid)}</td>
                <td>{item.encounter_type || '—'}</td>
                <td>{formatDate(item.encounter_date)}</td>
                <td>{item.creator?.name || '—'}</td>
                <td><StatusPill value={item.sync_status} /></td>
              </tr>
            )}
          />
        </DetailSection>
      )}
    </div>
  );
}

export default function Patients() {
  const { auth, metadata, apiRequest, downloadExport, openModal, showToast } = useApp();
  const [result, setResult] = useState(null);
  const [query, setQuery] = useState({ page: 1, per_page: 20 });
  const [lgaFilter, setLgaFilter] = useState('');
  const [loading, setLoading] = useState(true);

  function load(q) {
    setLoading(true);
    apiRequest(`/patients?${toQueryString({ per_page: 20, ...q })}`)
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
      const patient = await apiRequest(`/patients/${uuid}`);
      const token = auth.token;
      openModal({
        title: fullName(patient),
        subtitle: shortRef(patient.uuid),
        content: <PatientDetail patient={patient} token={token} showToast={showToast} />,
      });
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  const nhisValues = [...new Set((result?.data || []).map((p) => p.nhis_status).filter(Boolean))];

  return (
    <>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>
        {roleScopeCopy(auth.user?.role)}
      </p>
      <div className="panel">
        <form className="filters wide" onSubmit={handleFilter}>
          <TextField name="search" label="Search name, reference, phone" defaultValue={query.search} />
          <ControlledSelect
            name="lga_uuid" label="LGA"
            options={lgaOptions(metadata)}
            value={lgaFilter}
            onChange={(v) => setLgaFilter(v)}
          />
          <SelectField name="ward_uuid" label="Ward" options={wardOptions(metadata, lgaFilter)} defaultValue={query.ward_uuid} />
          <SelectField name="sex" label="Sex" options={['male', 'female']} defaultValue={query.sex} />
          <SelectField name="nhis_status" label="NHIS Status" options={nhisValues} defaultValue={query.nhis_status} />
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
              onClick={() => downloadExport('patients', toQueryString(query)).catch((err) => showToast(err.message, 'error'))}
            >
              Export CSV
            </button>
          </div>
          <span className="table-meta">
            {result?.total?.toLocaleString() ?? 0} patient records
          </span>
        </div>

        {loading ? (
          <div className="loading">Loading patients…</div>
        ) : (
          <DataTable
            headers={['Patient', 'Sex / NHIS', 'Location', 'Primary Facility', 'Phone', 'Sync', 'Registered', '']}
            rows={result?.data || []}
            renderRow={(patient) => (
              <tr key={patient.uuid}>
                <td>
                  <strong>{fullName(patient)}</strong>
                  <div className="mini-note">{shortRef(patient.uuid)}</div>
                </td>
                <td>
                  {patient.sex || '—'}
                  <div className="mini-note">{patient.nhis_status || 'Unknown'}</div>
                </td>
                <td>
                  {patient.lga?.name || '—'}
                  <div className="mini-note">{patient.ward?.name || '—'}</div>
                </td>
                <td>{patient.primary_facility?.name || '—'}</td>
                <td>{patient.phone_number || '—'}</td>
                <td><StatusPill value={patient.sync_status} /></td>
                <td>{formatDate(patient.created_at, true)}</td>
                <td>
                  <button className="link-btn" onClick={() => openDetail(patient.uuid)}>
                    View →
                  </button>
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
