import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { getAppPasswordV2, setAppPasswordV2 } from '../../services/api';

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
                onSuccess();
            } else if (status === 'locked') {
                const hash = await sha256(storedRecord.salt + pwd);
                if (hash === storedRecord.hash) {
                    onSuccess();
                } else {
                    setError('Invalid access key.');
                }
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (status === 'loading') return null;

    const isSetMode = status === 'set';

    return ReactDOM.createPortal(
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(10px)'
        }}>
            <div style={{
                width: '100%', maxWidth: '400px', padding: '3rem',
                background: 'rgba(15, 15, 25, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '32px',
                boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
                textAlign: 'center',
                position: 'relative'
            }}>
                <button 
                    onClick={onClose} 
                    style={{ position: 'absolute', top: '1rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '1.5rem', cursor: 'pointer' }}
                >
                    ✕
                </button>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                    {icon}
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem', color: 'white', textTransform: 'uppercase' }}>
                    {isSetMode ? `INIT ${title}` : `${title} LOCK`}
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2rem' }}>
                    {isSetMode ? 'Create a secret key for hidden collections.' : 'Enter your secret key.'}
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input
                        type="password"
                        placeholder={isSetMode ? 'New Secret Key (min 6 chars)' : 'Secret Key'}
                        value={pwd}
                        onChange={e => setPwd(e.target.value)}
                        autoFocus
                        required
                        style={{ width: '100%', padding: '1rem', borderRadius: '16px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                    {isSetMode && (
                        <input
                            type="password"
                            placeholder="Confirm Key"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            required
                            style={{ width: '100%', padding: '1rem', borderRadius: '16px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
                        />
                    )}
                    {error && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '0.8rem', color: '#f87171', fontSize: '0.8rem' }}>
                            {error}
                        </div>
                    )}
                    <button type="submit" disabled={submitting}
                        style={{ padding: '1rem', borderRadius: '16px', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 800, background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: 'white' }}>
                        {submitting ? 'VERIFYING...' : isSetMode ? 'CREATE' : 'UNLOCK'}
                    </button>
                </form>
            </div>
        </div>,
        document.body
    );
}
