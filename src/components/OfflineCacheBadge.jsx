import { useEffect, useState } from 'react';

/**
 * Secret Cache Indicator Widget
 * Small badge that pops up when app detects internet and starts auto-caching
 */
export default function OfflineCacheBadge() {
    const [isVisible, setIsVisible] = useState(false);
    const [status, setStatus] = useState('syncing');

    useEffect(() => {
        // Listen for custom events from OfflineCache
        const handleCacheStart = () => {
            setIsVisible(true);
            setStatus('syncing');
        };

        const handleCacheComplete = () => {
            setStatus('done');
            // Auto-hide after 2 seconds
            setTimeout(() => setIsVisible(false), 2000);
        };

        window.addEventListener('offlinecache:start', handleCacheStart);
        window.addEventListener('offlinecache:complete', handleCacheComplete);

        return () => {
            window.removeEventListener('offlinecache:start', handleCacheStart);
            window.removeEventListener('offlinecache:complete', handleCacheComplete);
        };
    }, []);

    if (!isVisible) return null;

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '1.5rem',
                left: '1.5rem',
                background: 'rgba(10, 168, 107, 0.95)',
                border: '1px solid rgba(50, 211, 153, 0.4)',
                borderRadius: '12px',
                padding: '0.8rem 1.2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                zIndex: 5000,
                boxShadow: '0 8px 24px rgba(10, 168, 107, 0.3)',
                animation: 'slideInUp 0.3s ease-out',
                backdropFilter: 'blur(8px)'
            }}
        >
            <style>{`
                @keyframes slideInUp {
                    from {
                        transform: translateY(100px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>

            {status === 'syncing' ? (
                <>
                    <div
                        style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTop: '2px solid white',
                            animation: 'spin 1s linear infinite'
                        }}
                    />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'white', letterSpacing: '0.5px' }}>
                        Syncing offline cache...
                    </span>
                </>
            ) : (
                <>
                    <span style={{ fontSize: '1rem' }}>✓</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'white', letterSpacing: '0.5px' }}>
                        Cache synced
                    </span>
                </>
            )}
        </div>
    );
}
