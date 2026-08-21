import React, { useState, useEffect, useRef } from 'react';

// ── Tool Data (from lifeos.html) ─────────────────────────
const TOOL_CATEGORIES = {
  focus: {
    label: 'Focus',
    tools: [
      { icon: '🍅', name: 'Pomofocus', desc: 'Pomodoro timer web app. Free, no account. Science: focused work intervals improve output quality.', science: '↳ Cirill (1992) — 25/5 min cycles' },
      { icon: '🔇', name: 'Brain.fm / Focusmate', desc: 'Neural phase locking audio for focus. Focusmate: virtual coworking accountability.', science: '↳ Auditory entrainment research' },
      { icon: '📵', name: 'Cold Turkey Blocker', desc: 'Hard block distracting sites during deep work. Cannot be bypassed easily. Windows/Mac.', science: '↳ Newport: distraction = 23 min recovery' },
      { icon: '⏱️', name: 'Toggl Track', desc: 'Time tracking. Free tier. Reveals actual time use vs perceived. Critical for data.', science: '↳ You can\'t improve what you don\'t measure' },
      { icon: '🎵', name: 'Lofi / Rain Sounds', desc: 'lofi.cafe, rainymood.com — ambient audio masks distracting sounds. Free, ad-light.', science: '↳ Moderate noise ~70dB boosts creativity' },
      { icon: '📋', name: 'Workflowy / Logseq', desc: 'Outliner for task capture during focus. Never lose a thought. Local-first (Logseq = private).', science: '↳ GTD: capture everything, trust the system' },
    ]
  },
  capture: {
    label: 'Capture',
    tools: [
      { icon: '🧠', name: 'Obsidian', desc: 'Local-first, Markdown notes with backlinks. Privacy respecting. Free forever. PKM gold standard.', science: '↳ Zettelkasten method (Luhmann: 70+ books)' },
      { icon: '📓', name: 'Logseq', desc: 'Free, open-source, graph-based journal + notes. Local storage. Works offline.', science: '↳ Daily journaling + linked notes' },
      { icon: '🗂️', name: 'PARA Method', desc: 'Projects / Areas / Resources / Archive. Tiago Forte\'s system. Folder structure, not app.', science: '↳ Building a Second Brain (2022)' },
      { icon: '📱', name: 'Telegram (Saved)', desc: 'Message yourself links/ideas instantly. Universal capture on mobile. No friction.', science: '↳ Capture friction = ideas lost' },
      { icon: '🔖', name: 'Raindrop.io', desc: 'Bookmark manager. Free tier, cross-platform. Better than browser folders.', science: '↳ Second brain: archive resources' },
    ]
  },
  planning: {
    label: 'Planning',
    tools: [
      { icon: '📅', name: 'Google Calendar', desc: 'Time-blocking tool. Schedule deep work, reviews, exercise. Calendar = commitment device.', science: '↳ Gollwitzer (1999): if-then plans 2x follow-through' },
      { icon: '✅', name: 'Todoist / TickTick', desc: 'Task manager with priority levels, recurring tasks. GTD-compatible. Free tiers available.', science: '↳ GTD: trusted external system' },
      { icon: '🗒️', name: 'Notion', desc: 'All-in-one workspace. Databases for projects, goals. Good for templates + structured planning.', science: '↳ PARA + OKR tracking' },
      { icon: '📊', name: 'This App (Life OS)', desc: 'Data-driven daily/weekly/monthly reviews, OKRs, decision engine. You\'re using it now.', science: '↳ Quantified Self methodology' },
      { icon: '🌅', name: 'Sunsama / Akiflow', desc: 'Daily planning tools that pull from multiple sources. Premium but excellent UX.', science: '↳ Daily planning = intentional execution' },
    ]
  },
  health: {
    label: 'Health',
    tools: [
      { icon: '😴', name: 'Sleep Cycle', desc: 'Smart alarm wakes you in lightest sleep phase. Tracks sleep quality over time.', science: '↳ Walker: 8h sleep = 40% more memory consolidation' },
      { icon: '🧘', name: 'Waking Up / Plum Village', desc: 'Meditation apps. Plum Village is free. Evidence: 8 weeks MBSR reduces cortisol, increases grey matter.', science: '↳ Kabat-Zinn MBSR research' },
      { icon: '💪', name: 'Strong / FitNotes', desc: 'Free workout logging apps. Track progressive overload. No data selling.', science: '↳ Progressive overload = muscle/strength gains' },
      { icon: '🥗', name: 'Cronometer', desc: 'Nutrition tracker. More micronutrient detail than MyFitnessPal. Free tier.', science: '↳ Nutrient deficiencies → cognitive decline' },
      { icon: '🚶', name: '10,000 Steps', desc: 'Phone step counter. Walking 8,000+ steps/day = 51% lower all-cause mortality (Paluch 2021).', science: '↳ Paluch et al. 2021, JAMA' },
    ]
  },
  learning: {
    label: 'Learning',
    tools: [
      { icon: '🃏', name: 'Anki', desc: 'Spaced repetition flashcards. Gold standard for long-term retention. Free, open-source.', science: '↳ Ebbinghaus forgetting curve — SR beats re-reading 2.35x' },
      { icon: '📖', name: 'Readwise', desc: 'Resurfaces your highlights from books/articles daily. Prevents knowledge loss.', science: '↳ Testing effect: retrieval practice > passive reading' },
      { icon: '🎓', name: 'Coursera / NPTEL', desc: 'Structured courses. NPTEL free + certificates. For NET JRF prep: IIT lectures on CS topics.', science: '↳ Deliberate practice (Ericsson): structure over volume' },
      { icon: '✍️', name: 'Feynman Technique', desc: 'Explain concepts in simple words. Gaps in explanation = gaps in understanding. No app needed.', science: '↳ Generation effect: teaching > reading for retention' },
      { icon: '🔍', name: 'Connected Papers', desc: 'Visual graph of related academic papers. Great for deep research dives.', science: '↳ Research efficiency' },
    ]
  },
  backup: {
    label: 'Backup',
    tools: [
      { icon: '☁️', name: '3-2-1 Backup Rule', desc: '3 copies, 2 different media, 1 offsite. Non-negotiable for anything important.', science: '↳ Standard data resilience protocol' },
      { icon: '🐙', name: 'GitHub', desc: 'Version control + cloud backup for all code projects. Free for unlimited repos. Use daily.', science: '↳ Every commit = a restore point' },
      { icon: '📦', name: 'Backblaze / rclone', desc: 'Cheap cloud backup ($7/mo unlimited). rclone = free, encrypt + sync to any cloud.', science: '↳ Offsite = protection from local disaster' },
      { icon: '🔐', name: 'Bitwarden', desc: 'Open-source password manager. Free, self-hostable. Never lose credentials.', science: '↳ Password manager adoption = key security hygiene' },
      { icon: '📤', name: 'Export (This App)', desc: 'Use Data Log → Export to download your Life OS data as JSON. Weekly backup habit.', science: '↳ Data portability = resilience' },
    ]
  },
};

// ── Focus Timer ────────────────────────────────────────────
const PRESETS = {
  focus: [
    { label: '25m Pomodoro', mins: 25 },
    { label: '45m', mins: 45 },
    { label: '60m', mins: 60 },
    { label: '90m Ultradian', mins: 90 },
  ],
  rest: [
    { label: '5m micro', mins: 5 },
    { label: '10m', mins: 10 },
    { label: '20m Nap', mins: 20 },
    { label: '30m', mins: 30 },
  ]
};

function FocusTimerModal({ onClose }) {
  const [mode, setMode]       = useState('focus');
  const [target, setTarget]   = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [label, setLabel]     = useState('');
  const [customMin, setCustomMin] = useState('90');
  const [sessions, setSessions]   = useState([]);
  const [logMsg, setLogMsg]   = useState('');
  const intervalRef = useRef(null);
  const startRef    = useRef(null);

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1;
          if (target > 0 && next >= target) {
            clearInterval(intervalRef.current);
            setRunning(false);
            if (Notification.permission === 'granted') {
              new Notification('⏱ Session complete!', { body: `${mode === 'focus' ? 'Focus' : 'Rest'} done!` });
            }
          }
          return next;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const fmt = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
  };

  const display = target > 0 ? Math.max(0, target - elapsed) : elapsed;
  const pct = target > 0 ? Math.min(100, (elapsed / target) * 100) : 0;
  const isFocus = mode === 'focus';
  const accentCol = isFocus ? 'var(--los-accent)' : 'var(--los-accent3)';

  const switchMode = (m) => {
    if (running) return;
    setMode(m); setTarget(0); setElapsed(0);
  };

  const setPreset = (mins) => {
    if (running) return;
    setTarget(mins * 60); setElapsed(0);
  };

  const start = () => {
    setRunning(true);
    startRef.current = new Date().toISOString();
    setLogMsg('');
  };

  const pause = () => setRunning(false);

  const reset = () => {
    setRunning(false);
    setElapsed(0);
    setLogMsg('');
  };

  const stopAndLog = () => {
    setRunning(false);
    if (elapsed < 30) { setLogMsg('⚠ Minimum 30s needed to log.'); return; }
    const mins = Math.round(elapsed / 60);
    const sessionLabel = label || (isFocus ? 'Focus session' : 'Rest break');
    setSessions(prev => [...prev, { mode, label: sessionLabel, mins, ts: new Date().toLocaleTimeString() }]);
    setLogMsg(`✓ +${mins}m ${mode} logged`);
    reset();
  };

  const todaySessions = sessions;
  const focusMins  = todaySessions.filter(s => s.mode === 'focus').reduce((s, x) => s + x.mins, 0);
  const restMins   = todaySessions.filter(s => s.mode === 'rest').reduce((s, x) => s + x.mins, 0);
  const frRatio    = focusMins > 0 && restMins > 0 ? (focusMins / restMins).toFixed(1) : '—';

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500, backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'relative', background: 'var(--los-surface2)', border: '1px solid var(--los-border2)', borderRadius: 16, padding: '24px 28px', width: 420, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', color: 'var(--los-text3)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}>×</button>

        {/* Mode switcher */}
        <div style={{ display: 'flex', border: '1px solid var(--los-border2)', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
          {['focus', 'rest'].map(m => (
            <button key={m} onClick={() => switchMode(m)}
              style={{ flex: 1, padding: '8px', fontFamily: 'var(--los-font-display)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', background: mode === m ? (m === 'focus' ? 'var(--los-accent)' : 'var(--los-accent3)') : 'var(--los-surface3)', color: mode === m ? '#000' : 'var(--los-text3)', transition: 'all 0.15s' }}>
              {m === 'focus' ? '⚡ Focus' : '☕ Rest'}
            </button>
          ))}
        </div>

        {/* Timer display */}
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <svg width="160" height="160" viewBox="0 0 160 160" style={{ display: 'block', margin: '0 auto 8px' }}>
            <circle cx="80" cy="80" r="70" fill="none" stroke="var(--los-surface3)" strokeWidth="8" />
            <circle cx="80" cy="80" r="70" fill="none" stroke={running ? accentCol : 'var(--los-border2)'} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 70}`}
              strokeDashoffset={`${2 * Math.PI * 70 * (1 - pct / 100)}`}
              transform="rotate(-90 80 80)"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
            />
            <text x="80" y="84" textAnchor="middle" fill={accentCol} fontFamily="var(--los-font-mono)" fontSize="26" fontWeight="700">{fmt(display)}</text>
          </svg>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'flex', background: 'var(--los-surface3)', borderRadius: 6, overflow: 'hidden', margin: '14px 0', textAlign: 'center' }}>
          {[
            { label: 'Focus Today', val: focusMins >= 60 ? (focusMins / 60).toFixed(1) + 'h' : focusMins + 'm', col: 'var(--los-accent)' },
            { label: 'Rest Today', val: restMins >= 60 ? (restMins / 60).toFixed(1) + 'h' : restMins + 'm', col: 'var(--los-accent3)' },
            { label: 'F:R Ratio', val: frRatio !== '—' ? frRatio + ':1' : '—', col: 'var(--los-text2)' },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, padding: '8px 0', borderRight: i < 2 ? '1px solid var(--los-border)' : undefined }}>
              <div style={{ fontFamily: 'var(--los-font-mono)', fontSize: '0.6rem', color: 'var(--los-text3)', textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--los-font-display)', fontSize: '1rem', fontWeight: 800, color: s.col }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Presets */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          {(PRESETS[mode] || []).map(p => (
            <button key={p.mins} className="los-btn los-btn-ghost" style={{ padding: '4px 10px', fontSize: '0.65rem' }} onClick={() => setPreset(p.mins)}>{p.label}</button>
          ))}
        </div>

        {/* Custom + label */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input type="number" min="1" max="300" value={customMin} onChange={e => setCustomMin(e.target.value)}
            style={{ width: 64, textAlign: 'center', flexShrink: 0, background: 'var(--los-surface3)', border: '1px solid var(--los-border2)', borderRadius: 6, color: 'var(--los-text)', padding: '6px 8px' }} />
          <button className="los-btn los-btn-ghost" style={{ padding: '6px 10px', flexShrink: 0 }} onClick={() => setPreset(parseInt(customMin) || 25)}>Set</button>
          <input type="text" placeholder="Label (e.g. NET JRF — Trees)" value={label} onChange={e => setLabel(e.target.value)}
            style={{ flex: 1, background: 'var(--los-surface3)', border: '1px solid var(--los-border2)', borderRadius: 6, color: 'var(--los-text)', padding: '6px 12px', fontSize: '0.82rem' }} />
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
          {!running
            ? <button className="los-btn los-btn-primary" style={{ flex: 1 }} onClick={start}>▶ {elapsed > 0 ? 'Resume' : 'Start'}</button>
            : <button className="los-btn los-btn-ghost" style={{ flex: 1 }} onClick={pause}>⏸ Pause</button>
          }
          <button className="los-btn los-btn-ghost" style={{ padding: '9px 14px' }} onClick={reset}>↺</button>
          <button className="los-btn" style={{ flex: 1, background: 'var(--los-accent4-dim)', color: 'var(--los-red)', border: '1px solid var(--los-red)' }} onClick={stopAndLog}>■ Stop & Log</button>
        </div>

        {logMsg && <div style={{ fontSize: '0.74rem', color: logMsg.startsWith('⚠') ? 'var(--los-red)' : 'var(--los-green)', textAlign: 'center', marginBottom: 10 }}>{logMsg}</div>}

        {/* Session list */}
        {sessions.length > 0 && (
          <div style={{ borderTop: '1px solid var(--los-border)', paddingTop: 10 }}>
            <div style={{ fontFamily: 'var(--los-font-mono)', fontSize: '0.58rem', color: 'var(--los-text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Today's Sessions</div>
            <div style={{ maxHeight: 110, overflowY: 'auto', fontSize: '0.74rem' }}>
              {sessions.map((s, i) => (
                <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid var(--los-border)', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: s.mode === 'focus' ? 'var(--los-accent)' : 'var(--los-accent3)' }}>{s.mode === 'focus' ? '⚡' : '☕'}</span>
                  <span style={{ color: 'var(--los-text3)', fontSize: '0.65rem', flexShrink: 0 }}>{s.ts}</span>
                  <span style={{ color: 'var(--los-text)', flex: 1 }}>{s.label}</span>
                  <span style={{ fontFamily: 'var(--los-font-mono)', color: s.mode === 'focus' ? 'var(--los-accent)' : 'var(--los-accent3)' }}>{s.mins}m</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ToolsPage ────────────────────────────────────────
export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState('focus');
  const [showTimer, setShowTimer] = useState(false);

  const current = TOOL_CATEGORIES[activeTab] || TOOL_CATEGORIES.focus;

  return (
    <div>
      {showTimer && <FocusTimerModal onClose={() => setShowTimer(false)} />}

      {/* Floating timer button */}
      <button
        onClick={() => setShowTimer(true)}
        title="Open Timer"
        style={{
          position: 'fixed', bottom: 24, right: 24, width: 52, height: 52,
          borderRadius: '50%', background: 'var(--los-accent)', border: 'none',
          fontSize: '1.3rem', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(255,184,48,0.4)', zIndex: 200,
          transition: 'transform 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >⏱</button>

      <div className="los-page-head">
        <h1>Tools Arsenal</h1>
        <p>Curated, evidence-backed tools stack. Organized by function. All privacy-respecting where possible.</p>
      </div>

      <div className="los-inner-tabs">
        {Object.entries(TOOL_CATEGORIES).map(([id, cat]) => (
          <button key={id} className={`los-inner-tab ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>{cat.label}</button>
        ))}
        <button className={`los-inner-tab`} onClick={() => setShowTimer(true)} style={{ color: 'var(--los-accent)' }}>⏱ Timer</button>
      </div>

      {/* Tool grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginTop: 8 }}>
        {current.tools.map((tool, i) => (
          <div key={i} className="los-card" style={{ transition: 'border-color 0.2s, transform 0.15s', cursor: 'default' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--los-border2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--los-border)'; e.currentTarget.style.transform = 'none'; }}>
            <div style={{ fontSize: '2rem', marginBottom: 10 }}>{tool.icon}</div>
            <div style={{ fontFamily: 'var(--los-font-display)', fontWeight: 700, fontSize: '0.92rem', color: 'var(--los-text)', marginBottom: 6 }}>{tool.name}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--los-text2)', lineHeight: 1.6, marginBottom: 8 }}>{tool.desc}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--los-accent)', fontFamily: 'var(--los-font-mono)', fontStyle: 'italic' }}>{tool.science}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
