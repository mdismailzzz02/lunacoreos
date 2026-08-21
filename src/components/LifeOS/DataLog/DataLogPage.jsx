import React, { useState, useEffect } from 'react';
import { lifeosSupabase } from '../../../services/lifeosSupabaseClient';

const LOG_TYPES = ['morning', 'evening', 'weekly', 'monthly', 'okr', 'woop', 'decision', 'premortem'];

export default function DataLogPage() {
  const [logs, setLogs]         = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => { loadLogs(); }, []);

  useEffect(() => {
    setFiltered(typeFilter === 'all' ? logs : logs.filter(l => l.type === typeFilter));
  }, [typeFilter, logs]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await lifeosSupabase
        .from('life_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifeos_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (!filtered.length) return;
    const headers = ['id', 'type', 'date', 'created_at', 'payload'];
    const rows = filtered.map(r => [
      r.id, r.type, r.date, r.created_at,
      JSON.stringify(r.payload || {}),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifeos_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const TYPE_COLOR = {
    morning: 'var(--los-accent)', evening: 'var(--los-accent2)', weekly: 'var(--los-green)',
    monthly: 'var(--los-blue)', okr: 'var(--los-accent3)', woop: 'var(--los-yellow)',
    decision: 'var(--los-accent4)', premortem: 'var(--los-red)',
  };

  return (
    <div>
      <div className="los-page-head">
        <h1>Data Log</h1>
        <p>All your logged data in one place. Filter, inspect, and export. Your data, fully owned.</p>
      </div>

      {/* Stats */}
      <div className="los-grid-4" style={{ marginBottom: 16 }}>
        <div className="los-metric-card" style={{ '--mc-color': 'var(--los-accent)' }}>
          <div className="los-metric-label">Total Records</div>
          <div className="los-metric-value">{logs.length}</div>
          <div className="los-metric-sub">in Supabase</div>
        </div>
        <div className="los-metric-card" style={{ '--mc-color': 'var(--los-green)' }}>
          <div className="los-metric-label">Days Logged</div>
          <div className="los-metric-value">{new Set(logs.map(l => l.date)).size}</div>
          <div className="los-metric-sub">unique days</div>
        </div>
        <div className="los-metric-card" style={{ '--mc-color': 'var(--los-accent2)' }}>
          <div className="los-metric-label">Morning Logs</div>
          <div className="los-metric-value">{logs.filter(l => l.type === 'morning').length}</div>
          <div className="los-metric-sub">check-ins</div>
        </div>
        <div className="los-metric-card" style={{ '--mc-color': 'var(--los-accent3)' }}>
          <div className="los-metric-label">OKRs Tracked</div>
          <div className="los-metric-value">{logs.filter(l => l.type === 'okr').length}</div>
          <div className="los-metric-sub">goals</div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="los-select" style={{ width: 'auto', flex: 'none' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">All types</option>
          {LOG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{ color: 'var(--los-text3)', fontSize: '0.8rem' }}>{filtered.length} records</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="los-btn los-btn-ghost" onClick={loadLogs}>↻ Refresh</button>
          <button className="los-btn los-btn-ghost" onClick={exportJSON}>Export JSON</button>
          <button className="los-btn los-btn-ghost" onClick={exportCSV}>Export CSV</button>
        </div>
      </div>

      {/* Table */}
      <div className="los-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--los-text2)' }}>Loading data...</div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--los-red)' }}>
            {error}<br />
            <span style={{ fontSize: '0.78rem', color: 'var(--los-text3)' }}>The life_logs table may not exist yet. Log some data first.</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--los-text2)' }}>No records found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  {['Date', 'Type', 'Summary', 'Created'].map(h => (
                    <th key={h} style={{ fontFamily: 'var(--los-font-mono)', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--los-text3)', textAlign: 'left', padding: '8px 16px', borderBottom: '1px solid var(--los-border)', background: 'var(--los-surface3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--los-border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--los-surface3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '9px 16px', color: 'var(--los-text2)', whiteSpace: 'nowrap' }}>{row.date}</td>
                    <td style={{ padding: '9px 16px' }}>
                      <span style={{ background: `${TYPE_COLOR[row.type]}20`, color: TYPE_COLOR[row.type], padding: '2px 8px', borderRadius: 20, fontFamily: 'var(--los-font-mono)', fontSize: '0.6rem', fontWeight: 700 }}>
                        {row.type}
                      </span>
                    </td>
                    <td style={{ padding: '9px 16px', color: 'var(--los-text2)', maxWidth: 400 }}>
                      {row.payload
                        ? <span style={{ overflow: 'hidden', display: 'block', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{JSON.stringify(row.payload).slice(0, 80)}…</span>
                        : row.objective || '—'}
                    </td>
                    <td style={{ padding: '9px 16px', color: 'var(--los-text3)', fontSize: '0.7rem', whiteSpace: 'nowrap', fontFamily: 'var(--los-font-mono)' }}>
                      {new Date(row.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
