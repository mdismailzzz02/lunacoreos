import { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';
import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';
import AIChatSidebar from './AIChatSidebar';
import '../../styles/Information.css';

const PROXY = 'https://corsproxy.io/?';

export default function InformationPage() {
    const [feeds, setFeeds] = useState([]);
    const [activeFeed, setActiveFeed] = useState(null);
    const [articles, setArticles] = useState([]);
    const [activeAIArticle, setActiveAIArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchingFeed, setFetchingFeed] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newFeed, setNewFeed] = useState({ name: '', url: '', category: 'Technology', icon: '📰' });
    const [error, setError] = useState('');

    // Load feeds from Google Sheets
    const loadFeeds = useCallback(async () => {
        try {
            setLoading(true);
            const data = await api.getRssFeeds();
            setFeeds(data || []);
            if (data?.length > 0 && !activeFeed) {
                setActiveFeed(data[0]);
            }
        } catch (err) {
            console.error('Failed to load feeds:', err);
            setError('Could not sync with Google Sheets.');
        } finally {
            setLoading(false);
        }
    }, [activeFeed]);

    useEffect(() => {
        loadFeeds();
    }, [loadFeeds]);

    // Fetch and parse RSS feed
    const fetchArticles = useCallback(async (feed) => {
        if (!feed?.url) return;
        setFetchingFeed(true);
        setArticles([]);
        try {
            const response = await fetch(`${PROXY}${encodeURIComponent(feed.url)}`);
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');

            const items = Array.from(xml.querySelectorAll('item, entry')).map(item => {
                const title = item.querySelector('title')?.textContent || 'Untitled';
                let link = '';
                const linkElem = item.querySelector('link');
                if (linkElem) {
                    link = linkElem.getAttribute('href') || linkElem.textContent?.trim() || '#';
                }

                const description = item.querySelector('description, summary, content')?.textContent || '';
                const pubDate = item.querySelector('pubDate, published, updated, date')?.textContent || '';

                let fullContent = item.getElementsByTagName('content:encoded');
                let htmlContent = fullContent.length > 0 ? fullContent[0].textContent : description;

                let image = '';
                const enclosure = item.querySelector('enclosure[type^="image"]');
                if (enclosure) image = enclosure.getAttribute('url');
                const mediaThumbnail = item.getElementsByTagName('media:thumbnail')[0];
                if (!image && mediaThumbnail) image = mediaThumbnail.getAttribute('url');
                const mediaContent = item.getElementsByTagName('media:content')[0];
                if (!image && mediaContent) image = mediaContent.getAttribute('url');
                // Try to find an image inside the HTML content
                if (!image && htmlContent) {
                    const imgMatch = htmlContent.match(/<img[^>]+src=["']([^"']+)["']/i);
                    if (imgMatch) image = imgMatch[1];
                }

                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = description;
                const snippet = (tempDiv.textContent || tempDiv.innerText || '').trim();

                return {
                    id: Math.random().toString(36).substr(2, 9),
                    title,
                    link,
                    snippet: snippet.slice(0, 200) + (snippet.length > 200 ? '…' : ''),
                    fullHtml: htmlContent,
                    date: pubDate ? new Date(pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent',
                    image
                };
            });

            setArticles(items);
        } catch (err) {
            console.error('Failed to fetch RSS:', err);
            setError('Could not fetch this feed. It may be blocked or invalid.');
        } finally {
            setFetchingFeed(false);
        }
    }, []);

    useEffect(() => {
        if (activeFeed) {
            setActiveAIArticle(null); // close AI panel when switching feeds
            fetchArticles(activeFeed);
        }
    }, [activeFeed, fetchArticles]);

    // Card click → open AI sidebar, silently fetch full content for better context
    const handleCardClick = async (article) => {
        // Immediately open the sidebar with what we have
        setActiveAIArticle({ ...article });

        // Silently enrich with full article text via Readability
        try {
            const response = await fetch(`${PROXY}${encodeURIComponent(article.link)}`);
            const htmlText = await response.text();
            const doc = new DOMParser().parseFromString(htmlText, 'text/html');
            const parsed = new Readability(doc).parse();
            if (parsed?.content) {
                const cleanHtml = DOMPurify.sanitize(parsed.content, { USE_PROFILES: { html: true } });
                setActiveAIArticle({ ...article, fullHtml: cleanHtml });
            }
        } catch (err) {
            // Graceful degradation — AI will use the RSS content it already has
            console.warn('Could not enrich article, using RSS content:', err);
        }
    };

    const handleAddFeed = async (e) => {
        e.preventDefault();
        try {
            const saved = await api.saveRssFeed(newFeed);
            setFeeds(prev => [...prev, saved]);
            setIsModalOpen(false);
            setNewFeed({ name: '', url: '', category: 'Technology', icon: '📰' });
        } catch (err) {
            console.error('Save feed error:', err);
        }
    };

    const handleRemoveFeed = async (id) => {
        if (!window.confirm('Remove this feed?')) return;
        try {
            await api.removeRssFeed(id);
            setFeeds(prev => prev.filter(f => f.id !== id));
            if (activeFeed?.id === id) setActiveFeed(null);
        } catch (err) {
            console.error('Remove feed error:', err);
        }
    };

    if (loading) {
        return (
            <div className="empty-feed" style={{ height: '100%' }}>
                <div className="spinner" />
                <p>Syncing your feeds…</p>
            </div>
        );
    }

    return (
        <div className="information-layout">
            {/* Sources Sidebar */}
            <aside className="information-sidebar">
                <div className="inf-header">
                    <h2 className="inf-section-title">Sources</h2>
                    <button className="add-feed-btn" onClick={() => setIsModalOpen(true)}>
                        <span>+</span> Add Feed
                    </button>
                </div>

                <div className="rss-source-list">
                    {['Technology', 'Science', 'Other'].map(cat => {
                        const catFeeds = feeds.filter(f => f.category === cat);
                        if (catFeeds.length === 0) return null;
                        return (
                            <div key={cat} style={{ marginBottom: '0.75rem' }}>
                                <div className="inf-section-title" style={{ fontSize: '0.62rem', opacity: 0.45, padding: '0 0.25rem', marginBottom: '0.35rem' }}>{cat}</div>
                                {catFeeds.map(f => (
                                    <div
                                        key={f.id}
                                        className={`rss-source-item ${activeFeed?.id === f.id ? 'active' : ''}`}
                                        onClick={() => setActiveFeed(f)}
                                    >
                                        <span className="rss-source-icon">{f.icon || '📰'}</span>
                                        <span className="rss-source-name">{f.name}</span>
                                        <button
                                            className="card-remove"
                                            style={{ marginLeft: 'auto' }}
                                            onClick={(e) => { e.stopPropagation(); handleRemoveFeed(f.id); }}
                                        >✕</button>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </aside>

            {/* Main Feed */}
            <main className="information-main">
                {activeFeed ? (
                    <>
                        <header className="feed-header">
                            <div className="feed-title-wrap">
                                <h2>{activeFeed.name}</h2>
                                <p className="feed-meta">{activeFeed.category} • {articles.length} articles</p>
                            </div>
                            {fetchingFeed && <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />}
                        </header>

                        <div className="feed-content">
                            {fetchingFeed ? (
                                <div className="feed-grid">
                                    {[...Array(8)].map((_, i) => (
                                        <div key={i} className="article-card skeleton-card">
                                            <div className="skeleton" style={{ height: 12, width: '40%', marginBottom: 12, borderRadius: 6 }} />
                                            <div className="skeleton" style={{ height: 20, width: '85%', marginBottom: 8, borderRadius: 6 }} />
                                            <div className="skeleton" style={{ height: 16, width: '95%', marginBottom: 4, borderRadius: 6 }} />
                                            <div className="skeleton" style={{ height: 16, width: '70%', borderRadius: 6 }} />
                                        </div>
                                    ))}
                                </div>
                            ) : articles.length > 0 ? (
                                <div className="feed-grid">
                                    {articles.map(article => (
                                        <div
                                            key={article.id}
                                            className={`article-card ${activeAIArticle?.id === article.id ? 'active-ai' : ''}`}
                                            onClick={() => handleCardClick(article)}
                                        >
                                            {article.image && (
                                                <div className="article-thumbnail">
                                                    <img src={article.image} alt={article.title} loading="lazy" onError={e => e.target.parentElement.style.display='none'} />
                                                </div>
                                            )}
                                            <span className="article-tag">{activeFeed.name}</span>
                                            <h3 className="article-title">{article.title}</h3>
                                            <p className="article-snippet">{article.snippet}</p>
                                            <div className="article-footer">
                                                <span className="article-date">📅 {article.date}</span>
                                                <a
                                                    href={article.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="open-link-btn"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    Open ↗
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-feed">
                                    <span className="empty-icon">📭</span>
                                    <p>No articles found in this feed.</p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="empty-feed">
                        <span className="empty-icon">📰</span>
                        <h3>Welcome to Information</h3>
                        <p>Select a source on the left to start reading.</p>
                    </div>
                )}

                {/* AI Chat — absolute, covers only this main content area */}
                {activeAIArticle && (
                    <AIChatSidebar
                        article={activeAIArticle}
                        articleHtml={activeAIArticle.fullHtml}
                        onClose={() => setActiveAIArticle(null)}
                    />
                )}
            </main>

            {/* Add Feed Modal */}
            {isModalOpen && (
                <div className="inf-modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="inf-modal" onClick={e => e.stopPropagation()}>
                        <h3>Add New RSS Feed</h3>
                        <form onSubmit={handleAddFeed}>
                            <div className="inf-form-group">
                                <label>Feed Name</label>
                                <input
                                    className="inf-input"
                                    value={newFeed.name}
                                    onChange={e => setNewFeed({ ...newFeed, name: e.target.value })}
                                    placeholder="e.g. The Verge"
                                    required
                                />
                            </div>
                            <div className="inf-form-group">
                                <label>RSS URL</label>
                                <input
                                    className="inf-input"
                                    value={newFeed.url}
                                    onChange={e => setNewFeed({ ...newFeed, url: e.target.value })}
                                    placeholder="https://example.com/rss"
                                    required
                                />
                            </div>
                            <div className="inf-form-group">
                                <label>Category</label>
                                <select
                                    className="inf-input"
                                    value={newFeed.category}
                                    onChange={e => setNewFeed({ ...newFeed, category: e.target.value })}
                                >
                                    <option value="Technology">Technology</option>
                                    <option value="Science">Science</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="inf-modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Feed</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {error && (
                <div className="error-toast">
                    {error}
                    <button onClick={() => setError('')}>✕</button>
                </div>
            )}
        </div>
    );
}
