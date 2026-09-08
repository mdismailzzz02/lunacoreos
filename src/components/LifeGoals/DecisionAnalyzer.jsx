import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, Clock, ShieldAlert, Save } from 'lucide-react';
import { getLifeGoals, createDecisionAnalysis, getFinancialContext, getGlobalAiContext } from '../../services/api';
import { analyzeDecision, askDecisionFollowUp } from '../../services/gemini';

export default function DecisionAnalyzer({ onHistoryUpdate }) {
    const [activityName, setActivityName] = useState('');
    const [activityDesc, setActivityDesc] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);

    const [followUpInput, setFollowUpInput] = useState('');
    const [followUpHistory, setFollowUpHistory] = useState([]);
    const [followUpLoading, setFollowUpLoading] = useState(false);

    // Listen for history item loads
    useEffect(() => {
        if (window.__lgLoadAnalysis) {
            const h = window.__lgLoadAnalysis;
            setActivityName(h.activity_name);
            setActivityDesc(h.activity_description || '');
            setResult(h.analysis_result);
            setSaved(true);
            window.__lgLoadAnalysis = null;
        }
    });

    const handleAnalyze = async () => {
        if (!activityName.trim()) return;
        setLoading(true);
        setError('');
        setResult(null);
        setSaved(false);

        try {
            const globalContext = await getGlobalAiContext();
            const apiKey = import.meta.env.VITE_GROQ_API_KEY;
            
            const aiResult = await analyzeDecision(apiKey, activityName, activityDesc, globalContext);
            setResult(aiResult);
        } catch (err) {
            console.error("AI Analysis failed", err);
            setError(err.message || 'Failed to analyze decision.');
        } finally {
            setLoading(false);
        }
    };

    const handleFollowUp = async () => {
        if (!followUpInput.trim() || !result) return;
        
        const question = followUpInput.trim();
        setFollowUpInput('');
        const newHistory = [...followUpHistory, { role: 'user', content: question }];
        setFollowUpHistory(newHistory);
        setFollowUpLoading(true);

        try {
            const apiKey = import.meta.env.VITE_GROQ_API_KEY;
            
            // Fetch fresh context so the AI has up-to-date info
            const globalContext = await getGlobalAiContext();

            const responseText = await askDecisionFollowUp(apiKey, activityName, result, question, globalContext);
            setFollowUpHistory([...newHistory, { role: 'assistant', content: responseText }]);
        } catch (err) {
            console.error("Follow up failed", err);
            setFollowUpHistory([...newHistory, { role: 'assistant', content: 'Sorry, I encountered an error answering that.' }]);
        } finally {
            setFollowUpLoading(false);
        }
    };

    const handleSaveAnalysis = async () => {
        if (!result) return;
        try {
            await createDecisionAnalysis({
                id: `DA-${Date.now()}`,
                activity_name: activityName,
                activity_description: activityDesc,
                analysis_result: result,
                verdict: result.verdict
            });
            setSaved(true);
            if (onHistoryUpdate) onHistoryUpdate();
        } catch (err) {
            console.error("Failed to save", err);
            setError("Failed to save analysis.");
        }
    };

    const handleReset = () => {
        setActivityName('');
        setActivityDesc('');
        setResult(null);
        setError('');
        setSaved(false);
        window.__lgLoadAnalysis = null;
    };

    return (
        <div className="da-analyzer">
            {/* Input Form */}
            <div className="da-form-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Brain size={20} color="var(--accent)" />
                        <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Decision Intelligence</span>
                    </div>
                    {result && (
                        <button className="icon-btn" onClick={handleReset} style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                            Reset
                        </button>
                    )}
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Considering something new? Enter it below and AI will analyze the long-term trajectory, time risks, and impact on your existing goals.
                </p>

                <div className="da-input-group">
                    <label>What are you considering starting?</label>
                    <input
                        type="text"
                        className="premium-input"
                        value={activityName}
                        onChange={e => setActivityName(e.target.value)}
                        placeholder="e.g. Modding Android ROMs, Learning Rust, Starting a YouTube channel..."
                    />
                </div>
                <div className="da-input-group">
                    <label>Context (optional)</label>
                    <textarea
                        rows="2"
                        className="premium-input"
                        value={activityDesc}
                        onChange={e => setActivityDesc(e.target.value)}
                        placeholder="What's drawing you to this right now?"
                        style={{ resize: 'vertical' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                    <button
                        className="btn-glow"
                        onClick={handleAnalyze}
                        disabled={loading || !activityName.trim()}
                        style={{ flex: 1 }}
                    >
                        {loading ? (
                            <><Sparkles size={18} className="spin" /> Analyzing Trajectory...</>
                        ) : (
                            <><Brain size={18} /> Analyze Trajectory</>
                        )}
                    </button>
                    {(activityName || activityDesc) && !result && (
                        <button className="goal-action-btn" onClick={handleReset} style={{ padding: '0 20px' }}>
                            Clear
                        </button>
                    )}
                </div>
                {error && <div className="da-error">{error}</div>}
            </div>

            {/* ─── AI Result ─── */}
            {result && (
                <div className="da-result">
                    {/* Verdict */}
                    <div className={`da-verdict-card ${result.verdict}`}>
                        <div className="verdict-label">Verdict: {result.verdict?.toUpperCase()}</div>
                        {result.verdict_reason && <div className="verdict-reason">{result.verdict_reason}</div>}
                    </div>

                    {/* Time / Opportunity */}
                    <div className="da-info-grid">
                        <div className="da-info-box">
                            <div className="info-label"><Clock size={13} /> Time Risk</div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                If hooked: <strong>{result.time_investment?.if_hooked}</strong>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                Total risk: {result.time_investment?.total_risk}
                            </div>
                        </div>
                        <div className="da-info-box">
                            <div className="info-label"><ShieldAlert size={13} /> Opportunity Cost</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                {result.opportunity_cost}
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    {result.stages && result.stages.length > 0 && (
                        <div className="da-timeline-section">
                            <h4>Predicted Trajectory</h4>
                            <div className="ai-timeline">
                                {result.stages.map((stage, idx) => (
                                    <div key={idx} className={`ai-stage ${!stage.reversible ? 'danger' : idx > 1 ? 'warning' : ''}`}>
                                        <div className="ai-stage-dot" />
                                        <div className="ai-stage-content">
                                            <div className="ai-stage-header">
                                                <span className="ai-stage-title">Stage {stage.stage_number}: {stage.stage_name}</span>
                                                <span className="ai-stage-duration">{stage.duration}</span>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                                                {stage.description}
                                            </div>
                                            {stage.affected_goals?.length > 0 && (
                                                <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '8px' }}>
                                                    <strong>Goals stalled:</strong> {stage.affected_goals.join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Goal Impact */}
                    {result.goal_impact?.length > 0 && (
                        <div className="da-impact-section">
                            <h4>Impact on Your Goals</h4>
                            {result.goal_impact.map((gi, idx) => (
                                <div key={idx} className="da-impact-item">
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{gi.goal_title}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '3px' }}>{gi.explanation}</div>
                                    </div>
                                    <span className={`da-impact-badge ${gi.impact}`}>{gi.impact}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Recommendation */}
                    {result.recommendation && (
                        <div className="da-recommendation">
                            <h4>Final Recommendation</h4>
                            <div style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>{result.recommendation}</div>
                        </div>
                    )}

                    {/* Save */}
                    <div className="da-action-row" style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px' }}>
                        {saved ? (
                            <span style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 600 }}>✓ Saved to history</span>
                        ) : (
                            <button className="goal-action-btn" onClick={handleSaveAnalysis} style={{ gap: '6px' }}>
                                <Save size={14} /> Save Analysis
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ─── AI Follow Up Section ─── */}
            {result && (
                <div className="da-follow-up-card" style={{ marginTop: '20px', background: 'rgba(20, 20, 20, 0.4)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <Brain size={16} color="var(--accent)" />
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Dig Deeper</span>
                    </div>
                    
                    {followUpHistory.map((msg, i) => (
                        <div key={i} style={{ marginBottom: '12px', padding: '12px', borderRadius: '10px', background: msg.role === 'user' ? 'rgba(255,255,255,0.03)' : 'rgba(var(--accent-rgb), 0.05)', borderLeft: msg.role === 'assistant' ? '2px solid var(--accent)' : 'none', fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                            <strong>{msg.role === 'user' ? 'You' : 'AI'}:</strong> {msg.content}
                        </div>
                    ))}

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <input
                            type="text"
                            className="premium-input"
                            value={followUpInput}
                            onChange={e => setFollowUpInput(e.target.value)}
                            placeholder="Ask a follow up question..."
                            onKeyDown={e => e.key === 'Enter' && handleFollowUp()}
                            style={{ flex: 1 }}
                        />
                        <button className="btn-glow" onClick={handleFollowUp} disabled={followUpLoading || !followUpInput.trim()}>
                            {followUpLoading ? <Sparkles size={16} className="spin" /> : 'Ask'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
