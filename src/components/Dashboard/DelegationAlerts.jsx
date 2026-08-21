import { useEffect, useState } from 'react';
import * as api from '../../services/api';
import { Users, AlertTriangle, Sparkles } from 'lucide-react';

export default function DelegationAlerts({ onNavigate }) {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        api.getDelegation().then(data => {
            if (!mounted) return;
            const items = data || [];
            
            const todayStr = new Date().toLocaleDateString('en-CA');
            const now = new Date();
            const oneWeekAgo = new Date(now.setDate(now.getDate() - 7)).toISOString();
            
            const activeAlerts = items.filter(i => {
                if (i.status === 'completed' || i.status === 'archived') return false;
                const isOverdue = i.due_date && i.due_date < todayStr;
                const isNew = i.added_at && i.added_at >= oneWeekAgo;
                return isOverdue || isNew;
            });

            activeAlerts.sort((a, b) => {
                const aOver = a.due_date && a.due_date < todayStr ? 1 : 0;
                const bOver = b.due_date && b.due_date < todayStr ? 1 : 0;
                if (aOver !== bOver) return bOver - aOver;
                return new Date(b.added_at || 0) - new Date(a.added_at || 0);
            });

            setAlerts(activeAlerts.slice(0, 3));
            setLoading(false);
        }).catch(err => {
            console.error('Failed to load delegation alerts:', err);
            if (mounted) setLoading(false);
        });
        return () => { mounted = false; };
    }, []);

    if (loading) return <div className="dashboard-card pulse" style={{ height: '150px' }}></div>;

    if (alerts.length === 0) return null; 

    return (
        <div className="dashboard-card fade-in" style={{ padding: '1.2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '4px solid var(--accent)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title">
                    <Users size={16} /> Delegation Alerts
                </h3>
                <span className="interactive-text" style={{ fontSize: '0.8rem', cursor: 'pointer', color: 'var(--accent)', fontWeight: 'bold' }} onClick={() => onNavigate('delegation')}>
                    Manage
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {alerts.map(a => {
                    const todayStr = new Date().toLocaleDateString('en-CA');
                    const isOverdue = a.due_date && a.due_date < todayStr;
                    return (
                        <div key={a.id} className="interactive-card" onClick={() => onNavigate('delegation')} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px', borderRadius: '8px', background: 'var(--surface-light)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                            {isOverdue ? <AlertTriangle size={18} color="#ef4444" style={{ marginTop: '2px' }} /> : <Sparkles size={18} color="var(--accent)" style={{ marginTop: '2px' }} />}
                            <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                                <div style={{ color: isOverdue ? '#ef4444' : 'inherit', fontWeight: '500' }}>{a.title}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {a.source} {a.due_date ? `• Due ${a.due_date}` : ''}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}


