import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Shell from '../components/layout/Shell';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Patients from '../pages/Patients';
import Encounters from '../pages/Encounters';
import Referrals from '../pages/Referrals';
import SyncLogs from '../pages/SyncLogs';
import AdminResource from '../pages/admin/AdminResource';
import Settings from '../pages/admin/Settings';

function ProtectedRoute({ children }) {
  const { auth } = useApp();
  if (!auth.token || !auth.user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function AppRouter() {
  const { auth, bootstrapping } = useApp();

  if (bootstrapping) {
    return <div className="loading" style={{ paddingTop: 80 }}>Loading…</div>;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={auth.token && auth.user ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Shell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="patients" element={<Patients />} />
        <Route path="encounters" element={<Encounters />} />
        <Route path="referrals" element={<Referrals />} />
        <Route path="sync-logs" element={<SyncLogs />} />
        <Route path="users" element={<AdminResource routeKey="users" />} />
        <Route path="lgas" element={<AdminResource routeKey="lgas" />} />
        <Route path="wards" element={<AdminResource routeKey="wards" />} />
        <Route path="facilities" element={<AdminResource routeKey="facilities" />} />
        <Route path="disease-categories" element={<AdminResource routeKey="disease-categories" />} />
        <Route path="service-categories" element={<AdminResource routeKey="service-categories" />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
