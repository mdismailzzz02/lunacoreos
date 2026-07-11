import { useState, useEffect, useRef } from 'react';
import { getFreshSignedUrl } from '../services/api';

/**
 * useSecureUrl — converts a Supabase signed URL into a local blob: URL
 * and automatically refreshes it right before it expires.
 *
 * Security model:
 *  - The raw signed URL is fetched in JavaScript (visible only in DevTools).
 *  - The result is a blob: URL that is ONLY valid for the current tab.
 *  - It is automatically revoked on unmount or URL change.
 *  - Auto-refresh keeps the blob active by fetching a new signed URL
 *    in the background before the old one expires.
 */
export function useSecureUrl(signedUrl, skip = false, item = null) {
    const [blobUrl, setBlobUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    
    const prevBlobUrl = useRef(null);
    const abortRef = useRef(null);
    const timerRef = useRef(null);
    const isFetchingRef = useRef(false);

    useEffect(() => {
        if (skip || !signedUrl) {
            setBlobUrl(null);
            setLoading(false);
            setError(false);
            return;
        }

        let cancelled = false;

        const fetchBlob = async (urlToFetch) => {
            if (prevBlobUrl.current) {
                URL.revokeObjectURL(prevBlobUrl.current);
                prevBlobUrl.current = null;
            }
            if (abortRef.current) {
                abortRef.current.abort();
            }
            const controller = new AbortController();
            abortRef.current = controller;
            
            setLoading(true);
            setError(false);
            isFetchingRef.current = true;

            try {
                const res = await fetch(urlToFetch, {
                    signal: controller.signal,
                    cache: 'no-store',
                    credentials: 'omit'
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const blob = await res.blob();
                if (cancelled) return;
                const url = URL.createObjectURL(blob);
                prevBlobUrl.current = url;
                setBlobUrl(url);
            } catch (err) {
                if (cancelled || err.name === 'AbortError') return;
                console.warn('[useSecureUrl] fetch failed:', err.message);
                setError(true);
            } finally {
                if (!cancelled) setLoading(false);
                isFetchingRef.current = false;
            }
        };

        const scheduleRefresh = (expiresAtMs, storagePath) => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (!expiresAtMs || !storagePath) return;

            // Refresh 30 seconds before expiry
            const timeUntilExpiry = expiresAtMs - Date.now();
            const refreshIn = Math.max(0, timeUntilExpiry - 30000);

            timerRef.current = setTimeout(async () => {
                if (cancelled) return;
                try {
                    const newUrl = await getFreshSignedUrl(storagePath);
                    if (cancelled) return;
                    
                    // Schedule next refresh 10 mins (600s) from now
                    scheduleRefresh(Date.now() + 600000, storagePath);
                    
                    // Fetch new blob
                    await fetchBlob(newUrl);
                } catch (e) {
                    console.error('Auto-refresh signed URL failed:', e);
                }
            }, refreshIn);
        };

        // Initial fetch
        fetchBlob(signedUrl);

        // Schedule auto-refresh if this is a Supabase item with expiry info
        if (item && item._isSupabaseStorage && item._expiresAt && item.storage_path) {
            scheduleRefresh(item._expiresAt, item.storage_path);
        }

        return () => {
            cancelled = true;
            if (abortRef.current) abortRef.current.abort();
            if (timerRef.current) clearTimeout(timerRef.current);
            if (prevBlobUrl.current) {
                URL.revokeObjectURL(prevBlobUrl.current);
                prevBlobUrl.current = null;
            }
        };
    }, [signedUrl, skip, item?.media_id]); // Trigger if the source URL or media item changes

    return { blobUrl, loading, error };
}
