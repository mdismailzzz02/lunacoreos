import { NodeViewWrapper } from '@tiptap/react';
import { FileText, Download } from 'lucide-react';
import * as api from '../../services/api';

export default function FileNodeView({ node, deleteNode }) {
    const { href, filename, media_id } = node.attrs;

    const handleDelete = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        deleteNode();
        if (media_id) {
            try {
                await api.deleteMedia(media_id);
                document.dispatchEvent(new CustomEvent('sn-media-deleted', { detail: { media_id } }));
            } catch (e) {
                console.error('Failed to delete file media:', e);
            }
        }
    };

    return (
        <NodeViewWrapper className="sn-embed-wrapper" style={{ display: 'inline-block' }}>
            <a href={href} target="_blank" rel="noopener noreferrer" className="sn-media-pill-embed" contentEditable={false}>
                <div className="sn-media-pill-icon">
                    <FileText size={18} />
                </div>
                <span className="sn-media-pill-name">{filename || 'Attached File'}</span>
            </a>
            <button className="sn-embed-delete" onClick={handleDelete} title="Remove from note" style={{ top: '6px', right: '-6px' }}>×</button>
        </NodeViewWrapper>
    );
}
