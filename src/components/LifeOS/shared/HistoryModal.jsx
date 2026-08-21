import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { lifeosSupabase } from '../../../services/lifeosSupabaseClient';

// ─── Helpers ──────────────────────────────────────────────
function ScoreBar({ val, max, color }) {
  const pct = Math.round(((val || 0) / max) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--los-surface4)', borderRadius: 4 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontFamily: 'var(--los-font-mono)', fontSize: '0.72rem', color, fontWeight: 700, width: 40, textAlign: 'right' }}>{val || 0}/{max}</span>
    </div>
  );
}

function DetailSection({ icon, title, children, color = 'var(--los-text3)' }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--los-border)' }}>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <span style={{ fontFamily: 'var(--los-font-display)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--los-border)', opacity: value ? 1 : 0.45 }}>
      <span style={{ fontSize: '0.72rem', color: 'var(--los-text3)', minWidth: 130, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.82rem', color: value ? 'var(--los-text)' : 'var(--los-text3)', lineHeight: 1.5 }}>{value || '—'}</span>
    </div>
  );
}

// ─── Entry Detail Renderers ──────────────────────────────
function DailyDetail({ entry }) {
  const isMorning = entry.type === 'morning';
  const p = entry.payload || {};
  const exLabels = ['None', 'Light', 'Moderate', 'Intense'];
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--los-font-display)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--los-text)', marginBottom: 4 }}>
          {isMorning ? '☀️ Morning Check-in' : '🌙 Evening Debrief'}
        </div>
        <div style={{ fontFamily: 'var(--los-font-mono)', fontSize: '0.68rem', color: 'var(--los-text3)' }}>{entry.date}</div>
      </div>

      {isMorning ? (
        <>
          <DetailSection icon="📊" title="Vitals" color="var(--los-blue)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><div style={{ fontSize: '0.68rem', color: 'var(--los-text3)', marginBottom: 4 }}>Sleep Quality</div><ScoreBar val={p.sleep} max={10} color="var(--los-blue)" /></div>
              <div><div style={{ fontSize: '0.68rem', color: 'var(--los-text3)', marginBottom: 4 }}>Energy Level</div><ScoreBar val={p.energy} max={10} color="var(--los-green)" /></div>
              <div><div style={{ fontSize: '0.68rem', color: 'var(--los-text3)', marginBottom: 4 }}>Mood</div><ScoreBar val={p.mood} max={10} color="var(--los-accent)" /></div>
            </div>
          </DetailSection>

          {p.mit?.length > 0 && (
            <DetailSection icon="🎯" title="Most Important Tasks" color="var(--los-accent)">
              {p.mit.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--los-border)' }}>
                  <span style={{ fontFamily: 'var(--los-font-mono)', fontSize: '0.65rem', color: 'var(--los-accent)', fontWeight: 700, flexShrink: 0, marginTop: 2 }}>MIT {i + 1}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--los-text)', lineHeight: 1.5 }}>{m}</span>
                </div>
              ))}
            </DetailSection>
          )}

          {p.intention && (
            <DetailSection icon="✨" title="Intention / Focus Word" color="var(--los-accent)">
              <div style={{ fontSize: '1.4rem', fontFamily: 'var(--los-font-display)', fontWeight: 700, color: 'var(--los-accent)', padding: '10px 0' }}>{p.intention}</div>
            </DetailSection>
          )}
        </>
      ) : (
        <>
          <DetailSection icon="⚡" title="Performance" color="var(--los-accent2)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--los-text3)', marginBottom: 4 }}>Deep Focus Hours</div>
                <div style={{ fontFamily: 'var(--los-font-mono)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--los-accent2)' }}>
                  {p.focus_hours || 0}<span style={{ fontSize: '0.8rem', color: 'var(--los-text3)' }}> hrs</span>
                </div>
              </div>
              <div><div style={{ fontSize: '0.68rem', color: 'var(--los-text3)', marginBottom: 4 }}>Stress Level</div><ScoreBar val={p.stress} max={10} color="var(--los-accent4)" /></div>
              {p.exercise !== undefined && (
                <div style={{ fontSize: '0.72rem', color: 'var(--los-text3)' }}>Exercise: <span style={{ color: 'var(--los-text)' }}>{exLabels[p.exercise] || p.exercise}</span></div>
              )}
            </div>
          </DetailSection>

          <DetailSection icon="🏆" title="Wins & Friction" color="var(--los-green)">
            <DetailRow label="Big Win" value={p.big_win} />
            <DetailRow label="Friction / Blocked by" value={p.friction} />
          </DetailSection>

          {p.journal?.trim() && (
            <DetailSection icon="📓" title="Journal Entry" color="var(--los-accent2)">
              <div style={{ fontSize: '0.88rem', lineHeight: 1.8, color: 'var(--los-text2)', background: 'var(--los-surface2)', border: '1px solid var(--los-border)', borderRadius: 8, padding: '16px 18px', borderLeft: '3px solid var(--los-accent2)', whiteSpace: 'pre-wrap' }}>
                {p.journal}
              </div>
            </DetailSection>
          )}
        </>
      )}
    </div>
  );
}

function WeeklyDetail({ entry }) {
  const p = entry.payload || {};
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--los-font-display)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--los-text)', marginBottom: 4 }}>📆 Weekly Review</div>
        <div style={{ fontFamily: 'var(--los-font-mono)', fontSize: '0.68rem', color: 'var(--los-text3)' }}>{entry.date}</div>
      </div>

      {p.priority && (
        <DetailSection icon="🧭" title="North Star / Priority" color="var(--los-accent2)">
          <div style={{ fontSize: '1rem', fontFamily: 'var(--los-font-display)', fontWeight: 700, color: 'var(--los-accent2)', background: 'rgba(0,229,255,0.08)', borderRadius: 8, padding: '12px 16px', borderLeft: '3px solid var(--los-accent2)' }}>{p.priority}</div>
        </DetailSection>
      )}

      <DetailSection icon="✅" title="Wins & Achievements" color="var(--los-green)">
        <div style={{ fontSize: '0.88rem', lineHeight: 1.8, color: 'var(--los-text)', whiteSpace: 'pre-wrap' }}>{p.win || <span style={{ color: 'var(--los-text3)' }}>Nothing logged</span>}</div>
      </DetailSection>
      <DetailSection icon="⛰️" title="Friction / What Blocked" color="var(--los-accent3)">
        <div style={{ fontSize: '0.88rem', lineHeight: 1.8, color: 'var(--los-text)', whiteSpace: 'pre-wrap' }}>{p.friction || <span style={{ color: 'var(--los-text3)' }}>Nothing logged</span>}</div>
      </DetailSection>
      <DetailSection icon="🔧" title="Change Plan for Next Week" color="var(--los-accent)">
        <div style={{ fontSize: '0.88rem', lineHeight: 1.8, color: 'var(--los-text)', whiteSpace: 'pre-wrap' }}>{p.change || <span style={{ color: 'var(--los-text3)' }}>Nothing logged</span>}</div>
      </DetailSection>
    </div>
  );
}

function MonthlyDetail({ entry }) {
  const p = entry.payload || {};
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--los-font-display)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--los-text)', marginBottom: 6 }}>📊 Monthly Strategy Review</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--los-font-mono)', fontSize: '0.68rem', color: 'var(--los-text3)' }}>{entry.date}</span>
          {p.theme && <span style={{ background: 'var(--los-accent3-dim)', border: '1px solid var(--los-accent3)', color: 'var(--los-accent3)', borderRadius: 20, padding: '2px 10px', fontSize: '0.68rem', fontFamily: 'var(--los-font-display)', fontWeight: 700 }}>🎯 {p.theme}</span>}
        </div>
      </div>
      <DetailSection icon="⚙️" title="Life Score" color="var(--los-accent)">
        {p.domains && Object.entries(p.domains).map(([k, v]) => (
          <div key={k} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--los-text3)', marginBottom: 4, textTransform: 'capitalize' }}>{k}</div>
            <ScoreBar val={v} max={10} color="var(--los-accent)" />
          </div>
        ))}
      </DetailSection>
      <DetailSection icon="💡" title="Core Intention" color="var(--los-accent2)">
        <div style={{ fontSize: '0.88rem', lineHeight: 1.8, color: 'var(--los-text)', whiteSpace: 'pre-wrap' }}>{p.intent || '—'}</div>
      </DetailSection>
    </div>
  );
}

function DecisionDetail({ entry }) {
  const p = entry.payload || {};
  const confNum = parseInt(p.confidence) || 0;
  const confCol = confNum >= 70 ? 'var(--los-green)' : confNum >= 40 ? 'var(--los-yellow)' : 'var(--los-accent4)';
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--los-font-display)', fontSize: '1.3rem', fontWeight: 800, color: 'var(--los-text)', marginBottom: 6 }}>⚖️ {p.question || 'Decision'}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--los-font-mono)', fontSize: '0.68rem', color: 'var(--los-text3)' }}>{entry.date}</span>
          <span style={{ background: 'var(--los-surface3)', border: `1px solid ${confCol}`, color: confCol, borderRadius: 20, padding: '2px 10px', fontSize: '0.68rem', fontFamily: 'var(--los-font-mono)', fontWeight: 700 }}>Confidence {p.confidence || '—'}</span>
        </div>
      </div>
      <DetailSection icon="🧠" title="Rationale" color="var(--los-accent2)">
        <div style={{ fontSize: '0.88rem', lineHeight: 1.8, color: 'var(--los-text)', background: 'var(--los-surface2)', borderRadius: 8, padding: '14px 16px', whiteSpace: 'pre-wrap' }}>{p.rationale || '—'}</div>
      </DetailSection>
      <DetailSection icon="🔮" title="Stakes" color="var(--los-accent3)">
        <ScoreBar val={parseInt(p.stakes)} max={10} color="var(--los-accent3)" />
      </DetailSection>
    </div>
  );
}

function WoopDetail({ entry }) {
  const p = entry.payload || {};
  const items = [
    { icon: '🌟', label: 'Wish', key: 'wish', color: 'var(--los-accent)' },
    { icon: '🏆', label: 'Outcome (Best Result)', key: 'outcome', color: 'var(--los-green)' },
    { icon: '⛰️', label: 'Obstacle (Inner Barrier)', key: 'obstacle', color: 'var(--los-accent3)' },
    { icon: '📋', label: 'Plan (If → Then)', key: 'plan', color: 'var(--los-accent2)' },
  ];
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--los-font-display)', fontSize: '1.3rem', fontWeight: 800, color: 'var(--los-text)', marginBottom: 4 }}>🌟 {p.wish || 'WOOP Entry'}</div>
        <div style={{ fontFamily: 'var(--los-font-mono)', fontSize: '0.68rem', color: 'var(--los-text3)' }}>{entry.date}</div>
      </div>
      {items.map(({ icon, label, key, color }) => (
        <DetailSection key={key} icon={icon} title={label} color={color}>
          <div style={{ fontSize: '0.9rem', lineHeight: 1.8, color: 'var(--los-text)', background: 'var(--los-surface2)', borderRadius: 8, padding: '14px 16px', borderLeft: `3px solid ${color}` }}>
            {p[key] || <span style={{ color: 'var(--los-text3)' }}>Not filled</span>}
          </div>
        </DetailSection>
      ))}
    </div>
  );
}

// ─── Entry list helpers ──────────────────────────────────
function getEntryIcon(entry, type) {
  if (type === 'daily') return entry.type === 'morning' ? '☀️' : '🌙';
  if (type === 'weekly') return '📆';
  if (type === 'monthly') return '📊';
  if (type === 'decision') return '⚖️';
  if (type === 'woop') return '🌟';
  return '📝';
}

function getEntryLabel(entry, type) {
  if (type === 'daily') return entry.date;
  if (type === 'weekly') return entry.date;
  if (type === 'monthly') return entry.date;
  if (type === 'decision') return (entry.payload?.question || '').slice(0, 42) || '—';
  if (type === 'woop') return (entry.payload?.wish || '').slice(0, 42) || '—';
  return '—';
}

function getEntrySub(entry, type) {
  const p = entry.payload || {};
  if (type === 'daily') return entry.type === 'morning'
    ? `Sleep ${p.sleep || '?'} · Energy ${p.energy || '?'} · Mood ${p.mood || '?'}`
    : `Focus ${p.focus_hours || 0}h · Stress ${p.stress || '?'} · ${p.big_win ? p.big_win.slice(0, 30) : 'no win logged'}`;
  if (type === 'weekly') return (p.priority || p.win || '').slice(0, 50);
  if (type === 'monthly') return p.theme ? '🎯 ' + p.theme : '';
  if (type === 'decision') return entry.date || '';
  if (type === 'woop') return entry.date || '';
  return '';
}

// ─── TABLE CONFIG ───────────────────────────────────────
const TABLE_MAP = {
  daily:    'life_logs',
  weekly:   'life_logs',
  monthly:  'life_logs',
  decision: 'life_logs',
  woop:     'life_logs',
};

const TYPE_MAP = {
  daily:    ['morning', 'evening'],
  weekly:   ['weekly'],
  monthly:  ['monthly'],
  decision: ['decision'],
  woop:     ['woop'],
};

const TITLES = {
  daily: 'Daily Logs',
  weekly: 'Weekly Reviews',
  monthly: 'Monthly Reviews',
  decision: 'Decision Log',
  woop: 'WOOP Entries',
};

// ─── Main HistoryModal Component ─────────────────────────
export default function HistoryModal({ type, onClose }) {
  const [entries, setEntries]     = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [selected, setSelected]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [monthFilter, setMonth]   = useState('');
  const [yearFilter, setYear]     = useState('');
  const [deleting, setDeleting]   = useState(false);

  useEffect(() => { loadEntries(); }, [type]);

  useEffect(() => {
    applyFilters(entries, search, monthFilter, yearFilter);
  }, [search, monthFilter, yearFilter, entries]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const loadEntries = async () => {
    setLoading(true);
    setSelected(null);
    try {
      const types = TYPE_MAP[type] || [type];
      let query = lifeosSupabase
        .from('life_logs')
        .select('*')
        .in('type', types)
        .order('date', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setEntries(data || []);
    } catch (err) {
      console.error('HistoryModal load error:', err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (data, q, m, y) => {
    let result = data;
    if (m !== '' || y !== '') {
      result = result.filter(e => {
        const d = new Date(e.date);
        if (isNaN(d)) return true;
        if (m !== '' && d.getMonth().toString() !== m) return false;
        if (y !== '' && d.getFullYear().toString() !== y) return false;
        return true;
      });
    }
    if (q.trim()) {
      const lq = q.toLowerCase();
      result = result.filter(e => JSON.stringify(e).toLowerCase().includes(lq));
    }
    setFiltered(result);
  };

  const deleteEntry = async () => {
    if (!selected || !selected.id) return;
    if (!window.confirm('Permanently delete this entry?')) return;
    setDeleting(true);
    try {
      const { error } = await lifeosSupabase.from('life_logs').delete().eq('id', selected.id);
      if (error) throw error;
      const newEntries = entries.filter(e => e.id !== selected.id);
      setEntries(newEntries);
      setSelected(null);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete entry');
    } finally {
      setDeleting(false);
    }
  };

  const renderDetail = (entry) => {
    if (type === 'daily') return <DailyDetail entry={entry} />;
    if (type === 'weekly') return <WeeklyDetail entry={entry} />;
    if (type === 'monthly') return <MonthlyDetail entry={entry} />;
    if (type === 'decision') return <DecisionDetail entry={entry} />;
    if (type === 'woop') return <WoopDetail entry={entry} />;
    return <pre style={{ fontSize: '0.75rem', color: 'var(--los-text2)' }}>{JSON.stringify(entry, null, 2)}</pre>;
  };

  const years = [];
  for (let y = new Date().getFullYear(); y >= 2024; y--) years.push(y);

  return createPortal(
    <div
      className="lifeos-root"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(6px)' }}
    >
      <div style={{ background: 'var(--los-surface)', border: '1px solid var(--los-border2)', borderRadius: 16, width: '82vw', maxWidth: 1200, height: '86vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.7)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px', borderBottom: '1px solid var(--los-border2)', flexShrink: 0, background: 'var(--los-surface2)', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--los-font-display)', fontSize: '1rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--los-text)' }}>{TITLES[type] || 'History'}</h3>
            <input
              type="text"
              placeholder="Search entries…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ background: 'var(--los-surface3)', border: '1px solid var(--los-border2)', borderRadius: 20, padding: '5px 14px', fontSize: '0.75rem', color: 'var(--los-text)', width: 200, outline: 'none' }}
            />
            <select value={monthFilter} onChange={e => setMonth(e.target.value)} style={{ background: 'var(--los-surface3)', border: '1px solid var(--los-border2)', borderRadius: 8, padding: '4px 8px', fontSize: '0.75rem', color: 'var(--los-text)', outline: 'none', cursor: 'pointer' }}>
              <option value="">All Months</option>
              {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                <option key={i} value={i.toString()}>{m}</option>
              ))}
            </select>
            <select value={yearFilter} onChange={e => setYear(e.target.value)} style={{ background: 'var(--los-surface3)', border: '1px solid var(--los-border2)', borderRadius: 8, padding: '4px 8px', fontSize: '0.75rem', color: 'var(--los-text)', outline: 'none', cursor: 'pointer' }}>
              <option value="">All Years</option>
              {years.map(y => <option key={y} value={y.toString()}>{y}</option>)}
            </select>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--los-text3)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1, padding: '2px 6px' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* List */}
          <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid var(--los-border)', overflowY: 'auto', padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {loading ? (
              <div style={{ padding: 20, color: 'var(--los-text3)', fontSize: '0.8rem', textAlign: 'center' }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 20, color: 'var(--los-text3)', fontSize: '0.78rem', textAlign: 'center' }}>{entries.length === 0 ? 'No entries yet.' : 'No matches.'}</div>
            ) : filtered.map((entry) => {
              const isActive = selected?.id === entry.id;
              return (
                <div
                  key={entry.id}
                  onClick={() => setSelected(entry)}
                  style={{
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                    border: `1px solid ${isActive ? 'rgba(255,184,48,0.3)' : 'transparent'}`,
                    background: isActive ? 'var(--los-accent-dim)' : 'transparent',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--los-surface2)'; e.currentTarget.style.borderColor = 'var(--los-border2)'; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; } }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>{getEntryIcon(entry, type)}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--los-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getEntryLabel(entry, type)}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--los-text3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getEntrySub(entry, type)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
            {selected ? (
              <>
                {renderDetail(selected)}
                <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid var(--los-border)', textAlign: 'right' }}>
                  <button
                    onClick={deleteEntry}
                    disabled={deleting}
                    style={{ background: 'var(--los-accent4-dim)', color: 'var(--los-red)', border: '1px solid var(--los-red)', borderRadius: 8, fontSize: '0.8rem', padding: '6px 14px', cursor: 'pointer', opacity: deleting ? 0.5 : 1 }}
                  >
                    🗑 {deleting ? 'Deleting…' : 'Delete Entry'}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--los-text3)', gap: 12 }}>
                <span style={{ fontSize: '2.5rem', opacity: 0.3 }}>📖</span>
                <span style={{ fontSize: '0.82rem' }}>Select an entry from the list to view it</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
