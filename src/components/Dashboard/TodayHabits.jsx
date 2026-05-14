import { useState } from 'react';
import { useHabits } from '../../hooks/useHabits';

export default function TodayHabits({ habits, logs }) {
    const { log } = useHabits();
    const [animating, setAnimating] = useState({});
    const today = new Date().toISOString().split('T')[0];

    const loggedIds = new Set(
        (logs || []).filter(l => l.status === 'completed').map(l => l.habit_id)
    );
    const done = loggedIds.size;

    const handleCheck = async (habit) => {
        if (loggedIds.has(habit.habit_id)) return;
        setAnimating(a => ({ ...a, [habit.habit_id]: true }));
        await log({ habit_id: habit.habit_id, date: today, status: 'completed' });
        setTimeout(() => setAnimating(a => { const n = { ...a }; delete n[habit.habit_id]; return n; }), 800);
    };

    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="section-title">Today's Habits</div>

            {habits.length > 0 && (
                <>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {done} of {habits.length} complete
                    </div>
                    <div className="progress-bar-wrap">
                        <div className="progress-bar-fill" style={{ width: `${Math.round(done / habits.length * 100)}%` }} />
                    </div>
                </>
            )}

            {habits.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-emoji">🌱</div>
                    <p>No habits created yet</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {habits.map(habit => {
                        const checked = loggedIds.has(habit.habit_id);
                        return (
                            <div
                                key={habit.habit_id}
                                className={`habit-row ${animating[habit.habit_id] ? 'habit-complete-anim' : ''}`}
                            >
                                <div className="habit-dot" style={{ background: habit.color || '#4caf7d' }} />
                                <span className="habit-icon">{habit.icon || '⭐'}</span>
                                <span className="habit-name">{habit.name}</span>
                                <button
                                    className={`check-circle ${checked ? 'checked' : ''}`}
                                    onClick={() => handleCheck(habit)}
                                    disabled={checked}
                                >
                                    {checked ? '✓' : ''}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
