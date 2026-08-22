import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: {
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        },
        fetch: (url, options = {}) =>
            fetch(url, {
                ...options,
                cache: 'no-store', // Always bypass browser/CDN cache
            }),
    },
});

const originalRefreshSession = supabase.auth.refreshSession.bind(supabase.auth);
let refreshPromise = null;

supabase.auth.refreshSession = async () => {
    if (refreshPromise) {
        console.log('[Auth] Refresh already in flight, waiting for it to finish...');
        return refreshPromise;
    }

    refreshPromise = (async () => {
        const result = await originalRefreshSession();
        if (result.error && result.error.message.toLowerCase().includes('refresh token')) {
            console.warn('[Auth] Invalid refresh token detected. Checking if session was recovered by another call...');
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                console.log('[Auth] Session is still valid, recovering from race condition.');
                return { data: { session }, error: null };
            }
        }
        return result;
    })();

    try {
        return await refreshPromise;
    } finally {
        refreshPromise = null;
    }
};
