import { useState, useEffect } from 'react';
import * as api from '../../services/api';

export default function TimeCapsulePage() {
    const [capsules, setCapsules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [formData, setFormData] = useState({ title: '', message: '', unlock_date: '' });

    useEffect(() => {
        loadCapsules();
    }, []);

    const loadCapsules = async () => {
        try {
            const data = await api.getTimeCapsules();
            setCapsules(data || []);
        } catch (err) {
            console.error('Failed to load capsules', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.unlock_date) return;

        const newCapsule = {
            id: Date.now().toString(),
            ...formData,
            created_at: new Date().toISOString(),
            is_unlocked: false
        };

        try {
            await api.saveTimeCapsule(newCapsule);
            setCapsules([...capsules, newCapsule]);
            setShowAdd(false);
            setFormData({ title: '', message: '', unlock_date: '' });
        } catch (err) {
            alert('Failed to save capsule');
        }
    };

    const isLocked = (unlockDate) => {
        return new Date(unlockDate) > new Date();
    };

    return (
        <div className="fade-in" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2rem' }}>⏳ Time Capsule</h1>
                    <p style={{ margin: '5px 0 0 0', opacity: 0.6 }}>Locked messages for your future self</p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    + Create Capsule
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                    <div className="spinner" />
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {capsules.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', opacity: 0.5, border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '20px' }}>
                            No capsules yet. Write something for future-you!
                        </div>
                    )}
                    {capsules.map(cap => {
                        const locked = isLocked(cap.unlock_date);
                        const dateObj = new Date(cap.unlock_date);

                        return (
                            <div key={cap.id} style={{
                                background: 'var(--card-bg)',
                                borderRadius: '20px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                padding: '1.5rem',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <h3 style={{ margin: 0 }}>{cap.title}</h3>
                                    <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>{new Date(cap.created_at).toLocaleDateString()}</span>
                                </div>

                                <div style={{
                                    minHeight: '100px',
                                    padding: '1rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '12px',
                                    filter: locked ? 'blur(8px)' : 'none',
                                    transition: 'filter 0.3s ease',
                                    userSelect: locked ? 'none' : 'text'
                                }}>
                                    {locked ? 'This message is locked away in time...' : cap.message}
                                </div>

                                <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                    {locked ? (
                                        <>
                                            <span style={{ color: '#ff9f43' }}>🔒 Unlocks:</span>
                                            <span>{dateObj.toLocaleDateString()}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span style={{ color: '#2ecc71' }}>🔓 Unlocked on:</span>
                                            <span>{dateObj.toLocaleDateString()}</span>
                                        </>
                                    )}
                                </div>

                                {locked && (
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'rgba(0,0,0,0.1)' }}>
                                        <div style={{ background: 'rgba(0,0,0,0.6)', padding: '5px 15px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', backdropFilter: 'blur(4px)' }}>
                                            CLOSED
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {showAdd && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: '24px', width: '500px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h2 style={{ marginTop: 0 }}>Create Time Capsule</h2>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <input
                                type="text"
                                placeholder="Capsule Title (e.g., Letter to myself in 2027)"
                                required
                                style={{ padding: '0.9rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                            <textarea
                                placeholder="Write your message here... it will be hidden until the unlock date."
                                required
                                rows={6}
                                style={{ padding: '0.9rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', resize: 'none', lineHeight: '1.5' }}
                                value={formData.message}
                                onChange={e => setFormData({ ...formData, message: e.target.value })}
                            />
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.5rem' }}>Unlock Date</label>
                                <input
                                    type="date"
                                    required
                                    min={new Date().toISOString().split('T')[0]}
                                    style={{ width: '100%', padding: '0.9rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                    value={formData.unlock_date}
                                    onChange={e => setFormData({ ...formData, unlock_date: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Seal Capsule</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
