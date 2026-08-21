import React, { useState, useEffect } from 'react';
import { lifeosSupabase } from '../../../services/lifeosSupabaseClient';
import HistoryModal from '../shared/HistoryModal';

const CRITERIA = [
  { id: 'impact', label: 'Long-term impact' },
  { id: 'reversible', label: 'Reversibility (higher = easier to undo)' },
  { id: 'cost', label: 'Cost / effort (higher = lower cost)' },
  { id: 'alignment', label: 'Values alignment' },
];

const BIASES = [
  { name: 'Sunk Cost Fallacy', desc: 'Am I staying because of past investment, not future value?' },
  { name: 'Availability Heuristic', desc: 'Am I overweighting vivid recent examples?' },
  { name: 'Confirmation Bias', desc: 'Have I actively sought disconfirming evidence?' },
  { name: 'Overconfidence', desc: 'Am I more certain than my track record warrants?' },
  { name: 'Status Quo Bias', desc: 'Am I resisting change simply because it\'s the default?' },
  { name: 'Planning Fallacy', desc: 'Have I multiplied my time/cost estimate by 2x to correct?' },
];

export default function DecisionEnginePage() {
  const [activeTab, setActiveTab] = useState('matrix');
  const [matrix, setMatrix] = useState({ question: '', optionA: 'Option A', optionB: 'Option B', scores: {} });
  const [journal, setJournal] = useState({ question: '', stakes: '5', confidence: '50', rationale: '', outcome_date: '' });
  const [premortem, setPremortem] = useState({ decision: '', fail_reasons: '', safeguards: '' });
  const [biasChecks, setBiasChecks] = useState({});
  const [savedDecisions, setSavedDecisions] = useState([]);
  const [toast, setToast] = useState('');
  const [showDecisionHistory, setShowDecisionHistory] = useState(false);

  useEffect(() => { loadDecisions(); }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadDecisions = async () => {
    try {
      const { data } = await lifeosSupabase.from('life_logs').select('*').eq('type', 'decision').order('created_at', { ascending: false }).limit(20);
      setSavedDecisions(data || []);
    } catch (err) { console.error(err); }
  };

  const setScore = (option, criterion, val) => {
    setMatrix(prev => ({ ...prev, scores: { ...prev.scores, [`${option}_${criterion}`]: parseInt(val) } }));
  };
  const getScore = (option, criterion) => matrix.scores[`${option}_${criterion}`] || 5;
  const totalScore = (option) => CRITERIA.reduce((s, c) => s + getScore(option, c.id), 0);

  const saveDecision = async () => {
    if (!journal.question) return showToast('Enter a decision question');
    try {
      await lifeosSupabase.from('life_logs').insert({
        type: 'decision',
        date: new Date().toISOString().split('T')[0],
        payload: journal,
      });
      showToast('Decision logged ✓');
      setJournal({ question: '', stakes: '5', confidence: '50', rationale: '', outcome_date: '' });
      loadDecisions();
    } catch (err) { console.error(err); showToast('Error saving'); }
  };

  const savePM = async () => {
    if (!premortem.decision) return showToast('Enter a decision');
    try {
      await lifeosSupabase.from('life_logs').insert({
        type: 'premortem',
        date: new Date().toISOString().split('T')[0],
        payload: premortem,
      });
      showToast('Pre-mortem saved ✓');
      setPremortem({ decision: '', fail_reasons: '', safeguards: '' });
    } catch (err) { console.error(err); showToast('Error saving'); }
  };

  const scoreA = totalScore('A');
  const scoreB = totalScore('B');

  return (
    <div>
      {showDecisionHistory && <HistoryModal type="decision" onClose={() => setShowDecisionHistory(false)} />}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--los-green)', color: '#000', padding: '10px 24px', borderRadius: 20, fontWeight: 700, fontSize: '0.85rem', zIndex: 9999 }}>
          {toast}
        </div>
      )}
      <div className="los-page-head">
        <h1>Decision Engine</h1>
        <p>Science basis: <em>Kahneman (Thinking, Fast and Slow): System 1 bias, overconfidence, availability heuristic. Decision journals reduce hindsight bias. Pre-mortem analysis (Klein 2007) catches failure modes.</em></p>
      </div>

      <div className="los-inner-tabs">
        {[['matrix','Decision Matrix'],['journal','Decision Journal'],['premortem','Pre-Mortem'],['biases','Bias Checklist']].map(([id, label]) => (
          <button key={id} className={`los-inner-tab ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>{label}</button>
        ))}
      </div>

      {activeTab === 'matrix' && (
        <div>
          <div className="los-notif los-notif-info">Weighted decision matrix: score each option on criteria (1–10). Highest total = data-supported choice.</div>
          <div className="los-grid-2" style={{ marginTop: 14 }}>
            <div className="los-card">
              <div className="los-card-title"><span className="los-dot"></span> Build a Decision Matrix</div>
              <div className="los-form-row">
                <label className="los-form-label">Decision Question</label>
                <input className="los-input" type="text" placeholder="e.g. Which framework to use?" value={matrix.question} onChange={e => setMatrix(p => ({ ...p, question: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                {['A', 'B'].map(opt => (
                  <div key={opt} style={{ flex: 1 }}>
                    <label className="los-form-label">Option {opt}</label>
                    <input className="los-input" type="text" value={matrix['option' + opt]} onChange={e => setMatrix(p => ({ ...p, ['option' + opt]: e.target.value }))} />
                  </div>
                ))}
              </div>
              {CRITERIA.map(c => (
                <div key={c.id} style={{ marginBottom: 14 }}>
                  <label className="los-form-label">{c.label}</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {['A', 'B'].map(opt => (
                      <div key={opt} style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--los-text3)', marginBottom: 4 }}>{matrix['option' + opt]} — {getScore(opt, c.id)}/10</div>
                        <input type="range" className="los-slider" min="1" max="10" value={getScore(opt, c.id)}
                          onChange={e => setScore(opt, c.id, e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="los-card">
              <div className="los-card-title"><span className="los-dot" style={{ background: 'var(--los-accent2)' }}></span> Matrix Result</div>
              {matrix.question && <div style={{ fontSize: '0.85rem', color: 'var(--los-text2)', marginBottom: 16 }}>{matrix.question}</div>}
              {['A', 'B'].map(opt => (
                <div key={opt} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: opt === 'A' ? 'var(--los-accent)' : 'var(--los-accent2)' }}>{matrix['option' + opt]}</span>
                    <span style={{ fontFamily: 'var(--los-font-mono)', color: 'var(--los-text)', fontSize: '1.1rem', fontWeight: 800 }}>{totalScore(opt)}</span>
                  </div>
                  <div className="los-prog-bar">
                    <div className="los-prog-fill" style={{ width: `${(totalScore(opt) / (CRITERIA.length * 10)) * 100}%`, background: opt === 'A' ? 'var(--los-accent)' : 'var(--los-accent2)' }}></div>
                  </div>
                </div>
              ))}
              <div className="los-divider"></div>
              <div style={{ textAlign: 'center', padding: 16, background: 'var(--los-surface3)', borderRadius: 10 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--los-text3)', marginBottom: 6 }}>Data Recommendation</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--los-accent)', fontFamily: 'var(--los-font-display)' }}>
                  {scoreA === scoreB ? 'Tied — flip a coin!' : scoreA > scoreB ? matrix.optionA : matrix.optionB}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'journal' && (
        <div className="los-grid-2">
          <div className="los-card">
            <div className="los-card-title"><span className="los-dot"></span> Log a Decision</div>
            <div className="los-form-row">
              <label className="los-form-label">Decision Question</label>
              <input className="los-input" type="text" placeholder="What exactly are you deciding?" value={journal.question} onChange={e => setJournal(p => ({ ...p, question: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="los-form-row" style={{ flex: 1 }}>
                <label className="los-form-label">Stakes (1–10)</label>
                <input type="range" className="los-slider" min="1" max="10" value={journal.stakes}
                  onChange={e => setJournal(p => ({ ...p, stakes: e.target.value }))} />
                <div style={{ textAlign: 'right', fontFamily: 'var(--los-font-mono)', color: 'var(--los-accent)', fontSize: '0.8rem' }}>{journal.stakes}/10</div>
              </div>
              <div className="los-form-row" style={{ flex: 1 }}>
                <label className="los-form-label">Confidence %</label>
                <input type="range" className="los-slider" min="0" max="100" value={journal.confidence}
                  onChange={e => setJournal(p => ({ ...p, confidence: e.target.value }))} />
                <div style={{ textAlign: 'right', fontFamily: 'var(--los-font-mono)', color: 'var(--los-accent)', fontSize: '0.8rem' }}>{journal.confidence}%</div>
              </div>
            </div>
            <div className="los-form-row">
              <label className="los-form-label">Rationale</label>
              <textarea className="los-textarea" placeholder="Why this choice? What factors matter most?" value={journal.rationale} onChange={e => setJournal(p => ({ ...p, rationale: e.target.value }))} />
            </div>
            <div className="los-form-row">
              <label className="los-form-label">Check Back Date (when to review outcome)</label>
              <input className="los-input" type="date" value={journal.outcome_date} onChange={e => setJournal(p => ({ ...p, outcome_date: e.target.value }))} />
            </div>
            <button className="los-btn los-btn-primary" onClick={saveDecision}>Log Decision ↗</button>
            <button className="los-btn los-btn-ghost" onClick={() => setShowDecisionHistory(true)}>📜 View Past Decisions</button>
          </div>
          <div className="los-card">
            <div className="los-card-title"><span className="los-dot" style={{ background: 'var(--los-accent2)' }}></span> Past Decisions</div>
            {savedDecisions.length === 0
              ? <em style={{ color: 'var(--los-text2)', fontSize: '0.8rem' }}>No decisions logged yet.</em>
              : savedDecisions.map(d => (
                <div key={d.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--los-border)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--los-text)' }}>{d.payload?.question}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--los-text3)', marginTop: 4 }}>
                    Stakes {d.payload?.stakes}/10 · Confidence {d.payload?.confidence}% · {d.date}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {activeTab === 'premortem' && (
        <div className="los-grid-2">
          <div className="los-card">
            <div className="los-card-title"><span className="los-dot"></span> Pre-Mortem Analysis</div>
            <div className="los-notif los-notif-info">Klein (2007): Imagine it's 1 year later and this decision failed catastrophically. What went wrong?</div>
            <div className="los-form-row">
              <label className="los-form-label">Decision / Plan</label>
              <input className="los-input" type="text" placeholder="What are you committing to?" value={premortem.decision} onChange={e => setPremortem(p => ({ ...p, decision: e.target.value }))} />
            </div>
            <div className="los-form-row">
              <label className="los-form-label">Failure Reasons (brainstorm all)</label>
              <textarea className="los-textarea" placeholder="If this failed, it's because... list everything." value={premortem.fail_reasons} onChange={e => setPremortem(p => ({ ...p, fail_reasons: e.target.value }))} />
            </div>
            <div className="los-form-row">
              <label className="los-form-label">Safeguards / Tripwires</label>
              <textarea className="los-textarea" placeholder="What will you watch for? At what signal do you change course?" value={premortem.safeguards} onChange={e => setPremortem(p => ({ ...p, safeguards: e.target.value }))} />
            </div>
            <button className="los-btn los-btn-primary" onClick={savePM}>Save Pre-Mortem ↗</button>
          </div>
          <div className="los-card">
            <div className="los-card-title"><span className="los-dot" style={{ background: 'var(--los-accent2)' }}></span> Why Pre-Mortems Work</div>
            <div className="los-timeline">
              {[
                { time: 'Problem', title: 'Hindsight Bias', text: 'Once we know an outcome, we think we "knew it all along." This inflates confidence in future predictions.' },
                { time: 'Solution', title: 'Prospective Hindsight', text: 'By imagining failure in advance, we activate prospective hindsight — identifying failure modes 30% more effectively (Klein 2007).' },
                { time: 'Process', title: 'How to Run It', text: '1. Commit to a decision. 2. Imagine it\'s 1 year later and it failed. 3. Generate as many failure reasons as possible. 4. Identify what would change your course.' },
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
      )}

      {activeTab === 'biases' && (
        <div className="los-grid-2">
          <div className="los-card">
            <div className="los-card-title"><span className="los-dot"></span> Bias Checklist</div>
            <ul className="los-checklist">
              {BIASES.map((b, i) => (
                <li key={i} className={biasChecks[i] ? 'done' : ''} onClick={() => setBiasChecks(p => ({ ...p, [i]: !p[i] }))}>
                  <span className={`los-check-box ${biasChecks[i] ? 'checked' : ''}`}>{biasChecks[i] ? '✓' : ''}</span>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{b.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--los-text2)' }}>{b.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="los-divider"></div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontFamily: 'var(--los-font-mono)', color: 'var(--los-accent)', fontWeight: 700 }}>
                {Object.values(biasChecks).filter(Boolean).length}/{BIASES.length} checked
              </span>
            </div>
          </div>
          <div className="los-card">
            <div className="los-card-title"><span className="los-dot" style={{ background: 'var(--los-accent2)' }}></span> The 10-10-10 Rule</div>
            <p style={{ fontSize: '0.82rem', color: 'var(--los-text2)', marginBottom: 16 }}>From Suzy Welch's research: before committing to a decision, ask:</p>
            {['In 10 minutes, how will I feel about this decision?', 'In 10 months, how will I feel about this decision?', 'In 10 years, how will I feel about this decision?'].map((q, i) => (
              <div key={i} style={{ padding: '12px 14px', background: 'var(--los-surface3)', borderRadius: 8, marginBottom: 8 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--los-accent)', fontFamily: 'var(--los-font-mono)', marginBottom: 4 }}>Question {i + 1}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--los-text)' }}>{q}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
