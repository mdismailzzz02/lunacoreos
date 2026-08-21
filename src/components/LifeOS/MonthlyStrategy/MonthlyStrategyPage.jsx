import React, { useState, useEffect } from 'react';
import { lifeosSupabase } from '../../../services/lifeosSupabaseClient';
import HistoryModal from '../shared/HistoryModal';

const DOMAINS = [
  { id: 'health', label: 'Health & Fitness', color: 'var(--los-green)' },
  { id: 'work', label: 'Deep Work / Career', color: 'var(--los-accent2)' },
  { id: 'learning', label: 'Learning / Growth', color: 'var(--los-accent)' },
  { id: 'relationships', label: 'Relationships', color: 'var(--los-accent3)' },
  { id: 'finance', label: 'Finance / Wealth', color: 'var(--los-blue)' },
  { id: 'mindset', label: 'Mindset / Wellbeing', color: 'var(--los-accent4)' },
];

export default function MonthlyStrategyPage() {
  const [theme, setTheme] = useState('');
  const [intent, setIntent] = useState('');
  const [sliders, setSliders] = useState(() => Object.fromEntries(DOMAINS.map(d => [d.id, 5])));
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const monthKey = new Date().toISOString().slice(0, 7); // "2026-08"

  useEffect(() => { loadMonth(); }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadMonth = async () => {
    try {
      const { data } = await lifeosSupabase.from('life_logs').select('*').eq('type', 'monthly').eq('date', monthKey + '-01').single();
      if (data?.payload) {
        setTheme(data.payload.theme || '');
        setIntent(data.payload.intent || '');
        if (data.payload.domains) setSliders(data.payload.domains);
      }
    } catch (_) {}
  };

  const lifeScore = () => {
    const vals = Object.values(sliders);
    return Math.round((vals.reduce((s, v) => s + v, 0) / (vals.length * 10)) * 100);
  };

  const save = async () => {
    setSaving(true);
    try {
      await lifeosSupabase.from('life_logs').upsert({
        type: 'monthly',
        date: monthKey + '-01',
        payload: { theme, intent, domains: sliders },
      }, { onConflict: 'type,date' });
      showToast('Monthly strategy saved ✓');
    } catch (err) {
      console.error(err);
      showToast('Error saving');
    } finally {
      setSaving(false);
    }
  };

  const score = lifeScore();

  return (
    <div>
      {showHistory && <HistoryModal type="monthly" onClose={() => setShowHistory(false)} />}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--los-green)', color: '#000', padding: '10px 24px', borderRadius: 20, fontWeight: 700, fontSize: '0.85rem', zIndex: 9999 }}>
          {toast}
        </div>
      )}
      <div className="los-page-head">
        <h1>Monthly Strategy</h1>
        <p>Science basis: <em>Locke & Latham (1990, 2002): specific + difficult goals outperform easy ones. Monthly = calibration cycle. Adjust inputs, not just outputs.</em></p>
      </div>

      <div className="los-grid-3" style={{ marginBottom: 16 }}>
        <div className="los-metric-card" style={{ '--mc-color': 'var(--los-accent)' }}>
          <div className="los-metric-label">Life Score</div>
          <div className="los-metric-value" style={{ color: score > 70 ? 'var(--los-green)' : score > 40 ? 'var(--los-accent)' : 'var(--los-red)' }}>{score}%</div>
          <div className="los-metric-sub">Composite of 6 domains</div>
        </div>
        <div className="los-metric-card" style={{ '--mc-color': 'var(--los-accent2)' }}>
          <div className="los-metric-label">Month Theme</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--los-text)', marginTop: 8 }}>{theme || '—'}</div>
          <div className="los-metric-sub">Set below</div>
        </div>
        <div className="los-metric-card" style={{ '--mc-color': 'var(--los-accent3)' }}>
          <div className="los-metric-label">Month</div>
          <div className="los-metric-value">{new Date().toLocaleString('default', { month: 'short' })}</div>
          <div className="los-metric-sub">{new Date().getFullYear()}</div>
        </div>
      </div>

      <div className="los-grid-2">
        <div className="los-card">
          <div className="los-card-title"><span className="los-dot"></span> 6-Domain Life Balance</div>
          {DOMAINS.map(d => (
            <div key={d.id} style={{ marginBottom: 12 }}>
              <div className="los-prog-label">
                <span>{d.label}</span>
                <span style={{ fontFamily: 'var(--los-font-mono)', color: d.color }}>{sliders[d.id]}/10</span>
              </div>
              <div className="los-prog-bar">
                <div className="los-prog-fill" style={{ width: `${(sliders[d.id] / 10) * 100}%`, background: d.color }}></div>
              </div>
              <input type="range" className="los-slider" min="1" max="10" value={sliders[d.id]}
                onChange={e => setSliders(prev => ({ ...prev, [d.id]: parseInt(e.target.value) }))}
                style={{ marginTop: 4 }}
              />
            </div>
          ))}
          <div className="los-divider"></div>
          <div className="los-form-row">
            <label className="los-form-label">Month Theme / Word</label>
            <input className="los-input" type="text" placeholder="e.g. Build, Focus, Repair" value={theme} onChange={e => setTheme(e.target.value)} />
          </div>
          <div className="los-form-row">
            <label className="los-form-label">Core Intention</label>
            <textarea className="los-textarea" placeholder="What does success look like at the end of this month?" value={intent} onChange={e => setIntent(e.target.value)} />
          </div>
          <button className="los-btn los-btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save Monthly Strategy ↗'}
          </button>
          <button className="los-btn los-btn-ghost" style={{ marginTop: 8 }} onClick={() => setShowHistory(true)}>📜 View Past Reviews</button>
        </div>

        <div className="los-card">
          <div className="los-card-title"><span className="los-dot" style={{ background: 'var(--los-accent2)' }}></span> Monthly Strategy Framework</div>
          <div className="los-timeline">
            {[
              { time: 'First 3 days', title: 'Calibrate', text: 'Review last month. Where did you actually spend your time vs. intentions? Use your Daily Log data for truth, not memory.' },
              { time: 'Week 1', title: 'Align Systems', text: 'Set OKRs for the month. Make sure your weekly habit schedule supports your domain goals. Eliminate one commitment.' },
              { time: 'Mid-month', title: 'Progress Check', text: 'Are you at 50% on each OKR? If not, the strategy must change, not the goal. Adjust tactics, not ambition.' },
              { time: 'Last 3 days', title: 'Closing Loop', text: 'Score all domains. Write a 3-sentence month debrief. Schedule next month review in calendar right now.' },
            ].map((item, i) => (
              <div key={i} className="los-tl-item">
                <div className="los-tl-time">{item.time}</div>
                <div className="los-tl-title">{item.title}</div>
                <div className="los-tl-text">{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
