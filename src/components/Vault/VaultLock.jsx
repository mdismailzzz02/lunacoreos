import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { getAppPasswordV2, setAppPasswordV2 } from '../../services/api';
import UnlockSequence from '../Auth/UnlockSequence';
import LofiRadio from '../Arcade/LofiRadio';

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
    const [tick, setTick] = useState(0);

    const handleSubmit = (e) => { e.preventDefault(); onSubmit(pwd, confirm); };
    const isOfflineMode = mode === 'locked_offline';
    const isSetMode = mode === 'set';
    const isHidden = targetLockId === 'vault_hidden';

    // Live clock tick
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(id);
    }, []);

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

    const vaultLabel = 'Encrypted Vault';
    const vaultIcon = '⬡';
    const accentColor = '#f97316';
    const accentGlow = 'rgba(249,115,22,0.4)';
    const promptPath = 'vault';
    const cmd = './unlock --volume=primary';
    const statusColor = isOfflineMode ? '#ef4444' : isSetMode ? '#f59e0b' : accentColor;
    const statusText = isOfflineMode ? 'OFFLINE' : isSetMode ? 'UNINITIALIZED' : 'LOCKED';

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.92)',
            backdropFilter: 'blur(20px)',
        }}>
            <style>{`
                @keyframes vl-pulse {
                    0%, 100% { opacity: 0.6; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.04); }
                }
                @keyframes vl-ring {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes vl-ring2 {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(-360deg); }
                }
                @keyframes vl-blink {
                    0%, 100% { opacity: 1; } 50% { opacity: 0; }
                }
                @keyframes vl-fadeup {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .vl-input {
                    flex: 1;
                    background: transparent;
                    border: none;
                    outline: none;
                    color: #e0e0e0;
                    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
                    font-size: 1rem;
                    letter-spacing: 0.25rem;
                    caret-color: ${accentColor};
                }
                .vl-input::placeholder { color: rgba(255,255,255,0.18); letter-spacing: 0.05rem; }
                .vl-input:disabled { opacity: 0.5; }
                .vl-submit-btn {
                    margin-top: 28px;
                    padding: 10px 28px;
                    background: transparent;
                    border: 1px solid ${accentColor}66;
                    color: ${accentColor};
                    font-family: 'Menlo', 'Monaco', monospace;
                    font-size: 0.82rem;
                    border-radius: 6px;
                    cursor: pointer;
                    letter-spacing: 0.08em;
                    transition: all 0.2s;
                    align-self: flex-start;
                }
                .vl-submit-btn:hover:not(:disabled) {
                    background: ${accentColor}14;
                    border-color: ${accentColor};
                    box-shadow: 0 0 20px ${accentGlow};
                }
                .vl-submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
                .vl-meta-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.72rem;
                    color: rgba(255,255,255,0.3);
                    font-family: 'Menlo', monospace;
                    letter-spacing: 0.05em;
                }
                .vl-meta-dot {
                    width: 5px; height: 5px; border-radius: 50%;
                    background: ${accentColor};
                    box-shadow: 0 0 6px ${accentGlow};
                }
            `}</style>

            <div style={{
                width: '100%', maxWidth: '960px',
                minHeight: '520px',
                display: 'flex',
                borderRadius: '16px',
                overflow: 'hidden',
                border: `1px solid ${accentColor}30`,
                boxShadow: `0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04), 0 0 60px ${accentGlow}20`,
                animation: 'vl-fadeup 0.4s ease',
            }}>

                {/* ── LEFT PANEL — Visual Identity ── */}
                <div style={{
                    width: '340px', flexShrink: 0,
                    background: `radial-gradient(ellipse at 60% 40%, ${accentColor}18 0%, rgba(10,10,14,0.98) 70%)`,
                    borderRight: `1px solid ${accentColor}20`,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    padding: '48px 32px',
                    position: 'relative',
                    gap: '32px',
                }}>
                    {/* Orb */}
                    <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
                        {/* Outer slow ring */}
                        <div style={{
                            position: 'absolute', inset: -2,
                            borderRadius: '50%',
                            border: `1px solid ${accentColor}30`,
                            animation: 'vl-ring 8s linear infinite',
                        }} />
                        {/* Dashed mid ring */}
                        <div style={{
                            position: 'absolute', inset: 10,
                            borderRadius: '50%',
                            border: `1px dashed ${accentColor}50`,
                            animation: 'vl-ring2 5s linear infinite',
                        }} />
                        {/* Core orb */}
                        <div style={{
                            position: 'absolute', inset: 22,
                            borderRadius: '50%',
                            background: `radial-gradient(circle at 40% 35%, ${accentColor}cc, ${accentColor}44 60%, transparent)`,
                            boxShadow: `0 0 30px ${accentGlow}, 0 0 60px ${accentGlow}60`,
                            animation: 'vl-pulse 3s ease-in-out infinite',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.6rem',
                        }}>
                            {vaultIcon}
                        </div>
                    </div>

                    {/* Identity */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase',
                            color: `${accentColor}99`, marginBottom: '8px', fontFamily: 'Menlo, monospace',
                        }}>
                            LunaCore /{promptPath}
                        </div>
                        <div style={{
                            fontSize: '1.3rem', fontWeight: 700, color: '#fff',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            letterSpacing: '-0.02em',
                        }}>
                            {vaultLabel}
                        </div>
                        <div style={{
                            marginTop: '10px',
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '4px 12px', borderRadius: '20px',
                            background: `${statusColor}18`,
                            border: `1px solid ${statusColor}40`,
                        }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, display: 'inline-block', boxShadow: `0 0 6px ${statusColor}` }} />
                            <span style={{ fontSize: '0.65rem', color: statusColor, fontFamily: 'Menlo, monospace', letterSpacing: '0.12em' }}>
                                {statusText}
                            </span>
                        </div>
                    </div>

                    {/* Live clock */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: 300, color: 'rgba(255,255,255,0.8)', fontFamily: 'Menlo, monospace', letterSpacing: '0.05em' }}>
                            {timeStr}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px', fontFamily: 'Menlo, monospace' }}>
                            {dateStr}
                        </div>
                    </div>

                    {/* Metadata rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                        <div className="vl-meta-row">
                            <span className="vl-meta-dot" />
                            <span>AES-256 · SHA-256 hash</span>
                        </div>
                        <div className="vl-meta-row">
                            <span className="vl-meta-dot" />
                            <span>End-to-end encrypted</span>
                        </div>
                        <div className="vl-meta-row">
                            <span className="vl-meta-dot" style={{ background: navigator.onLine ? '#4ade80' : '#ef4444' }} />
                            <span>{navigator.onLine ? 'Network connected' : 'Network offline'}</span>
                        </div>
                    </div>

                    {/* Lofi Radio Widget */}
                    <div style={{ marginTop: 'auto', width: '100%' }}>
                        <LofiRadio channel={1} />
                    </div>
                </div>

                {/* ── RIGHT PANEL — Terminal Input ── */}
                <div style={{
                    flex: 1,
                    background: 'rgba(10, 10, 14, 0.98)',
                    display: 'flex', flexDirection: 'column',
                }}>
                    {/* Title bar */}
                    <div style={{
                        display: 'flex', alignItems: 'center', padding: '12px 18px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        position: 'relative',
                    }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => window.dispatchEvent(new CustomEvent('luna:navigate', { detail: 'dashboard' }))}
                                style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56', border: '1px solid #e0443e', padding: 0, cursor: 'pointer' }}
                            />
                            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e', border: '1px solid #dea123', display: 'inline-block' }} />
                            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#27c93f', border: '1px solid #1aab29', display: 'inline-block' }} />
                        </div>
                        <div style={{
                            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                            fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)',
                            fontFamily: 'Menlo, monospace', letterSpacing: '0.05em',
                        }}>
                            ismail@lunacore — {promptPath} — 80×24
                        </div>
                    </div>

                    {/* Terminal body */}
                    <div style={{
                        flex: 1, padding: '36px 40px',
                        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                        fontSize: '0.9rem', lineHeight: 1.7, color: '#e0e0e0',
                        display: 'flex', flexDirection: 'column',
                    }}>
                        <div style={{ color: 'rgba(255,255,255,0.25)', marginBottom: '24px', fontSize: '0.82rem' }}>
                            Session started {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>

                        {unlockState ? (
                            <UnlockSequence isError={unlockState.isError} onComplete={unlockState.onComplete} />
                        ) : !isOfflineMode ? (
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
                                {/* Command line */}
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '18px', gap: '10px' }}>
                                    <span style={{ color: accentColor, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                        ~/{promptPath}$
                                    </span>
                                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{cmd}</span>
                                </div>

                                {/* Password prompt */}
                                <div style={{ marginBottom: isSetMode ? '12px' : '0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '10px', borderBottom: `1px solid ${accentColor}20` }}>
                                        <span style={{ color: accentColor, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                            {isSetMode ? 'New access key:' : 'Access key:'}
                                        </span>
                                        <input
                                            type="password"
                                            value={pwd}
                                            onChange={e => setPwd(e.target.value)}
                                            autoFocus
                                            required
                                            autoComplete="new-password"
                                            className="vl-input"
                                            placeholder="············"
                                            disabled={loading}
                                        />
                                        <span style={{ animation: 'vl-blink 1s step-end infinite', color: accentColor, fontSize: '1.1rem' }}>▌</span>
                                    </div>
                                </div>

                                {isSetMode && (
                                    <div style={{ marginTop: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '10px', borderBottom: `1px solid ${accentColor}20` }}>
                                            <span style={{ color: accentColor, fontWeight: 600, whiteSpace: 'nowrap' }}>Confirm key:</span>
                                            <input
                                                type="password"
                                                value={confirm}
                                                onChange={e => setConfirm(e.target.value)}
                                                required
                                                autoComplete="new-password"
                                                className="vl-input"
                                                placeholder="············"
                                                disabled={loading}
                                            />
                                        </div>
                                    </div>
                                )}

                                {error && (
                                    <div style={{ marginTop: '16px', color: '#ff5f56', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>✗</span> {error}
                                    </div>
                                )}

                                <button type="submit" disabled={loading} className="vl-submit-btn">
                                    {loading ? '[ verifying... ]' : isSetMode ? '[ set key & unlock ]' : '[ unlock ]'}
                                </button>

                                <div style={{ marginTop: '20px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'Menlo, monospace' }}>
                                    Press ↵ to submit · Red dot to exit
                                </div>
                            </form>
                        ) : (
                            <div>
                                <div style={{ color: '#ef4444', marginBottom: '12px' }}>
                                    ✗ fatal: network unreachable
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', lineHeight: 1.8 }}>
                                    Cannot verify credentials without a network connection.<br />
                                    Restore connectivity to unlock this vault.
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function VaultLock({ children }) {
    const [status, setStatus] = useState('loading');
    const [storedRecord, setStoredRecord] = useState(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [unlockState, setUnlockState] = useState(null);

    const targetLockId = 'vault';

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
        if (isOffline) { setStatus('locked_offline'); return; }
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
                await setAppPasswordV2(targetLockId, 'Vault Lock', salt, hash);
                setUnlockState({ isError: false, onComplete: () => {
                    setStatus('unlocked');
                }});
            } else if (status === 'locked') {
                const hash = await sha256(storedRecord.salt + pwd);
                if (hash === storedRecord.hash) {
                    setUnlockState({ isError: false, onComplete: () => {
                        setStatus('unlocked');
                    }});
                } else {
                    setUnlockState({ isError: true, onComplete: () => {
                        setError('access denied — invalid key');
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
