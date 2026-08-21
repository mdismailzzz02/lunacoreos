import { useEffect, useState } from 'react';
import { lifeosSupabase } from '../../services/lifeosSupabaseClient';
import { Target } from 'lucide-react';

const CAT_COLORS = {
    Academic: 'var(--los-accent, #a855f7)', 
    Project: 'var(--los-accent2, #3b82f6)', 
    Health: 'var(--los-green, #22c55e)',
    Finance: 'var(--los-blue, #0ea5e9)', 
    Relationships: 'var(--los-accent3, #ec4899)', 
    Skills: 'var(--los-yellow, #eab308)', 
    General: 'var(--los-text3, #9ca3af)'
};

export default function ActiveGoals({ onNavigate }) {
    const [okrs, setOkrs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        
        const fetchGoals = async () => {
            try {
                const { data, error } = await lifeosSupabase
                    .from('life_logs')
                    .select('*')
                    .eq('type', 'okr')
                    .order('created_at', { ascending: false })
                    .limit(2);
                
                if (error) throw error;
                if (mounted) {
                    setOkrs(data || []);
                    setLoading(false);
                }
            } catch (err) {
                console.error('Failed to load active goals:', err);
                if (mounted) setLoading(false);
            }
        };

        fetchGoals();
        return () => { mounted = false; };
    }, []);

    if (loading) return <div className="dashboard-card pulse" style={{ height: '180px', flex: '1 1 300px' }}></div>;

    return (
        <div className="dashboard-card fade-in" style={{ padding: '1.5rem', flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title">
                    <div className="icon-backdrop" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                        <Target size={16} />
                    </div>
                    Active Goals
                </h3>
                <span className="interactive-text" style={{ fontSize: '0.8rem', cursor: 'pointer', color: 'var(--accent)', fontWeight: 'bold' }} onClick={() => onNavigate('lifeos')}>
                    LifeOS
                </span>
            </div>

            {okrs.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    No active OKRs set in LifeOS yet.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {okrs.map(okr => {
                        const progress = okr.key_results?.length
                            ? Math.round(okr.key_results.reduce((s, kr) => s + (kr.progress || 0), 0) / okr.key_results.length)
                            : 0;
                        const color = CAT_COLORS[okr.category] || 'var(--accent)';
                        
                        return (
                            <div key={okr.id} className="interactive-scale" onClick={() => onNavigate('lifeos')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{okr.objective}</div>
                                        <div style={{ fontSize: '0.7rem', color: color, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold', marginTop: '2px' }}>
                                            {okr.category}
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: '800', color: 'var(--text)', fontSize: '1.1rem' }}>
                                        {progress}%
                                    </div>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: 'var(--surface-light)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${progress}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.3s ease' }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
