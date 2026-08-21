import React, { useState, useEffect } from 'react';
import { getInbox, getMessage, sendEmail, archiveEmail, deleteEmail } from '../../services/gmail';
import { forceGoogleReauth } from '../../services/googleAuth';
import { Mail, RefreshCw, AlertCircle, Trash2, Archive, Reply, Send, Edit, X, Search } from 'lucide-react';
import './MailPage.css';

export default function MailPage() {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeMessage, setActiveMessage] = useState(null);

    // Compose State
    const [showCompose, setShowCompose] = useState(false);
    const [composeTo, setComposeTo] = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeBody, setComposeBody] = useState('');
    const [sending, setSending] = useState(false);

    // Reply State
    const [showReply, setShowReply] = useState(false);
    const [replyBody, setReplyBody] = useState('');
    const [replying, setReplying] = useState(false);

    // Search & Pagination State
    const [nextPageToken, setNextPageToken] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        loadInbox();
    }, []);

    const loadInbox = async (query = '') => {
        setLoading(true);
        setError('');
        try {
            const data = await getInbox(20, '', query || 'in:inbox');
            setNextPageToken(data.nextPageToken || null);
            if (data.messages) {
                const msgPromises = data.messages.map(m => getMessage(m.id));
                const msgs = await Promise.all(msgPromises);
                setMessages(msgs);
            } else {
                setMessages([]);
            }
        } catch (err) {
            setError(err.message || 'Failed to load Gmail.');
        } finally {
            setLoading(false);
        }
    };

    const loadMore = async () => {
        if (!nextPageToken) return;
        setLoadingMore(true);
        try {
            const data = await getInbox(20, nextPageToken, searchQuery || 'in:inbox');
            setNextPageToken(data.nextPageToken || null);
            if (data.messages) {
                const msgPromises = data.messages.map(m => getMessage(m.id));
                const msgs = await Promise.all(msgPromises);
                setMessages(prev => [...prev, ...msgs]);
            }
        } catch (err) {
            alert('Failed to load more emails: ' + err.message);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        loadInbox(searchQuery);
    };

    const handleSelectMessage = (msg) => {
        setActiveMessage(msg);
        setShowReply(false);
        setReplyBody('');
    };

    const handleCompose = async () => {
        if (!composeTo || !composeSubject || !composeBody) return;
        setSending(true);
        try {
            await sendEmail(composeTo, composeSubject, composeBody.replace(/\n/g, '<br>'));
            setShowCompose(false);
            setComposeTo('');
            setComposeSubject('');
            setComposeBody('');
            loadInbox();
        } catch (err) {
            alert('Failed to send email: ' + err.message);
        } finally {
            setSending(false);
        }
    };

    const handleReply = async () => {
        if (!replyBody || !activeMessage) return;
        setReplying(true);
        try {
            const to = activeMessage.from;
            const subject = activeMessage.subject.toLowerCase().startsWith('re:') ? activeMessage.subject : `Re: ${activeMessage.subject}`;
            
            await sendEmail(
                to, 
                subject, 
                replyBody.replace(/\n/g, '<br>'), 
                activeMessage.threadId, 
                activeMessage.messageIdHeader
            );
            
            setShowReply(false);
            setReplyBody('');
            // Optional: add a success toast here
        } catch (err) {
            alert('Failed to send reply: ' + err.message);
        } finally {
            setReplying(false);
        }
    };

    const handleArchive = async () => {
        if (!activeMessage) return;
        const msgId = activeMessage.id;
        try {
            setActiveMessage(null);
            setMessages(prev => prev.filter(m => m.id !== msgId));
            await archiveEmail(msgId);
            loadInbox();
        } catch (err) {
            alert('Failed to archive: ' + err.message);
            loadInbox(); // reload to restore the message if failed
        }
    };

    const handleDelete = async () => {
        if (!activeMessage) return;
        const msgId = activeMessage.id;
        try {
            setActiveMessage(null);
            setMessages(prev => prev.filter(m => m.id !== msgId));
            await deleteEmail(msgId);
            loadInbox();
        } catch (err) {
            alert('Failed to delete: ' + err.message);
            loadInbox(); // reload to restore the message if failed
        }
    };

    const formatDate = (dateString) => {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const getSenderName = (fromHeader) => {
        const match = fromHeader?.match(/^(.*?)(?:<.*>)?$/);
        return match ? match[1].replace(/"/g, '').trim() : fromHeader;
    };

    if (error) {
        return (
            <div className="mail-page error-state">
                <AlertCircle size={48} color="#ef4444" />
                <h2>Gmail Integration Error</h2>
                <p>{error}</p>
                <div style={{ marginTop: '1rem', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', textAlign: 'left', maxWidth: '500px' }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Google Authentication Required</p>
                    <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1rem' }}>
                        To load your inbox automatically, LunaCore OS needs permission to read and manage your Gmail. 
                        Because this is your first time loading the inbox, you must authorize access manually.
                    </p>
                    <button 
                        className="mail-btn" 
                        style={{ background: 'var(--accent)', color: '#fff', fontWeight: 'bold', padding: '0.5rem 1rem', width: '100%', justifyContent: 'center' }}
                        onClick={async () => {
                            try {
                                await forceGoogleReauth();
                                loadInbox();
                            } catch (err) {
                                setError('Google Auth failed. ' + err.message);
                            }
                        }}
                    >
                        Connect Google Account
                    </button>
                </div>
                <button className="mail-btn primary mt-4" onClick={() => loadInbox()}>Try Again</button>
            </div>
        );
    }

    return (
        <div className="mail-page">
            <div className="mail-sidebar">
                <div className="mail-header">
                    <h2><Mail size={20} /> Inbox</h2>
                    <div className="mail-header-actions">
                        <button className="mail-icon-btn" onClick={() => setShowCompose(true)} title="Compose">
                            <Edit size={16} />
                        </button>
                        <button className="mail-icon-btn" onClick={() => loadInbox()} disabled={loading} title="Refresh">
                            <RefreshCw size={16} className={loading ? 'spin' : ''} />
                        </button>
                    </div>
                </div>
                <div className="mail-search-bar">
                    <form onSubmit={handleSearchSubmit}>
                        <Search size={14} className="mail-search-icon" />
                        <input 
                            type="text" 
                            placeholder="Search inbox..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </form>
                </div>
                <div className="mail-list">
                    {loading && messages.length === 0 ? (
                        <div className="mail-loading">Loading inbox...</div>
                    ) : messages.length === 0 ? (
                        <div className="mail-empty">No messages found.</div>
                    ) : (
                        messages.map(msg => (
                            <div 
                                key={msg.id} 
                                className={`mail-list-item ${activeMessage?.id === msg.id ? 'active' : ''}`}
                                onClick={() => handleSelectMessage(msg)}
                            >
                                <div className="mail-item-header">
                                    <span className="mail-sender">{getSenderName(msg.from)}</span>
                                    <span className="mail-date">{formatDate(msg.date)}</span>
                                </div>
                                <div className="mail-subject">{msg.subject || '(No Subject)'}</div>
                                <div className="mail-snippet">{msg.snippet}</div>
                            </div>
                        ))
                    )}
                    
                    {messages.length > 0 && !loading && (
                        <div className="mail-load-more">
                            {nextPageToken ? (
                                <button className="mail-btn" onClick={loadMore} disabled={loadingMore}>
                                    {loadingMore ? 'Loading...' : 'Load More'}
                                </button>
                            ) : (
                                <span className="mail-no-more">No more left</span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="mail-content-pane">
                {activeMessage ? (
                    <div className="mail-message-view fade-in">
                        <div className="mail-message-header">
                            <div className="mail-message-header-left">
                                <h2>{activeMessage.subject || '(No Subject)'}</h2>
                                <div className="mail-meta">
                                    <div><strong>From:</strong> {activeMessage.from}</div>
                                    <div><strong>To:</strong> {activeMessage.to}</div>
                                    <div className="mail-date-full">{formatDate(activeMessage.date)}</div>
                                </div>
                            </div>
                            <div className="mail-actions">
                                <button className="mail-btn" onClick={() => setShowReply(!showReply)} title="Reply">
                                    <Reply size={16} /> Reply
                                </button>
                                <button className="mail-btn" onClick={handleArchive} title="Archive">
                                    <Archive size={16} />
                                </button>
                                <button className="mail-btn danger" onClick={handleDelete} title="Delete">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        
                        <div className="mail-body-container">
                            {activeMessage.htmlBody ? (
                                <iframe 
                                    className="mail-iframe"
                                    srcDoc={`
                                        <style>
                                            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #fff; background: transparent; padding: 1rem; overscroll-behavior: contain; }
                                            a { color: #60a5fa; }
                                            img { max-width: 100%; height: auto; }
                                        </style>
                                        ${activeMessage.htmlBody}
                                    `}
                                    title="Email Content"
                                    sandbox="allow-same-origin allow-popups"
                                />
                            ) : (
                                <pre className="mail-text-body">{activeMessage.textBody || activeMessage.snippet}</pre>
                            )}

                            {showReply && (
                                <div className="mail-reply-box fade-in">
                                    <textarea 
                                        placeholder="Write your reply..." 
                                        value={replyBody}
                                        onChange={e => setReplyBody(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="mail-reply-actions">
                                        <button className="mail-btn" onClick={() => setShowReply(false)}>Cancel</button>
                                        <button className="mail-btn primary" onClick={handleReply} disabled={replying || !replyBody}>
                                            {replying ? 'Sending...' : <><Send size={14} /> Send Reply</>}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="mail-no-selection">
                        <Mail size={48} opacity={0.2} />
                        <p>Select a message to read</p>
                    </div>
                )}
            </div>

            {/* Compose Modal */}
            {showCompose && (
                <div className="mail-compose-overlay" onClick={(e) => { if (e.target.className === 'mail-compose-overlay') setShowCompose(false); }}>
                    <div className="mail-compose-modal fade-in">
                        <div className="mail-compose-header">
                            <h3>New Message</h3>
                            <button className="mail-icon-btn" onClick={() => setShowCompose(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="mail-compose-body">
                            <div className="mail-input-group">
                                <label>To:</label>
                                <input type="email" value={composeTo} onChange={e => setComposeTo(e.target.value)} placeholder="recipient@example.com" autoFocus />
                            </div>
                            <div className="mail-input-group">
                                <label>Subject:</label>
                                <input type="text" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="Subject" />
                            </div>
                            <textarea 
                                className="mail-compose-textarea"
                                value={composeBody}
                                onChange={e => setComposeBody(e.target.value)}
                                placeholder="Write something..."
                            />
                        </div>
                        <div className="mail-compose-footer">
                            <button className="mail-btn primary" onClick={handleCompose} disabled={sending || !composeTo || !composeBody}>
                                {sending ? 'Sending...' : <><Send size={14} /> Send</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
