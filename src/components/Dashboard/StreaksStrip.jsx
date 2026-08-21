import { useEffect, useState } from 'react';
import * as api from '../../services/api';
import { Flame } from 'lucide-react';

export default function StreaksStrip({ onNavigate }) {
    const [streaks, setStreaks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        api.getStreaks().then(data => {
            if (!mounted) return;
            // Only show active habits that have a streak > 0 or are being actively tracked
            const active = (data || []).filter(s => s.status === 'active');
            setStreaks(active);
            setLoading(false);
        }).catch(err => {
            console.error('Failed to load streaks:', err);
            if (mounted) setLoading(false);
        });
        return () => { mounted = false; };
    }, []);

    if (loading) return <div className="dashboard-card pulse" style={{ height: '80px', flex: '1 1 300px' }}></div>;

    return (
        <div className="dashboard-card fade-in" style={{ padding: '1rem', flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 className="card-title">
                <Flame size={16} /> Active Streaks
            </h3>

            {streaks.length === 0 ? (
                <div className="interactive-card" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)' }} onClick={() => onNavigate('streaks')}>
                    Start tracking habits in the Streaks tab
                </div>
            ) : (
                <div className="streaks-strip" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px' }}>
                    {streaks.map(s => (
                        <div key={s.streak_id} className="streak-badge interactive-card fade-in" onClick={() => onNavigate('streaks')} style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px',
                            borderRadius: '12px', background: 'var(--surface-light)', whiteSpace: 'nowrap',
                            border: '1px solid var(--border)', cursor: 'pointer'
                        }}>
                            <span style={{ fontSize: '1.2rem', color: s.current_streak > 0 ? '#f97316' : 'var(--text-muted)' }}>🔥</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>{s.title}</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    {s.current_streak} {s.current_streak === 1 ? 'day' : 'days'} • Max {s.longest_streak}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}


