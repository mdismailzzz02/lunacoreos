import { useState, useEffect } from 'react';
import * as api from '../../services/api';
import { getAiReflection } from '../../services/gemini';
import { useDashboard } from '../../hooks/useDashboard';

export default function ThoughtDumpPage() {
    const [thoughts, setThoughts] = useState([]);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [reflecting, setReflecting] = useState(false);
    const [reflection, setReflection] = useState('');
    const { stats } = useDashboard();

    useEffect(() => {
        loadThoughts();
    }, []);

    const loadThoughts = async () => {
        try {
            const data = await api.getThoughts();
            setThoughts(data || []);
        } catch (err) {
            console.error('Failed to load thoughts', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;

        const newThought = {
            id: Date.now().toString(),
            content: content.trim(),
            created_at: new Date().toISOString()
        };

        try {
            await api.saveThought(newThought);
            setThoughts([newThought, ...thoughts]);
            setContent('');
        } catch (err) {
            alert('Failed to save thought');
        }
    };

    const handleReflect = async () => {
        const apiKey = stats?.config?.google_api_key;
        if (!apiKey) {
            alert('Please add your Google API Key in Settings to use AI Reflection.');
            return;
        }

        setReflecting(true);
        try {
            // Only reflect on last 20 thoughts to keep it focused
            const recent = thoughts.slice(0, 20);
            const result = await getAiReflection(apiKey, recent);
            setReflection(result);
        } catch (err) {
            alert(err.message);
        } finally {
            setReflecting(false);
        }
    };

    return (
        <div className="fade-in" style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
                <h1 style={{ margin: 0, fontSize: '2.5rem' }}>💭 Thought Dump</h1>
                <p style={{ margin: '10px 0 0 0', opacity: 0.6 }}>Unfiltered consciousness. Let it all out.</p>
            </div>

            {/* Input Section */}
            <div style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="What's spinning in your head right now?"
                        style={{
                            width: '100%',
                            minHeight: '120px',
                            padding: '1rem',
                            borderRadius: '16px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'white',
                            fontSize: '1.1rem',
                            resize: 'none'
                        }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', opacity: 0.4 }}>Type and hit Save to clear your mind.</span>
                        <button
                            type="submit"
                            disabled={!content.trim()}
                            style={{ padding: '0.8rem 2rem', borderRadius: '12px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', opacity: content.trim() ? 1 : 0.5 }}
                        >
                            Save Thought
                        </button>
                    </div>
                </form>
            </div>

            {/* AI Reflection Section */}
            {thoughts.length >= 3 && (
                <div style={{ background: 'linear-gradient(135deg, rgba(162, 155, 254, 0.1), rgba(108, 92, 231, 0.1))', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(162, 155, 254, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: reflection ? '1rem' : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>✨</span>
                            <span style={{ fontWeight: 'bold' }}>AI Reflection</span>
                        </div>
                        <button
                            onClick={handleReflect}
                            disabled={reflecting}
                            style={{ background: 'none', border: '1px solid rgba(162, 155, 254, 0.3)', color: '#dcdde1', padding: '0.5rem 1rem', borderRadius: '10px', cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                            {reflecting ? 'Reflecting...' : reflection ? 'Re-reflect' : 'Reflect on Patterns'}
                        </button>
                    </div>
                    {reflection && (
                        <div style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#f5f6fa', whiteSpace: 'pre-wrap' }}>
                            {reflection}
                        </div>
                    )}
                </div>
            )}

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
                ) : (
                    thoughts.map(thought => (
                        <div key={thought.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.75rem', opacity: 0.4, marginBottom: '0.5rem' }}>{new Date(thought.created_at).toLocaleString()}</div>
                            <div style={{ lineHeight: '1.5', opacity: 0.9 }}>{thought.content}</div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
