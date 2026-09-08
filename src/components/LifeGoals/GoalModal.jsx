import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

export default function GoalModal({ goal, onClose, onSave }) {
    const isEdit = !!goal;
    const [title, setTitle] = useState(goal?.title || '');
    const [description, setDescription] = useState(goal?.description || '');
    const [category, setCategory] = useState(goal?.category || 'Personal');
    const [priority, setPriority] = useState(goal?.priority || 'medium');
    const [targetDate, setTargetDate] = useState(goal?.target_date || '');
    const [milestones, setMilestones] = useState(goal?.milestones || []);

    const addMilestone = () => {
        setMilestones([...milestones, { title: '', done: false }]);
    };

    const updateMilestone = (index, value) => {
        const updated = [...milestones];
        updated[index].title = value;
        setMilestones(updated);
    };

    const removeMilestone = (index) => {
        const updated = [...milestones];
        updated.splice(index, 1);
        setMilestones(updated);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        let pct = goal?.progress_pct || 0;
        if (milestones.length > 0) {
            const completed = milestones.filter(m => m.done).length;
            pct = Math.round((completed / milestones.length) * 100);
        }

        onSave({
            ...(goal || {}),
            title,
            description,
            category,
            priority,
            target_date: targetDate || null,
            milestones: milestones.filter(m => m.title.trim() !== ''),
            progress_pct: pct
        });
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)',
            animation: 'lgFadeUp 0.2s ease'
        }}>
            <div style={{
                width: '100%', maxWidth: '520px',
                background: 'linear-gradient(160deg, rgba(30,32,42,0.98), rgba(18,20,28,0.99))',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                maxHeight: '90vh', boxShadow: '0 30px 80px rgba(0,0,0,0.5)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>{isEdit ? 'Edit Goal' : 'New Goal'}</h3>
                    <button className="icon-btn" onClick={onClose}><X size={20} /></button>
                </div>

                {/* Form */}
                <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
                    <form id="goal-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="da-input-group">
                            <label>Goal Title</label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="e.g. Master React Native"
                                className="premium-input"
                            />
                        </div>

                        <div className="da-input-group">
                            <label>Description & Why</label>
                            <textarea
                                rows="3"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Why is this important? What's the motivation?"
                                className="premium-input"
                                style={{ resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="da-input-group">
                                <label>Category</label>
                                <select
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    className="premium-input"
                                >
                                    <option value="Career">Career</option>
                                    <option value="Health">Health</option>
                                    <option value="Learning">Learning</option>
                                    <option value="Financial">Financial</option>
                                    <option value="Personal">Personal</option>
                                    <option value="Creative">Creative</option>
                                </select>
                            </div>
                            <div className="da-input-group">
                                <label>Priority</label>
                                <select
                                    value={priority}
                                    onChange={e => setPriority(e.target.value)}
                                    className="premium-input"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical</option>
                                </select>
                            </div>
                        </div>

                        <div className="da-input-group">
                            <label>Target Date</label>
                            <input
                                type="date"
                                value={targetDate}
                                onChange={e => setTargetDate(e.target.value)}
                                className="premium-input"
                                style={{ colorScheme: 'dark' }}
                            />
                        </div>

                        <div className="da-input-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ margin: 0 }}>Milestones</label>
                                <button
                                    type="button"
                                    onClick={addMilestone}
                                    style={{
                                        background: 'none', border: 'none', color: 'var(--accent)',
                                        fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600
                                    }}
                                >
                                    <Plus size={14} /> Add Step
                                </button>
                            </div>

                            {milestones.length === 0 ? (
                                <div style={{
                                    fontSize: '0.82rem', color: 'var(--text-secondary)',
                                    padding: '10px 12px', background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.08)'
                                }}>
                                    No milestones added. Progress tracked manually 0–100%.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                                    {milestones.map((m, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input
                                                type="text"
                                                value={m.title}
                                                onChange={e => updateMilestone(i, e.target.value)}
                                                placeholder={`Step ${i + 1}...`}
                                                className="premium-input"
                                                style={{ flex: 1, padding: '9px 12px', fontSize: '0.88rem' }}
                                            />
                                            <button type="button" className="icon-btn" onClick={() => removeMilestone(i)}>
                                                <Trash2 size={15} color="#ef4444" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '1rem 1.5rem',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', justifyContent: 'flex-end', gap: '10px'
                }}>
                    <button type="button" className="goal-action-btn" onClick={onClose}>Cancel</button>
                    <button type="submit" form="goal-form" className="btn-glow" style={{ padding: '10px 24px', fontSize: '0.9rem' }}>
                        {isEdit ? 'Save Changes' : 'Create Goal'}
                    </button>
                </div>
            </div>
        </div>
    );
}
