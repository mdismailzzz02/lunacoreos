import React, { useState, useEffect, useRef } from 'react';
import { getTodos, getEntries, getWritings, getWatchlist, getReadingList, getHabits, getStreaks, getStudyNotes, getLifeMap, getWhoAmI } from '../../services/api';
import { askLuna } from '../../services/aiService';

export default function LunaAIPage() {
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Hello! I am Luna, your personal AI co-pilot. I have context about your entire non-confidential OS (tasks, journal, media, habits, study notes, etc). How can I help you today?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [systemContext, setSystemContext] = useState('');
    const messagesEndRef = useRef(null);

    // Fetch context on load
    useEffect(() => {
        async function fetchContext() {
            try {
                // Fetch context data
                const [todos, entries, writings, watchlist, readingList, habits, streaks, studyNotes, lifemap, whoami] = await Promise.all([
                    getTodos({ limit: 10 }),
                    getEntries({ limit: 3 }),
                    getWritings(),
                    getWatchlist(),
                    getReadingList(),
                    getHabits(),
                    getStreaks(),
                    getStudyNotes(),
                    getLifeMap(),
                    getWhoAmI()
                ]);
                
                const contextStr = `
You are Luna, the personal AI assistant built into LunaCoreOS.
Your goal is to help the user manage their life, tasks, reflections, and media.
Be concise, helpful, and warm.

Here is the user's current context:
[RECENT TASKS]
${todos.map(t => `- [${t.status === 'completed' ? 'x' : ' '}] ${t.title}`).join('\n')}

[RECENT JOURNAL ENTRIES]
${entries.map(e => `- ${new Date(e.created_at).toLocaleDateString()}: ${e.title || 'Untitled'}`).join('\n')}

[RECENT WRITINGS]
${writings.slice(0, 3).map(w => `- ${w.title || 'Untitled'}: ${w.content ? w.content.substring(0, 150) + '...' : ''}`).join('\n')}

[WATCHLIST (max 3)]
${watchlist.slice(0, 3).map(m => `- ${m.title || 'Untitled'}`).join('\n')}

[READING LIST (max 3)]
${readingList.slice(0, 3).map(b => `- ${b.title || 'Untitled'}`).join('\n')}

[HABITS & STREAKS]
Habits: ${habits.filter(h => h.status !== 'archived').slice(0, 5).map(h => h.title).join(', ')}
Streaks: ${streaks.slice(0, 3).map(s => `${s.title} (${s.count} days)`).join(', ')}

[STUDY NOTES (titles only)]
${studyNotes.slice(0, 5).map(n => `- ${n.title || 'Untitled'}`).join('\n')}

[LIFE MAP & WHO AM I (summaries)]
LifeMap: ${lifemap && lifemap.length > 0 ? (lifemap[0].content || '').substring(0, 200) + '...' : 'None'}
WhoAmI: ${whoami && whoami.length > 0 ? (whoami[0].content || '').substring(0, 200) + '...' : 'None'}
`;
                setSystemContext(contextStr);
            } catch (error) {
                console.error("Failed to load context for Luna:", error);
            }
        }
        fetchContext();
    }, []);

    // Auto-scroll to bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            // Build the conversation history for the prompt to allow multi-turn (simple approach)
            // For a robust multi-turn, we'd pass history to the API. 
            // Since we are using standard fetch with single prompt, we'll prefix previous messages.
            let prompt = "Conversation History:\n";
            messages.slice(-5).forEach(m => {
                prompt += `${m.role === 'user' ? 'User' : 'Luna'}: ${m.text}\n`;
            });
            prompt += `\nUser: ${userMsg}\nLuna:`;

            const reply = await askLuna(prompt, systemContext);
            setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ Error: ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#e0e0e0' }}>✨ Luna AI</h1>
                <p style={{ margin: 0, color: '#8892a4', fontSize: '0.9rem' }}>Your personal co-pilot</p>
            </div>

            <div style={styles.chatArea}>
                {messages.map((msg, idx) => (
                    <div key={idx} style={{
                        ...styles.messageWrapper,
                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                    }}>
                        <div style={{
                            ...styles.messageBubble,
                            backgroundColor: msg.role === 'user' ? '#e8a045' : '#16213e',
                            color: msg.role === 'user' ? '#1a1a2e' : '#e0e0e0',
                            borderBottomRightRadius: msg.role === 'user' ? '2px' : '12px',
                            borderBottomLeftRadius: msg.role === 'assistant' ? '2px' : '12px'
                        }}>
                            {/* Simple rendering for now, could use react-markdown later */}
                            {msg.text.split('\n').map((line, i) => (
                                <React.Fragment key={i}>
                                    {line}
                                    <br />
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div style={{ ...styles.messageWrapper, justifyContent: 'flex-start' }}>
                        <div style={{ ...styles.messageBubble, backgroundColor: '#16213e', color: '#8892a4' }}>
                            Luna is thinking...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} style={styles.inputArea}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask Luna something..."
                    style={styles.input}
                    disabled={isLoading}
                />
                <button type="submit" style={styles.button} disabled={isLoading || !input.trim()}>
                    Send
                </button>
            </form>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#1a1a2e',
        color: '#e0e0e0',
        fontFamily: "'DM Sans', sans-serif"
    },
    header: {
        padding: '20px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        backgroundColor: '#16213e'
    },
    chatArea: {
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
    },
    messageWrapper: {
        display: 'flex',
        width: '100%'
    },
    messageBubble: {
        maxWidth: '75%',
        padding: '12px 16px',
        borderRadius: '12px',
        lineHeight: '1.5',
        wordWrap: 'break-word',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    inputArea: {
        padding: '20px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        gap: '10px',
        backgroundColor: '#16213e'
    },
    input: {
        flex: 1,
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: '#1a1a2e',
        color: '#e0e0e0',
        outline: 'none',
        fontSize: '1rem'
    },
    button: {
        padding: '12px 24px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: '#e8a045',
        color: '#1a1a2e',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '1rem',
        transition: 'opacity 0.2s'
    }
};
