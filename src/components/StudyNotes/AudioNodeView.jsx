import { NodeViewWrapper } from '@tiptap/react';
import * as api from '../../services/api';

import { PlayCircle } from 'lucide-react';

export default function AudioNodeView({ node, deleteNode }) {
    const { src, media_id, filename } = node.attrs;

    const isDrive = src && (src.includes('drive.google.com') || src.includes('docs.google.com'));
    const fileId = isDrive
        ? (src.match(/\/d\/([^/]+)/)?.[1] || src.match(/id=([^&/]+)/)?.[1])
        : null;
    const audioSrc = fileId
        ? `https://drive.google.com/uc?export=download&id=${fileId}`
        : src;

    const handleDelete = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        deleteNode();
        if (media_id) {
            try {
                await api.deleteMedia(media_id);
                document.dispatchEvent(new CustomEvent('sn-media-deleted', { detail: { media_id } }));
            } catch (e) {
                console.error('Failed to delete audio media:', e);
            }
        }
    };

    return (
        <NodeViewWrapper className="sn-audio-embed-wrapper" style={{ display: isDrive ? 'inline-block' : 'flex' }}>
            {isDrive ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                    <a href={`https://drive.google.com/file/d/${fileId}/view`} target="_blank" rel="noopener noreferrer" className="sn-media-pill-embed" contentEditable={false}>
                        <div className="sn-media-pill-icon">
                            <PlayCircle size={18} />
                        </div>
                        <span className="sn-media-pill-name">{filename || 'Voice Note'}</span>
                    </a>
                    <button className="sn-embed-delete" onClick={handleDelete} title="Remove from note" style={{ top: '8px', right: '-8px', position: 'absolute' }}>×</button>
                </div>
            ) : (
                <>
                    <audio src={audioSrc} controls className="sn-embedded-audio" />
                    <button className="sn-embed-delete" onClick={handleDelete} title="Remove from note">×</button>
                </>
            )}
        </NodeViewWrapper>
    );
}
