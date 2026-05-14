import { useState, useEffect } from 'react';
import * as api from '../../services/api';

export default function ReadingListPage() {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        loadBooks();
    }, []);

    const loadBooks = async () => {
        try {
            const data = await api.getReadingList();
            setBooks(data || []);
        } catch (err) {
            console.error('Failed to load books', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setSearching(true);
        try {
            const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&limit=5`);
            const data = await res.json();
            setSearchResults(data.docs.map(doc => ({
                title: doc.title,
                author: doc.author_name?.[0] || 'Unknown Author',
                cover_id: doc.cover_i,
                first_publish_year: doc.first_publish_year
            })));
        } catch (err) {
            console.error('Search failed', err);
        } finally {
            setSearching(false);
        }
    };

    const addBook = async (book) => {
        const newBook = {
            id: Date.now().toString(),
            title: book.title,
            author: book.author,
            cover_url: book.cover_id ? `https://covers.openlibrary.org/b/id/${book.cover_id}-M.jpg` : null,
            status: 'to-read', // to-read, reading, finished
            rating: 0,
            added_at: new Date().toISOString()
        };

        try {
            await api.saveReadingList(newBook);
            setBooks([newBook, ...books]);
            setShowAdd(false);
            setSearchQuery('');
            setSearchResults([]);
        } catch (err) {
            alert('Failed to add book');
        }
    };

    const updateStatus = async (id, status) => {
        const book = books.find(b => b.id === id);
        if (!book) return;
        const updated = { ...book, status };
        try {
            await api.saveReadingList(updated);
            setBooks(books.map(b => b.id === id ? updated : b));
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const getStatusEmoji = (status) => {
        if (status === 'reading') return '📖';
        if (status === 'finished') return '✅';
        return '⏳';
    };

    return (
        <div className="fade-in" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2rem' }}>📚 Reading List</h1>
                    <p style={{ margin: '5px 0 0 0', opacity: 0.6 }}>Your personal library of knowledge and stories.</p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    + Add Book
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '2rem' }}>
                    {books.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', opacity: 0.5, border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '20px' }}>
                            Your library is empty. Add a book to get started!
                        </div>
                    )}
                    {books.map(book => (
                        <div key={book.id} style={{
                            background: 'var(--card-bg)',
                            borderRadius: '20px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'transform 0.2s',
                            cursor: 'default'
                        }}>
                            <div style={{ height: '280px', background: '#222', position: 'relative', overflow: 'hidden' }}>
                                {book.cover_url ? (
                                    <img src={book.cover_url} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', opacity: 0.2 }}>📚</div>
                                )}
                                <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', padding: '5px 10px', borderRadius: '12px', backdropFilter: 'blur(4px)', fontSize: '0.8rem' }}>
                                    {getStatusEmoji(book.status)} {book.status.replace('-', ' ')}
                                </div>
                            </div>
                            <div style={{ padding: '1.2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <h3 style={{ margin: '0 0 5px 0', fontSize: '1rem', lineHeight: '1.3' }}>{book.title}</h3>
                                <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6 }}>{book.author}</p>

                                <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                                    {book.status !== 'reading' && (
                                        <button onClick={() => updateStatus(book.id, 'reading')} style={{ flex: 1, fontSize: '0.7rem', padding: '5px', borderRadius: '5px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}>Read</button>
                                    )}
                                    {book.status !== 'finished' && (
                                        <button onClick={() => updateStatus(book.id, 'finished')} style={{ flex: 1, fontSize: '0.7rem', padding: '5px', borderRadius: '5px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}>Done</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAdd && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(15px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: '24px', width: '500px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0 }}>Add to Library</h2>
                            <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                        </div>

                        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <input
                                type="text"
                                placeholder="Search by title or author..."
                                autoFocus
                                style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            <button type="submit" disabled={searching} style={{ padding: '0.9rem 1.5rem', borderRadius: '12px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold' }}>
                                {searching ? '...' : 'Search'}
                            </button>
                        </form>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '400px', overflowY: 'auto' }}>
                            {searchResults.map((res, i) => (
                                <div key={i} onClick={() => addBook(res)} style={{
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    gap: '1rem',
                                    alignItems: 'center',
                                    transition: 'background 0.2s'
                                }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                                    <div style={{ width: '40px', height: '60px', background: '#333', borderRadius: '4px', overflow: 'hidden' }}>
                                        {res.cover_id && <img src={`https://covers.openlibrary.org/b/id/${res.cover_id}-S.jpg`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{res.title}</div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{res.author} ({res.first_publish_year})</div>
                                    </div>
                                    <div style={{ fontSize: '1.2rem', opacity: 0.3 }}>+</div>
                                </div>
                            ))}
                            {searchQuery && !searching && searchResults.length === 0 && (
                                <div style={{ textAlign: 'center', opacity: 0.5 }}>No results found</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
