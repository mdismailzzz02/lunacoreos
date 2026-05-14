import { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import * as api from '../../services/api';
import { useDashboard } from '../../hooks/useDashboard';

export default function WatchlistPage() {
    const { addToast } = useToast();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [shouldDelegate, setShouldDelegate] = useState(false);
    const [delegateDueDate, setDelegateDueDate] = useState('');
    const [targetWatchDate, setTargetWatchDate] = useState('');
    const { stats } = useDashboard();
    const apiKey = stats?.config?.tmdb_api_key;

    const [isReviewing, setIsReviewing] = useState(null); // ID of item being reviewed
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewText, setReviewText] = useState('');

    const openReviewModal = (item) => {
        setIsReviewing(item);
        setReviewRating(item.rating || 0);
        setReviewText(item.notes || '');
    };

    const saveReview = async () => {
        if (!isReviewing) return;
        const updatedItem = {
            ...isReviewing,
            rating: reviewRating,
            notes: reviewText,
            status: 'finished',
            watched_at: new Date().toISOString()
        };

        try {
            await api.saveWatchlist(updatedItem);
        } catch (err) {
            // Smart Retry: If it's a schema cache error, try again without watched_at
            if (err.message?.includes('schema cache')) {
                console.log('[Watchlist] Schema cache mismatch in review, retrying without watched_at...');
                const bareReview = {
                    ...isReviewing,
                    rating: reviewRating,
                    notes: reviewText,
                    status: 'finished'
                };
                await api.saveWatchlist(bareReview);
            } else {
                console.error('[Watchlist] Review save failed:', err);
                addToast('Failed to save review', 'error');
                return;
            }
        }

        addToast('Review saved! ⭐', 'success');
        setIsReviewing(null);
        loadWatchlist();
    };

    useEffect(() => {
        loadWatchlist();
    }, []);

    const loadWatchlist = async () => {
        try {
            const data = await api.getWatchlist();
            setItems(data || []);
        } catch (err) {
            console.error('Failed to load watchlist', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        if (!apiKey) {
            // Fallback: Just search for a dummy title if no key
            setSearchResults([{ title: searchQuery, type: 'movie', poster_path: null, release_date: '?' }]);
            return;
        }

        setSearching(true);
        try {
            const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            setSearchResults((data.results || []).map(r => ({
                id: r.id,
                title: r.title || r.name,
                type: r.media_type,
                poster_path: r.poster_path,
                release_date: r.release_date || r.first_air_date
            })));
        } catch (err) {
            console.error('TMDB Search failed', err);
        } finally {
            setSearching(false);
        }
    };

    const addItem = async (item) => {
        try {
            const itemId = `WL-${Date.now()}`;
        const newItem = {
            id: itemId,
            title: item.title,
            type: item.type || 'movie',
            poster_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
            status: 'to-watch',
            rating: 0,
            year: item.year || '',
            target_watch_date: targetWatchDate || null
        };

        try {
            await api.saveWatchlist(newItem);
        } catch (err) {
            // Only fallback if the specific target_watch_date column is missing
            if (err.message?.includes('target_watch_date')) {
                console.warn('[Watchlist] target_watch_date column missing, falling back...');
                delete newItem.target_watch_date;
                await api.saveWatchlist(newItem);
            } else {
                throw err;
            }
        }

        // Add linked delegation if requested
        if (shouldDelegate) {
            try {
                await api.saveDelegationItem({
                    id: `DLG-WL-${itemId}`,
                    title: item.title,
                    source: 'Watchlist',
                    link: '',
                    category: item.type === 'tv' ? 'TV Show' : 'Movie',
                    importance: 'Medium',
                    due_date: delegateDueDate || '',
                    added_at: new Date().toISOString()
                });
            } catch (dlgErr) {
                console.warn('[Watchlist] Linked delegation failed:', dlgErr);
                addToast('Movie added, but failed to create delegation task.', 'warning');
            }
        }

        addToast('Added to watchlist! 🎬', 'success');
        loadWatchlist();
        setShowAdd(false);
        setSearchQuery('');
        setSearchResults([]);
        setShouldDelegate(false);
        setDelegateDueDate('');
        setTargetWatchDate('');
        } catch (err) {
            console.error('[Watchlist] Add failed:', err);
            alert(`Failed to add item: ${err.message || 'Unknown error'}`);
        }
    };

    const updateStatus = async (id, status) => {
        const item = items.find(i => i.id === id);
        if (!item) return;
        const updated = { ...item, status };
        try {
            await api.saveWatchlist(updated);
            setItems(items.map(i => i.id === id ? updated : i));
            
            // Sync: If finished, remove from delegation
            if (status === 'finished') {
                await api.deleteDelegationItem(`DLG-WL-${id}`).catch(() => {});
            }
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const deleteItem = async (id) => {
        if (!window.confirm('Remove from watchlist?')) return;
        try {
            await api.deleteWatchItem(id);
            await api.deleteDelegationItem(`DLG-WL-${id}`).catch(() => {});
            setItems(items.filter(i => i.id !== id));
        } catch (err) {
            alert('Failed to delete');
        }
    };

    return (
        <div className="fade-in" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2rem' }}>🎬 Watchlist</h1>
                    <p style={{ margin: '5px 0 0 0', opacity: 0.6 }}>Movies, shows, and documentaries to experience.</p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    + Add Title
                </button>
            </div>

            {!apiKey && (
                <div style={{ background: 'rgba(255, 165, 0, 0.1)', border: '1px solid rgba(255, 165, 0, 0.2)', padding: '0.8rem 1rem', borderRadius: '12px', fontSize: '0.85rem', color: '#ff9f43', marginBottom: '1.5rem' }}>
                    Note: Add TMDB_API_KEY to your settings for automatic movie search and posters.
                </div>
            )}

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '2rem' }}>
                    {items.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', opacity: 0.5, border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '20px' }}>
                            Your watchlist is empty. What's next on your screen?
                        </div>
                    )}
                    {items.map(item => (
                        <div key={item.id} style={{
                            background: 'var(--card-bg)',
                            borderRadius: '24px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            position: 'relative'
                        }}>
                            <div style={{ height: '320px', background: '#111', position: 'relative', overflow: 'hidden' }}>
                                {item.poster_url ? (
                                     <img src={item.poster_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                 ) : (
                                     <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', opacity: 0.2 }}>🎬</div>
                                 )}
                                 
                                 <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                     <div style={{ background: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: '10px', backdropFilter: 'blur(8px)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: item.status === 'finished' ? '#55efc4' : '#fab1a0' }}>
                                         {item.status.replace('-', ' ')}
                                     </div>
                                     {item.year && (
                                         <div style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '10px', backdropFilter: 'blur(8px)', fontSize: '0.7rem', fontWeight: 700 }}>
                                             {item.year}
                                         </div>
                                     )}
                                 </div>

                                 <button 
                                     onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                                     style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,107,107,0.2)', border: '1px solid rgba(255,107,107,0.3)', color: '#ff7675', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}
                                 >×</button>

                                 {item.rating > 0 && (
                                     <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(255, 234, 0, 0.9)', color: '#000', padding: '4px 10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                         ⭐ {item.rating}
                                     </div>
                                 )}
                            </div>
                            <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, lineHeight: '1.4' }}>{item.title}</h3>
                                    <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.type}</p>
                                </div>

                                {item.notes && (
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.85rem', opacity: 0.7, fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        "{item.notes}"
                                    </p>
                                )}

                                {(item.target_watch_date || item.targetWatchDate) && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
                                        📅 Watch on {new Date(item.target_watch_date || item.targetWatchDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                )}

                                <div style={{ marginTop: 'auto', paddingTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                                    {item.status === 'to-watch' && (
                                        <button onClick={() => updateStatus(item.id, 'watching')} style={{ flex: 1, fontSize: '0.75rem', fontWeight: 600, padding: '10px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}>Start Watching</button>
                                    )}
                                    {item.status !== 'finished' && (
                                        <button onClick={() => openReviewModal(item)} style={{ flex: 1, fontSize: '0.75rem', fontWeight: 600, padding: '10px', borderRadius: '12px', background: 'var(--accent)', border: 'none', color: 'white', cursor: 'pointer' }}>Mark Finished</button>
                                    )}
                                    {item.status === 'finished' && (
                                        <button onClick={() => openReviewModal(item)} style={{ flex: 1, fontSize: '0.75rem', fontWeight: 600, padding: '10px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}>Edit Review</button>
                                    )}
                                </div>
                                
                                {item.added_at && (
                                    <div style={{ fontSize: '0.65rem', opacity: 0.3, textAlign: 'center', marginTop: '5px' }}>
                                        Added {new Date(item.added_at).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Review Modal */}
            {isReviewing && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '1rem' }}>
                    <div style={{ background: 'var(--surface)', padding: '2.5rem', borderRadius: '32px', width: '100%', maxWidth: '450px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                        <h2 style={{ margin: '0 0 0.5rem 0', textAlign: 'center' }}>How was it?</h2>
                        <p style={{ textAlign: 'center', opacity: 0.5, marginBottom: '2rem' }}>{isReviewing.title}</p>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '2rem' }}>
                            {[1, 2, 3, 4, 5].map(star => (
                                <button 
                                    key={star}
                                    onClick={() => setReviewRating(star)}
                                    style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer', color: star <= reviewRating ? '#ffeaa7' : 'rgba(255,255,255,0.1)', transition: 'transform 0.1s' }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    ★
                                </button>
                            ))}
                        </div>

                        <textarea 
                            placeholder="Write a short review or your favorite quote..."
                            value={reviewText}
                            onChange={e => setReviewText(e.target.value)}
                            style={{ width: '100%', height: '120px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '15px', padding: '1rem', color: 'white', fontSize: '0.9rem', outline: 'none', resize: 'none', marginBottom: '1.5rem' }}
                        />

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setIsReviewing(null)} style={{ flex: 1, padding: '1rem', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: 'white', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={saveReview} className="btn btn-primary" style={{ flex: 1, padding: '1rem', borderRadius: '15px' }}>Save Review</button>
                        </div>
                    </div>
                </div>
            )}

            {showAdd && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(15px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: '24px', width: '500px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0 }}>Add to Watchlist</h2>
                            <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                        </div>

                        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <input
                                type="text"
                                placeholder="Search movies or TV shows..."
                                autoFocus
                                style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            <button type="submit" disabled={searching} style={{ padding: '0.9rem 1.5rem', borderRadius: '12px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                                {searching ? '...' : apiKey ? 'Search' : 'Add'}
                            </button>
                        </form>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.75rem', opacity: 0.5 }}>🎯 Target Watch Date (optional)</label>
                                <input
                                    type="date"
                                    className="field-input"
                                    value={targetWatchDate}
                                    onChange={e => setTargetWatchDate(e.target.value)}
                                    style={{ padding: '0.6rem 0.8rem', borderRadius: '10px' }}
                                />
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#aaa', cursor: 'pointer' }}>
                                <input type="checkbox" checked={shouldDelegate} onChange={e => setShouldDelegate(e.target.checked)} />
                                📥 Also add to Delegation
                            </label>
                            {shouldDelegate && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginLeft: '22px' }}>
                                    <label style={{ fontSize: '0.75rem', opacity: 0.5 }}>📅 Delegation Due Date</label>
                                    <input
                                        type="datetime-local"
                                        value={delegateDueDate}
                                        onChange={e => setDelegateDueDate(e.target.value)}
                                        style={{ padding: '0.6rem 0.8rem', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(169,112,255,0.3)', color: 'white', colorScheme: 'dark', fontSize: '0.85rem' }}
                                    />
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '400px', overflowY: 'auto' }}>
                            {searchResults.map((res, i) => (
                                <div key={i} onClick={() => addItem(res)} style={{
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    gap: '1rem',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ width: '45px', height: '65px', background: '#333', borderRadius: '6px', overflow: 'hidden' }}>
                                        {res.poster_path && <img src={`https://image.tmdb.org/t/p/w92${res.poster_path}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{res.title}</div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{res.type} {res.release_date ? `(${res.release_date.split('-')[0]})` : ''}</div>
                                    </div>
                                    <div style={{ fontSize: '1.2rem', opacity: 0.3 }}>+</div>
                                </div>
                            ))}
                            {!apiKey && searchQuery && (
                                <div style={{ textAlign: 'center', opacity: 0.6, fontSize: '0.85rem' }}>
                                    Click Add to include this title manually.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
