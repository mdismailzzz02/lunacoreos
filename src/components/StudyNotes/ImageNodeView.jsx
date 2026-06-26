import { NodeViewWrapper } from '@tiptap/react';
import * as api from '../../services/api';

export default function ImageNodeView({ node, deleteNode }) {
    const { src, alt, media_id } = node.attrs;

    const handleDelete = async () => {
        deleteNode();
        if (media_id) {
            try {
                await api.deleteMedia(media_id);
                document.dispatchEvent(new CustomEvent('sn-media-deleted', { detail: { media_id } }));
            } catch (e) {
                console.error('Failed to delete image media:', e);
            }
        }
    };

    return (
        <NodeViewWrapper className="sn-embed-wrapper" style={{ display: 'block' }}>
            <img
                src={src}
                alt={alt || ''}
                className="sn-embedded-image"
                referrerPolicy="no-referrer"
            />
            <button className="sn-embed-delete" onClick={handleDelete} title="Remove from note">×</button>
        </NodeViewWrapper>
    );
}
