import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { getAppPasswordV2, setAppPasswordV2 } from '../../services/api';
import UnlockSequence from '../Auth/UnlockSequence';

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt() {
    const arr = new Uint8Array(16);
    window.crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function LockScreen({ mode, onSubmit, error, loading, targetLockId, unlockState }) {
    const [pwd, setPwd] = useState('');
    const [confirm, setConfirm] = useState('');

    const handleSubmit = (e) => { e.preventDefault(); onSubmit(pwd, confirm); };
    const isOfflineMode = mode === 'locked_offline';
    const isSetMode = mode === 'set';

    const isHidden = targetLockId === 'vault_hidden';
    const header = isHidden ? 'LunaCore OS (Classified Volume: H-Tier)' : 'LunaCore OS (Encrypted Core Volume)';
    const statusTxt = isHidden ? 'ENCRYPTED' : 'LOCKED';
    const cmd = isHidden ? './decrypt' : './unlock';

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(10px)'
        }}>
            <div style={{
                width: '100%', maxWidth: '900px', minHeight: '550px',
                background: 'rgba(15, 15, 20, 0.85)',
                backdropFilter: 'blur(24px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                boxShadow: '0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2)',
                overflow: 'hidden',
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                display: 'flex', flexDirection: 'column'
            }}>
                <style>{`
                    .vl-term-text { color: #e0e0e0; margin: 0 0 8px 0; font-size: 0.95rem; line-height: 1.4; }
                    .vl-term-prompt { color: #4ade80; margin-right: 12px; font-size: 0.95rem; font-weight: 600; }
                    .vl-term-command { color: #e0e0e0; font-size: 0.95rem; }
                    .vl-term-input { flex: 1; background: transparent; border: none; outline: none; color: #e0e0e0; font-family: inherit; font-size: 0.95rem; letter-spacing: 0.2rem; }
                    .vl-term-error { color: #ff5f56; margin-top: 12px; font-size: 0.95rem; }
                `}</style>
                <div style={{
                    display: 'flex', alignItems: 'center', padding: '12px 16px',
                    background: 'rgba(40, 40, 45, 0.5)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    position: 'relative'
                }}>
                    <div style={{ display: 'flex', gap: '8px', position: 'absolute', left: '16px' }}>
                        <button onClick={() => window.dispatchEvent(new CustomEvent('luna:navigate', { detail: 'dashboard' }))} style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56', border: '1px solid #e0443e', padding: 0, cursor: 'pointer' }}></button>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e', border: '1px solid #dea123' }}></span>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f', border: '1px solid #1aab29' }}></span>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', fontWeight: 500, letterSpacing: '0.5px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
                        LunaCore Security Daemon — active
                    </div>
                </div>

                <div style={{ padding: '40px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <p className="vl-term-text">Last login: {new Date().toLocaleString()} on ttys000</p>
                    <p className="vl-term-text">{header}</p>
                    <p className="vl-term-text" style={{ opacity: 0.5 }}>
                        {isHidden ? 'Hidden Status: ' : 'Vault Status: '} 
                        {isOfflineMode ? 'NO CONNECTION' : isSetMode ? 'UNINITIALIZED' : statusTxt}
                    </p>
                    <br />

                    {unlockState ? (
                        <UnlockSequence isError={unlockState.isError} onComplete={unlockState.onComplete} />
                    ) : !isOfflineMode && (
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                <span className="vl-term-prompt">ismail@lunacore:~/{targetLockId}$</span>
                                <span className="vl-term-command">{cmd}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                <span className="vl-term-prompt">{isSetMode ? 'New Key:' : 'Access Key:'}</span>
                                <input
                                    type="password"
                                    value={pwd}
                                    onChange={e => setPwd(e.target.value)}
                                    autoFocus
                                    required
                                    autoComplete="new-password"
                                    className="vl-term-input"
                                    disabled={loading}
                                />
                            </div>
                            {isSetMode && (
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                    <span className="vl-term-prompt">Confirm Key:</span>
                                    <input
                                        type="password"
                                        value={confirm}
                                        onChange={e => setConfirm(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                        className="vl-term-input"
                                        disabled={loading}
                                    />
                                </div>
                            )}
                            {error && <div className="vl-term-error">{error}</div>}
                            <button type="submit" style={{ display: 'none' }}>Submit</button>
                        </form>
                    )}

                    {isOfflineMode && (
                        <div className="vl-term-error">
                            fatal error: network unreachable<br/>
                            Cannot verify credentials without a network connection. Come back online to unlock.
                        </div>
                    )}
                </div>
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
    const [unlockState, setUnlockState] = useState(null);

    const isHiddenTrigger = sessionStorage.getItem('luna_trigger_hidden_vault') === 'true';
    const targetLockId = isHiddenTrigger ? 'vault_hidden' : 'vault';

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
        getAppPasswordV2(targetLockId)
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
                
                const salt = generateSalt();
                const hash = await sha256(salt + pwd);
                await setAppPasswordV2(targetLockId, isHiddenTrigger ? 'Hidden Vault Lock' : 'Vault Lock', salt, hash);
                
                setUnlockState({ isError: false, onComplete: () => {
                    if (isHiddenTrigger) sessionStorage.setItem('luna_trigger_hidden_vault', 'verified');
                    setStatus('unlocked');
                }});
            } else if (status === 'locked') {
                const hash = await sha256(storedRecord.salt + pwd);
                if (hash === storedRecord.hash) {
                    setUnlockState({ isError: false, onComplete: () => {
                        if (isHiddenTrigger) sessionStorage.setItem('luna_trigger_hidden_vault', 'verified');
                        setStatus('unlocked');
                    }});
                } else {
                    setUnlockState({ isError: true, onComplete: () => {
                        setError('access denied: invalid master key');
                        setUnlockState(null);
                    }});
                }
            }
        } finally { setSubmitting(false); }
    };

    if (status === 'loading') return null;
    if (status === 'unlocked') return children;
    
    return <LockScreen 
        mode={status} 
        onSubmit={handleSubmit} 
        error={error} 
        loading={submitting} 
        targetLockId={targetLockId} 
        unlockState={unlockState}
    />;
}
