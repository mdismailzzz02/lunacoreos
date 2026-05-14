import React from 'react';

/**
 * MobileNav - Bottom Navigation for handheld devices
 */
export default function MobileNav({ active, onNavigate, onToggleMenu }) {
    const primaryTabs = [
        { id: 'dashboard', icon: '🌸', label: 'Home' },
        { id: 'journal', icon: '📖', label: 'Journal' },
        { id: 'vault', icon: '💎', label: 'Vault' },
        { id: 'insights', icon: '✨', label: 'Insights' },
    ];

    return (
        <nav className="mobile-nav">
            {primaryTabs.map(tab => (
                <button
                    key={tab.id}
                    className={`mobile-nav-item ${active === tab.id ? 'active' : ''}`}
                    onClick={() => onNavigate(tab.id)}
                >
                    <span className="mobile-nav-icon">{tab.icon}</span>
                    <span className="mobile-nav-label">{tab.label}</span>
                </button>
            ))}
            
            <button className="mobile-nav-item" onClick={onToggleMenu}>
                <span className="mobile-nav-icon">🎀</span>
                <span className="mobile-nav-label">More</span>
            </button>
        </nav>
    );
}
