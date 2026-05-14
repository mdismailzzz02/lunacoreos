import { useState } from 'react';

export default function ConclusionModal({ todo, onComplete, onClose }) {
    const [remarks, setRemarks] = useState(todo.notes || '');
    const [outcome, setOutcome] = useState(todo.outcome_status || 'completed');
    const [learning, setLearning] = useState(todo.learning || '');

    // Critical rule: checkbox stays disabled until conclusion_remarks typed
    const canComplete = remarks.trim().length > 0;

    const submit = () => {
        if (!canComplete) return;
        onComplete({ conclusion_remarks: remarks, final_outcome: outcome, learning });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-title">✅ Complete This Todo</div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>{todo.title}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="field-group">
                        <label className="field-label">How did it go? *</label>
                        <select className="field-input" value={outcome} onChange={e => setOutcome(e.target.value)}>
                            <option value="completed">✅ Completed fully</option>
                            <option value="partial">🔶 Partially done</option>
                            <option value="delegated">➡️ Delegated</option>
                        </select>
                    </div>

                    <div className="field-group">
                        <label className="field-label">
                            Conclusion Remarks * <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(required to mark complete)</span>
                        </label>
                        <textarea
                            className="field-input"
                            placeholder="What happened? What did you accomplish or learn?"
                            value={remarks}
                            onChange={e => setRemarks(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <div className="field-group">
                        <label className="field-label">Key Learning (optional)</label>
                        <input
                            className="field-input"
                            placeholder="Any insight from this task?"
                            value={learning}
                            onChange={e => setLearning(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button
                            className="btn btn-primary"
                            disabled={!canComplete}
                            onClick={submit}
                            title={!canComplete ? 'Please write your conclusion remarks first' : ''}
                        >
                            ✅ Mark Complete
                        </button>
                    </div>

                    {!canComplete && (
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                            Write your conclusion to enable the complete button
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
