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

export default function SecondaryVaultLock({ lockId, title, icon, onSuccess, onClose }) {
    const [status, setStatus] = useState('loading'); // loading | set | locked | unlocked
    const [storedRecord, setStoredRecord] = useState(null);
    const [pwd, setPwd] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [unlockState, setUnlockState] = useState(null);

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
            .catch(() => {
                setStatus('set');
            });
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
                        setError('Invalid access key.');
                        setUnlockState(null);
                    }});
                }
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (status === 'loading') return null;

    const isSetMode = status === 'set';
    const pathName = title ? title.toLowerCase().replace(/\s+/g, '_') : 'module';

    const getCustomText = (t) => {
        const titleStr = (t || '').toLowerCase();
        if (titleStr.includes('delete') || titleStr.includes('trash')) return {
            header: 'LunaCore OS (Destructive Action Protocol)',
            status: 'AUTHORIZATION REQUIRED',
            cmd: './authorize-deletion'
        };
        if (titleStr.includes('hidden')) return {
            header: 'LunaCore OS (Classified Volume: H-Tier)',
            status: 'ENCRYPTED',
            cmd: './decrypt'
        };
        if (titleStr.includes('secret')) return {
            header: 'LunaCore OS (Classified Volume: S-Tier)',
            status: 'HEAVILY ENCRYPTED',
            cmd: './override'
        };
        if (titleStr.includes('journal') || titleStr.includes('diary')) return {
            header: 'LunaCore OS (Private Logs)',
            status: 'LOCKED',
            cmd: './unlock-logs'
        };
        return {
            header: `LunaCore OS (${title} Subsystem)`,
            status: 'LOCKED',
            cmd: './unlock'
        };
    };
    const custom = getCustomText(title);

    return ReactDOM.createPortal(
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
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
                fontFamily: 'Menlo, Monaco, "Courier New", monospace'
            }}>
                <style>{`
                    .svl-term-text { color: #e0e0e0; margin: 0 0 8px 0; font-size: 0.95rem; line-height: 1.4; }
                    .svl-term-prompt { color: #4ade80; margin-right: 12px; font-size: 0.95rem; font-weight: 600; }
                    .svl-term-command { color: #e0e0e0; font-size: 0.95rem; }
                    .svl-term-input { flex: 1; background: transparent; border: none; outline: none; color: #e0e0e0; font-family: inherit; font-size: 0.95rem; letter-spacing: 0.2rem; }
                    .svl-term-error { color: #ff5f56; margin-top: 12px; font-size: 0.95rem; }
                `}</style>
                <div style={{
                    display: 'flex', alignItems: 'center', padding: '12px 16px',
                    background: 'rgba(40, 40, 45, 0.5)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    position: 'relative'
                }}>
                    <div style={{ display: 'flex', gap: '8px', position: 'absolute', left: '16px' }}>
                        <button onClick={onClose} style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56', border: '1px solid #e0443e', padding: 0, cursor: 'pointer' }}></button>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e', border: '1px solid #dea123' }}></span>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f', border: '1px solid #1aab29' }}></span>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', fontWeight: 500, letterSpacing: '0.5px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
                        LunaCore Security Daemon — active
                    </div>
                </div>

                <div style={{ padding: '40px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <p className="svl-term-text">Last login: {new Date().toLocaleString()} on ttys001</p>
                    <p className="svl-term-text">{custom.header}</p>
                    <p className="svl-term-text" style={{ opacity: 0.5 }}>Module Status: {isSetMode ? 'UNINITIALIZED' : custom.status}</p>
                    <br />

                    {unlockState ? (
                        <UnlockSequence isError={unlockState.isError} onComplete={unlockState.onComplete} />
                    ) : (
                        <form onSubmit={handleSubmit}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                            <span className="svl-term-prompt">ismail@lunacore:~/{pathName}$</span>
                            <span className="svl-term-command">{custom.cmd}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                            <span className="svl-term-prompt">{isSetMode ? 'New Key:' : 'Access Key:'}</span>
                            <input
                                type="password"
                                value={pwd}
                                onChange={e => setPwd(e.target.value)}
                                autoFocus
                                required
                                className="svl-term-input"
                                disabled={submitting}
                            />
                        </div>
                        {isSetMode && (
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                <span className="svl-term-prompt">Confirm Key:</span>
                                <input
                                    type="password"
                                    value={confirm}
                                    onChange={e => setConfirm(e.target.value)}
                                    required
                                    className="svl-term-input"
                                    disabled={submitting}
                                />
                            </div>
                        )}
                        
                        {submitting && <div className="svl-term-text" style={{ color: '#f97316', marginTop: '12px' }}>Verifying credentials...</div>}
                            {error && <div className="svl-term-error">{error}</div>}
                            <button type="submit" style={{ display: 'none' }}>Submit</button>
                        </form>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
