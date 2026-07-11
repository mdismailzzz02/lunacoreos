import { useState, useEffect } from 'react';
import { getAppPasswordV2, setAppPasswordV2 } from '../../services/api';

const LOCK_ID = 'vault';
// REMOVED: hardcoded offline emergency passcode (was '8734') — security fix

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Generate a cryptographically random hex salt */
function generateSalt() {
    const arr = new Uint8Array(16);
    window.crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function LockScreen({ mode, onSubmit, error, loading }) {
    const [pwd, setPwd] = useState('');
    const [confirm, setConfirm] = useState('');

    const handleSubmit = (e) => { e.preventDefault(); onSubmit(pwd, confirm); };
    const isOfflineMode = mode === 'locked_offline';
    const isSetMode = mode === 'set';

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'linear-gradient(135deg, #0a0a1a 0%, #12112b 50%, #0a0a1a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(167,139,250,0.1) 0%, transparent 70%)'
        }}>
            <div style={{
                width: '100%', maxWidth: '400px', padding: '3rem',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '32px',
                backdropFilter: 'blur(30px)',
                boxShadow: '0 40px 100px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)',
                textAlign: 'center',
                animation: 'lock-fade-in 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
                <style>{`
                    @keyframes lock-fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                    @keyframes glow-pulse { 0%,100% { filter: drop-shadow(0 0 15px rgba(167,139,250,0.4)); } 50% { filter: drop-shadow(0 0 30px rgba(167,139,250,0.8)); } }
                    .lock-input::placeholder { color: rgba(255,255,255,0.2); }
                `}</style>

                <div style={{ fontSize: '4rem', marginBottom: '1.5rem', animation: 'glow-pulse 3s infinite' }}>
                    {isOfflineMode ? '📡' : '🔒'}
                </div>

                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-0.02em', background: 'linear-gradient(to bottom, #fff, rgba(255,255,255,0.5))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {isSetMode ? 'INIT_VAULT' : isOfflineMode ? 'NO_CONNECTION' : 'VAULT_LOCKED'}
                </h2>
                <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2.5rem', fontWeight: 500 }}>
                    {isSetMode
                        ? 'Establish a new access key.'
                        : isOfflineMode
                            ? 'Cannot verify credentials without a network connection. Come back online to unlock.'
                            : 'Secure credentials required.'}
                </p>

                {!isOfflineMode && (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input
                            type="password"
                            placeholder={isSetMode ? 'New Key (min 6 chars)' : 'Access Key'}
                            value={pwd}
                            onChange={e => setPwd(e.target.value)}
                            autoFocus
                            required
                            autoComplete="new-password"
                            className="lock-input"
                            style={{ width: '100%', padding: '1.1rem 1.4rem', borderRadius: '16px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1.1rem', outline: 'none', transition: 'all 0.3s', boxSizing: 'border-box' }}
                        />
                        {isSetMode && (
                            <input
                                type="password"
                                placeholder="Confirm Key"
                                value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                required
                                autoComplete="new-password"
                                className="lock-input"
                                style={{ width: '100%', padding: '1.1rem 1.4rem', borderRadius: '16px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1.1rem', outline: 'none', boxSizing: 'border-box' }}
                            />
                        )}
                        {error && (
                            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '0.8rem 1rem', color: '#f87171', fontSize: '0.82rem', fontWeight: 600 }}>
                                {error}
                            </div>
                        )}
                        <button type="submit" disabled={loading}
                            style={{ padding: '1.1rem', borderRadius: '16px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '1rem', marginTop: '0.5rem', background: loading ? 'rgba(167,139,250,0.3)' : 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: 'white', boxShadow: '0 10px 30px rgba(124,58,237,0.4)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                            {loading ? 'VERIFYING...' : isSetMode ? 'ESTABLISH ACCESS' : 'UNLOCK_VAULT'}
                        </button>
                    </form>
                )}

                {isOfflineMode && (
                    <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.05)', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.15)', color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', lineHeight: 1.6 }}>
                        🔴 Vault requires a network connection to verify your credentials securely. Please reconnect and try again.
                    </div>
                )}
            </div>
        </div>
    );
}

export default function VaultLock({ children }) {
    const [status, setStatus] = useState('loading');
    const [storedRecord, setStoredRecord] = useState(null); // { salt, hash }
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        if (isOffline) {
            setStatus('locked_offline');
            return;
        }
        getAppPasswordV2(LOCK_ID)
            .then(res => {
                if (res?.hash && res?.salt) {
                    setStoredRecord({ salt: res.salt, hash: res.hash });
                    setStatus('locked');
                } else {
                    setStatus('set');
                }
            })
            .catch(() => {
                if (!navigator.onLine) setStatus('locked_offline');
                else setStatus('set');
            });
    }, [isOffline]);

    const handleSubmit = async (pwd, confirm) => {
        setError('');
        setSubmitting(true);
        try {
            if (status === 'set') {
                if (pwd.length < 6) { setError('Key must be at least 6 characters.'); return; }
                if (pwd !== confirm) { setError('Keys do not match.'); return; }
                // Generate a unique random salt and hash = SHA256(salt + password)
                const salt = generateSalt();
                const hash = await sha256(salt + pwd);
                await setAppPasswordV2(LOCK_ID, 'Vault Lock', salt, hash);
                setStatus('unlocked');
            } else if (status === 'locked') {
                const hash = await sha256(storedRecord.salt + pwd);
                if (hash === storedRecord.hash) {
                    setStatus('unlocked');
                } else {
                    setError('Invalid access key.');
                }
            }
        } finally { setSubmitting(false); }
    };

    if (status === 'loading') return (
        <div style={{ position: 'fixed', inset: 0, background: '#0a0a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
             <div style={{ width: '40px', height: '40px', border: '3px solid rgba(167,139,250,0.1)', borderTop: '3px solid #a78bfa', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
    );
    if (status === 'unlocked') return children;
    return <LockScreen mode={status} onSubmit={handleSubmit} error={error} loading={submitting} />;
}
