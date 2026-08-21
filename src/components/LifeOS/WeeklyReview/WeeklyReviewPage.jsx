import React, { useState, useEffect } from 'react';
import { lifeosSupabase } from '../../../services/lifeosSupabaseClient';
import HistoryModal from '../shared/HistoryModal';

export default function WeeklyReviewPage() {
  const [win, setWin]         = useState('');
  const [friction, setFriction] = useState('');
  const [change, setChange]   = useState('');
  const [priority, setPriority] = useState('');
  const [weekStats, setWeekStats] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [checks, setChecks]   = useState({});

  useEffect(() => { computeWeekly(); }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const computeWeekly = async () => {
    const today = new Date();
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    try {
      const { data } = await lifeosSupabase
        .from('life_logs')
        .select('*')
        .in('date', dates)
        .in('type', ['morning', 'evening']);

      if (!data) return;

      let totalSleep = 0, sleepCount = 0;
      let totalMood  = 0, moodCount  = 0;
      let totalFocus = 0, exDays = 0;
      let mits = 0, totalMits = 0;

      data.forEach(row => {
        if (row.type === 'morning' && row.payload) {
          if (row.payload.sleep) { totalSleep += row.payload.sleep; sleepCount++; }
          if (row.payload.mood)  { totalMood  += row.payload.mood;  moodCount++;  }
          if (Array.isArray(row.payload.mit)) {
            totalMits += row.payload.mit.length;
          }
        }
        if (row.type === 'evening' && row.payload) {
          if (row.payload.focus_hours) totalFocus += row.payload.focus_hours;
          if (row.payload.exercise > 0) exDays++;
        }
      });

      setWeekStats({
        avgSleep: sleepCount ? (totalSleep / sleepCount).toFixed(1) : null,
        avgMood:  moodCount  ? (totalMood  / moodCount).toFixed(1)  : null,
        focusHrs: totalFocus.toFixed(1),
        exDays,
      });
    } catch (err) {
      console.error('Weekly compute failed:', err);
    }
  };

  const saveWeekly = async () => {
    setSaving(true);
    const weekOf = new Date().toISOString().split('T')[0];
    try {
      await lifeosSupabase.from('life_logs').upsert({
        type: 'weekly',
        date: weekOf,
        payload: { win, friction, change, priority },
      }, { onConflict: 'type,date' });
      showToast('Weekly review saved ✓');
    } catch (err) {
      console.error(err);
      showToast('Error saving');
    } finally {
      setSaving(false);
    }
  };

  const toggleCheck = (key) => setChecks(prev => ({ ...prev, [key]: !prev[key] }));

  const BACKUP_ITEMS = [
    'Export Life OS data (Data Log → Export)',
    'Sync notes to cloud (Obsidian / Notion)',
    'Back up project files (local + cloud)',
    'Commit code to GitHub',
    'Review password manager',
  ];

  return (
    <div>
      {showHistory && <HistoryModal type="weekly" onClose={() => setShowHistory(false)} />}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--los-green)', color: '#000', padding: '10px 24px', borderRadius: 20, fontWeight: 700, fontSize: '0.85rem', zIndex: 9999 }}>
          {toast}
        </div>
      )}

      <div className="los-page-head">
        <h1>Weekly Review</h1>
        <p>Science basis: <em>"Fresh Start Effect" — Dai, Milkman & Riis (2014). Weekly reviews are the master feedback loop. GTD's David Allen: "the single most critical habit." Do on Sunday, 30–60 min.</em></p>
      </div>

      <div className="los-notif los-notif-warn">⚡ Schedule this as a non-negotiable calendar block. Weekly review users outperform those who don't review by <strong>23% on goal attainment</strong> (research: Week Plan 2024).</div>

      <div className="los-grid-2" style={{ marginTop: 16 }}>
        <div>
          {/* Scorecard */}
          <div className="los-card" style={{ marginBottom: 16 }}>
            <div className="los-card-title"><span className="los-dot"></span> Week Scorecard</div>
            {weekStats ? (
              <>
                <div className="los-prog-wrap">
                  <div className="los-prog-label"><span>Deep Focus Hours</span><span>{weekStats.focusHrs}h / 15h goal</span></div>
                  <div className="los-prog-bar">
                    <div className="los-prog-fill" style={{ width: `${Math.min(100, (weekStats.focusHrs / 15) * 100)}%`, background: 'var(--los-accent2)' }}></div>
                  </div>
                </div>
                <div className="los-prog-wrap">
                  <div className="los-prog-label"><span>Exercise Days</span><span>{weekStats.exDays}/7</span></div>
                  <div className="los-prog-bar">
                    <div className="los-prog-fill" style={{ width: `${(weekStats.exDays / 7) * 100}%`, background: 'var(--los-accent3)' }}></div>
                  </div>
                </div>
                {weekStats.avgSleep && (
                  <div className="los-prog-wrap">
                    <div className="los-prog-label"><span>Avg Sleep Quality</span><span>{weekStats.avgSleep}/10</span></div>
                    <div className="los-prog-bar">
                      <div className="los-prog-fill" style={{ width: `${(weekStats.avgSleep / 10) * 100}%`, background: 'var(--los-blue)' }}></div>
                    </div>
                  </div>
                )}
                {weekStats.avgMood && (
                  <div className="los-prog-wrap">
                    <div className="los-prog-label"><span>Avg Mood</span><span>{weekStats.avgMood}/10</span></div>
                    <div className="los-prog-bar">
                      <div className="los-prog-fill" style={{ width: `${(weekStats.avgMood / 10) * 100}%`, background: 'var(--los-green)' }}></div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p style={{ color: 'var(--los-text2)', fontSize: '0.82rem' }}>Loading this week's data...</p>
            )}
            <div className="los-divider"></div>
            <button className="los-btn los-btn-ghost" onClick={computeWeekly}>Compute From Logs ↗</button>
          </div>

          {/* Questions */}
          <div className="los-card">
            <div className="los-card-title"><span className="los-dot" style={{ background: 'var(--los-accent2)' }}></span> Weekly Review Questions</div>
            <div className="los-form-row">
              <label className="los-form-label">What went well this week?</label>
              <textarea className="los-textarea" placeholder="Wins, breakthroughs, good decisions..." value={win} onChange={e => setWin(e.target.value)} />
            </div>
            <div className="los-form-row">
              <label className="los-form-label">What friction patterns appeared?</label>
              <textarea className="los-textarea" placeholder="Repeating blocks, energy drains, wasted time..." value={friction} onChange={e => setFriction(e.target.value)} />
            </div>
            <div className="los-form-row">
              <label className="los-form-label">What will you DO differently next week?</label>
              <textarea className="los-textarea" placeholder="Be specific with one actionable change." value={change} onChange={e => setChange(e.target.value)} />
            </div>
            <div className="los-form-row">
              <label className="los-form-label">Next week's #1 priority (North Star)</label>
              <input className="los-input" type="text" placeholder="One thing that would make the week a success" value={priority} onChange={e => setPriority(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="los-btn los-btn-primary" onClick={saveWeekly} disabled={saving}>
                {saving ? 'Saving...' : 'Save Weekly Review ↗'}
              </button>
              <button className="los-btn los-btn-ghost" onClick={() => setShowHistory(true)}>📜 View Past Reviews</button>
            </div>
          </div>
        </div>

        <div>
          {/* Protocol */}
          <div className="los-card" style={{ marginBottom: 16 }}>
            <div className="los-card-title"><span className="los-dot" style={{ background: 'var(--los-accent3)' }}></span> The 5-Step Weekly Review Protocol</div>
            <div className="los-timeline">
              {[
                { time: 'Step 1 — 5 min', title: 'Clear Inboxes', text: 'Email, notes, messages to zero. Every capture point emptied. GTD principle: mind like water.' },
                { time: 'Step 2 — 10 min', title: 'Review Metrics', text: 'Check this scorecard. Look for trends, not single data points. One week is noise; patterns are signal.' },
                { time: 'Step 3 — 15 min', title: 'Review Goals / OKRs', text: 'Are you on track? What slipped? Adjust next week\'s priorities to compensate.' },
                { time: 'Step 4 — 10 min', title: 'Plan Next Week', text: 'Time-block deep work sessions first. Scheduling with specific time + place doubles follow-through (Gollwitzer 1999).' },
                { time: 'Step 5 — 5 min', title: 'Gratitude + Shutdown', text: '3 things that went well. Gratitude journaling raises wellbeing scores 10–15% at 8 weeks (Emmons & McCullough 2003).' },
              ].map((item, i) => (
                <div key={i} className="los-tl-item">
                  <div className="los-tl-time">{item.time}</div>
                  <div className="los-tl-title">{item.title}</div>
                  <div className="los-tl-text">{item.text}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Backup Checklist */}
          <div className="los-card">
            <div className="los-card-title"><span className="los-dot" style={{ background: 'var(--los-green)' }}></span> Backup Checklist</div>
            <ul className="los-checklist">
              {BACKUP_ITEMS.map((item, i) => (
                <li key={i} className={checks[i] ? 'done' : ''} onClick={() => toggleCheck(i)}>
                  <span className={`los-check-box ${checks[i] ? 'checked' : ''}`}>{checks[i] ? '✓' : ''}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
