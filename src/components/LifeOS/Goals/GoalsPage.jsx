import React, { useState, useEffect } from 'react';
import { lifeosSupabase } from '../../../services/lifeosSupabaseClient';
import HistoryModal from '../shared/HistoryModal';

const CAT_COLORS = {
  Academic: 'var(--los-accent)', Project: 'var(--los-accent2)', Health: 'var(--los-green)',
  Finance: 'var(--los-blue)', Relationships: 'var(--los-accent3)', Skills: 'var(--los-yellow)', General: 'var(--los-text3)'
};

function OKRCard({ okr, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const progress = okr.key_results?.length
    ? Math.round(okr.key_results.reduce((s, kr) => s + (kr.progress || 0), 0) / okr.key_results.length)
    : 0;

  return (
    <div className="los-card" style={{ marginBottom: 12, borderLeft: `3px solid ${CAT_COLORS[okr.category] || 'var(--los-accent)'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--los-text)' }}>{okr.objective}</div>
          <div style={{ fontSize: '0.7rem', color: CAT_COLORS[okr.category] || 'var(--los-accent)', marginTop: 4, fontFamily: 'var(--los-font-mono)', textTransform: 'uppercase' }}>{okr.category}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--los-accent)', fontFamily: 'var(--los-font-display)' }}>{progress}%</div>
          <div style={{ fontSize: '0.6rem', color: 'var(--los-text3)' }}>{expanded ? '▲ collapse' : '▼ expand'}</div>
        </div>
      </div>
      <div className="los-prog-bar" style={{ marginTop: 10 }}>
        <div className="los-prog-fill" style={{ width: `${progress}%`, background: CAT_COLORS[okr.category] || 'var(--los-accent)' }}></div>
      </div>
      {expanded && okr.key_results?.map((kr, i) => (
        <div key={i} style={{ marginTop: 12, padding: '10px 14px', background: 'var(--los-surface3)', borderRadius: 8 }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--los-text2)', marginBottom: 6 }}>{kr.text}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="range" className="los-slider" min="0" max="100" value={kr.progress || 0}
              onChange={e => onUpdate(okr.id, i, parseInt(e.target.value))} style={{ flex: 1 }} />
            <span style={{ fontFamily: 'var(--los-font-mono)', color: 'var(--los-accent)', fontSize: '0.8rem', minWidth: 36 }}>{kr.progress || 0}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GoalsPage() {
  const [activeTab, setActiveTab] = useState('okr');
  const [okrs, setOkrs] = useState([]);
  const [form, setForm] = useState({ objective: '', kr1: '', kr2: '', kr3: '', category: 'Academic', confidence: 50 });
  const [woop, setWoop] = useState({ wish: '', outcome: '', obstacle: '', plan: '' });
  const [savedWoops, setSavedWoops] = useState([]);
  const [toast, setToast] = useState('');
  const [showWoopHistory, setShowWoopHistory] = useState(false);

  useEffect(() => { loadOKRs(); loadWoops(); }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadOKRs = async () => {
    try {
      const { data } = await lifeosSupabase.from('life_logs').select('*').eq('type', 'okr').order('created_at', { ascending: false });
      setOkrs(data || []);
    } catch (err) { console.error(err); }
  };

  const loadWoops = async () => {
    try {
      const { data } = await lifeosSupabase.from('life_logs').select('*').eq('type', 'woop').order('created_at', { ascending: false }).limit(10);
      setSavedWoops(data || []);
    } catch (err) { console.error(err); }
  };

  const addOKR = async () => {
    const krs = [form.kr1, form.kr2, form.kr3].filter(Boolean).map(text => ({ text, progress: 0 }));
    if (!form.objective || krs.length === 0) return showToast('Enter an objective and at least one key result');
    try {
      const { data, error } = await lifeosSupabase.from('life_logs').insert({
        type: 'okr',
        date: new Date().toISOString().split('T')[0],
        payload: null,
        objective: form.objective,
        category: form.category,
        confidence: form.confidence,
        key_results: krs,
      }).select();
      if (error) throw error;
      setOkrs(prev => [data[0], ...prev]);
      setForm({ objective: '', kr1: '', kr2: '', kr3: '', category: 'Academic', confidence: 50 });
      setActiveTab('okr');
      showToast('OKR added ✓');
    } catch (err) { console.error(err); showToast('Error saving OKR'); }
  };

  const updateKRProgress = async (okrId, krIndex, newVal) => {
    const okr = okrs.find(o => o.id === okrId);
    if (!okr) return;
    const newKRs = [...(okr.key_results || [])];
    newKRs[krIndex] = { ...newKRs[krIndex], progress: newVal };
    try {
      await lifeosSupabase.from('life_logs').update({ key_results: newKRs }).eq('id', okrId);
      setOkrs(prev => prev.map(o => o.id === okrId ? { ...o, key_results: newKRs } : o));
    } catch (err) { console.error(err); }
  };

  const saveWoop = async () => {
    if (!woop.wish) return showToast('Enter a wish / goal');
    try {
      const { data, error } = await lifeosSupabase.from('life_logs').insert({
        type: 'woop',
        date: new Date().toISOString().split('T')[0],
        payload: woop,
      }).select();
      if (error) throw error;
      setSavedWoops(prev => [data[0], ...prev]);
      setWoop({ wish: '', outcome: '', obstacle: '', plan: '' });
      showToast('WOOP saved ✓');
    } catch (err) { console.error(err); showToast('Error saving'); }
  };

  return (
    <div>
      {showWoopHistory && <HistoryModal type="woop" onClose={() => setShowWoopHistory(false)} />}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--los-green)', color: '#000', padding: '10px 24px', borderRadius: 20, fontWeight: 700, fontSize: '0.85rem', zIndex: 9999 }}>
          {toast}
        </div>
      )}
      <div className="los-page-head">
        <h1>Goals & OKRs</h1>
        <p>Science basis: <em>Locke & Latham 35-year research: specific + difficult goals = effect size 0.42–0.80. OKRs: 60–70% hit rate is ideal. WOOP (Oettingen) for personal goals.</em></p>
      </div>

      <div className="los-inner-tabs">
        <button className={`los-inner-tab ${activeTab === 'okr' ? 'active' : ''}`} onClick={() => setActiveTab('okr')}>OKR Goals</button>
        <button className={`los-inner-tab ${activeTab === 'woop' ? 'active' : ''}`} onClick={() => setActiveTab('woop')}>WOOP Analysis</button>
        <button className={`los-inner-tab ${activeTab === 'add' ? 'active' : ''}`} onClick={() => setActiveTab('add')}>+ Add Goal</button>
      </div>

      {activeTab === 'okr' && (
        <div>
          <div className="los-sec-head">
            <h2>Active OKRs</h2>
            <span className="los-badge los-badge-accent">Q{Math.ceil((new Date().getMonth() + 1) / 3)} {new Date().getFullYear()}</span>
          </div>
          {okrs.length === 0
            ? <div className="los-placeholder"><h2>No OKRs yet</h2><p>Click "+ Add Goal" to create your first OKR.</p></div>
            : okrs.map(okr => <OKRCard key={okr.id} okr={okr} onUpdate={updateKRProgress} />)
          }
        </div>
      )}

      {activeTab === 'woop' && (
        <div className="los-grid-2">
          <div className="los-card">
            <div className="los-card-title"><span className="los-dot"></span> WOOP Worksheet</div>
            <div className="los-notif los-notif-info">WOOP = Wish → Outcome → Obstacle → Plan. Developed by Gabriele Oettingen. Outperforms pure positive visualization by pairing hope with realistic obstacle planning.</div>
            {[
              { key: 'wish', label: '🌟 Wish (Goal)', placeholder: 'Specific, challenging but achievable' },
              { key: 'outcome', label: '🏆 Outcome (Best result if achieved)', placeholder: 'Visualize vividly. What does success feel like?', textarea: true },
              { key: 'obstacle', label: '⛰️ Obstacle (Inner: your biggest barrier)', placeholder: 'What inside you will stop this?', textarea: true },
              { key: 'plan', label: '📋 Plan (If-Then Implementation Intention)', placeholder: 'IF [obstacle], THEN I will [action]' },
            ].map(field => (
              <div className="los-form-row" key={field.key}>
                <label className="los-form-label">{field.label}</label>
                {field.textarea
                  ? <textarea className="los-textarea" placeholder={field.placeholder} value={woop[field.key]} onChange={e => setWoop(p => ({ ...p, [field.key]: e.target.value }))} />
                  : <input className="los-input" type="text" placeholder={field.placeholder} value={woop[field.key]} onChange={e => setWoop(p => ({ ...p, [field.key]: e.target.value }))} />
                }
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="los-btn los-btn-primary" onClick={saveWoop}>Save WOOP ↗</button>
              <button className="los-btn los-btn-ghost" onClick={() => setShowWoopHistory(true)}>📜 View Past WOOPs</button>
            </div>
          </div>
          <div className="los-card">
            <div className="los-card-title"><span className="los-dot" style={{ background: 'var(--los-accent2)' }}></span> Saved WOOPs</div>
            {savedWoops.length === 0
              ? <em style={{ color: 'var(--los-text2)', fontSize: '0.8rem' }}>No WOOPs saved yet.</em>
              : savedWoops.map(w => (
                <div key={w.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--los-border)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--los-text)', marginBottom: 4 }}>{w.payload?.wish}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--los-text2)' }}>{w.date}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {activeTab === 'add' && (
        <div className="los-card" style={{ maxWidth: 600 }}>
          <div className="los-card-title"><span className="los-dot"></span> Add New OKR</div>
          {[
            { label: 'Objective', key: 'objective', placeholder: 'Inspiring, directional, qualitative' },
            { label: 'Key Result 1 (Measurable)', key: 'kr1', placeholder: 'Specific number or milestone' },
            { label: 'Key Result 2', key: 'kr2', placeholder: '' },
            { label: 'Key Result 3', key: 'kr3', placeholder: '' },
          ].map(f => (
            <div className="los-form-row" key={f.key}>
              <label className="los-form-label">{f.label}</label>
              <input className="los-input" type="text" placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
            </div>
          ))}
          <div className="los-form-row">
            <label className="los-form-label">Category</label>
            <select className="los-select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              {['Academic','Project','Health','Finance','Relationships','Skills','General'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="los-form-row">
            <label className="los-form-label">Initial Confidence (0–100%)</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input type="range" className="los-slider" min="0" max="100" value={form.confidence}
                onChange={e => setForm(p => ({ ...p, confidence: parseInt(e.target.value) }))} style={{ flex: 1 }} />
              <span style={{ fontFamily: 'var(--los-font-mono)', color: 'var(--los-accent)', fontSize: '0.85rem' }}>{form.confidence}%</span>
            </div>
          </div>
          <button className="los-btn los-btn-primary" onClick={addOKR}>Add OKR ↗</button>
        </div>
      )}
    </div>
  );
}
