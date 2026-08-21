import React, { useState, useEffect, useRef } from 'react';
import { lifeosSupabase } from '../../../services/lifeosSupabaseClient';
import HistoryModal from '../shared/HistoryModal';

const SECTION = { MORNING: 'morning', EVENING: 'evening' };

function SliderField({ label, id, min = 1, max = 10, defaultValue = 5, leftLabel, rightLabel, hint }) {
  const [value, setValue] = useState(null);

  return (
    <div className="los-form-row">
      <label className="los-form-label">{label}</label>
      <div className="los-slider-row">
        <div className="los-slider-row-head">
          <span>{leftLabel}</span>
          <span className={`los-slider-val${value === null ? ' unset' : ''}`}>
            {value ?? '—'}
          </span>
          <span>{rightLabel}</span>
        </div>
        <input
          id={id}
          type="range"
          className="los-slider"
          min={min}
          max={max}
          defaultValue={defaultValue}
          onChange={e => setValue(e.target.value)}
        />
        {hint && value === null && (
          <div style={{ fontSize: '0.72rem', color: 'var(--los-text3)', marginTop: 4 }}>{hint}</div>
        )}
      </div>
    </div>
  );
}

export default function DailyLogPage() {
  const today = new Date().toISOString().split('T')[0];

  // Morning fields
  const sleepRef = useRef(5);
  const energyRef = useRef(5);
  const moodRef = useRef(5);
  const [mit1, setMit1] = useState('');
  const [mit2, setMit2] = useState('');
  const [mit3, setMit3] = useState('');
  const [intention, setIntention] = useState('');

  // Evening fields
  const [focusHours, setFocusHours] = useState('');
  const [exercise, setExercise] = useState('0');
  const [bigWin, setBigWin] = useState('');
  const [friction, setFriction] = useState('');
  const stressRef = useRef(3);
  const [journal, setJournal] = useState('');

  // State
  const [morningDone, setMorningDone] = useState(false);
  const [eveningDone, setEveningDone] = useState(false);
  const [saving, setSaving] = useState(null);
  const [toast, setToast] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    checkTodayLogs();
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const checkTodayLogs = async () => {
    try {
      const { data } = await lifeosSupabase
        .from('life_logs')
        .select('type')
        .eq('date', today);
      if (data) {
        if (data.some(r => r.type === SECTION.MORNING)) setMorningDone(true);
        if (data.some(r => r.type === SECTION.EVENING)) setEveningDone(true);
      }
    } catch (err) {
      console.error('Failed to check today logs:', err);
    }
  };

  const getSliderValue = (ref) => {
    // We read directly from the DOM since we use uncontrolled refs for performance
    return parseInt(ref.current) || 5;
  };

  const saveMorning = async () => {
    setSaving(SECTION.MORNING);
    try {
      const payload = {
        sleep: getSliderValue(sleepRef),
        energy: getSliderValue(energyRef),
        mood: getSliderValue(moodRef),
        mit: [mit1, mit2, mit3].filter(Boolean),
        intention,
      };
      await lifeosSupabase.from('life_logs').upsert({
        type: SECTION.MORNING,
        date: today,
        payload,
      }, { onConflict: 'type,date' });
      setMorningDone(true);
      showToast('Morning logged ✓');
    } catch (err) {
      console.error(err);
      showToast('Error saving — check console');
    } finally {
      setSaving(null);
    }
  };

  const saveEvening = async () => {
    setSaving(SECTION.EVENING);
    try {
      const payload = {
        focus_hours: parseFloat(focusHours) || 0,
        exercise: parseInt(exercise),
        big_win: bigWin,
        friction,
        stress: getSliderValue(stressRef),
        journal,
      };
      await lifeosSupabase.from('life_logs').upsert({
        type: SECTION.EVENING,
        date: today,
        payload,
      }, { onConflict: 'type,date' });
      setEveningDone(true);
      showToast('Evening logged ✓');
    } catch (err) {
      console.error(err);
      showToast('Error saving — check console');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div>
      {showHistory && <HistoryModal type="daily" onClose={() => setShowHistory(false)} />}
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--los-green)', color: '#000', padding: '10px 24px',
          borderRadius: 20, fontWeight: 700, fontSize: '0.85rem', zIndex: 9999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
        }}>
          {toast}
        </div>
      )}

      <div className="los-page-head">
        <h1>Daily Log</h1>
        <p>Science basis: <em>Ultradian rhythms (90-min cycles), chronobiology, affect labeling reduces amygdala activation (Lieberman 2007)</em>. Log twice: morning + evening.</p>
      </div>

      <div className="los-grid-2">
        {/* LEFT COLUMN — Morning + Science */}
        <div>
          <div className="los-card" style={{ marginBottom: 16 }}>
            <div className="los-card-title">
              <span className="los-dot"></span>
              Morning Check-in
              {morningDone && (
                <span style={{ background: 'var(--los-green)', color: '#000', fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, marginLeft: 6, fontFamily: 'var(--los-font-mono)' }}>
                  ✓ LOGGED
                </span>
              )}
            </div>
            <div className="los-notif los-notif-info">⏰ Best time: First 30 min after wake. Takes ~3 min.</div>

            <div className="los-form-row">
              <label className="los-form-label">Sleep Quality (1–10)</label>
              <div className="los-slider-row">
                <div className="los-slider-row-head">
                  <span>Poor</span><span style={{ fontFamily: 'var(--los-font-mono)', color: 'var(--los-accent)' }} id="sleep-display">5</span><span>Excellent</span>
                </div>
                <input type="range" className="los-slider" min="1" max="10" defaultValue="5"
                  onChange={e => { sleepRef.current = e.target.value; document.getElementById('sleep-display').textContent = e.target.value; }} />
              </div>
            </div>

            <div className="los-form-row">
              <label className="los-form-label">Energy Level (1–10)</label>
              <div className="los-slider-row">
                <div className="los-slider-row-head">
                  <span>Drained</span><span style={{ fontFamily: 'var(--los-font-mono)', color: 'var(--los-accent)' }} id="energy-display">5</span><span>Peak</span>
                </div>
                <input type="range" className="los-slider" min="1" max="10" defaultValue="5"
                  onChange={e => { energyRef.current = e.target.value; document.getElementById('energy-display').textContent = e.target.value; }} />
              </div>
            </div>

            <div className="los-form-row">
              <label className="los-form-label">Mood (1–10)</label>
              <div className="los-slider-row">
                <div className="los-slider-row-head">
                  <span>Low</span><span style={{ fontFamily: 'var(--los-font-mono)', color: 'var(--los-accent)' }} id="mood-display">5</span><span>High</span>
                </div>
                <input type="range" className="los-slider" min="1" max="10" defaultValue="5"
                  onChange={e => { moodRef.current = e.target.value; document.getElementById('mood-display').textContent = e.target.value; }} />
              </div>
            </div>

            <div className="los-form-row">
              <label className="los-form-label">Top 3 MIT (Most Important Tasks)</label>
              <input className="los-input" type="text" placeholder="MIT #1 (highest leverage)" value={mit1} onChange={e => setMit1(e.target.value)} />
              <div style={{ height: 6 }} />
              <input className="los-input" type="text" placeholder="MIT #2" value={mit2} onChange={e => setMit2(e.target.value)} />
              <div style={{ height: 6 }} />
              <input className="los-input" type="text" placeholder="MIT #3" value={mit3} onChange={e => setMit3(e.target.value)} />
            </div>

            <div className="los-form-row">
              <label className="los-form-label">Intention / Focus Word</label>
              <input className="los-input" type="text" placeholder="e.g. Deep, Calm, Bold" value={intention} onChange={e => setIntention(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="los-btn los-btn-primary" onClick={saveMorning} disabled={saving === SECTION.MORNING}>
                {saving === SECTION.MORNING ? 'Saving...' : 'Log Morning ↗'}
              </button>
              <button className="los-btn los-btn-ghost" onClick={() => setShowHistory(true)}>📜 View Past Logs</button>
            </div>
          </div>

          {/* Science card */}
          <div className="los-card">
            <div className="los-card-title">
              <span className="los-dot" style={{ background: 'var(--los-accent3)' }}></span>
              Science: Daily Protocols
            </div>
            <div className="los-timeline">
              <div className="los-tl-item">
                <div className="los-tl-time">06:00 – 07:00</div>
                <div className="los-tl-title">Cortisol Peak Window</div>
                <div className="los-tl-text">Highest alertness. Do hardest cognitive work. No caffeine yet (delays crash). Source: Huberman Lab / circadian research.</div>
              </div>
              <div className="los-tl-item">
                <div className="los-tl-time">90-min blocks</div>
                <div className="los-tl-title">Ultradian Rhythm</div>
                <div className="los-tl-text">Kleitman's Basic Rest-Activity Cycle. Work 90 min, rest 20 min. Elite performers use this (Ericsson 1993).</div>
              </div>
              <div className="los-tl-item">
                <div className="los-tl-time">Post-lunch dip</div>
                <div className="los-tl-title">Trough Period</div>
                <div className="los-tl-text">Daniel Pink's "When": schedule low-stakes tasks (email, admin). Nap 10–20 min if possible — restores alertness.</div>
              </div>
              <div className="los-tl-item">
                <div className="los-tl-time">Evening</div>
                <div className="los-tl-title">Shutdown Ritual</div>
                <div className="los-tl-text">Newport (Deep Work): write "Shutdown complete." Signals brain to stop planning, reduces rumination, improves sleep.</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — Evening + Summary */}
        <div>
          <div className="los-card" style={{ marginBottom: 16 }}>
            <div className="los-card-title">
              <span className="los-dot" style={{ background: 'var(--los-accent2)' }}></span>
              Evening Debrief
              {eveningDone && (
                <span style={{ background: 'var(--los-accent2)', color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, marginLeft: 6, fontFamily: 'var(--los-font-mono)' }}>
                  ✓ LOGGED
                </span>
              )}
            </div>
            <div className="los-notif los-notif-info">⏰ Best time: 1–2 hours before sleep.</div>

            <div className="los-form-row">
              <label className="los-form-label">Deep Focus Hours (actual)</label>
              <input className="los-input" type="number" min="0" max="16" step="0.5" placeholder="e.g. 3.5" value={focusHours} onChange={e => setFocusHours(e.target.value)} />
            </div>

            <div className="los-form-row">
              <label className="los-form-label">Exercise Done?</label>
              <select className="los-select" value={exercise} onChange={e => setExercise(e.target.value)}>
                <option value="0">No</option>
                <option value="1">Light (walk/stretch)</option>
                <option value="2">Moderate (30+ min)</option>
                <option value="3">Intense (60+ min)</option>
              </select>
            </div>

            <div className="los-form-row">
              <label className="los-form-label">Big Win of the Day</label>
              <input className="los-input" type="text" placeholder="Something that moved the needle" value={bigWin} onChange={e => setBigWin(e.target.value)} />
            </div>

            <div className="los-form-row">
              <label className="los-form-label">Biggest Friction / What Blocked You</label>
              <input className="los-input" type="text" placeholder="Be specific — data you can act on" value={friction} onChange={e => setFriction(e.target.value)} />
            </div>

            <div className="los-form-row">
              <label className="los-form-label">Stress Level (1–10)</label>
              <div className="los-slider-row">
                <div className="los-slider-row-head">
                  <span>None</span>
                  <span style={{ fontFamily: 'var(--los-font-mono)', color: 'var(--los-accent)' }} id="stress-display">3</span>
                  <span>Max</span>
                </div>
                <input type="range" className="los-slider" min="1" max="10" defaultValue="3"
                  onChange={e => { stressRef.current = e.target.value; document.getElementById('stress-display').textContent = e.target.value; }} />
              </div>
            </div>

            <div className="los-form-row">
              <label className="los-form-label">Journal Entry</label>
              <textarea
                className="los-textarea"
                placeholder="How did today feel? Label it precisely — this reduces amygdala activation (Lieberman 2007)."
                rows={5}
                value={journal}
                onChange={e => setJournal(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="los-btn los-btn-primary" onClick={saveEvening} disabled={saving === SECTION.EVENING}>
                {saving === SECTION.EVENING ? 'Saving...' : 'Log Evening ↗'}
              </button>
              <button className="los-btn los-btn-ghost" onClick={() => setShowHistory(true)}>📜 View Past Logs</button>
              <button className="los-btn los-btn-ghost" onClick={() => {
                setFocusHours(''); setExercise('0'); setBigWin(''); setFriction(''); setJournal('');
              }}>Clear</button>
            </div>
          </div>

          {/* Today summary */}
          <div className="los-card">
            <div className="los-card-title">
              <span className="los-dot" style={{ background: 'var(--los-green)' }}></span>
              Today's Status
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{
                flex: 1, padding: '12px 16px',
                background: morningDone ? 'rgba(57,255,126,0.08)' : 'var(--los-surface3)',
                border: `1px solid ${morningDone ? 'rgba(57,255,126,0.25)' : 'var(--los-border)'}`,
                borderRadius: 10, textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem' }}>{morningDone ? '✅' : '⬜'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--los-text2)', marginTop: 4 }}>Morning</div>
              </div>
              <div style={{
                flex: 1, padding: '12px 16px',
                background: eveningDone ? 'rgba(0,229,255,0.08)' : 'var(--los-surface3)',
                border: `1px solid ${eveningDone ? 'rgba(0,229,255,0.25)' : 'var(--los-border)'}`,
                borderRadius: 10, textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem' }}>{eveningDone ? '✅' : '⬜'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--los-text2)', marginTop: 4 }}>Evening</div>
              </div>
            </div>
            {!morningDone && !eveningDone && (
              <p style={{ marginTop: 16, fontSize: '0.82rem', color: 'var(--los-text2)' }}>
                <em>No log yet. Fill morning or evening check-in →</em>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
