import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Grid3x3, X, ChevronDown, ChevronUp, Image as ImageIcon, Video, Type } from 'lucide-react';
import * as api from '../../services/api';

const DEFAULT_WIDTH_BY_COLS = { 1: '40%', 2: '55%', 3: '80%', 4: '100%' };
const getDefaultWidth = (cols) => DEFAULT_WIDTH_BY_COLS[cols] || '100%';

const DEFAULT_HEIGHT_BY_COLS = { 1: 240, 2: 220, 3: 200, 4: 180 };
const getDefaultHeight = (cols) => DEFAULT_HEIGHT_BY_COLS[cols] || 200;

export default function GridNodeView({ node, updateAttributes, deleteNode, selected }) {
    const fileInputRef = useRef(null);
    const videoInputRef = useRef(null);
    const boxRef = useRef(null);
    const [selectedCellIdx, setSelectedCellIdx] = useState(null);
    const [customRows, setCustomRows] = useState(node.attrs.rows || 1);
    const [customCols, setCustomCols] = useState(node.attrs.columns || 3);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [fullscreenImage, setFullscreenImage] = useState(null);

    const rows = node.attrs.rows || 1;
    const columns = node.attrs.columns || 3;
    const gridWidth = node.attrs.gridWidth || getDefaultWidth(columns);
    const cellHeight = node.attrs.cellHeight || getDefaultHeight(columns);

    let cells = node.attrs.cells || [];
    const totalCells = rows * columns;
    if (cells.length === 0) {
        cells = Array(totalCells).fill(null).map(() => ({}));
    } else if (cells.length < totalCells) {
        cells = [...cells, ...Array(totalCells - cells.length).fill(null).map(() => ({}))]
    }

    useEffect(() => {
        setCustomRows(node.attrs.rows || 1);
        setCustomCols(node.attrs.columns || 3);
    }, [node.attrs.rows, node.attrs.columns]);

    useEffect(() => {
        if (isCollapsed) return;
        const timer = setTimeout(() => setIsCollapsed(true), 5000);
        return () => clearTimeout(timer);
    }, [isCollapsed]);

    // ── Drag-to-resize ────────────────────────────────────────────
    const onResizeMouseDown = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        const box = boxRef.current;
        if (!box) return;

        const startX = e.clientX;
        const startY = e.clientY;
        const startW = box.getBoundingClientRect().width;
        const startH = cellHeight;
        const parentW = box.parentElement?.getBoundingClientRect().width || startW;

        setIsResizing(true);

        const onMove = (ev) => {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;
            const newWPx = Math.max(parentW * 0.15, Math.min(parentW, startW + dx));
            const newWPct = Math.round((newWPx / parentW) * 100);
            const newH = Math.max(80, Math.min(600, startH + dy));
            updateAttributes({ gridWidth: `${newWPct}%`, cellHeight: Math.round(newH) });
        };

        const onUp = () => {
            setIsResizing(false);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [cellHeight, updateAttributes]);

    // ─────────────────────────────────────────────────────────────

    const updateGridSize = (newRows, newCols) => {
        const newTotal = newRows * newCols;
        let newCells = [...cells].slice(0, newTotal);
        if (newCells.length < newTotal) {
            newCells = [...newCells, ...Array(newTotal - newCells.length).fill(null).map(() => ({}))]
        }
        updateAttributes({
            rows: newRows, columns: newCols, cells: newCells,
            gridWidth: node.attrs.gridWidth || getDefaultWidth(newCols),
            cellHeight: node.attrs.cellHeight || getDefaultHeight(newCols),
        });
    };

    const updateColumns = (n) => updateGridSize(1, n);

    const updateCell = (index, cellData) => {
        const newCells = [...cells];
        newCells[index] = { ...newCells[index], ...cellData };
        updateAttributes({ cells: newCells });
    };

    const handleImageSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file || selectedCellIdx === null) return;
        try {
            const base64data = await api.fileToBase64(file);
            const res = await api.uploadMedia({
                base64data, filename: file.name, mime_type: file.type,
                media_type: 'image', uploaded_from: 'studynotes_grid', source_id: 'grid'
            });
            if (res.drive_link) {
                updateCell(selectedCellIdx, { type: 'image', imageSrc: res.drive_link, mediaId: res.media_id, filename: file.name });
            }
        } catch (err) {
            console.error('Grid image upload failed:', err);
            alert(`Failed to upload image: ${err.message}`);
        }
        e.target.value = '';
    };

    const handleVideoSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file || selectedCellIdx === null) return;
        try {
            const base64data = await api.fileToBase64(file);
            const res = await api.uploadMedia({
                base64data, filename: file.name, mime_type: file.type,
                media_type: 'video', uploaded_from: 'studynotes_grid', source_id: 'grid'
            });
            if (res.drive_link) {
                updateCell(selectedCellIdx, { type: 'video', src: res.drive_link, mediaId: res.media_id, filename: file.name });
            }
        } catch (err) {
            console.error('Grid video upload failed:', err);
            alert(`Failed to upload video: ${err.message}`);
        }
        e.target.value = '';
    };

    const triggerImageInput = (idx) => { setSelectedCellIdx(idx); fileInputRef.current.click(); };
    const triggerVideoInput = (idx) => { setSelectedCellIdx(idx); videoInputRef.current.click(); };
    const removeCell = (idx) => updateCell(idx, { type: null, imageSrc: null, src: null, textContent: null, mediaId: null, filename: null });

    return (
        // NodeViewWrapper stays unstyled — just a transparent block wrapper from Tiptap
        <NodeViewWrapper className="sn-grid-outer-wrapper">

            {/* ── The styled box: sized to gridWidth, not full-width ── */}
            <div
                ref={boxRef}
                className={`sn-grid-node-wrapper ${selected ? 'selected' : ''} ${isResizing ? 'resizing' : ''}`}
                style={{ width: gridWidth }}
            >
                {/* Controls — inside the sized box, so X stays at its right edge */}
                <div className="sn-grid-controls">
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
                            title={isCollapsed ? 'Expand' : 'Collapse'}
                        >
                            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                        </button>
                        <Grid3x3 size={16} />
                        <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Grid ({rows}×{columns})</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '4px', whiteSpace: 'nowrap' }}>
                            {gridWidth} · {cellHeight}px
                        </span>
                    </div>

                    {!isCollapsed && (
                        <>
                            <div className="sn-grid-quick-buttons">
                                <span style={{ fontSize: '0.75rem', color: '#999' }}>Quick:</span>
                                {[2, 3, 4].map(n => (
                                    <button
                                        key={n}
                                        className="sn-col-btn"
                                        style={{ background: rows === 1 && columns === n ? '#a78bfa' : '#3f3f46' }}
                                        onClick={() => updateColumns(n)}
                                        title={`1×${n}`}
                                    >{n}</button>
                                ))}
                            </div>
                            <div className="sn-grid-custom-inputs">
                                <span style={{ fontSize: '0.75rem', color: '#999' }}>Custom:</span>
                                {[['R', customRows, setCustomRows], ['C', customCols, setCustomCols]].map(([lbl, val, setter]) => (
                                    <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <span style={{ fontSize: '0.72rem', color: '#999' }}>{lbl}:</span>
                                        <input
                                            type="number" min="1" max="10" value={val}
                                            onChange={(e) => setter(Math.max(1, parseInt(e.target.value) || 1))}
                                            onBlur={() => updateGridSize(customRows, customCols)}
                                            onKeyDown={(e) => e.key === 'Enter' && updateGridSize(customRows, customCols)}
                                            style={{ width: '36px', padding: '3px 5px', background: '#2a2a2e', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', color: 'var(--text)', fontSize: '0.82rem' }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    <button
                        className="sn-col-btn sn-remove-btn"
                        onClick={() => setShowDeleteConfirm(true)}
                        title="Remove grid"
                        style={{ marginLeft: '8px', flexShrink: 0 }}
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Delete confirm */}
                {showDeleteConfirm && (
                    <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>Remove this grid and all its content?</span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: '0.35rem 0.7rem', background: '#3f3f46', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', color: 'var(--text)', cursor: 'pointer', fontSize: '0.82rem' }}>Cancel</button>
                            <button onClick={() => { setShowDeleteConfirm(false); deleteNode(); }} style={{ padding: '0.35rem 0.7rem', background: 'rgba(239,68,68,0.8)', border: '1px solid #ef4444', borderRadius: 'var(--radius-xs)', color: 'white', cursor: 'pointer', fontSize: '0.82rem' }}>Remove</button>
                        </div>
                    </div>
                )}

                {/* Media grid */}
                <div className="sn-grid-container" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                    {cells.map((cell, idx) => {
                        const isImage = cell && (cell.type === 'image' || cell.imageSrc);
                        const isVideo = cell && cell.type === 'video';
                        const isText = cell && cell.type === 'text';
                        const isEmpty = !isImage && !isVideo && !isText;

                        return (
                            <div key={idx} className="sn-grid-cell" style={{ height: `${cellHeight}px` }}>
                                {isImage && (
                                    <div className="sn-grid-cell-image-wrapper">
                                        <img 
                                            src={cell.imageSrc || cell.src} 
                                            alt={cell.filename || 'Grid image'} 
                                            onClick={() => setFullscreenImage(cell.imageSrc || cell.src)}
                                            style={{ cursor: 'zoom-in' }}
                                            title="Click to view full screen"
                                        />
                                        <button className="sn-grid-cell-remove" onClick={() => removeCell(idx)} title="Remove image">✕</button>
                                    </div>
                                )}
                                
                                {isVideo && (
                                    <div className="sn-grid-cell-media-wrapper">
                                        <video 
                                            src={cell.src} 
                                            controls
                                            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
                                        />
                                        <button className="sn-grid-cell-remove" onClick={() => removeCell(idx)} title="Remove video">✕</button>
                                    </div>
                                )}

                                {isText && (
                                    <div className="sn-grid-cell-text-wrapper">
                                        <textarea 
                                            value={cell.textContent || ''}
                                            onChange={(e) => updateCell(idx, { textContent: e.target.value })}
                                            placeholder="Write something..."
                                            className="sn-grid-cell-textarea"
                                            onKeyDown={(e) => {
                                                // Prevent Tiptap from hijacking enter/arrows when inside textarea
                                                e.stopPropagation();
                                            }}
                                        />
                                        <button className="sn-grid-cell-remove sn-text-remove" onClick={() => removeCell(idx)} title="Remove text">✕</button>
                                    </div>
                                )}

                                {isEmpty && (
                                    <div className="sn-grid-cell-empty">
                                        <button onClick={() => triggerImageInput(idx)} title="Add Image"><ImageIcon size={18} /></button>
                                        <button onClick={() => triggerVideoInput(idx)} title="Add Video"><Video size={18} /></button>
                                        <button onClick={() => updateCell(idx, { type: 'text', textContent: '' })} title="Add Text"><Type size={18} /></button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Corner resize handle */}
                <div className="sn-grid-resize-handle" onMouseDown={onResizeMouseDown} title="Drag to resize">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 10L10 2M6 10L10 6M10 10V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                </div>
            </div>

            {fullscreenImage && createPortal(
                <div 
                    className="sn-grid-lightbox"
                    onClick={() => setFullscreenImage(null)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 999999,
                        backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'zoom-out', animation: 'sn-fade-in 0.2s ease-out'
                    }}
                >
                    <img 
                        src={fullscreenImage} 
                        style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} 
                        alt="Fullscreen view" 
                    />
                    <button 
                        style={{ position: 'absolute', top: '24px', right: '32px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => setFullscreenImage(null)}
                    ><X size={24} /></button>
                </div>,
                document.body
            )}
            
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleImageSelect} />
            <input type="file" ref={videoInputRef} style={{ display: 'none' }} accept="video/*" onChange={handleVideoSelect} />
            <NodeViewContent style={{ display: 'none' }} />
        </NodeViewWrapper>
    );
}
