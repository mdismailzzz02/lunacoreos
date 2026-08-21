import { useEffect, useState } from 'react';
import * as api from '../../services/api';
import { BookOpen, CheckCircle } from 'lucide-react';

const DAILY_PROMPTS = [
    "What's one thing you want to focus on today?",
    "What are you grateful for this morning?",
    "What would make today great?",
    "What's on your mind right now?",
    "What's one small step you can take today?",
    "What drained you yesterday, and how will you protect your energy today?",
    "What's something you're looking forward to?",
    "What lesson from yesterday can you carry into today?",
];

function getDailyPrompt() {
    const day = new Date().getDate();
    return DAILY_PROMPTS[day % DAILY_PROMPTS.length];
}

export default function JournalNudge({ onNavigate }) {
    const [entry, setEntry] = useState(null);
    const [loading, setLoading] = useState(true);

    const todayStr = new Date().toLocaleDateString('en-US');

    useEffect(() => {
        let mounted = true;
        api.getEntries({ limit: 1 }).then(data => {
            if (!mounted) return;
            const latest = data?.[0];
            if (latest && new Date(latest.created_at).toLocaleDateString('en-US') === todayStr) {
                setEntry(latest);
            }
            setLoading(false);
        }).catch(err => {
            console.error('Failed to load journal for nudge:', err);
            if (mounted) setLoading(false);
        });
        return () => { mounted = false; };
    }, []);

    if (loading) return <div className="dashboard-card pulse" style={{ height: '150px' }}></div>;

    const hasStarted = entry && (entry.content?.length > 10 || entry.status === 'published');

    if (hasStarted) {
        return (
            <div className="card fade-in interactive-card" onClick={() => onNavigate('journal')} style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookOpen size={16} /> Daily journal completed.
                </span>
                <CheckCircle size={18} color="#22c55e" />
            </div>
        );
    }

    return (
        <div className="dashboard-card fade-in" style={{ padding: '1.2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'linear-gradient(145deg, var(--surface), var(--surface-light))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title">
                    <BookOpen size={16} /> Daily Reflection
                </h3>
            </div>
            
            <div style={{ fontSize: '0.95rem', fontStyle: 'italic', lineHeight: '1.5', padding: '8px', borderLeft: '2px solid var(--accent)', background: 'var(--surface-light)', borderRadius: '0 8px 8px 0' }}>
                "{getDailyPrompt()}"
            </div>

            <button 
                className="btn btn-primary btn-sm interactive-scale" 
                style={{ alignSelf: 'flex-start', marginTop: '4px', fontWeight: 'bold' }}
                onClick={() => onNavigate('journal')}
            >
                Start entry ✍️
            </button>
        </div>
    );
}


