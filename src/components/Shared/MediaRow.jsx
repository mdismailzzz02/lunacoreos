import { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useAudio } from '../../context/AudioContext';
import Lightbox from './Lightbox';
import SmartThumbnail from './SmartThumbnail';
import * as api from '../../services/api';

function fileTypeIcon(ext) {
    const map = { pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', ppt: '📋', pptx: '📋', txt: '📃', zip: '🗜️', js: '💻', jsx: '💻', ts: '💻', tsx: '💻', py: '🐍', html: '🌐', css: '🎨', json: '📋', md: '📝', sql: '🗄️' };
    return map[ext?.toLowerCase()] || '📎';
}

function classifyExtension(ext) {
    const e = (ext || '').toLowerCase().replace('.', '');
    if (e === 'pdf') return 'pdf';
    if (['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'webm'].includes(e)) return 'audio';
    if (['txt', 'md', 'js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css', 'json', 'xml', 'csv', 'yaml', 'yml', 'sh', 'bash', 'sql', 'php', 'rb', 'go', 'java', 'c', 'cpp', 'h', 'cs', 'swift', 'kt'].includes(e)) return 'text';
    return 'file';
}

function getStreamableUrl(url, mode = 'download') {
    if (!url) return '';
    const match = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&/]+)/);
    if (!match) return url;
    const id = match[1];
    if (mode === 'preview') return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    if (mode === 'large') return `https://drive.google.com/thumbnail?id=${id}&sz=w2500`;
    return `https://docs.google.com/uc?id=${id}&export=${mode}`;
}

// ── File Preview Modal ───────────────────────────────────────────
function FilePreviewModal({ item, onClose }) {
    const [textContent, setTextContent] = useState(null);
    const [textLoading, setTextLoading] = useState(false);
    const fileType = classifyExtension(item.file_extension);

    useEffect(() => {
        if (fileType !== 'text' || !item.drive_file_id) return;
        setTextLoading(true);
        api.getFileTextContent(item.drive_file_id)
            .then(res => setTextContent(res?.content || ''))
            .catch(() => setTextContent('// Could not load file content.'))
            .finally(() => setTextLoading(false));
    }, [item.drive_file_id, fileType]);

    return ReactDOM.createPortal(
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', padding: '20px' }}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '900px', height: '90vh', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                    <span style={{ fontSize: '1.2rem' }}>{fileTypeIcon(item.file_extension)}</span>
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: '0.9rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                        {item.display_name || item.filename}
                    </span>
                    <a href={item.drive_link} target="_blank" rel="noreferrer" style={{ flexShrink: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '3px 10px' }}>↗ Drive</a>
                    <button onClick={onClose} style={{ flexShrink: 0, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>

                {/* PDF */}
                {fileType === 'pdf' && (
                    <div style={{ flex: 1, position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
                        <div id={`preview-loading-${item.media_id}`} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', zIndex: 1, borderRadius: '12px' }}>
                            <span style={{ fontSize: '2.5rem' }}>📄</span>
                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Loading PDF…</span>
                        </div>
                        <iframe
                            src={`https://drive.google.com/file/d/${item.drive_file_id}/preview`}
                            style={{ width: '100%', height: '100%', border: 'none', borderRadius: '12px', position: 'relative', zIndex: 2 }}
                            title={item.display_name}
                            onLoad={() => { const el = document.getElementById(`preview-loading-${item.media_id}`); if (el) el.style.display = 'none'; }}
                        />
                    </div>
                )}

                {/* Text / Code */}
                {fileType === 'text' && (
                    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', background: 'rgba(0,0,0,0.55)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {textLoading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.75rem', minHeight: '200px' }}>
                                <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #a78bfa', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
                                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Loading file…</span>
                            </div>
                        ) : (
                            <pre style={{ margin: 0, padding: '1.25rem 1.5rem', fontFamily: '"Fira Code", "Cascadia Code", Consolas, monospace', fontSize: '0.82rem', lineHeight: 1.75, color: '#e2e8f0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {textContent ?? '(empty file)'}
                            </pre>
                        )}
                    </div>
                )}

                {/* Audio */}
                {fileType === 'audio' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
                        <div style={{ width: '150px', height: '150px', borderRadius: '50%', background: 'linear-gradient(135deg, #6d28d9, #a78bfa, #4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', boxShadow: '0 20px 60px rgba(109,40,217,0.5)' }}>
                            🎵
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ color: 'white', fontWeight: 700, fontSize: '1rem', margin: '0 0 0.25rem' }}>{item.display_name || item.filename}</p>
                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Audio File</p>
                        </div>
                        <iframe
                            src={`https://drive.google.com/file/d/${item.drive_file_id}/preview`}
                            style={{ width: '100%', maxWidth: '520px', height: '80px', border: 'none', borderRadius: '12px', background: 'rgba(0,0,0,0.4)' }}
                            allow="autoplay"
                            title={item.display_name}
                        />
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}

// ── Audio Box ───────────────────────────────────────────────────
function AudioBox({ items = [], onUpload, onRecord, onRemove }) {
    const { onContentAudioPlay, onContentAudioStop } = useAudio();
    const [recording, setRecording] = useState(false);
    const [recTime, setRecTime] = useState(0);
    const [playing, setPlaying] = useState(null);
    const audioRef = useRef(null);
    const mediaRec = useRef(null);
    const timerRef = useRef(null);
    const fileNameRef = useRef('');
    const [brokenAudio, setBrokenAudio] = useState(new Set());

    const startRecord = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream);
            const chunks = [];
            mr.ondataavailable = e => chunks.push(e.data);
            mr.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const name = fileNameRef.current;
                const finalName = name ? (name.endsWith('.webm') ? name : `${name}.webm`) : `voice_memo_${Date.now()}.webm`;
                const file = new File([blob], finalName, { type: 'audio/webm' });
                onRecord && onRecord(file);
                stream.getTracks().forEach(t => t.stop());
            };
            mr.start();
            mediaRec.current = mr;
            setRecording(true);
            setRecTime(0);
            timerRef.current = setInterval(() => setRecTime(t => t + 1), 1000);
        } catch (e) { alert('Microphone access denied'); }
    };

    const stopRecord = () => {
        if (!mediaRec.current) return;
        const name = window.prompt('Name your recording:', `memo_${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
        fileNameRef.current = name;
        mediaRec.current.stop();
        clearInterval(timerRef.current);
        setRecording(false);
    };

    const playTimeoutRef = useRef(null);

    const togglePlay = (item) => {
        const el = audioRef.current;
        if (!el) return;
        clearTimeout(playTimeoutRef.current);
        if (playing === item.media_id) {
            el.pause();
            setPlaying(null);
            onContentAudioStop();
        } else {
            const streamUrl = getStreamableUrl(item.drive_link, 'download');
            setPlaying(item.media_id);
            el.src = streamUrl;
            playTimeoutRef.current = setTimeout(() => {
                if (audioRef.current && audioRef.current.paused && playing !== item.media_id) {
                    setPlaying(null);
                    setBrokenAudio(prev => new Set([...prev, item.media_id]));
                }
            }, 3500);
            el.play().then(() => {
                clearTimeout(playTimeoutRef.current);
                onContentAudioPlay(el);
            }).catch(err => {
                clearTimeout(playTimeoutRef.current);
                setPlaying(null);
                setBrokenAudio(prev => new Set([...prev, item.media_id]));
            });
            el.onplaying = () => { clearTimeout(playTimeoutRef.current); };
            el.onended = () => { setPlaying(null); onContentAudioStop(); };
            el.onerror = () => {
                clearTimeout(playTimeoutRef.current);
                setPlaying(null);
                setBrokenAudio(prev => new Set([...prev, item.media_id]));
            };
        }
    };

    const confirmRemove = (item) => {
        if (window.confirm(`Remove "${item.display_name || item.filename}" from this entry?`)) {
            onRemove(item.media_id);
        }
    };

    return (
        <div className="media-box">
            <div className="media-box-title">🎙️ Audio</div>
            <audio ref={audioRef} style={{ display: 'none' }} preload="metadata" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflowY: 'auto' }}>
                {items.map(item => (
                    <div key={item.media_id} className="audio-bar">
                        {brokenAudio.has(item.media_id) ? (
                            <div className="play-mini broken" title="Unplayable" style={{ background: 'var(--surface2)', color: 'var(--danger)', opacity: 0.7 }}>🔇</div>
                        ) : (
                            <button className="play-mini" onClick={() => togglePlay(item)} title="Play/Pause">
                                {playing === item.media_id ? '⏸' : '▶'}
                            </button>
                        )}
                        <span className="audio-name" style={{ flex: 1 }}>{item.display_name || item.filename}</span>
                        <a href={item.drive_link} target="_blank" rel="noreferrer" className="badge badge-ref" style={{ textDecoration: 'none', cursor: 'alias' }} title="View in Google Drive">↗ View</a>
                        {onRemove && (
                            <button
                                className="media-remove-btn-inline"
                                onClick={(e) => { e.stopPropagation(); confirmRemove(item); }}
                                title="Delete"
                                style={{ color: 'var(--danger, #ef4444)', fontWeight: 700, fontSize: '1rem' }}
                            >✕</button>
                        )}
                    </div>
                ))}
                {items.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No audio yet</span>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {recording ? (
                    <div className="rec-indicator">
                        <div className="rec-dot" /> {Math.floor(recTime / 60)}:{String(recTime % 60).padStart(2, '0')}
                        <button className="btn btn-danger btn-sm" onClick={stopRecord}>⏹ Stop</button>
                    </div>
                ) : (
                    <button className="btn btn-ghost btn-sm" onClick={startRecord}>🔴 Record</button>
                )}
                <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                    ⬆ Upload
                    <input type="file" accept="audio/*" hidden onChange={e => onUpload && onUpload(e.target.files[0], 'audio')} />
                </label>
            </div>
        </div>
    );
}

// ── Images Box ──────────────────────────────────────────────────
function ImagesBox({ items = [], onUpload, onRemove }) {
    const [lb, setLb] = useState(null);

    const confirmRemove = (mediaId, name) => {
        if (window.confirm(`Remove "${name}" from this entry?`)) {
            onRemove(mediaId);
        }
    };

    return (
        <div className="media-box">
            <div className="media-box-title">📷 Images</div>
            <div className="image-grid" style={{ flex: 1 }}>
                {items.map((item, i) => (
                    <SmartThumbnail
                        key={item.media_id}
                        item={item}
                        onClick={() => setLb(i)}
                        onRemove={onRemove ? () => confirmRemove(item.media_id, item.display_name || item.filename) : undefined}
                    />
                ))}
                {items.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', gridColumn: '1/-1' }}>No images yet</span>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
                <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                    📷 Capture
                    <input type="file" accept="image/*" capture="environment" hidden onChange={e => onUpload && onUpload(e.target.files[0], 'image')} />
                </label>
                <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                    ⬆ Upload
                    <input type="file" accept="image/*" hidden onChange={e => onUpload && onUpload(e.target.files[0], 'image')} />
                </label>
            </div>
            {lb !== null && (
                <Lightbox images={items} startIndex={lb} onClose={() => setLb(null)} />
            )}
        </div>
    );
}

// ── Files Box ───────────────────────────────────────────────────
function FilesBox({ items = [], onUpload, onRemove }) {
    const [previewItem, setPreviewItem] = useState(null);

    const confirmRemove = (item) => {
        if (window.confirm(`Remove "${item.display_name || item.filename}" from this entry?`)) {
            onRemove(item.media_id);
        }
    };

    const isPreviewable = (item) => {
        const t = classifyExtension(item.file_extension);
        return t === 'pdf' || t === 'text' || t === 'audio';
    };

    return (
        <div className="media-box">
            <div className="media-box-title">📎 Files</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto' }}>
                {items.map(item => (
                    <div key={item.media_id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {/* File card (click opens in Drive, unless previewable) */}
                        <a href={item.drive_link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', flex: 1 }}>
                            <div className="file-card">
                                <span className="file-icon">{fileTypeIcon(item.file_extension)}</span>
                                <span className="file-name">{item.display_name || item.filename}</span>
                            </div>
                        </a>

                        {/* Preview button for PDFs, text/code, audio */}
                        {isPreviewable(item) && (
                            <button
                                onClick={() => setPreviewItem(item)}
                                title="Preview"
                                style={{ flexShrink: 0, background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa', borderRadius: '8px', padding: '3px 8px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(167,139,250,0.28)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(167,139,250,0.15)'; }}
                            >
                                👁 View
                            </button>
                        )}

                        {/* Delete with confirmation */}
                        {onRemove && (
                            <button
                                className="media-remove-btn-inline"
                                onClick={(e) => { e.stopPropagation(); confirmRemove(item); }}
                                title="Delete"
                                style={{ flexShrink: 0, color: 'var(--danger, #ef4444)', fontWeight: 700, fontSize: '1rem' }}
                            >✕</button>
                        )}
                    </div>
                ))}
                {items.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No files yet</span>}
            </div>
            <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                ⬆ Upload
                <input type="file" hidden onChange={e => onUpload && onUpload(e.target.files[0], 'file')} />
            </label>

            {previewItem && <FilePreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />}
        </div>
    );
}

// ── MediaRow — three boxes side by side ─────────────────────────
export default function MediaRow({ active, mediaItems = { audio: [], images: [], files: [] }, onUpload, onRecord, onRemove }) {
    if (!active) return null;

    return (
        <div className="media-row">
            <AudioBox items={mediaItems.audio} onUpload={onUpload} onRecord={onRecord} onRemove={onRemove} />
            <ImagesBox items={mediaItems.images} onUpload={onUpload} onRemove={onRemove} />
            <FilesBox items={mediaItems.files} onUpload={onUpload} onRemove={onRemove} />
        </div>
    );
}
