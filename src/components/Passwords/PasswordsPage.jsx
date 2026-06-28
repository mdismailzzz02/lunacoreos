import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Plus, Search, Key, Eye, EyeOff, Copy, Pencil, Trash2,
    Upload, X, Check, ChevronDown, ExternalLink, ShieldCheck,
    ShieldAlert, Shield, RefreshCw, Globe, Lock
} from 'lucide-react';
import {
    deriveKeyFromMaster, hasSessionKey, encryptPassword,
    decryptPassword, scorePasswordStrength, copyWithAutoClear
} from '../../services/cryptoService';
import {
    getPasswords, createPassword, updatePassword,
    deletePassword, bulkCreatePasswords
} from '../../services/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORIES = ['General', 'Social', 'Finance', 'Work', 'Entertainment', 'Shopping', 'Health', 'Other'];

const STRENGTH_META = {
    weak:   { label: 'Weak',   color: '#ef4444', bars: 1 },
    fair:   { label: 'Fair',   color: '#f59e0b', bars: 2 },
    strong: { label: 'Strong', color: '#22c55e', bars: 3 },
};

function getFaviconUrl(url) {
    try {
        const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
        return null;
    }
}

function generateStrongPassword(length = 20) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}';
    const arr = new Uint8Array(length);
    crypto.getRandomValues(arr);
    return Array.from(arr).map((b) => chars[b % chars.length]).join('');
}

// ── Strength Bar ─────────────────────────────────────────────────────────────
function StrengthBar({ password }) {
    const score = scorePasswordStrength(password);
    const meta  = STRENGTH_META[score];
    return (
        <div style={{ marginTop: '0.4rem' }}>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                {[1, 2, 3].map((n) => (
                    <div key={n} style={{
                        flex: 1, height: '4px', borderRadius: '99px',
                        background: n <= meta.bars ? meta.color : 'rgba(255,255,255,0.1)',
                        transition: 'background 0.3s',
                    }} />
                ))}
            </div>
            <span style={{ fontSize: '0.72rem', color: meta.color, fontWeight: 600 }}>
                {password ? meta.label : ''}
            </span>
        </div>
    );
}

// ── Unlock Prompt (derive key if not yet set) ────────────────────────────────
function UnlockPrompt({ onUnlocked }) {
    const [pwd, setPwd] = useState('');
    const [show, setShow] = useState(false);
    const [err, setErr] = useState('');
    const [loading, setLoading] = useState(false);

    const handleUnlock = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErr('');
        try {
            await deriveKeyFromMaster(pwd);
            onUnlocked();
        } catch {
            setErr('Failed to derive encryption key. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: '60vh', gap: '1.5rem',
        }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>🔑</div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary, #fff)' }}>
                    Unlock Password Vault
                </h2>
                <p style={{ margin: '0.5rem 0 0', color: 'var(--text-secondary, #aaa)', fontSize: '0.88rem' }}>
                    Enter your Master Key to decrypt your saved passwords.
                </p>
            </div>
            <form onSubmit={handleUnlock} style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ position: 'relative' }}>
                    <input
                        type={show ? 'text' : 'password'}
                        value={pwd}
                        onChange={e => setPwd(e.target.value)}
                        placeholder="Master Key…"
                        autoFocus
                        required
                        className="pwd-input"
                    />
                    <button type="button" onClick={() => setShow(s => !s)} className="pwd-eye-btn">
                        {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
                {err && <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: 0 }}>{err}</p>}
                <button type="submit" disabled={loading} className="pwd-primary-btn">
                    {loading ? 'Unlocking…' : <><Lock size={15} style={{ marginRight: '0.4rem' }} />Unlock</>}
                </button>
            </form>
        </div>
    );
}

// ── Password Modal (Add / Edit) ──────────────────────────────────────────────
function PasswordModal({ entry, onSave, onClose }) {
    const isEdit = !!entry;
    const [form, setForm] = useState({
        site_name: entry?.site_name || '',
        site_url:  entry?.site_url  || '',
        username:  entry?.username  || '',
        password:  '',    // plaintext (never stored)
        notes:     entry?.notes     || '',
        category:  entry?.category  || 'General',
    });
    const [revealPlain, setRevealPlain] = useState(false);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');

    // For edit: load decrypted password
    useEffect(() => {
        if (isEdit && entry.enc_password) {
            decryptPassword(entry.enc_password, entry.enc_iv)
                .then(p => setForm(f => ({ ...f, password: p })))
                .catch(() => setErr('Could not decrypt existing password.'));
        }
    }, []);

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.site_name.trim()) { setErr('Site name is required.'); return; }
        if (!form.password.trim())  { setErr('Password cannot be empty.'); return; }
        setSaving(true); setErr('');
        try {
            const { enc_password, enc_iv } = await encryptPassword(form.password);
            const strength = scorePasswordStrength(form.password);
            await onSave({
                id: entry?.id,
                site_name: form.site_name.trim(),
                site_url:  form.site_url.trim(),
                username:  form.username.trim(),
                enc_password, enc_iv, strength,
                notes:    form.notes.trim(),
                category: form.category,
            });
        } catch (ex) {
            setErr('Save failed: ' + ex.message);
            setSaving(false);
        }
    };

    return (
        <div className="pwd-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="pwd-modal">
                <div className="pwd-modal-header">
                    <h3>{isEdit ? 'Edit Password' : 'Add Password'}</h3>
                    <button onClick={onClose} className="pwd-icon-btn"><X size={18} /></button>
                </div>
                <form onSubmit={handleSave} className="pwd-modal-form">
                    <label>Site Name *
                        <input value={form.site_name} onChange={set('site_name')} placeholder="e.g. GitHub" required />
                    </label>
                    <label>URL
                        <input value={form.site_url} onChange={set('site_url')} placeholder="https://github.com" />
                    </label>
                    <label>Username / Email
                        <input value={form.username} onChange={set('username')} placeholder="you@example.com" />
                    </label>
                    <label>Password *
                        <div style={{ position: 'relative' }}>
                            <input
                                type={revealPlain ? 'text' : 'password'}
                                value={form.password}
                                onChange={set('password')}
                                placeholder="Enter password"
                                required
                                style={{ paddingRight: '5.5rem' }}
                            />
                            <div style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '0.3rem' }}>
                                <button type="button" onClick={() => setRevealPlain(s => !s)} className="pwd-icon-btn" title="Toggle visibility">
                                    {revealPlain ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                                <button type="button" title="Generate strong password"
                                    onClick={() => setForm(f => ({ ...f, password: generateStrongPassword() }))}
                                    className="pwd-icon-btn" style={{ color: '#f97316' }}>
                                    <RefreshCw size={15} />
                                </button>
                            </div>
                        </div>
                        <StrengthBar password={form.password} />
                    </label>
                    <label>Category
                        <select value={form.category} onChange={set('category')}>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </label>
                    <label>Notes
                        <textarea value={form.notes} onChange={set('notes')} placeholder="Optional notes…" rows={2} />
                    </label>
                    {err && <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: 0 }}>{err}</p>}
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button type="button" onClick={onClose} className="pwd-secondary-btn" style={{ flex: 1 }}>Cancel</button>
                        <button type="submit" disabled={saving} className="pwd-primary-btn" style={{ flex: 2 }}>
                            {saving ? 'Saving…' : isEdit ? 'Update' : 'Save Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── CSV Import Modal ──────────────────────────────────────────────────────────
function CsvImportModal({ onClose, onImported }) {
    const [step, setStep] = useState('upload'); // 'upload' | 'review' | 'pushing' | 'done'
    const [rows, setRows] = useState([]);
    const [selected, setSelected] = useState(new Set());
    const [pushResult, setPushResult] = useState(null);
    const [err, setErr] = useState('');
    const fileRef = useRef();

    // Detect column name aliases (BitWarden, Chrome, 1Password, generic)
    const mapRow = (header, values) => {
        const get = (...keys) => {
            for (const k of keys) {
                const idx = header.findIndex(h => h.toLowerCase().replace(/[^a-z]/g, '') === k.replace(/[^a-z]/g, ''));
                if (idx !== -1 && values[idx] !== undefined) return values[idx].trim();
            }
            return '';
        };
        return {
            site_name: get('name', 'sitename', 'title', 'service', 'account'),
            site_url:  get('url', 'website', 'uri', 'loginuri'),
            username:  get('username', 'email', 'login', 'user'),
            password:  get('password', 'pass', 'secret'),
            notes:     get('notes', 'note', 'comment', 'extra'),
            category:  get('folder', 'category', 'group', 'type') || 'General',
        };
    };

    const parseCSV = (text) => {
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) return [];
        const header = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
        return lines.slice(1).map(line => {
            // Handle quoted fields with commas inside
            const values = [];
            let inQuote = false, cur = '';
            for (const ch of line + ',') {
                if (ch === '"') { inQuote = !inQuote; }
                else if (ch === ',' && !inQuote) { values.push(cur.trim()); cur = ''; }
                else { cur += ch; }
            }
            return mapRow(header, values);
        }).filter(r => r.site_name || r.password);
    };

    const handleFile = (e) => {
        setErr('');
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.name.endsWith('.csv')) { setErr('Please select a .csv file.'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = parseCSV(ev.target.result);
                if (!parsed.length) { setErr('No valid rows found. Check your CSV format.'); return; }
                setRows(parsed);
                setSelected(new Set(parsed.map((_, i) => i)));
                setStep('review');
            } catch (ex) {
                setErr('CSV parse error: ' + ex.message);
            }
        };
        reader.readAsText(file);
    };

    const toggleRow = (i) => setSelected(s => {
        const n = new Set(s);
        n.has(i) ? n.delete(i) : n.add(i);
        return n;
    });

    const toggleAll = () =>
        setSelected(s => s.size === rows.length ? new Set() : new Set(rows.map((_, i) => i)));

    const handlePush = async () => {
        setStep('pushing');
        try {
            const toImport = rows.filter((_, i) => selected.has(i));
            const encrypted = await Promise.all(toImport.map(async (r) => {
                const { enc_password, enc_iv } = await encryptPassword(r.password);
                const strength = scorePasswordStrength(r.password);
                return { ...r, enc_password, enc_iv, strength };
            }));
            const saved = await bulkCreatePasswords(encrypted);
            setPushResult({ success: saved.length, total: toImport.length });
            setStep('done');
            onImported?.();
        } catch (ex) {
            setErr('Import failed: ' + ex.message);
            setStep('review');
        }
    };

    const strengthColor = { weak: '#ef4444', fair: '#f59e0b', strong: '#22c55e' };

    return (
        <div className="pwd-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="pwd-modal" style={{ maxWidth: step === 'review' ? '900px' : '480px', width: '95vw' }}>
                <div className="pwd-modal-header">
                    <h3>📤 Import from CSV</h3>
                    <button onClick={onClose} className="pwd-icon-btn"><X size={18} /></button>
                </div>

                {/* STEP 1: Upload */}
                {step === 'upload' && (
                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p style={{ color: 'var(--text-secondary, #aaa)', fontSize: '0.88rem', margin: 0 }}>
                            Upload a CSV export from your existing password manager (Chrome, BitWarden, 1Password, etc.).
                            All rows will be shown for review <strong>before</strong> anything goes to Supabase.
                        </p>
                        <div
                            className="pwd-dropzone"
                            onClick={() => fileRef.current?.click()}
                        >
                            <Upload size={32} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
                            <p style={{ margin: 0, fontWeight: 600 }}>Click to select CSV file</p>
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', opacity: 0.6 }}>Supports Chrome, BitWarden, 1Password, or generic CSV exports</p>
                        </div>
                        <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
                        {err && <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: 0 }}>{err}</p>}
                        <button onClick={onClose} className="pwd-secondary-btn">Cancel</button>
                    </div>
                )}

                {/* STEP 2: Review table */}
                {step === 'review' && (
                    <div style={{ padding: '1rem 1.5rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary, #aaa)' }}>
                                <strong style={{ color: '#f97316' }}>{selected.size}</strong> of {rows.length} rows selected
                            </span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={toggleAll} className="pwd-secondary-btn" style={{ padding: '0.35rem 0.8rem', fontSize: '0.82rem' }}>
                                    {selected.size === rows.length ? 'Deselect All' : 'Select All'}
                                </button>
                                <button onClick={() => { setStep('upload'); setRows([]); }} className="pwd-secondary-btn" style={{ padding: '0.35rem 0.8rem', fontSize: '0.82rem' }}>
                                    ← Re-upload
                                </button>
                            </div>
                        </div>
                        {err && <p style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: '0.5rem' }}>{err}</p>}
                        <div style={{ overflowX: 'auto', maxHeight: '50vh', overflowY: 'auto', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.05)', position: 'sticky', top: 0 }}>
                                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left' }}>✓</th>
                                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left' }}>Site</th>
                                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left' }}>URL</th>
                                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left' }}>Username</th>
                                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left' }}>Password</th>
                                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left' }}>Strength</th>
                                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left' }}>Category</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, i) => {
                                        const s = scorePasswordStrength(r.password);
                                        return (
                                            <tr key={i}
                                                onClick={() => toggleRow(i)}
                                                style={{
                                                    cursor: 'pointer',
                                                    borderTop: '1px solid rgba(255,255,255,0.05)',
                                                    background: selected.has(i) ? 'rgba(249,115,22,0.07)' : 'transparent',
                                                    transition: 'background 0.15s',
                                                }}
                                            >
                                                <td style={{ padding: '0.5rem 0.75rem' }}>
                                                    <div style={{
                                                        width: 16, height: 16, borderRadius: 4,
                                                        border: `2px solid ${selected.has(i) ? '#f97316' : 'rgba(255,255,255,0.2)'}`,
                                                        background: selected.has(i) ? '#f97316' : 'transparent',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    }}>
                                                        {selected.has(i) && <Check size={10} style={{ color: '#fff' }} />}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '0.5rem 0.75rem', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.site_name || '–'}</td>
                                                <td style={{ padding: '0.5rem 0.75rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#60a5fa' }}>{r.site_url || '–'}</td>
                                                <td style={{ padding: '0.5rem 0.75rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.username || '–'}</td>
                                                <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>{'•'.repeat(Math.min(r.password.length, 12))}</td>
                                                <td style={{ padding: '0.5rem 0.75rem' }}>
                                                    <span style={{ color: strengthColor[s], fontWeight: 600, fontSize: '0.78rem', textTransform: 'capitalize' }}>{s}</span>
                                                </td>
                                                <td style={{ padding: '0.5rem 0.75rem', color: 'rgba(255,255,255,0.6)' }}>{r.category}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                            <button onClick={onClose} className="pwd-secondary-btn" style={{ flex: 1 }}>Cancel</button>
                            <button
                                onClick={handlePush}
                                disabled={selected.size === 0}
                                className="pwd-primary-btn"
                                style={{ flex: 2 }}
                            >
                                <ShieldCheck size={15} style={{ marginRight: '0.4rem' }} />
                                Encrypt &amp; Push {selected.size} {selected.size === 1 ? 'Entry' : 'Entries'} to Supabase
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: Pushing */}
                {step === 'pushing' && (
                    <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                        <div className="pwd-spinner" style={{ margin: '0 auto 1rem' }} />
                        <p style={{ color: 'var(--text-secondary, #aaa)' }}>
                            Encrypting &amp; uploading {selected.size} entries…
                        </p>
                    </div>
                )}

                {/* STEP 4: Done */}
                {step === 'done' && (
                    <div style={{ padding: '3rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ShieldCheck size={28} style={{ color: '#22c55e' }} />
                        </div>
                        <h3 style={{ margin: 0, color: '#22c55e' }}>Import Complete!</h3>
                        <p style={{ color: 'var(--text-secondary, #aaa)', margin: 0 }}>
                            Successfully encrypted and saved <strong>{pushResult?.success}</strong> passwords to Supabase.
                        </p>
                        <button onClick={onClose} className="pwd-primary-btn" style={{ width: '100%', maxWidth: 240 }}>
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Password Card ─────────────────────────────────────────────────────────────
function PasswordCard({ entry, onEdit, onDelete }) {
    const [revealed, setRevealed] = useState(false);
    const [plaintext, setPlaintext] = useState('');
    const [copied, setCopied] = useState('');
    const faviconUrl = getFaviconUrl(entry.site_url || entry.site_name);
    const meta = STRENGTH_META[entry.strength] || STRENGTH_META.fair;

    const handleReveal = async () => {
        if (revealed) { setRevealed(false); setPlaintext(''); return; }
        try {
            const p = await decryptPassword(entry.enc_password, entry.enc_iv);
            setPlaintext(p);
            setRevealed(true);
        } catch {
            setPlaintext('Decryption failed');
            setRevealed(true);
        }
    };

    const handleCopy = async (type) => {
        try {
            if (type === 'username') {
                await copyWithAutoClear(entry.username);
            } else {
                const p = plaintext || await decryptPassword(entry.enc_password, entry.enc_iv);
                await copyWithAutoClear(p);
            }
            setCopied(type);
            setTimeout(() => setCopied(''), 2000);
        } catch { /* ignore */ }
    };

    return (
        <div className="pwd-card">
            {/* Top row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                {faviconUrl ? (
                    <img src={faviconUrl} alt="" width={28} height={28}
                        style={{ borderRadius: 6, objectFit: 'contain', background: 'rgba(255,255,255,0.06)', padding: 2 }}
                        onError={e => { e.target.style.display = 'none'; }}
                    />
                ) : (
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(249,115,22,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Globe size={14} style={{ color: '#f97316' }} />
                    </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {entry.site_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {entry.username || 'No username'}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 0.25 }}>
                    {/* Strength dots */}
                    {[1, 2, 3].map(n => (
                        <div key={n} style={{ width: 6, height: 6, borderRadius: '50%', background: n <= meta.bars ? meta.color : 'rgba(255,255,255,0.12)', margin: '0 2px' }} />
                    ))}
                </div>
            </div>

            {/* Category badge */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                <span className="pwd-badge">{entry.category}</span>
                {entry.site_url && (
                    <a href={entry.site_url.startsWith('http') ? entry.site_url : `https://${entry.site_url}`}
                        target="_blank" rel="noopener noreferrer" className="pwd-badge pwd-badge-link">
                        <ExternalLink size={10} style={{ marginRight: 3 }} />Visit
                    </a>
                )}
            </div>

            {/* Password row */}
            <div className="pwd-field-row">
                <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', letterSpacing: revealed ? '0.05em' : '0.2em', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: revealed ? '#e2e8f0' : 'rgba(255,255,255,0.3)' }}>
                    {revealed ? plaintext : '••••••••••••'}
                </span>
                <button onClick={handleReveal} className="pwd-icon-btn" title={revealed ? 'Hide' : 'Reveal'}>
                    {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button onClick={() => handleCopy('password')} className="pwd-icon-btn" title="Copy password (auto-clears in 30s)">
                    {copied === 'password' ? <Check size={14} style={{ color: '#22c55e' }} /> : <Copy size={14} />}
                </button>
            </div>

            {/* Username copy row */}
            {entry.username && (
                <div className="pwd-field-row" style={{ marginTop: '0.4rem' }}>
                    <span style={{ fontSize: '0.78rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.5)' }}>
                        {entry.username}
                    </span>
                    <button onClick={() => handleCopy('username')} className="pwd-icon-btn" title="Copy username">
                        {copied === 'username' ? <Check size={14} style={{ color: '#22c55e' }} /> : <Copy size={14} />}
                    </button>
                </div>
            )}

            {/* Notes */}
            {entry.notes && (
                <p style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.6rem', marginBottom: 0, lineHeight: 1.4 }}>{entry.notes}</p>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <button onClick={() => onEdit(entry)} className="pwd-action-btn">
                    <Pencil size={13} /><span>Edit</span>
                </button>
                <button onClick={() => onDelete(entry)} className="pwd-action-btn pwd-action-btn-danger">
                    <Trash2 size={13} /><span>Delete</span>
                </button>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PasswordsPage() {
    const [unlocked, setUnlocked] = useState(hasSessionKey());
    const [passwords, setPasswords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [editEntry, setEditEntry] = useState(null);
    const [showCsv, setShowCsv] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [toast, setToast] = useState('');

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const load = useCallback(async () => {
        if (!unlocked) return;
        setLoading(true);
        try {
            const data = await getPasswords();
            setPasswords(data || []);
        } catch (e) {
            showToast('Failed to load passwords: ' + e.message);
        } finally {
            setLoading(false);
        }
    }, [unlocked]);

    useEffect(() => { load(); }, [load]);

    const handleSave = async (params) => {
        if (params.id) {
            await updatePassword(params);
            showToast('Password updated ✓');
        } else {
            await createPassword(params);
            showToast('Password saved ✓');
        }
        setShowModal(false);
        setEditEntry(null);
        load();
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        await deletePassword(deleteTarget.id);
        setDeleteTarget(null);
        showToast('Deleted.');
        load();
    };

    const filtered = passwords.filter(p => {
        const q = search.toLowerCase();
        const matchesQ = !q || p.site_name?.toLowerCase().includes(q) || p.username?.toLowerCase().includes(q);
        const matchesCat = filterCat === 'All' || p.category === filterCat;
        return matchesQ && matchesCat;
    });

    const stats = {
        total: passwords.length,
        weak:   passwords.filter(p => p.strength === 'weak').length,
        strong: passwords.filter(p => p.strength === 'strong').length,
    };

    if (!unlocked) {
        return (
            <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
                <UnlockPrompt onUnlocked={() => setUnlocked(true)} />
                <PwdStyles />
            </div>
        );
    }

    return (
        <div className="pwd-page">
            <PwdStyles />

            {/* Toast */}
            {toast && (
                <div className="pwd-toast">{toast}</div>
            )}

            {/* Header */}
            <div className="pwd-header">
                <div>
                    <h1 className="pwd-title"><Key size={22} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Passwords</h1>
                    <p className="pwd-subtitle">AES-256-GCM encrypted · Key lives in memory only</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button onClick={() => setShowCsv(true)} className="pwd-secondary-btn">
                        <Upload size={15} style={{ marginRight: '0.3rem' }} />Import CSV
                    </button>
                    <button onClick={() => { setEditEntry(null); setShowModal(true); }} className="pwd-primary-btn">
                        <Plus size={15} style={{ marginRight: '0.3rem' }} />Add Password
                    </button>
                </div>
            </div>

            {/* Stats bar */}
            <div className="pwd-stats">
                <div className="pwd-stat-chip">
                    <Shield size={14} /><span>{stats.total} total</span>
                </div>
                {stats.weak > 0 && (
                    <div className="pwd-stat-chip pwd-stat-chip-warn">
                        <ShieldAlert size={14} /><span>{stats.weak} weak</span>
                    </div>
                )}
                <div className="pwd-stat-chip pwd-stat-chip-ok">
                    <ShieldCheck size={14} /><span>{stats.strong} strong</span>
                </div>
            </div>

            {/* Toolbar */}
            <div className="pwd-toolbar">
                <div className="pwd-search-wrap">
                    <Search size={15} className="pwd-search-icon" />
                    <input
                        className="pwd-search"
                        placeholder="Search sites or usernames…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select className="pwd-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                    <option value="All">All categories</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {/* Grid */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
                    <div className="pwd-spinner" style={{ margin: '0 auto 1rem' }} />
                    <p>Loading encrypted vault…</p>
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '5rem 2rem', opacity: 0.4 }}>
                    <Key size={48} style={{ marginBottom: '1rem' }} />
                    <p style={{ fontSize: '1rem' }}>{search || filterCat !== 'All' ? 'No results found.' : 'No passwords saved yet. Add one or import a CSV.'}</p>
                </div>
            ) : (
                <div className="pwd-grid">
                    {filtered.map(p => (
                        <PasswordCard
                            key={p.id}
                            entry={p}
                            onEdit={(e) => { setEditEntry(e); setShowModal(true); }}
                            onDelete={setDeleteTarget}
                        />
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <PasswordModal
                    entry={editEntry}
                    onSave={handleSave}
                    onClose={() => { setShowModal(false); setEditEntry(null); }}
                />
            )}

            {/* CSV Import Modal */}
            {showCsv && (
                <CsvImportModal
                    onClose={() => setShowCsv(false)}
                    onImported={() => { setShowCsv(false); load(); }}
                />
            )}

            {/* Delete Confirmation */}
            {deleteTarget && (
                <div className="pwd-overlay" onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
                    <div className="pwd-modal" style={{ maxWidth: 400 }}>
                        <div className="pwd-modal-header">
                            <h3>Delete Password?</h3>
                            <button onClick={() => setDeleteTarget(null)} className="pwd-icon-btn"><X size={18} /></button>
                        </div>
                        <div style={{ padding: '1rem 1.5rem 1.5rem' }}>
                            <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 1.25rem' }}>
                                Are you sure you want to permanently delete the password for <strong>{deleteTarget.site_name}</strong>? This cannot be undone.
                            </p>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button onClick={() => setDeleteTarget(null)} className="pwd-secondary-btn" style={{ flex: 1 }}>Cancel</button>
                                <button onClick={handleDelete} className="pwd-primary-btn" style={{ flex: 1, background: '#ef4444', boxShadow: '0 4px 14px rgba(239,68,68,0.3)' }}>
                                    <Trash2 size={14} style={{ marginRight: '0.3rem' }} />Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Inline Styles ─────────────────────────────────────────────────────────────
function PwdStyles() {
    return (
        <style>{`
        .pwd-page {
            padding: 1.5rem 2rem;
            max-width: 1400px;
            margin: 0 auto;
            font-family: 'Inter', 'Segoe UI', sans-serif;
            color: #e2e8f0;
            position: relative;
        }
        .pwd-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 1rem;
            margin-bottom: 1.25rem;
        }
        .pwd-title {
            margin: 0 0 0.25rem;
            font-size: 1.5rem;
            font-weight: 800;
            letter-spacing: -0.02em;
            color: #fff;
        }
        .pwd-subtitle {
            margin: 0;
            font-size: 0.78rem;
            color: #22c55e;
            font-weight: 600;
            letter-spacing: 0.04em;
            text-transform: uppercase;
        }

        /* Stats */
        .pwd-stats {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
            margin-bottom: 1.25rem;
        }
        .pwd-stat-chip {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            padding: 0.3rem 0.75rem;
            border-radius: 99px;
            font-size: 0.78rem;
            font-weight: 600;
            background: rgba(255,255,255,0.07);
            color: rgba(255,255,255,0.7);
        }
        .pwd-stat-chip-warn { background: rgba(239,68,68,0.15); color: #f87171; }
        .pwd-stat-chip-ok   { background: rgba(34,197,94,0.12); color: #4ade80; }

        /* Toolbar */
        .pwd-toolbar {
            display: flex;
            gap: 0.75rem;
            flex-wrap: wrap;
            margin-bottom: 1.5rem;
        }
        .pwd-search-wrap {
            position: relative;
            flex: 1;
            min-width: 220px;
        }
        .pwd-search-icon {
            position: absolute;
            left: 0.8rem;
            top: 50%;
            transform: translateY(-50%);
            color: rgba(255,255,255,0.35);
            pointer-events: none;
        }
        .pwd-search, .pwd-select {
            width: 100%;
            padding: 0.65rem 0.9rem 0.65rem 2.3rem;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 0.75rem;
            color: #e2e8f0;
            font-size: 0.88rem;
            outline: none;
            transition: border-color 0.2s;
        }
        .pwd-select { padding-left: 0.9rem; min-width: 170px; cursor: pointer; }
        .pwd-select option {
            background-color: #1a1a2e;
            color: #e2e8f0;
        }
        .pwd-search:focus, .pwd-select:focus { border-color: #f97316; }

        /* Grid */
        .pwd-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1rem;
        }

        /* Card */
        .pwd-card {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 1rem;
            padding: 1rem 1.1rem;
            transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
        }
        .pwd-card:hover {
            border-color: rgba(249,115,22,0.3);
            transform: translateY(-2px);
            box-shadow: 0 8px 28px rgba(0,0,0,0.25);
        }

        /* Field row */
        .pwd-field-row {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            background: rgba(0,0,0,0.2);
            border-radius: 0.5rem;
            padding: 0.35rem 0.5rem;
        }

        /* Badges */
        .pwd-badge {
            display: inline-flex;
            align-items: center;
            padding: 0.18rem 0.55rem;
            border-radius: 99px;
            font-size: 0.72rem;
            font-weight: 600;
            background: rgba(255,255,255,0.07);
            color: rgba(255,255,255,0.55);
        }
        .pwd-badge-link {
            color: #60a5fa;
            text-decoration: none;
            background: rgba(96,165,250,0.1);
        }
        .pwd-badge-link:hover { background: rgba(96,165,250,0.2); }

        /* Action buttons on card */
        .pwd-action-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            padding: 0.3rem 0.65rem;
            border-radius: 0.5rem;
            border: 1px solid rgba(255,255,255,0.1);
            background: rgba(255,255,255,0.05);
            color: rgba(255,255,255,0.65);
            font-size: 0.78rem;
            cursor: pointer;
            transition: all 0.15s;
        }
        .pwd-action-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .pwd-action-btn-danger:hover { background: rgba(239,68,68,0.15); color: #f87171; border-color: rgba(239,68,68,0.3); }

        /* Buttons */
        .pwd-primary-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.65rem 1.25rem;
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            border: none;
            border-radius: 0.75rem;
            color: #fff;
            font-weight: 700;
            font-size: 0.88rem;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 14px rgba(249,115,22,0.3);
            white-space: nowrap;
        }
        .pwd-primary-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(249,115,22,0.4); }
        .pwd-primary-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .pwd-secondary-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.65rem 1.1rem;
            background: rgba(255,255,255,0.07);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 0.75rem;
            color: rgba(255,255,255,0.8);
            font-weight: 600;
            font-size: 0.88rem;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
        }
        .pwd-secondary-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
        .pwd-icon-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.3rem;
            background: none;
            border: none;
            border-radius: 0.4rem;
            color: rgba(255,255,255,0.45);
            cursor: pointer;
            transition: all 0.15s;
            flex-shrink: 0;
        }
        .pwd-icon-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }

        /* Modal */
        .pwd-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.65);
            backdrop-filter: blur(6px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 1rem;
        }
        .pwd-modal {
            background: #141418;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 1.25rem;
            width: 100%;
            max-width: 520px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 24px 64px rgba(0,0,0,0.6);
        }
        .pwd-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1.25rem 1.5rem 0;
        }
        .pwd-modal-header h3 { margin: 0; font-size: 1.05rem; }
        .pwd-modal-form {
            display: flex;
            flex-direction: column;
            gap: 0.85rem;
            padding: 1rem 1.5rem 1.5rem;
        }
        .pwd-modal-form label {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
            font-size: 0.8rem;
            font-weight: 600;
            color: rgba(255,255,255,0.55);
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        .pwd-modal-form input,
        .pwd-modal-form select,
        .pwd-modal-form textarea {
            padding: 0.6rem 0.85rem;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 0.65rem;
            color: #e2e8f0;
            font-size: 0.88rem;
            outline: none;
            transition: border-color 0.2s;
            width: 100%;
            box-sizing: border-box;
        }
        .pwd-modal-form input:focus,
        .pwd-modal-form select:focus,
        .pwd-modal-form textarea:focus { border-color: #f97316; }
        .pwd-modal-form select option {
            background-color: #1a1a2e;
            color: #e2e8f0;
        }
        .pwd-modal-form textarea { resize: vertical; font-family: inherit; }

        /* Unlock page */
        .pwd-input {
            width: 100%;
            padding: 0.85rem 3rem 0.85rem 1rem;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 0.9rem;
            color: #e2e8f0;
            font-size: 1rem;
            outline: none;
            transition: border-color 0.2s;
            box-sizing: border-box;
        }
        .pwd-input:focus { border-color: #f97316; }
        .pwd-eye-btn {
            position: absolute;
            right: 0.85rem;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: rgba(255,255,255,0.4);
            cursor: pointer;
            display: flex;
        }

        /* CSV dropzone */
        .pwd-dropzone {
            border: 2px dashed rgba(255,255,255,0.15);
            border-radius: 1rem;
            padding: 2.5rem 1.5rem;
            text-align: center;
            cursor: pointer;
            transition: border-color 0.2s, background 0.2s;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .pwd-dropzone:hover {
            border-color: #f97316;
            background: rgba(249,115,22,0.05);
        }

        /* Spinner */
        .pwd-spinner {
            width: 36px; height: 36px;
            border: 3px solid rgba(255,255,255,0.1);
            border-top-color: #f97316;
            border-radius: 50%;
            animation: pwd-spin 0.7s linear infinite;
        }
        @keyframes pwd-spin { to { transform: rotate(360deg); } }

        /* Toast */
        .pwd-toast {
            position: fixed;
            bottom: 2rem;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(20,20,24,0.95);
            border: 1px solid rgba(249,115,22,0.4);
            color: #fff;
            padding: 0.65rem 1.5rem;
            border-radius: 99px;
            font-size: 0.88rem;
            font-weight: 600;
            z-index: 2000;
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
            animation: pwd-fadeup 0.3s ease;
        }
        @keyframes pwd-fadeup {
            from { opacity: 0; transform: translateX(-50%) translateY(10px); }
            to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        @media (max-width: 600px) {
            .pwd-page { padding: 1rem; }
            .pwd-header { flex-direction: column; }
        }
        `}</style>
    );
}
