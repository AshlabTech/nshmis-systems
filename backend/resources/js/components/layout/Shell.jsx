import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatRole } from '../../utils/format';
import Modal from '../ui/Modal';
import Toast from '../ui/Toast';

/* ── SVG Icons ─────────────────────────────────────────── */
const Icon = ({ d, size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const ICONS = {
  dashboard:            ['M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z', 'M9 22V12h6v10'],
  patients:             ['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 11a4 4 0 100-8 4 4 0 000 8'],
  encounters:           ['M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8'],
  referrals:            ['M7 17L17 7', 'M7 7h10v10'],
  'sync-logs':          'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
  users:                ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', 'M9 11a4 4 0 100-8 4 4 0 000 8', 'M23 21v-2a4 4 0 00-3-3.87', 'M16 3.13a4 4 0 010 7.75'],
  lgas:                 ['M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4', 'M8 2v16', 'M16 6v16'],
  wards:                ['M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z', 'M12 10a1 1 0 100-2 1 1 0 000 2'],
  facilities:           ['M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z', 'M9 22V12h6v10'],
  'disease-categories': ['M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z'],
  'service-categories': ['M12 20h9', 'M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5'],
  settings:             ['M12 15a3 3 0 100-6 3 3 0 000 6z', 'M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z'],
  logout:               ['M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
};

/* ── Nav config ─────────────────────────────────────────── */
const NAV_CONFIG = [
  { key: 'dashboard',           label: 'Dashboard',          roles: ['data_clerk', 'supervisor', 'state_admin'] },
  { key: 'patients',            label: 'Patients',           roles: ['data_clerk', 'supervisor', 'state_admin'] },
  { key: 'encounters',          label: 'Encounters',         roles: ['data_clerk', 'supervisor', 'state_admin'] },
  { key: 'referrals',           label: 'Referrals',          roles: ['data_clerk', 'supervisor', 'state_admin'] },
  { key: 'sync-logs',           label: 'Sync Logs',          roles: ['data_clerk', 'supervisor', 'state_admin'] },
  { key: 'users',               label: 'Users',              roles: ['state_admin'], section: 'Administration' },
  { key: 'lgas',                label: 'LGAs',               roles: ['state_admin'], section: 'Administration' },
  { key: 'wards',               label: 'Wards',              roles: ['state_admin'], section: 'Administration' },
  { key: 'facilities',          label: 'Facilities',         roles: ['state_admin'], section: 'Administration' },
  { key: 'disease-categories',  label: 'Disease Categories', roles: ['state_admin'], section: 'Administration' },
  { key: 'service-categories',  label: 'Service Categories', roles: ['state_admin'], section: 'Administration' },
  { key: 'settings',            label: 'App Settings',       roles: ['state_admin'], section: 'Administration' },
];

export { NAV_CONFIG };

/* ── Page titles for topbar ─────────────────────────────── */
const PAGE_TITLES = {
  dashboard:           'Dashboard',
  patients:            'Patients',
  encounters:          'Encounters',
  referrals:           'Referrals',
  'sync-logs':         'Sync Logs',
  users:               'Users',
  lgas:                'LGAs',
  wards:               'Wards',
  facilities:          'Facilities',
  'disease-categories':'Disease Categories',
  'service-categories':'Service Categories',
  'settings':           'App Settings',
};

function initials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'U';
}

export default function Shell() {
  const { auth, logout, toast, modal, closeModal, branding } = useApp();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const currentRoute = location.pathname.replace(/^\//, '') || 'dashboard';
  const userRole = auth.user?.role || '';
  const visibleNav = NAV_CONFIG.filter((item) => item.roles.includes(userRole));

  const navEntries = [];
  let lastSection = '';
  for (const item of visibleNav) {
    if (item.section && item.section !== lastSection) {
      navEntries.push({ type: 'section', label: item.section, key: `section-${item.section}` });
      lastSection = item.section;
    }
    navEntries.push({ type: 'item', ...item });
  }

  return (
    <div className="shell">
      {/* ── Sidebar ── */}
      <aside className={`sidebar ${mobileNavOpen ? 'open' : ''}`}>

        {/* Brand */}
        <div className="sidebar-header">
          <div className="brand">
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt="App logo"
                style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain', flexShrink: 0 }}
              />
            ) : (
              <div className="brand-mark">NH</div>
            )}
            <div className="brand-copy">
              <h1>{branding?.appName || 'Niger HMIS'}</h1>
              <p>Outreach Admin</p>
            </div>
          </div>
        </div>

        {/* User */}
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials(auth.user?.name)}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{auth.user?.name || 'User'}</span>
            <span className="sidebar-user-role">{formatRole(userRole)}</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {navEntries.map((entry) =>
            entry.type === 'section' ? (
              <div key={entry.key} className="section-label">
                {entry.label}
              </div>
            ) : (
              <button
                key={entry.key}
                className={`nav-link ${currentRoute === entry.key ? 'active' : ''}`}
                onClick={() => {
                  setMobileNavOpen(false);
                  navigate(`/${entry.key}`);
                }}
              >
                <Icon d={ICONS[entry.key] || ICONS.dashboard} size={16} />
                {entry.label}
              </button>
            ),
          )}
        </nav>

        {/* Logout */}
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={logout}>
            <Icon d={ICONS.logout} size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main">
        {/* Desktop topbar */}
        <div className="page-topbar">
          <div className="page-heading">
            <h2>{PAGE_TITLES[currentRoute] || 'Niger HMIS'}</h2>
          </div>
          <div className="topbar-right">
            <span className="role-badge">{formatRole(userRole)}</span>
          </div>
        </div>

        {/* Mobile topbar */}
        <div className="mobile-topbar">
          <button className="btn-ghost btn-icon" onClick={() => setMobileNavOpen((v) => !v)}>
            <Icon d={['M3 12h18', 'M3 6h18', 'M3 18h18']} size={20} />
          </button>
          <div className="brand" style={{ gap: 8 }}>
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt="App logo" style={{ width: 30, height: 30, borderRadius: 6, objectFit: 'contain' }} />
            ) : (
              <div className="brand-mark" style={{ width: 30, height: 30, fontSize: 12 }}>NH</div>
            )}
            <span style={{ fontWeight: 700, fontSize: 14 }}>{branding?.appName || 'Niger HMIS'}</span>
          </div>
          <button className="btn-ghost btn-icon" onClick={logout}>
            <Icon d={ICONS.logout} size={20} />
          </button>
        </div>

        {/* Page content */}
        <div className="page-content">
          <Outlet />
        </div>
      </div>

      {modal && <Modal config={modal} onClose={closeModal} />}
      {toast && <Toast toast={toast} />}
    </div>
  );
}
