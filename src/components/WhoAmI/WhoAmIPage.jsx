import { useState, useEffect } from 'react';
import * as api from '../../services/api';

const DEFAULT_SECTIONS = [
    { section: 'Vision', content: 'Who do I want to become?' },
    { section: 'Values', content: 'What principles guide my life?' },
    { section: 'I Love', content: 'What brings me joy?' },
    { section: 'I Am', content: 'How do I describe myself right now?' },
    { section: 'Beliefs', content: 'What do I hold to be true?' }
];

export default function WhoAmIPage() {
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingSection, setEditingSection] = useState(null);
    const [editContent, setEditContent] = useState('');

    useEffect(() => {
        loadSections();
    }, []);

    const loadSections = async () => {
        try {
            const data = await api.getWhoAmI();
            if (data && data.length > 0) {
                setSections(data);
            } else {
                setSections(DEFAULT_SECTIONS);
            }
        } catch (err) {
            console.error('Failed to load sections', err);
            setSections(DEFAULT_SECTIONS);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (sec) => {
        setEditingSection(sec.section);
        setEditContent(sec.content);
    };

    const handleSave = async (secName) => {
        const newSec = { section: secName, content: editContent, updated_at: new Date().toISOString() };
        try {
            await api.saveWhoAmI(newSec);
            setSections(prev => prev.map(s => s.section === secName ? newSec : s));
            setEditingSection(null);
        } catch (err) {
            alert('Failed to save section');
        }
    };

    return (
        <div className="fade-in" style={{ padding: '1rem', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
                <h1 style={{ margin: 0, fontSize: '2.5rem' }}>🧬 Who Am I</h1>
                <p style={{ margin: '10px 0 0 0', opacity: 0.6 }}>Your personal identity wiki. A living document of self-discovery.</p>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                    <div className="spinner" />
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '2rem' }}>
                    {sections.map(sec => (
                        <div key={sec.section} style={{
                            background: 'var(--card-bg)',
                            borderRadius: '24px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            overflow: 'hidden',
                            transition: 'all 0.3s ease',
                            boxShadow: editingSection === sec.section ? '0 10px 30px rgba(0,0,0,0.3)' : 'none'
                        }}>
                            <div style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--brand-color, #a29bfe)' }}>{sec.section}</h2>
                                {editingSection !== sec.section && (
                                    <button
                                        onClick={() => handleEdit(sec)}
                                        style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.1rem' }}
                                        title="Edit"
                                    >
                                        ✎
                                    </button>
                                )}
                            </div>

                            <div style={{ padding: '2rem' }}>
                                {editingSection === sec.section ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <textarea
                                            autoFocus
                                            value={editContent}
                                            onChange={e => setEditContent(e.target.value)}
                                            style={{
                                                width: '100%',
                                                minHeight: '150px',
                                                padding: '1rem',
                                                borderRadius: '12px',
                                                background: 'rgba(0,0,0,0.2)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                color: 'white',
                                                fontSize: '1.05rem',
                                                lineHeight: '1.6',
                                                resize: 'vertical'
                                            }}
                                        />
                                        <div style={{ display: 'flex', gap: '1rem', alignSelf: 'flex-end' }}>
                                            <button
                                                onClick={() => setEditingSection(null)}
                                                style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => handleSave(sec.section)}
                                                style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                                            >
                                                Update Section
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p style={{
                                        margin: 0,
                                        fontSize: '1.1rem',
                                        lineHeight: '1.7',
                                        opacity: 0.85,
                                        whiteSpace: 'pre-wrap',
                                        fontFamily: "'Lora', serif"
                                    }}>
                                        {sec.content || 'Click edit to write...'}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
