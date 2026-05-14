import { useState, useEffect } from 'react';
import { getAppPassword, setAppPassword } from '../../services/api';

const LOCK_ID = 'vault';
const OFFLINE_EMERGENCY_PASSWORD = '8734';

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');
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
                    {isOfflineMode ? '📱' : '🔒'}
                </div>

                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-0.02em', background: 'linear-gradient(to bottom, #fff, rgba(255,255,255,0.5))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {isSetMode ? 'INIT_VAULT' : isOfflineMode ? 'OFFLINE_CORE' : 'VAULT_LOCKED'}
                </h2>
                <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2.5rem', fontWeight: 500 }}>
                    {isSetMode ? 'Establish a new access key.' : isOfflineMode ? 'Local authentication required.' : 'Secure credentials required.'}
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input 
                        type="password" 
                        placeholder={isSetMode ? 'New Key' : isOfflineMode ? 'Emergency Key' : 'Access Key'}
                        value={pwd} 
                        onChange={e => setPwd(e.target.value)} 
                        autoFocus 
                        required
                        autoComplete="new-password"
                        className="lock-input"
                        style={{ width: '100%', padding: '1.1rem 1.4rem', borderRadius: '16px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1.1rem', outline: 'none', transition: 'all 0.3s' }} 
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
                            style={{ width: '100%', padding: '1.1rem 1.4rem', borderRadius: '16px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1.1rem', outline: 'none' }} 
                        />
                    )}
                    {error && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '0.8rem 1rem', color: '#f87171', fontSize: '0.82rem', fontWeight: 600 }}>
                            {error}
                        </div>
                    )}
                    <button type="submit" disabled={loading}
                        style={{ padding: '1.1rem', borderRadius: '16px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '1rem', marginTop: '0.5rem', background: loading ? 'rgba(167,139,250,0.3)' : 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: 'white', boxShadow: '0 10px 30px rgba(124,58,237,0.4)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                        {loading ? 'DECRYPTING...' : mode === 'set' ? 'ESTABLISH ACCESS' : 'UNLOCK_VAULT'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function VaultLock({ children }) {
    const [status, setStatus] = useState('loading');
    const [storedHash, setStoredHash] = useState(null);
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
        getAppPassword(LOCK_ID)
            .then(res => {
                const data = res?.data || res;
                if (data?.hash) {
                    setStoredHash(data.hash);
                    setStatus('locked');
                } else {
                    setStatus('set');
                }
            })
            .catch(() => {
                if (!navigator.onLine) setStatus('locked_offline');
                else setStatus('set');
            });
    }, []);

    const handleSubmit = async (pwd, confirm) => {
        setError('');
        setSubmitting(true);
        try {
            if (status === 'set') {
                if (pwd.length < 6) { setError('Key must be at least 6 characters.'); return; }
                if (pwd !== confirm) { setError('Keys do not match.'); return; }
                const hash = await sha256(pwd);
                await setAppPassword(LOCK_ID, 'Vault Lock', hash);
                setStatus('unlocked');
            } else if (status === 'locked_offline') {
                if (pwd === OFFLINE_EMERGENCY_PASSWORD) setStatus('unlocked');
                else setError('Invalid emergency credentials.');
            } else {
                const hash = await sha256(pwd);
                if (hash === storedHash) setStatus('unlocked');
                else setError('Invalid access key.');
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
