import React, { useState } from 'react';
import { Target, Zap } from 'lucide-react';

const MODES = [
    {
        id: 'disk',
        icon: <Target size={36} strokeWidth={1.5} />,
        title: 'Command Disk',
        desc: 'A radial pie menu with all your apps in a circle.',
        shortcut: 'Spacebar',
        preview: 'Home  Dna  Sparkles  BookOpen  Music',
    },
    {
        id: 'smart',
        icon: <Zap size={36} strokeWidth={1.5} />,
        title: 'Smart Actions',
        desc: 'A Spotlight-style search bar. Just type to navigate.',
        shortcut: 'Escape',
        preview: 'Search "you" → YouTube',
    },
];

export default function NavModePicker({ onSelect }) {
    const [hoveredId, setHoveredId] = useState(null);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(3, 5, 10, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            animation: 'nmp-fade-in 0.5s ease',
        }}>
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '2.5rem', maxWidth: '640px', padding: '2rem',
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🌘</div>
                    <h1 style={{
                        fontSize: '1.6rem', fontWeight: 700, color: '#fff',
                        letterSpacing: '-0.02em', marginBottom: '0.5rem',
                    }}>
                        Choose Your Navigation
                    </h1>
                    <p style={{
                        fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)',
                        maxWidth: '380px', margin: '0 auto', lineHeight: 1.5,
                    }}>
                        Pick how you want to move around LunaCoreOS. You can change this later in Settings.
                    </p>
                </div>

                {/* Cards */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem',
                    width: '100%',
                }}>
                    {MODES.map(mode => {
                        const isHovered = hoveredId === mode.id;
                        return (
                            <div
                                key={mode.id}
                                onClick={() => onSelect(mode.id)}
                                onMouseEnter={() => setHoveredId(mode.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                style={{
                                    background: isHovered
                                        ? 'rgba(232, 160, 69, 0.08)'
                                        : 'rgba(255, 255, 255, 0.03)',
                                    border: `1.5px solid ${isHovered ? 'rgba(232, 160, 69, 0.4)' : 'rgba(255,255,255,0.07)'}`,
                                    borderRadius: '16px',
                                    padding: '1.75rem 1.5rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.25s ease',
                                    display: 'flex', flexDirection: 'column', gap: '1rem',
                                    transform: isHovered ? 'translateY(-4px)' : 'none',
                                    boxShadow: isHovered
                                        ? '0 12px 35px rgba(0,0,0,0.4), 0 0 20px rgba(232,160,69,0.08)'
                                        : '0 4px 15px rgba(0,0,0,0.2)',
                                }}
                            >
                                <div style={{ color: 'var(--accent)' }}>{mode.icon}</div>
                                <div>
                                    <div style={{
                                        fontSize: '1.05rem', fontWeight: 600, color: '#fff',
                                        marginBottom: '0.35rem',
                                    }}>
                                        {mode.title}
                                    </div>
                                    <div style={{
                                        fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)',
                                        lineHeight: 1.5,
                                    }}>
                                        {mode.desc}
                                    </div>
                                </div>
                                <div style={{
                                    fontSize: '0.65rem',
                                    color: 'rgba(255,255,255,0.25)',
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                }}>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '5px',
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        fontFamily: 'monospace', fontSize: '0.62rem',
                                        color: 'rgba(255,255,255,0.35)',
                                    }}>
                                        {mode.shortcut}
                                    </span>
                                    <span>to open</span>
                                </div>
                                <div style={{
                                    fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)',
                                    padding: '0.5rem 0.75rem',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '8px',
                                    textAlign: 'center',
                                    letterSpacing: mode.id === 'disk' ? '0.15em' : '0',
                                }}>
                                    {mode.preview}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <style>{`
                @keyframes nmp-fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @media (max-width: 600px) {
                    /* Stack cards vertically on small screens */
                    .nmp-cards { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    );
}
