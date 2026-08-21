import { useEffect, useState } from 'react';
import * as api from '../../services/api';
import { Package } from 'lucide-react';

export default function TimeCapsuleAlert({ onNavigate }) {
    const [capsule, setCapsule] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        
        api.getTimeCapsules().then(data => {
            if (!mounted) return;
            const capsules = data || [];
            const now = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            
            const upcoming = capsules.find(c => {
                const unlockDate = new Date(c.unlock_date);
                return unlockDate > now && unlockDate <= thirtyDaysFromNow;
            });
            
            setCapsule(upcoming);
            setLoading(false);
        }).catch(err => {
            console.error('Failed to load time capsules:', err);
            if (mounted) setLoading(false);
        });

        return () => { mounted = false; };
    }, []);

    if (loading || !capsule) return null;

    const daysLeft = Math.ceil((new Date(capsule.unlock_date) - new Date()) / (1000 * 60 * 60 * 24));

    return (
        <div 
            className="interactive-card fade-in" 
            onClick={() => onNavigate('timecapsule')}
            style={{ 
                padding: '0.5rem 1rem', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.1), rgba(59, 130, 246, 0.1))',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '20px',
                color: 'var(--text-color)'
            }}
        >
            <Package size={16} color="#a855f7" />
            <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                Time capsule unlocks in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
            </span>
        </div>
    );
}
