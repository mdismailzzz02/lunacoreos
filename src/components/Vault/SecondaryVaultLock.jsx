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

function getTheme(title) {
    const t = (title || '').toLowerCase();
    if (t.includes('delete') || t.includes('trash')) return {
        accentColor: '#ef4444',
        accentGlow: 'rgba(239,68,68,0.4)',
        icon: '⚠',
        label: 'Destructive Action',
        path: 'restricted',
        cmd: './authorize --action=delete',
        statusTxt: 'AUTHORIZATION REQUIRED',
    };

    if (t.includes('secret')) return {
        accentColor: '#ec4899',
        accentGlow: 'rgba(236,72,153,0.4)',
        icon: '◉',
        label: 'Classified Volume',
        path: 'classified',
        cmd: './override --clearance=s',
        statusTxt: 'HEAVILY ENCRYPTED',
    };
    if (t.includes('journal') || t.includes('diary')) return {
        accentColor: '#34d399',
        accentGlow: 'rgba(52,211,153,0.4)',
        icon: '◎',
        label: 'Private Logs',
        path: 'journal',
        cmd: './unlock-logs',
        statusTxt: 'LOCKED',
    };
    return {
        accentColor: '#f97316',
        accentGlow: 'rgba(249,115,22,0.4)',
        icon: '⬡',
        label: title || 'Secure Module',
        path: (title || 'module').toLowerCase().replace(/\s+/g, '_'),
        cmd: './unlock',
        statusTxt: 'LOCKED',
    };
}

export default function SecondaryVaultLock({ lockId, title, icon, onSuccess, onClose }) {
    const [status, setStatus] = useState('loading');
    const [storedRecord, setStoredRecord] = useState(null);
    const [pwd, setPwd] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [unlockState, setUnlockState] = useState(null);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        getAppPasswordV2(lockId)
            .then(res => {
                if (res?.hash && res?.salt) {
                    setStoredRecord({ salt: res.salt, hash: res.hash });
                    setStatus('locked');
                } else {
                    setStatus('set');
                }
            })
            .catch(() => setStatus('set'));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            if (status === 'set') {
                if (pwd.length < 6) { setError('Key must be at least 6 characters.'); return; }
                if (pwd !== confirm) { setError('Keys do not match.'); return; }
                const salt = generateSalt();
                const hash = await sha256(salt + pwd);
                await setAppPasswordV2(lockId, title, salt, hash);
                setUnlockState({ isError: false, onComplete: onSuccess });
            } else if (status === 'locked') {
                const hash = await sha256(storedRecord.salt + pwd);
                if (hash === storedRecord.hash) {
                    setUnlockState({ isError: false, onComplete: onSuccess });
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

    const isSetMode = status === 'set';
    const theme = getTheme(title);
    const { accentColor, accentGlow, label, path, cmd, statusTxt } = theme;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

    return ReactDOM.createPortal(
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.92)',
            backdropFilter: 'blur(20px)',
        }}>
            <style>{`
                @keyframes svl-pulse {
                    0%, 100% { opacity: 0.6; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.04); }
                }
                @keyframes svl-ring { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                @keyframes svl-ring2 { 0% { transform: rotate(0deg); } 100% { transform: rotate(-360deg); } }
                @keyframes svl-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
                @keyframes svl-fadeup { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                .svl-input {
                    flex: 1; background: transparent; border: none; outline: none;
                    color: #e0e0e0; font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
                    font-size: 1rem; letter-spacing: 0.25rem; caret-color: ${accentColor};
                }
                .svl-input::placeholder { color: rgba(255,255,255,0.18); letter-spacing: 0.05rem; }
                .svl-input:disabled { opacity: 0.5; }
                .svl-submit-btn {
                    margin-top: 28px; padding: 10px 28px; background: transparent;
                    border: 1px solid ${accentColor}66; color: ${accentColor};
                    font-family: 'Menlo', 'Monaco', monospace; font-size: 0.82rem;
                    border-radius: 6px; cursor: pointer; letter-spacing: 0.08em;
                    transition: all 0.2s; align-self: flex-start;
                }
                .svl-submit-btn:hover:not(:disabled) {
                    background: ${accentColor}14; border-color: ${accentColor};
                    box-shadow: 0 0 20px ${accentGlow};
                }
                .svl-submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
                .svl-meta-row { display: flex; align-items: center; gap: 8px; font-size: 0.72rem; color: rgba(255,255,255,0.3); font-family: 'Menlo', monospace; letter-spacing: 0.05em; }
                .svl-meta-dot { width: 5px; height: 5px; border-radius: 50%; background: ${accentColor}; box-shadow: 0 0 6px ${accentGlow}; }
            `}</style>

            <div style={{
                width: '100%', maxWidth: '960px', minHeight: '520px',
                display: 'flex', borderRadius: '16px', overflow: 'hidden',
                border: `1px solid ${accentColor}30`,
                boxShadow: `0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04), 0 0 60px ${accentGlow}20`,
                animation: 'svl-fadeup 0.4s ease',
            }}>
                {/* ── LEFT PANEL ── */}
                <div style={{
                    width: '340px', flexShrink: 0,
                    background: `radial-gradient(ellipse at 60% 40%, ${accentColor}18 0%, rgba(10,10,14,0.98) 70%)`,
                    borderRight: `1px solid ${accentColor}20`,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    padding: '48px 32px', gap: '32px',
                }}>
                    {/* Orb */}
                    <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
                        <div style={{ position: 'absolute', inset: -2, borderRadius: '50%', border: `1px solid ${accentColor}30`, animation: 'svl-ring 8s linear infinite' }} />
                        <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', border: `1px dashed ${accentColor}50`, animation: 'svl-ring2 5s linear infinite' }} />
                        <div style={{
                            position: 'absolute', inset: 22, borderRadius: '50%',
                            background: `radial-gradient(circle at 40% 35%, ${accentColor}cc, ${accentColor}44 60%, transparent)`,
                            boxShadow: `0 0 30px ${accentGlow}, 0 0 60px ${accentGlow}60`,
                            animation: 'svl-pulse 3s ease-in-out infinite',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem',
                        }}>
                            {theme.icon}
                        </div>
                    </div>

                    {/* Identity */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: `${accentColor}99`, marginBottom: '8px', fontFamily: 'Menlo, monospace' }}>
                            LunaCore /{path}
                        </div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', letterSpacing: '-0.02em' }}>
                            {label}
                        </div>
                        <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', background: `${accentColor}18`, border: `1px solid ${accentColor}40` }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor, display: 'inline-block', boxShadow: `0 0 6px ${accentColor}` }} />
                            <span style={{ fontSize: '0.65rem', color: accentColor, fontFamily: 'Menlo, monospace', letterSpacing: '0.12em' }}>
                                {isSetMode ? 'UNINITIALIZED' : statusTxt}
                            </span>
                        </div>
                    </div>

                    {/* Live clock */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: 300, color: 'rgba(255,255,255,0.8)', fontFamily: 'Menlo, monospace', letterSpacing: '0.05em' }}>{timeStr}</div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px', fontFamily: 'Menlo, monospace' }}>{dateStr}</div>
                    </div>

                    {/* Metadata */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                        <div className="svl-meta-row"><span className="svl-meta-dot" /><span>SHA-256 hash verification</span></div>
                        <div className="svl-meta-row"><span className="svl-meta-dot" /><span>Key never stored on disk</span></div>
                        <div className="svl-meta-row"><span className="svl-meta-dot" style={{ background: navigator.onLine ? '#4ade80' : '#ef4444' }} /><span>{navigator.onLine ? 'Network connected' : 'Network offline'}</span></div>
                    </div>
                </div>

                {/* ── RIGHT PANEL ── */}
                <div style={{ flex: 1, background: 'rgba(10,10,14,0.98)', display: 'flex', flexDirection: 'column' }}>
                    {/* Title bar */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={onClose} style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56', border: '1px solid #e0443e', padding: 0, cursor: 'pointer' }} />
                            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e', border: '1px solid #dea123', display: 'inline-block' }} />
                            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#27c93f', border: '1px solid #1aab29', display: 'inline-block' }} />
                        </div>
                        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'Menlo, monospace', letterSpacing: '0.05em' }}>
                            ismail@lunacore — {path} — 80×24
                        </div>
                    </div>

                    {/* Terminal body */}
                    <div style={{ flex: 1, padding: '36px 40px', fontFamily: 'Menlo, Monaco, "Courier New", monospace', fontSize: '0.9rem', lineHeight: 1.7, color: '#e0e0e0', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ color: 'rgba(255,255,255,0.25)', marginBottom: '24px', fontSize: '0.82rem' }}>
                            Session started {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>

                        {unlockState ? (
                            <UnlockSequence isError={unlockState.isError} onComplete={unlockState.onComplete} />
                        ) : (
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '18px', gap: '10px' }}>
                                    <span style={{ color: accentColor, fontWeight: 600, whiteSpace: 'nowrap' }}>~/{path}$</span>
                                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{cmd}</span>
                                </div>

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
                                            className="svl-input"
                                            placeholder="············"
                                            disabled={submitting}
                                        />
                                        <span style={{ animation: 'svl-blink 1s step-end infinite', color: accentColor, fontSize: '1.1rem' }}>▌</span>
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
                                                className="svl-input"
                                                placeholder="············"
                                                disabled={submitting}
                                            />
                                        </div>
                                    </div>
                                )}

                                {error && (
                                    <div style={{ marginTop: '16px', color: '#ff5f56', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>✗</span> {error}
                                    </div>
                                )}

                                <button type="submit" disabled={submitting} className="svl-submit-btn">
                                    {submitting ? '[ verifying... ]' : isSetMode ? '[ set key & unlock ]' : '[ unlock ]'}
                                </button>

                                <div style={{ marginTop: '20px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'Menlo, monospace' }}>
                                    Press ↵ to submit · Red dot to close
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
