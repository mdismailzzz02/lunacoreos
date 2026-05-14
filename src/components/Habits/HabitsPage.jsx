import { useState, useEffect } from 'react';
import { useHabits } from '../../hooks/useHabits';
import { SkeletonCard } from '../Shared/Skeleton';

const COLORS = ['#4caf7d', '#e8a045', '#6baed6', '#e05c5c', '#a78bfa', '#f472b6', '#34d399'];

function Heatmap({ logs }) {
    const logSet = {};
    (logs || []).forEach(l => { logSet[String(l.date).substring(0, 10)] = l.status === 'completed'; });

    const days = [];
    for (let i = 89; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        days.push({ date: dateStr, done: logSet[dateStr] });
    }

    return (
        <div className="heatmap-grid">
            {days.map(d => (
                <div
                    key={d.date}
                    className="heat-sq"
                    data-tip={d.date}
                    style={d.done ? { background: 'var(--success)', opacity: 0.85 } : {}}
                    title={d.date + (d.done ? ' ✓' : '')}
                />
            ))}
        </div>
    );
}

export default function HabitsPage() {
    const { habits, todayHabits, loading, create, archive, log, getLogs } = useHabits();
    const [showForm, setShowForm] = useState(false);
    const [logs, setLogs] = useState({});
    const [animating, setAnimating] = useState({});
    const [form, setForm] = useState({ name: '', icon: '⭐', color: COLORS[0], frequency: 'daily', custom_days: '', unit: 'times', target_value: '1', category: '', notes: '' });

    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        habits.forEach(async (h) => {
            const data = await getLogs(h.habit_id, {});
            setLogs(l => ({ ...l, [h.habit_id]: data || [] }));
        });
    }, [habits]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleLog = async (habit) => {
        setAnimating(a => ({ ...a, [habit.habit_id]: true }));
        await log({ habit_id: habit.habit_id, date: today, status: 'completed' });
        setTimeout(() => setAnimating(a => { const n = { ...a }; delete n[habit.habit_id]; return n; }), 800);
    };

    const dayLogs = {};
    Object.values(logs).flat().forEach(l => {
        if (l.status === 'completed') dayLogs[l.habit_id] = (dayLogs[l.habit_id] || 0) + 1;
    });
    const todayLogDone = new Set(
        Object.values(logs).flat().filter(l => String(l.date).substring(0, 10) === today && l.status === 'completed').map(l => l.habit_id)
    );

    const submit = async (e) => {
        e.preventDefault();
        await create(form);
        setShowForm(false);
        setForm({ name: '', icon: '⭐', color: COLORS[0], frequency: 'daily', custom_days: '', unit: 'times', target_value: '1', category: '', notes: '' });
    };

    if (loading) return <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>;

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>🔥 Habits</h2>
                <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ New Habit</button>
            </div>

            {/* Today section */}
            <div className="card">
                <div className="section-title">Today — {today}</div>
                {todayHabits.length === 0 ? (
                    <div className="empty-state"><div className="empty-emoji">🌱</div><p>No habits scheduled for today</p></div>
                ) : (
                    todayHabits.map(habit => {
                        const done = todayLogDone.has(habit.habit_id);
                        return (
                            <div key={habit.habit_id} className={`habit-row ${animating[habit.habit_id] ? 'habit-complete-anim' : ''}`}>
                                <div className="habit-dot" style={{ background: habit.color || '#4caf7d' }} />
                                <span className="habit-icon">{habit.icon || '⭐'}</span>
                                <span className="habit-name">{habit.name}</span>
                                <div className="habit-measure">
                                    {habit.unit && <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{habit.target_value} {habit.unit}</span>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700 }}>
                                        🔥 {habit.current_streak || 0} day streak
                                    </div>
                                    <button
                                        className={`check-circle ${done ? 'checked' : ''}`}
                                        onClick={() => !done && handleLog(habit)}
                                        disabled={done}
                                    >
                                        {done ? '✓' : ''}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* All habits with heatmaps */}
            <div className="card">
                <div className="section-title">90-Day Heatmaps</div>
                {habits.length === 0 ? (
                    <div className="empty-state"><div className="empty-emoji">🌿</div><p>Create habits to see your progress</p></div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {habits.map(habit => (
                            <div key={habit.habit_id}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                    <div className="habit-dot" style={{ background: habit.color || '#4caf7d', width: 12, height: 12 }} />
                                    <span style={{ fontSize: '1.1rem' }}>{habit.icon || '⭐'}</span>
                                    <span style={{ fontWeight: 600 }}>{habit.name}</span>
                                    <span style={{ color: 'var(--accent)', fontSize: '0.78rem', marginLeft: 'auto' }}>
                                        🔥 {habit.current_streak || 0} · Best: {habit.longest_streak || 0}
                                    </span>
                                    <button className="btn btn-ghost btn-sm" onClick={() => archive(habit.habit_id)}>Archive</button>
                                </div>
                                <Heatmap logs={logs[habit.habit_id] || []} />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">New Habit 🔥</div>
                        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.75rem', alignItems: 'end' }}>
                                <div className="field-group">
                                    <label className="field-label">Icon</label>
                                    <input className="field-input" style={{ width: 60, textAlign: 'center', fontSize: '1.4rem' }} value={form.icon} onChange={e => set('icon', e.target.value)} maxLength={2} />
                                </div>
                                <div className="field-group">
                                    <label className="field-label">Name *</label>
                                    <input className="field-input" placeholder="e.g. Morning Run" value={form.name} onChange={e => set('name', e.target.value)} required />
                                </div>
                            </div>
                            <div className="field-group">
                                <label className="field-label">Color</label>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {COLORS.map(c => (
                                        <div key={c} onClick={() => set('color', c)}
                                            style={{
                                                width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer',
                                                outline: form.color === c ? '2px solid white' : 'none', outlineOffset: 2
                                            }} />
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div className="field-group">
                                    <label className="field-label">Frequency</label>
                                    <select className="field-input" value={form.frequency} onChange={e => set('frequency', e.target.value)}>
                                        <option value="daily">Daily</option>
                                        <option value="weekdays">Weekdays</option>
                                        <option value="weekends">Weekends</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                </div>
                                {form.frequency === 'custom' && (
                                    <div className="field-group">
                                        <label className="field-label">Days (Mon,Tue,...)</label>
                                        <input className="field-input" placeholder="Mon,Wed,Fri" value={form.custom_days} onChange={e => set('custom_days', e.target.value)} />
                                    </div>
                                )}
                                <div className="field-group">
                                    <label className="field-label">Target</label>
                                    <input type="number" min="1" className="field-input" value={form.target_value} onChange={e => set('target_value', e.target.value)} />
                                </div>
                                <div className="field-group">
                                    <label className="field-label">Unit</label>
                                    <input className="field-input" placeholder="times, minutes, pages..." value={form.unit} onChange={e => set('unit', e.target.value)} />
                                </div>
                            </div>
                            <div className="field-group">
                                <label className="field-label">Category</label>
                                <input className="field-input" placeholder="Health, Learning, etc." value={form.category} onChange={e => set('category', e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Habit 🔥</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
