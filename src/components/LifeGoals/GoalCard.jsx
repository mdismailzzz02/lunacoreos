import React from 'react';
import { Target, Play, Pause, Check, Trash2, Edit2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

export default function GoalCard({ goal, onEdit, onUpdateStatus, onDelete }) {
    const [expanded, setExpanded] = React.useState(false);

    // Calculate days remaining
    const targetDate = goal.target_date ? new Date(goal.target_date) : null;
    const today = new Date();
    const isOverdue = goal.status === 'active' && targetDate && targetDate < today;
    const diffTime = targetDate ? targetDate - today : 0;
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let timeStatus = '';
    if (goal.status === 'completed') {
        timeStatus = goal.completed_at ? 'Completed ' + new Date(goal.completed_at).toLocaleDateString() : 'Completed';
    } else if (goal.status === 'abandoned') {
        timeStatus = 'Abandoned';
    } else if (!targetDate) {
        timeStatus = 'No deadline';
    } else if (isOverdue) {
        timeStatus = `Overdue by ${Math.abs(daysRemaining)} days`;
    } else {
        timeStatus = `${daysRemaining} days remaining`;
    }

    const toggleMilestone = (index) => {
        const milestones = [...(goal.milestones || [])];
        milestones[index].done = !milestones[index].done;
        const completed = milestones.filter(m => m.done).length;
        const total = milestones.length;
        const progress_pct = total > 0 ? Math.round((completed / total) * 100) : goal.progress_pct;
        onUpdateStatus(goal.id, { milestones, progress_pct });
    };

    return (
        <div className={`goal-card ${isOverdue ? 'overdue' : ''}`}>
            <div className="goal-header">
                <div className="goal-title-area">
                    <h3 className="goal-title">
                        {goal.title}
                        {isOverdue && <AlertTriangle size={15} color="#ef4444" />}
                    </h3>
                    <div className="goal-meta">
                        <span className="goal-category-tag">{goal.category}</span>
                        <span style={{ color: isOverdue ? '#ef4444' : 'inherit' }}>{timeStatus}</span>
                    </div>
                </div>
                <div className="goal-right-actions">
                    <div className={`goal-badge ${goal.status}`}>{goal.status}</div>
                    <button className="icon-btn" onClick={() => setExpanded(!expanded)}>
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            <div className="goal-progress-wrap">
                <div
                    className={`goal-progress-fill ${goal.status === 'completed' ? 'completed' : ''}`}
                    style={{ width: `${goal.progress_pct || 0}%` }}
                />
            </div>
            <div className="goal-progress-meta">
                <span>Progress</span>
                <span>{goal.progress_pct || 0}%</span>
            </div>

            {expanded && (
                <div className="goal-expanded">
                    {goal.description && (
                        <p className="goal-description">{goal.description}</p>
                    )}

                    {goal.milestones && goal.milestones.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div className="goal-milestones-label">Milestones</div>
                            {goal.milestones.map((m, i) => (
                                <div key={i} className={`goal-milestone-item ${m.done ? 'done' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={m.done}
                                        onChange={() => toggleMilestone(i)}
                                    />
                                    <span>{m.title}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="goal-actions">
                        <button className="goal-action-btn" onClick={() => onEdit(goal)}>
                            <Edit2 size={14} /> Edit
                        </button>

                        {goal.status !== 'completed' && (
                            <button
                                className="goal-action-btn complete"
                                onClick={() => onUpdateStatus(goal.id, { status: 'completed', progress_pct: 100, completed_at: new Date().toISOString() })}
                            >
                                <Check size={14} /> Complete
                            </button>
                        )}

                        {goal.status === 'active' ? (
                            <button className="goal-action-btn" onClick={() => onUpdateStatus(goal.id, { status: 'paused' })}>
                                <Pause size={14} /> Pause
                            </button>
                        ) : goal.status !== 'completed' ? (
                            <button className="goal-action-btn" onClick={() => onUpdateStatus(goal.id, { status: 'active' })}>
                                <Play size={14} /> Resume
                            </button>
                        ) : null}

                        {goal.status !== 'abandoned' && goal.status !== 'completed' && (
                            <button className="goal-action-btn danger" onClick={() => onUpdateStatus(goal.id, { status: 'abandoned' })}>
                                Abandon
                            </button>
                        )}

                        <button className="goal-action-btn danger" style={{ marginLeft: 'auto' }} onClick={() => onDelete(goal.id)}>
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
