import { useEffect, useState } from 'react';
import * as api from '../../services/api';
import WeatherWidget from './WeatherWidget';
import DelegationAlerts from './DelegationAlerts';
import SakuraCalculator from './SakuraCalculator';

import MediaGrid from './MediaGrid';

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
            {/* Greeting Hero */}
            <div style={{ 
                position: 'relative',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start', 
                flexWrap: 'wrap', 
                gap: '1rem',
                padding: '3rem 2.5rem',
                borderRadius: '24px',
                backgroundImage: 'url(/sakura.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(15,15,20,0.95) 0%, rgba(15,15,20,0.5) 40%, rgba(15,15,20,0.2) 100%)' }} />
                
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div className="greeting-h1" style={{ fontFamily: '"Orbitron", sans-serif', fontSize: '2.5rem', fontWeight: '900', letterSpacing: '1px', color: '#fff', textShadow: '0 2px 10px rgba(0,242,254,0.8), 0 0 20px rgba(255,0,255,0.4)', textTransform: 'uppercase' }}>{greeting(userName)}</div>
                    <div className="greeting-date" style={{ fontFamily: '"Space Grotesk", sans-serif', color: 'rgba(255,255,255,0.9)', fontSize: '1.1rem', marginTop: '6px', fontWeight: '500', textShadow: '0 1px 5px rgba(0,0,0,0.8)', letterSpacing: '2px', textTransform: 'uppercase' }}>{todayDate()}</div>
                </div>
                {/* Ambient: Time Capsule */}
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <TimeCapsuleAlert onNavigate={onNavigate} />
                </div>
            </div>
            

            {/* Second Row: Today's essentials */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                <WeatherWidget />
                <DelegationAlerts onNavigate={onNavigate} />
                <SakuraCalculator />
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





