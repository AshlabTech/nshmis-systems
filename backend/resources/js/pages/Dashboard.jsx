import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import StatCard from '../components/ui/StatCard';
import BarChart from '../components/ui/BarChart';
import TrendChart from '../components/ui/TrendChart';

export default function Dashboard() {
  const { apiRequest, showToast } = useApp();
  const [stats, setStats] = useState(null);
  const [trendMode, setTrendMode] = useState('daily');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/dashboard/stats')
      .then(setStats)
      .catch((err) => showToast(err.message || 'Failed to load dashboard.', 'error'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="loading">Loading dashboard…</div>;
  if (!stats) return null;

  const trendData = stats.charts?.[`${trendMode}_trend`] || [];

  return (
    <>
      <section className="grid-cards">
        <StatCard label="Total Patients"        value={stats.cards?.total_patients}          iconKey="patients"    colorIndex={0} />
        <StatCard label="Total Encounters"      value={stats.cards?.total_encounters}        iconKey="encounters"  colorIndex={1} />
        <StatCard label="Total Referrals"       value={stats.cards?.total_referrals}         iconKey="referrals"   colorIndex={2} />
        <StatCard label="Pending Sync Records"  value={stats.cards?.pending_sync_records}    iconKey="pending"     colorIndex={3} />
        <StatCard label="Failed Sync Records"   value={stats.cards?.failed_sync_records}     iconKey="failed"      colorIndex={4} />
        <StatCard label="Referral Completion"   value={`${stats.cards?.referral_completion_rate}%`} iconKey="completion" colorIndex={5} />
      </section>

      <section className="layout-two">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>Encounter Trends</h3>
              <p>Daily, weekly, and monthly view of activity volume</p>
            </div>
            <div className="segmented">
              {['daily', 'weekly', 'monthly'].map((mode) => (
                <button
                  key={mode}
                  className={trendMode === mode ? 'active' : ''}
                  onClick={() => setTrendMode(mode)}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <TrendChart items={trendData} />
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>Referral Status</h3>
              <p>Distribution of workflow outcomes</p>
            </div>
          </div>
          <BarChart items={stats.charts?.referral_status_breakdown || []} labelKey="label" />
        </div>
      </section>

      <section className="layout-three">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>Encounters by LGA</h3>
              <p>Outreach activity concentration</p>
            </div>
          </div>
          <BarChart items={stats.charts?.encounters_by_lga || []} labelKey="label" />
        </div>
        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>Encounters by Ward</h3>
              <p>Ward-level spread</p>
            </div>
          </div>
          <BarChart items={stats.charts?.encounters_by_ward || []} labelKey="label" />
        </div>
        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>Disease Breakdown</h3>
              <p>Programs currently handled</p>
            </div>
          </div>
          <BarChart items={stats.charts?.disease_program_breakdown || []} labelKey="label" />
        </div>
      </section>
    </>
  );
}
