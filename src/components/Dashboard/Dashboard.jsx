import { useEffect, useState } from 'react';
import * as api from '../../services/api';
import WeatherWidget from './WeatherWidget';
import DelegationAlerts from './DelegationAlerts';
import JournalNudge from './JournalNudge';
import ProductivityHeatmap from './ProductivityHeatmap';
import MediaGrid from './MediaGrid';
import ActiveGoals from './ActiveGoals';
import TimeCapsuleAlert from './TimeCapsuleAlert';

function greeting(name) {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return `Good morning, ${name} ☀️`;
    if (h >= 12 && h < 17) return `Good afternoon, ${name} 🌤`;
    if (h >= 17 && h < 22) return `Good evening, ${name} 🌙`;
    return `Late night, ${name} 🦉`;
}

function todayDate() {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function Dashboard({ onNavigate }) {
    const [userName, setUserName] = useState('Friend');

    useEffect(() => {
        let mounted = true;
        api.getDashboardStats().then(data => {
            if (mounted && data?.config?.user_name) {
                setUserName(data.config.user_name);
            }
        });
        return () => { mounted = false; };
    }, []);

    return (
        <div className="fade-in dashboard-container" style={{ paddingBottom: '4rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Greeting */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <div className="greeting-h1" style={{ fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.5px' }}>{greeting(userName)}</div>
                    <div className="greeting-date" style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>{todayDate()}</div>
                </div>
                {/* Ambient: Time Capsule */}
                <div>
                    <TimeCapsuleAlert onNavigate={onNavigate} />
                </div>
            </div>
            
            {/* Top Row: Streaks & Media Hub */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'stretch' }}>
                <ActiveGoals onNavigate={onNavigate} />
                </div>

            {/* Second Row: Today's essentials */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                <WeatherWidget />
                <DelegationAlerts onNavigate={onNavigate} />
                <JournalNudge onNavigate={onNavigate} />
            </div>

            {/* Third Row: Momentum/Insight */}
            <div>
                <ProductivityHeatmap />
            </div>

            {/* Fourth Row: Media Hub (Books & Shows) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.1rem', margin: 0, paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Media Hub
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <MediaGrid onNavigate={onNavigate} />
                </div>
            </div>
        </div>
    );
}





