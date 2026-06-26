import { useState, useEffect } from 'react';
import * as api from '../../services/api';

const DEFAULT_QUESTIONS = [
    { id: 'wins', label: 'Top 3 Wins this Year', placeholder: 'What are you most proud of achieving?' },
    { id: 'challenges', label: 'Biggest Challenges', placeholder: 'What obstacles did you face and how did you handle them?' },
    { id: 'lessons', label: 'Key Lessons Learned', placeholder: 'What wisdom are you carrying forward?' },
    { id: 'gratitude', label: 'Moments of Gratitude', placeholder: 'Names, places, or experiences you are thankful for.' },
    { id: 'theme', label: 'Theme for Next Year', placeholder: 'One word or phrase that defines your next chapter.' }
];

export default function YearlyReviewPage() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingYear, setEditingYear] = useState(null);
    const [formData, setFormData] = useState({});

    useEffect(() => {
        loadReviews();
    }, []);

    const loadReviews = async () => {
        try {
            const data = await api.getYearlyReviews();
            setReviews(data || []);
        } catch (err) {
            console.error('Failed to load yearly reviews', err);
        } finally {
            setLoading(false);
        }
    };

    const handleNew = () => {
        const year = new Date().getFullYear().toString();
        setEditingYear(year);
        const existing = reviews.find(r => r.year === year);
        if (existing) {
            setFormData(existing);
        } else {
            setFormData({ year, wins: '', challenges: '', lessons: '', gratitude: '', theme: '' });
        }
    };

    const handleEdit = (rev) => {
        setEditingYear(rev.year);
        setFormData(rev);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await api.saveYearlyReview(formData);
            if (reviews.find(r => r.year === formData.year)) {
                setReviews(reviews.map(r => r.year === formData.year ? formData : r));
            } else {
                setReviews([formData, ...reviews]);
            }
            setEditingYear(null);
        } catch (err) {
            alert('Failed to save review');
        }
    };

    if (editingYear) {
        return (
            <div className="fade-in" style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <button onClick={() => setEditingYear(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>← Back</button>
                    <h2 style={{ margin: 0 }}>Review for {editingYear}</h2>
                    <div />
                </div>

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {DEFAULT_QUESTIONS.map(q => (
                        <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <label style={{ fontWeight: 'bold', color: 'var(--brand-color, #a29bfe)', fontSize: '1.1rem' }}>{q.label}</label>
                            <textarea
                                value={formData[q.id] || ''}
                                onChange={e => setFormData({ ...formData, [q.id]: e.target.value })}
                                placeholder={q.placeholder}
                                rows={4}
                                style={{
                                    padding: '1.2rem',
                                    borderRadius: '16px',
                                    background: 'var(--card-bg)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white',
                                    fontSize: '1.05rem',
                                    lineHeight: '1.6',
                                    resize: 'vertical',
                                    fontFamily: "'Lora', serif"
                                }}
                            />
                        </div>
                    ))}
                    <button type="submit" style={{ padding: '1rem', borderRadius: '16px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', marginTop: '1rem' }}>
                        Save Reflection
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="fade-in" style={{ padding: '1rem', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2.5rem' }}>🔮 Yearly Review</h1>
                    <p style={{ margin: '10px 0 0 0', opacity: 0.6 }}>The grand arc of your life. One year at a time.</p>
                </div>
                <button
                    onClick={handleNew}
                    style={{ padding: '0.9rem 1.8rem', borderRadius: '14px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    + Review {new Date().getFullYear()}
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {reviews.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '5rem', opacity: 0.5, border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '30px' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🕰️</div>
                            No yearly reviews yet. Your first one starts here.
                        </div>
                    )}
                    {reviews.sort((a, b) => b.year - a.year).map(rev => (
                        <div key={rev.year} onClick={() => handleEdit(rev)} style={{
                            background: 'var(--card-bg)',
                            borderRadius: '30px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            padding: '2rem',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                        }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand-color, #a29bfe)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 style={{ margin: 0, fontSize: '2rem' }}>{rev.year}</h2>
                                <span style={{ padding: '5px 15px', borderRadius: '20px', background: 'rgba(162, 155, 254, 0.1)', color: 'var(--brand-color, #a29bfe)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                    {rev.theme || 'Untitled Year'}
                                </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 10px 0', opacity: 0.4, fontSize: '0.8rem', textTransform: 'uppercase' }}>Wins</h4>
                                    <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{rev.wins}</p>
                                </div>
                                <div>
                                    <h4 style={{ margin: '0 0 10px 0', opacity: 0.4, fontSize: '0.8rem', textTransform: 'uppercase' }}>Lessons</h4>
                                    <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{rev.lessons}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
