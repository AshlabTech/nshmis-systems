import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  formatRole,
  toQueryString,
  lgaOptions,
  wardOptions,
  labelForLga,
  labelForWard,
  shortRef,
} from '../../utils/format';
import DataTable from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import StatusPill from '../../components/ui/StatusPill';
import { ControlledSelect, SelectField, TextField } from '../../components/ui/FormField';

function getConfig(routeKey) {
  const configs = {
    users: {
      title: 'Users Management',
      singular: 'User',
      description: 'Create and manage role assignments for data clerks, supervisors, and state admins.',
      endpoint: '/admin/users',
      columns: ['Name', 'Email', 'Role', 'Scope / LGAs', 'Team', 'Action'],
    },
    lgas: {
      title: 'LGAs Management',
      singular: 'LGA',
      description: 'Manage local government areas available for outreach scoping and filters.',
      endpoint: '/admin/lgas',
      columns: ['Name', 'Reference', 'Action'],
    },
    wards: {
      title: 'Wards Management',
      singular: 'Ward',
      description: 'Manage ward definitions within each LGA.',
      endpoint: '/admin/wards',
      columns: ['Name', 'LGA', 'Reference', 'Action'],
    },
    facilities: {
      title: 'Facilities Management',
      singular: 'Facility',
      description: 'Manage referral destinations and public health facility references.',
      endpoint: '/admin/facilities',
      columns: ['Name', 'Type', 'Location', 'Status', 'Action'],
    },
    'disease-categories': {
      title: 'Disease / Program Categories',
      singular: 'Disease Category',
      description: 'Manage disease and program categories used in reporting filters.',
      endpoint: '/admin/disease-categories',
      columns: ['Name', 'Status', 'Reference', 'Action'],
    },
    'service-categories': {
      title: 'Service Categories',
      singular: 'Service Category',
      description: 'Manage service categories shown in supervisory tools and metadata.',
      endpoint: '/admin/service-categories',
      columns: ['Name', 'Status', 'Reference', 'Action'],
    },
  };
  return configs[routeKey] || null;
}

function AdminFilters({ routeKey, query, metadata, onSubmit }) {
  const [lgaId, setLgaId] = useState(query.lga_id || '');

  if (routeKey === 'users') {
    return (
      <form className="filters compact" onSubmit={onSubmit}>
        <TextField name="search" label="Search name, email, team" defaultValue={query.search} />
        <SelectField
          name="role"
          label="Role"
          options={(metadata?.roles || []).map((r) => ({ value: r.value, label: r.label }))}
          defaultValue={query.role}
        />
        <div className="field">
          <label>&nbsp;</label>
          <button className="btn" type="submit">
            Apply Filters
          </button>
        </div>
      </form>
    );
  }

  if (routeKey === 'wards') {
    return (
      <form className="filters compact" onSubmit={onSubmit}>
        <TextField name="search" label="Search ward" defaultValue={query.search} />
        <ControlledSelect
          name="lga_id"
          label="LGA"
          options={(metadata?.lgas || []).map((l) => ({ value: String(l.id), label: l.name }))}
          value={lgaId}
          onChange={(v) => setLgaId(v)}
        />
        <div className="field">
          <label>&nbsp;</label>
          <button className="btn" type="submit">
            Apply Filters
          </button>
        </div>
      </form>
    );
  }

  if (['facilities', 'disease-categories', 'service-categories'].includes(routeKey)) {
    return (
      <form className="filters compact" onSubmit={onSubmit}>
        <TextField name="search" label="Search records" defaultValue={query.search} />
        {routeKey === 'facilities' && (
          <SelectField
            name="lga_uuid"
            label="LGA"
            options={lgaOptions(metadata)}
            defaultValue={query.lga_uuid}
          />
        )}
        <SelectField
          name="status"
          label="Status"
          options={['active', 'inactive']}
          defaultValue={query.status}
        />
        <div className="field">
          <label>&nbsp;</label>
          <button className="btn" type="submit">
            Apply Filters
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="filters compact" onSubmit={onSubmit}>
      <TextField name="search" label="Search records" defaultValue={query.search} />
      <div className="field">
        <label>&nbsp;</label>
        <button className="btn" type="submit">
          Apply Filters
        </button>
      </div>
    </form>
  );
}

function AssignLgasForm({ user, metadata, onSubmit }) {
  const allLgas = metadata?.lgas || [];
  const assignedIds = (user.assigned_lgas || []).map((l) => String(l.id));
  const [selected, setSelected] = useState(assignedIds);

  const toggle = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(selected.map(Number)); }}>
      <p style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
        Select the LGAs this data clerk is authorised to operate in. They will only be able to enroll patients within these LGAs.
      </p>
      {allLgas.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No LGAs defined yet. Add LGAs first.</p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {allLgas.map((lga) => {
          const isChecked = selected.includes(String(lga.id));
          return (
            <label
              key={lga.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                border: `1.5px solid ${isChecked ? 'var(--primary, #0d6b55)' : 'var(--border)'}`,
                borderRadius: 6, cursor: 'pointer', fontSize: 13,
                background: isChecked ? 'rgba(13,107,85,.07)' : 'var(--surface)',
              }}
            >
              <input type="checkbox" checked={isChecked} onChange={() => toggle(String(lga.id))} style={{ accentColor: 'var(--primary, #0d6b55)' }} />
              {lga.name}
            </label>
          );
        })}
      </div>
      <button className="btn" type="submit">Save LGA Assignments</button>
    </form>
  );
}

function RowCells({ routeKey, item, metadata, onEdit, onDelete, onAssignLgas }) {
  if (routeKey === 'users') {
    const assignedLgaNames = (item.assigned_lgas || []).map((l) => l.name).join(', ');
    return (
      <tr key={item.id}>
        <td>
          <strong>{item.name}</strong>
        </td>
        <td>{item.email}</td>
        <td>
          <StatusPill value={item.role} />
        </td>
        <td>
          {item.role === 'data_clerk' ? (
            assignedLgaNames ? (
              <span style={{ fontSize: 12 }}>{assignedLgaNames}</span>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--danger, #c00)' }}>No LGA assigned</span>
            )
          ) : (
            <>
              {labelForLga(metadata, item.assigned_lga_uuid) || 'Statewide'}
              <div className="mini-note">{labelForWard(metadata, item.assigned_ward_uuid) || 'All wards'}</div>
            </>
          )}
        </td>
        <td>{item.team_name || '-'}</td>
        <td className="row-actions">
          <button className="link-btn" onClick={() => onEdit(item)}>
            Edit
          </button>
          {item.role === 'data_clerk' && (
            <button className="link-btn" onClick={() => onAssignLgas(item)}>
              Assign LGAs
            </button>
          )}
          <button className="link-btn" onClick={() => onDelete(item)}>
            Delete
          </button>
        </td>
      </tr>
    );
  }

  if (routeKey === 'lgas') {
    return (
      <tr key={item.id}>
        <td>
          <strong>{item.name}</strong>
        </td>
        <td>{shortRef(item.uuid)}</td>
        <td className="row-actions">
          <button className="link-btn" onClick={() => onEdit(item)}>
            Edit
          </button>
          <button className="link-btn" onClick={() => onDelete(item)}>
            Delete
          </button>
        </td>
      </tr>
    );
  }

  if (routeKey === 'wards') {
    return (
      <tr key={item.id}>
        <td>
          <strong>{item.name}</strong>
        </td>
        <td>{item.lga?.name || '-'}</td>
        <td>{shortRef(item.uuid)}</td>
        <td className="row-actions">
          <button className="link-btn" onClick={() => onEdit(item)}>
            Edit
          </button>
          <button className="link-btn" onClick={() => onDelete(item)}>
            Delete
          </button>
        </td>
      </tr>
    );
  }

  if (routeKey === 'facilities') {
    return (
      <tr key={item.id}>
        <td>
          <strong>{item.name}</strong>
        </td>
        <td>{item.type || '-'}</td>
        <td>
          {labelForLga(metadata, item.lga_uuid) || '-'}
          <div className="mini-note">{labelForWard(metadata, item.ward_uuid) || '-'}</div>
        </td>
        <td>
          <StatusPill value={item.status} />
        </td>
        <td className="row-actions">
          <button className="link-btn" onClick={() => onEdit(item)}>
            Edit
          </button>
          <button className="link-btn" onClick={() => onDelete(item)}>
            Delete
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr key={item.id}>
      <td>
        <strong>{item.name}</strong>
      </td>
      <td>
        <StatusPill value={item.status} />
      </td>
      <td>{shortRef(item.uuid)}</td>
      <td className="row-actions">
        <button className="link-btn" onClick={() => onEdit(item)}>
          Edit
        </button>
        <button className="link-btn" onClick={() => onDelete(item)}>
          Delete
        </button>
      </td>
    </tr>
  );
}

function AdminForm({ routeKey, record, metadata, onSubmit }) {
  const [lgaUuid, setLgaUuid] = useState(record?.assigned_lga_uuid || record?.lga_uuid || '');

  return (
    <form className="filters compact" onSubmit={onSubmit} data-record-id={record?.id || ''}>
      {routeKey === 'users' && (
        <>
          <TextField name="name" label="Full Name" defaultValue={record?.name} />
          <TextField name="email" label="Email" defaultValue={record?.email} type="email" />
          <TextField
            name="password"
            label={record ? 'New Password (optional)' : 'Password'}
            type="password"
          />
          <SelectField
            name="role"
            label="Role"
            options={(metadata?.roles || []).map((r) => ({ value: r.value, label: r.label }))}
            defaultValue={record?.role}
          />
          <ControlledSelect
            name="assigned_lga_uuid"
            label="Assigned LGA"
            options={lgaOptions(metadata)}
            value={lgaUuid}
            onChange={(v) => setLgaUuid(v)}
          />
          <SelectField
            name="assigned_ward_uuid"
            label="Assigned Ward"
            options={wardOptions(metadata, lgaUuid)}
            defaultValue={record?.assigned_ward_uuid}
          />
          <TextField name="team_name" label="Team Name" defaultValue={record?.team_name} />
        </>
      )}

      {routeKey === 'lgas' && (
        <TextField name="name" label="LGA Name" defaultValue={record?.name} />
      )}

      {routeKey === 'wards' && (
        <>
          <SelectField
            name="lga_id"
            label="LGA"
            options={(metadata?.lgas || []).map((l) => ({ value: String(l.id), label: l.name }))}
            defaultValue={record?.lga_id ? String(record.lga_id) : ''}
          />
          <TextField name="name" label="Ward Name" defaultValue={record?.name} />
        </>
      )}

      {routeKey === 'facilities' && (
        <>
          <TextField name="name" label="Facility Name" defaultValue={record?.name} />
          <TextField name="type" label="Facility Type" defaultValue={record?.type} />
          <ControlledSelect
            name="lga_uuid"
            label="LGA"
            options={lgaOptions(metadata)}
            value={lgaUuid}
            onChange={(v) => setLgaUuid(v)}
          />
          <SelectField
            name="ward_uuid"
            label="Ward"
            options={wardOptions(metadata, lgaUuid)}
            defaultValue={record?.ward_uuid}
          />
          <SelectField
            name="status"
            label="Status"
            options={['active', 'inactive']}
            defaultValue={record?.status}
          />
        </>
      )}

      {(routeKey === 'disease-categories' || routeKey === 'service-categories') && (
        <>
          <TextField name="name" label="Category Name" defaultValue={record?.name} />
          <SelectField
            name="status"
            label="Status"
            options={['active', 'inactive']}
            defaultValue={record?.status}
          />
        </>
      )}

      <div className="field">
        <label>&nbsp;</label>
        <button className="btn" type="submit">
          {record ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}

export default function AdminResource({ routeKey }) {
  const { auth, metadata, apiRequest, refreshMetadata, openModal, closeModal, showToast } = useApp();
  const config = getConfig(routeKey);

  const [result, setResult] = useState(null);
  const [query, setQuery] = useState({ page: 1, per_page: 20 });
  const [loading, setLoading] = useState(true);

  function load(q) {
    setLoading(true);
    apiRequest(`${config.endpoint}?${toQueryString({ per_page: 20, ...q })}`)
      .then(setResult)
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(query);
  }, [routeKey]); // eslint-disable-line react-hooks/exhaustive-deps

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

  async function handleFormSubmit(e, record) {
    e.preventDefault();
    const data = new FormData(e.target);
    const payload = {};
    for (const [k, v] of data.entries()) {
      if (v !== '') payload[k] = v;
    }
    const isUpdate = Boolean(record?.id);
    try {
      await apiRequest(`${config.endpoint}${isUpdate ? `/${record.id}` : ''}`, {
        method: isUpdate ? 'PUT' : 'POST',
        body: payload,
      });
      showToast(`${config.singular} ${isUpdate ? 'updated' : 'created'} successfully.`, 'success');
      closeModal();
      await refreshMetadata();
      load(query);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function openEditor(record = null) {
    openModal({
      title: `${record ? 'Edit' : 'Add'} ${config.singular}`,
      subtitle: config.description,
      content: (
        <AdminForm
          routeKey={routeKey}
          record={record}
          metadata={metadata}
          onSubmit={(e) => handleFormSubmit(e, record)}
        />
      ),
    });
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete this ${config.singular.toLowerCase()}?`)) return;
    try {
      await apiRequest(`${config.endpoint}/${item.id}`, { method: 'DELETE' });
      showToast(`${config.singular} deleted.`, 'success');
      if (routeKey !== 'users') await refreshMetadata();
      load(query);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleAssignLgas(user, lgaIds) {
    try {
      const res = await apiRequest(`/admin/users/${user.id}/lgas`, {
        method: 'POST',
        body: { lga_ids: lgaIds },
      });
      showToast('LGA assignments saved.', 'success');
      closeModal();
      load(query);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function openAssignLgas(user) {
    openModal({
      title: `Assign LGAs — ${user.name}`,
      subtitle: 'Select LGAs this data clerk can operate in.',
      content: (
        <AssignLgasForm
          user={user}
          metadata={metadata}
          onSubmit={(lgaIds) => handleAssignLgas(user, lgaIds)}
        />
      ),
    });
  }

  if (!config) return <div className="empty-state">Unknown admin resource.</div>;

  return (
    <>
      <div className="topbar">
        <div className="page-heading">
          <h2>{config.title}</h2>
          <p>{config.description}</p>
        </div>
        <div className="topbar-actions">
          <span className="pill">{formatRole(auth.user?.role)}</span>
        </div>
      </div>
      <section className="panel">
        <AdminFilters
          routeKey={routeKey}
          query={query}
          metadata={metadata}
          onSubmit={handleFilter}
        />
        <div className="toolbar">
          <div className="toolbar-group">
            <button className="btn" onClick={() => openEditor()}>
              Add {config.singular}
            </button>
          </div>
          <div className="table-meta">
            Showing {result?.data?.length ?? 0} of {result?.total ?? 0} records
          </div>
        </div>
        {loading ? (
          <div className="loading">Loading…</div>
        ) : (
          <DataTable
            headers={config.columns}
            rows={result?.data || []}
            renderRow={(item) => (
              <RowCells
                key={item.id}
                routeKey={routeKey}
                item={item}
                metadata={metadata}
                onEdit={openEditor}
                onDelete={handleDelete}
                onAssignLgas={openAssignLgas}
              />
            )}
          />
        )}
        <Pagination result={result} onPage={handlePage} />
      </section>
    </>
  );
}
