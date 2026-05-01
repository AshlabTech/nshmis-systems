import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function Login() {
  const { login, showToast, toast, branding } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const data = new FormData(e.target);
    setLoading(true);
    try {
      await login(data.get('email'), data.get('password'));
      showToast('Signed in successfully.', 'success');
      navigate('/dashboard');
    } catch (err) {
      showToast(err.message || 'Sign in failed.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-screen">
      {/* Left decorative panel */}
      <div className="auth-decoration">
        <div className="auth-decoration-content">
          <div className="auth-logo">
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt="App logo"
                style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'contain' }}
              />
            ) : (
              <div className="auth-logo-mark">NH</div>
            )}
            <span className="auth-logo-text">{branding?.appName || 'Niger HMIS'}</span>
          </div>

          <h2>Outreach Health<br />Management System</h2>
          <p>
            A unified platform for managing outreach patients, tracking encounters,
            and monitoring referral pathways across Niger State.
          </p>

          <div className="auth-features">
            {[
              'Real-time mobile sync and monitoring',
              'LGA and ward-level operational analytics',
              'Role-based access for all staff tiers',
              'Referral tracking and completion workflows',
            ].map((feat) => (
              <div key={feat} className="auth-feature">
                <div className="auth-feature-icon">
                  <CheckIcon />
                </div>
                {feat}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-form-panel">
        <div className="auth-form-header">
          <h3>Welcome back</h3>
          <p>Sign in to your account to continue</p>
        </div>

        <form className="auth-stack" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="admin@nigerhmis.local"
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          <button className="btn" type="submit" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? (
              <>
                <span
                  style={{
                    width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    display: 'inline-block', animation: 'spin .7s linear infinite',
                  }}
                />
                Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        
      </div>

      {toast && <div className={`toast ${toast.type || 'info'}`}>{toast.message}</div>}
    </section>
  );
}
