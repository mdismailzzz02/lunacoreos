import { useEffect, useState } from 'react';
import * as api from '../../services/api';
import { BookOpen, Tv } from 'lucide-react';

export default function CurrentlyConsuming({ onNavigate }) {
    const [reading, setReading] = useState(null);
    const [watching, setWatching] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        
        Promise.all([
            api.getReadingList().catch(() => []),
            api.getWatchlist().catch(() => [])
        ]).then(([books, media]) => {
            if (!mounted) return;
            
            const activeBooks = (books || []).filter(b => b.status === 'Reading');
            const activeMedia = (media || []).filter(m => m.status === 'Watching');
            
            // Sort by most recently updated if possible, or just take first
            // Since there's no updated_at guaranteed, we just take the first one or assume the API returns newest first.
            setReading(activeBooks[0]);
            setWatching(activeMedia[0]);
            setLoading(false);
        });

        return () => { mounted = false; };
    }, []);

    if (loading) return (
        <div style={{ display: 'flex', gap: '1rem', flex: '2 1 400px' }}>
            <div className="dashboard-card pulse" style={{ height: '180px', flex: 1 }}></div>
            <div className="dashboard-card pulse" style={{ height: '180px', flex: 1 }}></div>
        </div>
    );

    if (!reading && !watching) return null;

    return (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: '2 1 400px' }}>
            {reading && (
                <div className="card fade-in interactive-card" style={{ flex: '1 1 200px', padding: '1.2rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px' }} onClick={() => onNavigate('readinglist')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                        <BookOpen size={14} /> Currently Reading
                    </div>
                    {reading.cover_url && (
                        <div style={{ width: '100%', height: '80px', borderRadius: '8px', overflow: 'hidden', marginBottom: '4px' }}>
                            <img src={reading.cover_url} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                    )}
                    <div style={{ fontWeight: '600', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {reading.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {reading.author}
                    </div>
                    {reading.current_page > 0 && reading.total_pages > 0 && (
                        <div style={{ marginTop: 'auto', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                <span>Pg {reading.current_page}</span>
                                <span>{Math.round((reading.current_page / reading.total_pages) * 100)}%</span>
                            </div>
                            <div style={{ background: 'var(--surface-light)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${(reading.current_page / reading.total_pages) * 100}%`, background: 'var(--accent)', height: '100%', borderRadius: '3px' }}></div>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {watching && (
                <div className="card fade-in interactive-card" style={{ flex: '1 1 200px', padding: '1.2rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px' }} onClick={() => onNavigate('watchlist')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                        <Tv size={14} /> Currently Watching
                    </div>
                    {watching.poster_url && (
                        <div style={{ width: '100%', height: '80px', borderRadius: '8px', overflow: 'hidden', marginBottom: '4px' }}>
                            <img src={watching.poster_url} alt="Poster" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                    )}
                    <div style={{ fontWeight: '600', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {watching.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {watching.type} {watching.current_episode && `• Ep ${watching.current_episode}`}
                    </div>
                </div>
            )}
        </div>
    );
}

