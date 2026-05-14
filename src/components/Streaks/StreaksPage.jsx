import { useState, useEffect } from 'react';
import * as api from '../../services/api';

export default function StreaksPage() {
    const [streaks, setStreaks] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [formData, setFormData] = useState({ name: '', emoji: '🔥', description: '' });

    useEffect(() => {
        loadData();
    }, []);

    const toLocalDateString = (date) => {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const getLocalToday = () => toLocalDateString(new Date());

    const loadData = async () => {
        try {
            const [sData, lData] = await Promise.all([api.getStreaks(), api.getStreakLogs()]);
            setStreaks(sData || []);
            setLogs(lData || []);
        } catch (err) {
            console.error('Failed to load streaks data', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        const newStreak = {
            id: Date.now().toString(),
            ...formData,
            created_at: new Date().toISOString()
        };
        try {
            await api.saveStreak(newStreak);
            setStreaks([...streaks, newStreak]);
            setShowAdd(false);
            setFormData({ name: '', emoji: '🔥', description: '' });
        } catch (err) {
            alert('Failed to add streak');
        }
    };

    const handleCheckIn = async (streakId) => {
        const today = getLocalToday();
        try {
            await api.logStreak(streakId, today);
            // Refresh logs
            const updatedLogs = await api.getStreakLogs();
            setLogs(updatedLogs || []);
        } catch (err) {
            alert('Failed to check in');
        }
    };

    const calculateCurrentStreak = (streakId) => {
        const streakLogs = logs
            .filter(l => String(l.streak_id) === String(streakId))
            .map(l => toLocalDateString(l.date))
            .sort((a, b) => b.localeCompare(a));

        if (streakLogs.length === 0) return 0;

        let count = 0;
        let checkDate = new Date();
        const todayStr = getLocalToday();

        // If today isn't logged, check if yesterday was logged (streak still active)
        if (!streakLogs.includes(todayStr)) {
            checkDate.setDate(checkDate.getDate() - 1);
        }

        while (true) {
            const dStr = toLocalDateString(checkDate);
            if (streakLogs.includes(dStr)) {
                count++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
        return count;
    };

    const isTodayLogged = (streakId) => {
        const today = getLocalToday();
        return logs.some(l => String(l.streak_id) === String(streakId) && toLocalDateString(l.date) === today);
    };

    const ActivityGraph = ({ streakId }) => {
        const days = [];
        const today = new Date();

        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dStr = toLocalDateString(d);
            const isLogged = logs.some(l => String(l.streak_id) === String(streakId) && toLocalDateString(l.date) === dStr);
            days.push({ date: dStr, isLogged });
        }

        return (
            <div style={{ display: 'flex', gap: '3px', marginTop: '0.5rem' }}>
                {days.map((day, idx) => (
                    <div
                        key={idx}
                        title={day.date}
                        style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '2px',
                            background: day.isLogged ? 'var(--brand-color, #a29bfe)' : 'rgba(255,255,255,0.05)',
                            transition: 'all 0.2s'
                        }}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="fade-in" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2rem' }}>🔥 Streaks</h1>
                    <p style={{ margin: '5px 0 0 0', opacity: 0.6 }}>Consistency is the only rule. Track your wins.</p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    + New Streak
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                    <div className="spinner" />
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {streaks.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', opacity: 0.5, border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '20px' }}>
                            You haven't defined any streaks yet. What do you want to stay consistent with?
                        </div>
                    )}
                    {streaks.map(streak => {
                        const count = calculateCurrentStreak(streak.id);
                        const doneToday = isTodayLogged(streak.id);

                        return (
                            <div key={streak.id} style={{
                                background: 'var(--card-bg)',
                                borderRadius: '24px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                padding: '1.5rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                opacity: doneToday ? 1 : 0.85
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontSize: '1.8rem' }}>{streak.emoji || '🔥'}</span>
                                        <div>
                                            <h3 style={{ margin: 0 }}>{streak.name}</h3>
                                            <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.5 }}>{streak.description}</p>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{count}</div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase' }}>Day Streak</div>
                                    </div>
                                </div>

                                <div>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.4, textTransform: 'uppercase', marginBottom: '4px' }}>30 Day Activity</div>
                                    <ActivityGraph streakId={streak.id} />
                                </div>

                                <button
                                    onClick={() => handleCheckIn(streak.id)}
                                    disabled={doneToday}
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        borderRadius: '16px',
                                        border: 'none',
                                        background: doneToday ? 'rgba(46, 204, 113, 0.2)' : 'var(--brand-color, #a29bfe)',
                                        color: doneToday ? '#2ecc71' : 'white',
                                        fontWeight: 'bold',
                                        cursor: doneToday ? 'default' : 'pointer',
                                        transition: 'all 0.2s',
                                        fontSize: '1rem'
                                    }}
                                >
                                    {doneToday ? '✓ Done for Today' : 'Mark as Done'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {showAdd && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: '24px', width: '400px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h2 style={{ marginTop: 0 }}>Add New Streak</h2>
                        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <input
                                    type="text"
                                    placeholder="🔥"
                                    style={{ width: '60px', padding: '0.9rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textAlign: 'center' }}
                                    value={formData.emoji}
                                    onChange={e => setFormData({ ...formData, emoji: e.target.value })}
                                />
                                <input
                                    type="text"
                                    placeholder="Streak Name (e.g., No Sugar)"
                                    required
                                    style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <textarea
                                placeholder="Short description or why you're doing this..."
                                rows={3}
                                style={{ padding: '0.9rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', resize: 'none' }}
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Create Streak</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
