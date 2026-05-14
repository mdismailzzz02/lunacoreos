import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { generateChatResponse } from '../../services/gemini';
import '../../styles/AIChatSidebar.css';

const GeminiIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#gemini-grad)" />
        <defs>
            <linearGradient id="gemini-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#a78bfa" />
                <stop offset="1" stopColor="#818cf8" />
            </linearGradient>
        </defs>
    </svg>
);

const SendIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
);

// Module-level cache maps article IDs to Promises of the summary payload.
// This prevents StrictMode double-bouncing and avoids burning API quota.
const summaryCache = new Map();

export default function AIChatSidebar({ article, articleHtml, onClose }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [articleContext, setArticleContext] = useState('');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    useEffect(() => {
        let isMounted = true;
        const fetchSummary = async () => {
            setLoading(true);
            setMessages([]);

            // If we already fetched (or are fetching) this article summary, reuse the promise
            if (summaryCache.has(article.id)) {
                try {
                    const cachedMsgs = await summaryCache.get(article.id);
                    if (isMounted) {
                        setMessages(cachedMsgs);
                        setLoading(false);
                    }
                } catch (e) {
                    // Fallthrough to retry on error
                }
                return;
            }

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = articleHtml || article.snippet;
            const rawText = (tempDiv.textContent || tempDiv.innerText || '').trim();
            setArticleContext(rawText);

            const initialPrompt = `You are Md Ismail, an advanced AI research assistant embedded in Md Ismaildiary — a personal knowledge & journal app. The user is a research student who wants deep, structured, academically rigorous analysis of articles they read.

Article Title: "${article.title}"

Full Article Text:
---
${rawText.slice(0, 45000)}
---

Produce a **Research Intelligence Brief** using the following structure. Be thorough, precise, and insightful. Use markdown formatting.

---

## 🔬 Core Concept (1–2 sentences)
What is the single most important idea or finding? Explain it as if briefing a senior researcher who has 30 seconds.

## 📌 Key Knowledge Points
List 7–10 specific, factual knowledge points from the article. Each point should be a standalone piece of information that adds to a researcher's understanding. Go beyond surface-level — extract specific data, findings, methods, or mechanisms mentioned.

## 🔗 Underlying Mechanisms & Context
Explain the *why* and *how* behind the main findings. What existing theories, processes, or prior research does this build on or challenge? Be specific.

## ⚡ Critical Findings & Evidence
What specific evidence, data, experiments, or methods were used to arrive at these conclusions? What makes this credible (or what should be questioned)?

## 🌐 Broader Implications
How does this connect to the wider field? What does it change or challenge? Why should a researcher in this domain care about this work?

## ❓ Open Questions & Research Gaps
Based on the article, what questions remain unanswered? What would be a logical next research direction?

## 🏷️ Key Terms & Concepts
List 5–8 technical terms or concepts from the article with a one-line definition each (useful for a student building their vocabulary).

---
After completing the brief, add a short line at the bottom:
*Ask me anything to go deeper — I have the full article context.*`;

            const history = [{ role: 'user', parts: [{ text: initialPrompt }] }];
            
            // Create the promise and immediately store it in the cache to prevent Strict Mode double-fire
            const fetchPromise = generateChatResponse(history).then(responseText => {
                return [{ role: 'model', text: responseText }];
            });
            
            summaryCache.set(article.id, fetchPromise);

            try {
                const finalMsgs = await fetchPromise;
                if (isMounted) setMessages(finalMsgs);
            } catch (err) {
                summaryCache.delete(article.id); // clear failed cache so they can retry
                if (isMounted) {
                    setMessages([{ role: 'model', text: `I wasn't able to summarize this article. This might be due to an API error or the article content was too short.\n\n**Error:** ${err.message}` }]);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                    setTimeout(() => inputRef.current?.focus(), 100);
                }
            }
        };
        fetchSummary();
        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [article.id]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput('');
        const newMessages = [...messages, { role: 'user', text: userMsg }];
        setMessages(newMessages);
        setLoading(true);

        try {
            const history = [
                { role: 'user', parts: [{ text: `Article context for our conversation:\nTitle: "${article.title}"\n\nContent:\n${articleContext.slice(0, 30000)}` }] },
                { role: 'model', parts: [{ text: messages[0]?.text || 'I have read the article.' }] },
                ...newMessages.slice(1).map(msg => ({
                    role: msg.role,
                    parts: [{ text: msg.text }]
                }))
            ];

            const responseText = await generateChatResponse(history);
            setMessages(prev => [...prev, { role: 'model', text: responseText }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'model', text: `Sorry, I hit an error: ${err.message}` }]);
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            handleSend(e);
        }
    };

    return (
        <div className="ai-sidebar slide-in-right">
            {/* Header */}
            <div className="ai-sidebar-header">
                <div className="ai-sidebar-branding">
                    <div className="ai-sidebar-icon"><GeminiIcon /></div>
                    <div>
                        <div className="ai-sidebar-label">Md Ismail AI</div>
                        <div className="ai-sidebar-subtitle">Powered by Gemini</div>
                    </div>
                </div>
                <button className="ai-close-btn" onClick={onClose} aria-label="Close AI panel">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>

            {/* Article context pill */}
            <div className="ai-article-pill">
                <span className="ai-article-pill-icon">📄</span>
                <span className="ai-article-pill-text">{article.title}</span>
            </div>

            {/* Hero image */}
            {article.image && (
                <div className="ai-hero-image">
                    <img
                        src={article.image}
                        alt={article.title}
                        onError={e => e.target.parentElement.style.display = 'none'}
                    />
                </div>
            )}

            {/* Messages */}
            <div className="ai-messages-pane">
                {messages.length === 0 && loading && (
                    <div className="ai-analyzing">
                        <div className="ai-analyzing-orb">
                            <div className="orb-ring r1" />
                            <div className="orb-ring r2" />
                            <div className="orb-ring r3" />
                            <GeminiIcon />
                        </div>
                        <p className="ai-analyzing-text">Analyzing article…</p>
                        <span className="ai-analyzing-sub">Md Ismail is reading and extracting key insights</span>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} className={`ai-message ${msg.role}`}>
                        {msg.role === 'model' && (
                            <div className="ai-message-avatar"><GeminiIcon /></div>
                        )}
                        <div className="ai-message-bubble">
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                    </div>
                ))}

                {loading && messages.length > 0 && (
                    <div className="ai-message model">
                        <div className="ai-message-avatar"><GeminiIcon /></div>
                        <div className="ai-message-bubble ai-typing">
                            <span /><span /><span />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="ai-input-dock">
                <form className="ai-input-form" onSubmit={handleSend}>
                    <input
                        ref={inputRef}
                        className="ai-text-input"
                        placeholder={loading ? 'Md Ismail is thinking…' : 'Ask anything about this article…'}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={loading}
                        autoComplete="off"
                    />
                    <button
                        type="submit"
                        className="ai-submit-btn"
                        disabled={loading || !input.trim()}
                        aria-label="Send message"
                    >
                        <SendIcon />
                    </button>
                </form>
                <p className="ai-disclaimer">Md Ismail can make mistakes. Verify important info.</p>
            </div>
        </div>
    );
}
