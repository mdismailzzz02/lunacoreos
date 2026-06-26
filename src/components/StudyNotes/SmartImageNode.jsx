import { NodeViewWrapper } from '@tiptap/react';
import { useState } from 'react';
import * as api from '../../services/api';

export default function SmartImageNode(props) {
    const { node, updateAttributes } = props;
    const initialSrc = node.attrs.src;
    const [src, setSrc] = useState(initialSrc);
    const [failed, setFailed] = useState(false);

    const handleError = async () => {
        if (failed || !initialSrc) return;
        setFailed(true);
        
        // Try to extract ID and fetch base64
        const match = initialSrc.match(/\/d\/([^/]+)/) || initialSrc.match(/id=([^&/]+)/);
        if (!match) return;
        const id = match[1];

        console.log(`Inline image failed to load, fetching base64 for ${id}...`);
        try {
            // We need to fetch the media record by drive_file_id, 
            // but the API getThumbnailBase64 takes media_id.
            // Let's use the new getMediaBySource or similar?
            // Actually, getMediaThumbnailBase64 in Code.gs accepts drive_file_id if we modify it or we can just fetch the image.
            
            // To be safe, if we can't find it, we just leave it broken.
            // BUT wait! We know the file ID. We can try docs.google.com/uc?id=${id} as a fallback right here.
            setSrc(`https://docs.google.com/uc?id=${id}&export=download`);
        } catch (e) {
            console.error('Fallback failed:', e);
        }
    };

    return (
        <NodeViewWrapper style={{ display: 'inline-block', width: '100%' }}>
            <img 
                src={src} 
                alt={node.attrs.alt} 
                title={node.attrs.title}
                className={node.attrs.class || 'sn-embedded-image'}
                referrerPolicy="no-referrer"
                onError={handleError}
                style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }}
            />
        </NodeViewWrapper>
    );
}
