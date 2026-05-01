import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { rawRequest, rawExport } from '../api/client';

const AppContext = createContext(null);

function loadJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

const DEFAULT_BRANDING = { appName: 'Niger HMIS', logoUrl: null };

function loadBranding() {
  try {
    return JSON.parse(localStorage.getItem('niger_hmis_branding') || 'null') || DEFAULT_BRANDING;
  } catch {
    return DEFAULT_BRANDING;
  }
}

export function AppProvider({ children }) {
  const [auth, setAuth] = useState(() => ({
    token: localStorage.getItem('niger_hmis_token') || '',
    user: loadJson('niger_hmis_user'),
  }));
  const [metadata, setMetadata] = useState(null);
  const [branding, setBranding] = useState(loadBranding);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(
    () => !!localStorage.getItem('niger_hmis_token'),
  );
  const toastTimer = useRef(null);

  const clearAuth = useCallback(() => {
    setAuth({ token: '', user: null });
    setMetadata(null);
    localStorage.removeItem('niger_hmis_token');
    localStorage.removeItem('niger_hmis_user');
  }, []);

  const fetchBranding = useCallback(() => {
    fetch('/api/v1/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const b = { appName: data.app_name || DEFAULT_BRANDING.appName, logoUrl: data.logo_url || null };
        setBranding(b);
        localStorage.setItem('niger_hmis_branding', JSON.stringify(b));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchBranding();
    const token = localStorage.getItem('niger_hmis_token');
    if (!token) {
      setBootstrapping(false);
      return;
    }
    Promise.all([
      rawRequest('/auth/me', {}, token),
      rawRequest('/metadata', {}, token),
    ])
      .then(([me, meta]) => {
        setAuth({ token, user: me.user });
        localStorage.setItem('niger_hmis_user', JSON.stringify(me.user));
        setMetadata(meta);
      })
      .catch(() => {
        clearAuth();
      })
      .finally(() => {
        setBootstrapping(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const apiRequest = useCallback(
    async (path, options = {}) => {
      try {
        return await rawRequest(path, options, auth.token);
      } catch (err) {
        if (err.status === 401) {
          clearAuth();
        }
        throw err;
      }
    },
    [auth.token, clearAuth],
  );

  const downloadExport = useCallback(
    async (type, query = '') => {
      const path = `/exports/${type}${query ? `?${query}` : ''}`;
      const response = await rawExport(path, auth.token);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${type}-export.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    },
    [auth.token],
  );

  const login = useCallback(async (email, password) => {
    const response = await rawRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    const { token, user } = response;
    localStorage.setItem('niger_hmis_token', token);
    localStorage.setItem('niger_hmis_user', JSON.stringify(user));
    const meta = await rawRequest('/metadata', {}, token);
    setMetadata(meta);
    setAuth({ token, user });
    fetchBranding();
  }, [fetchBranding]);

  const logout = useCallback(async () => {
    try {
      await rawRequest('/auth/logout', { method: 'POST' }, auth.token);
    } catch {}
    clearAuth();
  }, [auth.token, clearAuth]);

  const refreshMetadata = useCallback(async () => {
    const meta = await apiRequest('/metadata');
    setMetadata(meta);
    return meta;
  }, [apiRequest]);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const openModal = useCallback((config) => setModal(config), []);
  const closeModal = useCallback(() => setModal(null), []);

  return (
    <AppContext.Provider
      value={{
        auth,
        metadata,
        branding,
        fetchBranding,
        toast,
        modal,
        bootstrapping,
        apiRequest,
        downloadExport,
        login,
        logout,
        refreshMetadata,
        showToast,
        openModal,
        closeModal,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
