import React from 'react';
import { Info, Shield, Zap, Terminal, Code, Cpu } from 'lucide-react';
import '../../styles/Information.css';

export default function InformationPage() {
    return (
        <div className="fade-in" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem', fontFamily: 'var(--font-primary, system-ui)' }}>
            
            <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #a855f7, #ec4899)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 12px 30px rgba(168, 85, 247, 0.3)' }}>
                    <Cpu size={40} color="white" />
                </div>
                <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 0.5rem 0', letterSpacing: '-1px' }}>LunaCore OS</h1>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-muted, #9ca3af)', margin: 0 }}>Version 2.0.4 • System About</p>
            </header>

            <section style={{ background: 'var(--card-bg, rgba(255,255,255,0.03))', border: '1px solid var(--border, rgba(255,255,255,0.05))', borderRadius: '24px', padding: '2rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem', marginTop: 0, marginBottom: '1.5rem', borderBottom: '1px solid var(--border, rgba(255,255,255,0.05))', paddingBottom: '1rem' }}>
                    <Info size={24} color="#3b82f6" />
                    About The System
                </h2>
                <p style={{ lineHeight: '1.7', fontSize: '1.05rem', color: 'var(--text-secondary, #d1d5db)' }}>
                    LunaCore OS is a comprehensive, private digital brain and Life Operating System. 
                    Designed as a secure hub for daily operations, it integrates tasks, knowledge management, media consumption, and deep personal analytics into a single unified interface.
                </p>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div style={{ background: 'var(--card-bg, rgba(255,255,255,0.03))', border: '1px solid var(--border, rgba(255,255,255,0.05))', borderRadius: '24px', padding: '1.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', marginTop: 0, marginBottom: '1rem', color: '#10b981' }}>
                        <Shield size={20} />
                        Privacy First
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted, #9ca3af)', lineHeight: '1.6' }}>
                        Built with an encrypted Vault and zero-knowledge principles. Your personal data, journal entries, and private media never leave your controlled environment without explicit delegation.
                    </p>
                </div>

                <div style={{ background: 'var(--card-bg, rgba(255,255,255,0.03))', border: '1px solid var(--border, rgba(255,255,255,0.05))', borderRadius: '24px', padding: '1.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', marginTop: 0, marginBottom: '1rem', color: '#f59e0b' }}>
                        <Zap size={20} />
                        High Performance
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted, #9ca3af)', lineHeight: '1.6' }}>
                        Powered by a modern React architecture with optimistic UI updates and edge caching, ensuring instant interactions regardless of network conditions.
                    </p>
                </div>
                
                <div style={{ background: 'var(--card-bg, rgba(255,255,255,0.03))', border: '1px solid var(--border, rgba(255,255,255,0.05))', borderRadius: '24px', padding: '1.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', marginTop: 0, marginBottom: '1rem', color: '#a855f7' }}>
                        <Terminal size={20} />
                        Arcade & Terminal
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted, #9ca3af)', lineHeight: '1.6' }}>
                        A fully integrated UNIX-style command line and retro arcade modules provide power-user capabilities and downtime entertainment straight from the root.
                    </p>
                </div>

                <div style={{ background: 'var(--card-bg, rgba(255,255,255,0.03))', border: '1px solid var(--border, rgba(255,255,255,0.05))', borderRadius: '24px', padding: '1.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', marginTop: 0, marginBottom: '1rem', color: '#ec4899' }}>
                        <Code size={20} />
                        Tech Stack
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted, #9ca3af)', lineHeight: '1.6' }}>
                        Vite, React 18, Supabase (PostgreSQL + Auth + Storage), Lucide Icons, and custom CSS-in-JS abstractions for a sleek, responsive dark-mode interface.
                    </p>
                </div>
            </div>

            <footer style={{ textAlign: 'center', marginTop: '3rem', opacity: 0.5, fontSize: '0.85rem' }}>
                <p>© {new Date().getFullYear()} LunaCore OS. All rights reserved.</p>
                <p>System Operating Normally.</p>
            </footer>
        </div>
    );
}
