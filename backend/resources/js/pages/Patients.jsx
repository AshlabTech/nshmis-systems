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

function PatientDetail({ patient }) {
  return (
    <>
      <DetailGrid
        rows={[
          ['Sex', patient.sex],
          ['Date of Birth', formatDate(patient.date_of_birth)],
          ['Estimated Age', patient.estimated_age_years],
          ['NHIS Status', patient.nhis_status],
          ['Phone Number', patient.phone_number],
          ['Address', patient.address_line],
          ['LGA', patient.lga?.name],
          ['Ward', patient.ward?.name],
        ]}
      />
      {(patient.encounters?.length > 0) && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Encounter History</h3>
          <DataTable
            headers={['Encounter', 'Type', 'Date', 'Data Clerk']}
            rows={patient.encounters || []}
            renderRow={(item) => (
              <tr key={item.uuid}>
                <td>{shortRef(item.uuid)}</td>
                <td>{item.encounter_type || '—'}</td>
                <td>{formatDate(item.encounter_date)}</td>
                <td>{item.creator?.name || '—'}</td>
              </tr>
            )}
          />
        </div>
      )}
    </>
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
      openModal({
        title: fullName(patient),
        subtitle: shortRef(patient.uuid),
        content: <PatientDetail patient={patient} />,
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
            headers={['Patient', 'Sex / NHIS', 'Location', 'Phone', 'Sync Status', 'Registered', '']}
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
