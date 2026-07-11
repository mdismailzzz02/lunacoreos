import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSecureUrl } from '../../hooks/useSecureUrl';

const isTextFile = (mimeType, filename = '') => {
    if (!mimeType) return false;
    if (mimeType.startsWith('text/')) return true;
    const textMimes = ['application/json', 'application/javascript', 'application/xml', 'application/xhtml+xml', 'application/x-sh'];
    if (textMimes.includes(mimeType)) return true;
    // fallback based on extension
    const ext = filename.split('.').pop()?.toLowerCase();
    const textExts = ['txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'csv', 'py', 'sh', 'env', 'sql'];
    return textExts.includes(ext);
};

export default function FileViewerModal({ item, onClose }) {
    const isR2 = !!item._isR2;
    const isSupabase = !isR2 && !!item._isSupabaseStorage;

    const { blobUrl, loading: secureLoading } = useSecureUrl(
        isSupabase ? item.drive_link : null,
        !isSupabase,
        item
    );

    const resolvedUrl = isR2 ? item.drive_link : isSupabase ? blobUrl : item.drive_link;

    const [textContent, setTextContent] = useState(null);
    const [textLoading, setTextLoading] = useState(false);
    const [textError, setTextError] = useState(false);

    const isPdf = item.mime_type === 'application/pdf' || item.filename?.toLowerCase().endsWith('.pdf');
    const isText = isTextFile(item.mime_type, item.filename);
    const isVideo = item.media_type === 'video' || item.mime_type?.startsWith('video/');
    const isAudio = item.media_type === 'audio' || item.mime_type?.startsWith('audio/');

    useEffect(() => {
        if (!resolvedUrl || !isText) return;
        
        let active = true;
        setTextLoading(true);
        fetch(resolvedUrl)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch text content');
                return res.text();
            })
            .then(text => {
                if (active) {
                    setTextContent(text);
                    setTextLoading(false);
                }
            })
            .catch(err => {
                console.error('Text fetch error:', err);
                if (active) {
                    setTextError(true);
                    setTextLoading(false);
                }
            });
            
        return () => { active = false; };
    }, [resolvedUrl, isText]);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!item) return null;

    const renderContent = () => {
        if (secureLoading && !resolvedUrl) {
            return <div style={{ color: 'white', padding: '2rem' }}>⏳ Securely loading file...</div>;
        }

        if (isVideo) {
            return <video controls autoPlay src={resolvedUrl} style={{ maxWidth: '100%', maxHeight: '80vh', outline: 'none' }} />;
        }

        if (isAudio) {
            return (
                <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius)', minWidth: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '3rem' }}>🎵</div>
                    <div style={{ color: 'var(--text)', fontWeight: 600, textAlign: 'center' }}>{item.display_name || item.filename}</div>
                    <audio controls autoPlay src={resolvedUrl} style={{ width: '100%', outline: 'none' }} />
                </div>
            );
        }

        if (isPdf) {
            return <iframe src={resolvedUrl} title={item.filename} style={{ width: '90vw', height: '85vh', border: 'none', background: 'white', borderRadius: 'var(--radius)' }} />;
        }

        if (isText) {
            if (textLoading) return <div style={{ color: 'white' }}>⏳ Loading text content...</div>;
            if (textError) return <div style={{ color: 'var(--error)' }}>❌ Failed to load text content.</div>;
            return (
                <div style={{ background: '#1e1e1e', color: '#d4d4d4', padding: '1.5rem', borderRadius: 'var(--radius)', width: '100%', maxWidth: '1200px', height: '100%', overflow: 'auto', textAlign: 'left', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', boxSizing: 'border-box' }}>
                    {textContent}
                </div>
            );
        }

        // Fallback for unknown types
        return (
            <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius)', textAlign: 'center', color: 'var(--text)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                <h3 style={{ margin: '0 0 1rem 0' }}>Preview not available</h3>
                <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-muted)' }}>This file type cannot be previewed inside the app.</p>
                <a href={resolvedUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" download={item.filename}>
                    Download File
                </a>
            </div>
        );
    };

    return createPortal(
        <div className="lightbox-overlay" style={{ zIndex: 9999, display: 'flex', flexDirection: 'column' }} onClick={onClose}>
            <div className="lightbox-topbar" style={{ position: 'relative', width: '100%', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <span className="lightbox-title">{item.display_name || item.filename}</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {resolvedUrl && (
                        <a href={resolvedUrl} target="_blank" rel="noopener noreferrer" download={item.filename} className="btn btn-ghost btn-sm" style={{ color: 'white' }}>
                            ↓ Download
                        </a>
                    )}
                    <button className="lightbox-close" onClick={onClose} title="Close">✕</button>
                </div>
            </div>
            
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '1.5rem', boxSizing: 'border-box', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                {renderContent()}
            </div>
        </div>,
        document.body
    );
}
