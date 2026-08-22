const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://mail.google.com/';

// We import supabase from the centralized client to avoid circular dependencies
import { supabase } from './supabaseClient';

const TOKEN_KEY = 'luna_google_token';
const TOKEN_EXPIRY_KEY = 'luna_google_token_expiry';
const TOKEN_LIFETIME_MS = 55 * 60 * 1000; // 55 min
let refreshInterval = null;

let tokenClient = null;
let accessToken = null;
let pendingResolvers = []; // queue of waiters while a single popup is open
let popupOpen = false;

let cachedToken = null;
let tokenExpiry = null;


// ── Persistence ───────────────────────────────────────────────
function loadCachedToken() {
    const cached = sessionStorage.getItem(TOKEN_KEY);
    const expiry = parseInt(sessionStorage.getItem(TOKEN_EXPIRY_KEY) || '0', 10);
    if (cached && Date.now() < expiry) {
        accessToken = cached;
        startBackgroundRefresh();
        return true;
    }
    accessToken = null;
    return false;
}

function saveToken(token) {
    accessToken = token;
    // Use sessionStorage so token clears when tab closes (more secure than localStorage)
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + TOKEN_LIFETIME_MS));
    startBackgroundRefresh();
}

export const clearGoogleToken = () => {
    accessToken = null;
    cachedToken = null;
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
    if (refreshInterval) clearInterval(refreshInterval);
};

// ── Proactive Background Refresh ───────────────────────────────
function startBackgroundRefresh() {
    if (refreshInterval) return;
    
    // Check every 5 minutes
    refreshInterval = setInterval(async () => {
        const expiry = parseInt(sessionStorage.getItem(TOKEN_EXPIRY_KEY) || '0', 10);
        const remaining = expiry - Date.now();
        
        // If less than 10 minutes remains, try a silent refresh
        if (remaining > 0 && remaining < 10 * 60 * 1000) {
            console.log('[Auth] Token nearing expiry. Triggering proactive silent refresh...');
            try {
                await requestGoogleAccess(true); // Call with silent flag
            } catch (err) {
                console.warn('[Auth] Proactive refresh failed, will retry or wait for next manual request:', err);
            }
        }
    }, 5 * 60 * 1000);
}

// ── Load GSI Script ───────────────────────────────────────────
const gsiReady = new Promise((resolve) => {
    if (typeof window === 'undefined') return;

    // Restore cached token immediately on module load
    loadCachedToken();

    const tryInit = () => {
        if (window.google?.accounts?.oauth2) {
            tokenClient = window.google.accounts.oauth2.initCodeClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                ux_mode: 'popup',
                callback: async (response) => {
                    if (response.error) {
                        pendingResolvers.forEach(([, reject]) => reject(response));
                        pendingResolvers = [];
                        popupOpen = false;
                        return;
                    }
                    try {
                        const { data, error } = await supabase.functions.invoke('exchange-google-code', {
                            body: { code: response.code }
                        });
                        if (error) throw error;
                        
                        if (data.refresh_token) {
                            const { data: config } = await supabase.from('config').select('*').eq('config_id', 'MAIN_CONFIG').maybeSingle();
                            const currentContent = config?.content || {};
                            await supabase.from('config').upsert([{ 
                                config_id: 'MAIN_CONFIG', 
                                content: { ...currentContent, google_refresh_token: data.refresh_token } 
                            }]);
                        }
                        
                        saveToken(data.access_token);
                        pendingResolvers.forEach(([resolve]) => resolve(accessToken));
                    } catch (err) {
                        console.error('[Auth] Code exchange failed:', err);
                        pendingResolvers.forEach(([, reject]) => reject(err));
                    }
                    pendingResolvers = [];
                    popupOpen = false;
                },
            });
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            tokenClient = window.google.accounts.oauth2.initCodeClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                ux_mode: 'popup',
                callback: async (response) => {
                    if (response.error) {
                        pendingResolvers.forEach(([, reject]) => reject(response));
                        pendingResolvers = [];
                        popupOpen = false;
                        return;
                    }
                    try {
                        const { data, error } = await supabase.functions.invoke('exchange-google-code', {
                            body: { code: response.code }
                        });
                        if (error) throw error;
                        
                        if (data.refresh_token) {
                            const { data: config } = await supabase.from('config').select('*').eq('config_id', 'MAIN_CONFIG').maybeSingle();
                            const currentContent = config?.content || {};
                            await supabase.from('config').upsert([{ 
                                config_id: 'MAIN_CONFIG', 
                                content: { ...currentContent, google_refresh_token: data.refresh_token } 
                            }]);
                        }
                        
                        saveToken(data.access_token);
                        pendingResolvers.forEach(([resolve]) => resolve(accessToken));
                    } catch (err) {
                        console.error('[Auth] Code exchange failed:', err);
                        pendingResolvers.forEach(([, reject]) => reject(err));
                    }
                    pendingResolvers = [];
                    popupOpen = false;
                },
            });
            resolve();
        };
        document.body.appendChild(script);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInit);
    } else {
        tryInit();
    }
});

export const initGoogleAuth = () => gsiReady;

export const requestGoogleAccess = async (isSilent = false) => {
    // 1. Fast path: check if we have a valid in-memory token
    if (accessToken) {
        const expiry = parseInt(sessionStorage.getItem(TOKEN_EXPIRY_KEY) || '0', 10);
        if (Date.now() < expiry) return accessToken;
        accessToken = null;
    }

    // 2. Second chance: restore from localStorage cache
    if (loadCachedToken()) return accessToken;

    // 3. Third chance: Try Supabase Session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.provider_token) {
        saveToken(session.provider_token);
        return session.provider_token;
    }

    // 4. Fourth chance: Force Supabase Session Refresh
    if (session) {
        try {
            const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
            if (refreshedSession?.provider_token) {
                saveToken(refreshedSession.provider_token);
                return refreshedSession.provider_token;
            }
        } catch (err) {
            console.warn('[Auth] Supabase session refresh failed:', err);
        }
    }

    // 5. Check for permanent refresh token in database (New Flow)
    try {
        const { data: config } = await supabase.from('config').select('content').eq('config_id', 'MAIN_CONFIG').maybeSingle();
        if (config?.content?.google_refresh_token) {
            const { data, error } = await supabase.functions.invoke('refresh-drive-token', {
                body: { refresh_token: config.content.google_refresh_token }
            });
            if (!error && data?.access_token) {
                saveToken(data.access_token);
                return data.access_token;
            }
        }
    } catch (err) {
        console.warn('[Auth] Failed to restore from DB refresh token:', err);
    }

    if (isSilent) throw new Error('Silent refresh not possible');

    // 5. Final Fallback: GSI Popup
    await gsiReady; 
    
    if (popupOpen) {
        return new Promise((resolve, reject) => {
            pendingResolvers.push([resolve, reject]);
        });
    }

    popupOpen = true;
    return new Promise((resolve, reject) => {
        pendingResolvers.push([resolve, reject]);
        try {
            // requestCode is used for initCodeClient
            tokenClient.requestCode();
        } catch (err) {
            popupOpen = false;
            reject(new Error('Google Identity Services failed.'));
        }
    });
};

export const forceGoogleReauth = async () => {
    clearGoogleToken();
    // Also sign out of Supabase to clear provider_token if it exists, but actually we just need GSI
    await gsiReady;
    
    if (popupOpen) return;
    
    popupOpen = true;
    return new Promise((resolve, reject) => {
        pendingResolvers.push([resolve, reject]);
        try {
            tokenClient.requestCode();
        } catch (err) {
            popupOpen = false;
            reject(new Error('Google Identity Services failed.'));
        }
    });
};

// ── Supabase Login Trigger ────────────────────────────────────
export const loginWithSupabase = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            scopes: SCOPES,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
            redirectTo: window.location.origin
        }
    });
    if (error) throw error;
};

