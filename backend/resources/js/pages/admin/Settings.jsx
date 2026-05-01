import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';

/* ── small inline SVG icons ─────────────────────────────────── */
const UploadIcon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const TrashIcon = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </svg>
);

/* ── style helpers ─────────────────────────────────────────── */
const card = {
  background: '#fff',
  borderRadius: 14,
  border: '1px solid #D8E4E4',
  padding: '28px 32px',
  marginBottom: 20,
  boxShadow: '0 1px 4px rgba(0,128,128,.06)',
};

const cardTitle = {
  margin: '0 0 6px',
  fontSize: 15,
  fontWeight: 700,
  color: '#123232',
};

const cardSub = {
  margin: '0 0 22px',
  fontSize: 13,
  color: '#6B7C7C',
  lineHeight: 1.5,
};

const primaryBtn = (disabled) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  padding: '9px 20px',
  backgroundColor: disabled ? '#93BFBF' : '#008080',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  fontWeight: 700,
  fontSize: 14,
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'background .15s',
});

const ghostBtn = (color = '#6B7C7C') => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  backgroundColor: 'transparent',
  color,
  border: `1.5px solid ${color === '#DC2626' ? '#FECACA' : '#D8E4E4'}`,
  borderRadius: 10,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
});

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  minHeight: 46,
  padding: '10px 14px',
  border: '1.5px solid #D8E4E4',
  borderRadius: 10,
  fontSize: 14,
  color: '#123232',
  outline: 'none',
  fontFamily: 'inherit',
};

const labelStyle = {
  display: 'block',
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 700,
  color: '#123232',
};

const hintStyle = {
  marginTop: 5,
  fontSize: 12,
  color: '#6B7C7C',
};

/* ── component ──────────────────────────────────────────────── */
export default function Settings() {
  const { auth, showToast, fetchBranding } = useApp();
  const fileRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Form state
  const [appName, setAppName] = useState('');
  const [savedLogoUrl, setSavedLogoUrl] = useState(null); // URL from server
  const [logoFile, setLogoFile] = useState(null);          // pending new file
  const [logoPreview, setLogoPreview] = useState(null);    // what the UI shows

  /* ── fetch current settings on mount ── */
  useEffect(() => {
    fetch('/api/v1/settings')
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('Failed to load')))
      .then((data) => {
        setAppName(data.app_name ?? '');
        setSavedLogoUrl(data.logo_url ?? null);
        setLogoPreview(data.logo_url ?? null);
      })
      .catch(() => showToast('Could not load current settings.', 'error'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── pick a new logo file ── */
  const pickFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('Logo must be under 2 MB.', 'error');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  /* ── cancel a pending (not-yet-saved) file selection ── */
  const cancelPending = () => {
    setLogoFile(null);
    setLogoPreview(savedLogoUrl); // revert preview to saved value
  };

  /* ── remove the saved logo from the server ── */
  const removeSavedLogo = async () => {
    setRemoving(true);
    try {
      const res = await fetch('/api/v1/admin/settings/images/logo', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (!res.ok) throw new Error((await res.json()).message ?? 'Remove failed');
      setSavedLogoUrl(null);
      setLogoPreview(null);
      setLogoFile(null);
      showToast('Logo removed.', 'success');
      fetchBranding();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setRemoving(false);
    }
  };

  /* ── save settings ── */
  const save = async () => {
    if (!appName.trim()) {
      showToast('App name cannot be empty.', 'error');
      return;
    }
    setSaving(true);
    try {
      const body = new FormData();
      body.append('app_name', appName.trim());
      if (logoFile) body.append('logo', logoFile);

      const res = await fetch('/api/v1/admin/settings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.token}` },
        // No Content-Type header — browser sets multipart/form-data with boundary automatically
        body,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'Save failed');

      const newLogoUrl = json.data?.logo_url ?? null;
      setSavedLogoUrl(newLogoUrl);
      setLogoPreview(newLogoUrl);
      setLogoFile(null);
      showToast('Settings saved successfully.', 'success');
      fetchBranding();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ── guard — only state_admin ── */
  const user = auth.user;
  if (user && user.role !== 'state_admin') {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#6B7C7C' }}>
        You do not have permission to manage app settings.
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: '#6B7C7C' }}>Loading settings…</div>;
  }

  const hasPendingLogo = Boolean(logoFile);
  const hasSavedLogo = Boolean(savedLogoUrl) && !hasPendingLogo;

  return (
    <div style={{ maxWidth: 640 }}>

      {/* ── Logo card ─────────────────────────────── */}
      <div style={card}>
        <h3 style={cardTitle}>App Logo</h3>
        <p style={cardSub}>
          Shown on the mobile app splash screen and login page. PNG, JPG or SVG — max 2 MB.
        </p>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
          {/* Preview box */}
          <div
            onClick={() => fileRef.current?.click()}
            title="Click to upload a logo"
            style={{
              flexShrink: 0,
              width: 100,
              height: 100,
              borderRadius: 16,
              border: '2px dashed #D8E4E4',
              backgroundColor: '#F4FAFA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'border-color .15s',
            }}
          >
            {logoPreview
              ? <img src={logoPreview} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <span style={{ fontSize: 26, fontWeight: 900, color: '#008080', letterSpacing: 1 }}>NH</span>
            }
          </div>

          {/* Actions */}
          <div style={{ flex: 1 }}>
            {hasPendingLogo && (
              <div style={{
                marginBottom: 12, padding: '8px 12px', borderRadius: 8,
                backgroundColor: '#E6F6F6', fontSize: 12, color: '#006666',
              }}>
                <strong>Pending:</strong> {logoFile.name} — will be uploaded when you save.
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button style={primaryBtn(false)} onClick={() => fileRef.current?.click()}>
                <UploadIcon />
                {logoPreview ? 'Change Logo' : 'Upload Logo'}
              </button>

              {hasPendingLogo && (
                <button style={ghostBtn()} onClick={cancelPending}>
                  Cancel
                </button>
              )}

              {hasSavedLogo && (
                <button style={ghostBtn('#DC2626')} onClick={removeSavedLogo} disabled={removing}>
                  <TrashIcon />
                  {removing ? 'Removing…' : 'Remove Logo'}
                </button>
              )}
            </div>
          </div>
        </div>

        <input
          type="file"
          accept="image/jpeg,image/png,image/svg+xml"
          ref={fileRef}
          style={{ display: 'none' }}
          onChange={pickFile}
        />
      </div>

      {/* ── App identity card ─────────────────────── */}
      <div style={card}>
        <h3 style={cardTitle}>App Identity</h3>
        <p style={cardSub}>
          The app name is displayed on the mobile splash screen, login screen, and inside the admin header.
        </p>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle} htmlFor="app_name">App Name</label>
          <input
            id="app_name"
            type="text"
            style={inputStyle}
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="Niger State HMIS Outreach"
            maxLength={120}
          />
          <p style={hintStyle}>{appName.length}/120 characters</p>
        </div>

        <button style={{ ...primaryBtn(saving), width: '100%', justifyContent: 'center', padding: '12px 20px', fontSize: 15 }} onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

    </div>
  );
}
