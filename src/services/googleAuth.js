const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive';

// We import supabase from the centralized client to avoid circular dependencies
import { supabase } from './supabaseClient';

const TOKEN_KEY = 'luna_drive_token';
const TOKEN_EXPIRY_KEY = 'luna_drive_token_expiry';
const TOKEN_LIFETIME_MS = 55 * 60 * 1000; // 55 min
let refreshInterval = null;

let tokenClient = null;
let accessToken = null;
let pendingResolvers = []; // queue of waiters while a single popup is open
let popupOpen = false;

let cachedToken = null;
let tokenExpiry = null;

export const getDriveToken = async () => {
    // 1. Return cached token if still valid (with 60s buffer)
    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 60000) {
        return cachedToken;
    }

    try {
        // 2. Call the secure Supabase Edge Function (The Key stays hidden in the backend!)
        const { data, error } = await supabase.functions.invoke('drive-auth');

        if (error || !data?.access_token) {
            console.warn('[Auth] Edge Function auth failed, falling back to cached session:', error?.message);
            throw new Error('Edge Function failed');
        }

        cachedToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
        console.log('[Auth] Secure Drive token acquired via Edge Function.');
        return cachedToken;
    } catch (err) {
        // If Edge Function isn't deployed yet or fails, we return null to trigger fallbacks
        return null;
    }
};

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

export const clearDriveToken = () => {
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
        const expiry = parseInt(localStorage.getItem(TOKEN_EXPIRY_KEY) || '0', 10);
        const remaining = expiry - Date.now();
        
        // If less than 10 minutes remains, try a silent refresh
        if (remaining > 0 && remaining < 10 * 60 * 1000) {
            console.log('[Auth] Token nearing expiry. Triggering proactive silent refresh...');
            try {
                await requestDriveAccess(true); // Call with silent flag
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
            tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: (response) => {
                    if (response.error) {
                        pendingResolvers.forEach(([, reject]) => reject(response));
                    } else {
                        saveToken(response.access_token);
                        pendingResolvers.forEach(([resolve]) => resolve(accessToken));
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
            tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: (response) => {
                    if (response.error) {
                        pendingResolvers.forEach(([, reject]) => reject(response));
                    } else {
                        saveToken(response.access_token);
                        pendingResolvers.forEach(([resolve]) => resolve(accessToken));
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

// ── Token Request ─────────────────────────────────────────────
export const requestDriveAccess = async (isSilent = false) => {
    // 0. NEW: SECURE EDGE FUNCTION PATH (Priority)
    const secureToken = await getDriveToken();
    if (secureToken) return secureToken;

    // 1. Fast path: check if we have a valid in-memory token
    if (accessToken) {
        const expiry = parseInt(localStorage.getItem(TOKEN_EXPIRY_KEY) || '0', 10);
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
            tokenClient.requestAccessToken({ prompt: '' });
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

// ── Drive Folder Scanner ──────────────────────────────────────
export const scanDriveFolder = async (folderId, filter = '') => {
    const token = await requestDriveAccess();
    let allFiles = [];
    let pageToken = null;

    const baseQuery = `'${folderId}' in parents and trashed = false`;
    const query = filter ? `${baseQuery} and (${filter})` : baseQuery;
    const fields = 'nextPageToken, files(id, name, mimeType, size, webViewLink, thumbnailLink)';

    do {
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ''}`;
        let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

        if (res.status === 401) {
            await clearDriveToken();
            const freshToken = await requestDriveAccess();
            res = await fetch(url, { headers: { Authorization: `Bearer ${freshToken}` } });
        }

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error?.message || 'Failed to scan Drive folder');
        }

        const data = await res.json();
        allFiles = allFiles.concat(data.files || []);
        pageToken = data.nextPageToken;
    } while (pageToken);

    return allFiles;
};

export const scanDriveFolderIdsOnly = async (folderId, sinceDate = null) => {
    const token = await requestDriveAccess();
    let allFiles = [];
    let pageToken = null;

    let baseQuery = `'${folderId}' in parents and trashed = false`;
    if (sinceDate) {
        baseQuery += ` and modifiedTime > '${sinceDate}'`;
    }
    const fields = 'nextPageToken, files(id, name, mimeType)';

    do {
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(baseQuery)}&fields=${encodeURIComponent(fields)}&pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ''}`;
        let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

        if (res.status === 401) {
            await clearDriveToken();
            const freshToken = await requestDriveAccess();
            res = await fetch(url, { headers: { Authorization: `Bearer ${freshToken}` } });
        }

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error?.message || 'Failed to scan Drive folder');
        }

        const data = await res.json();
        allFiles = allFiles.concat(data.files || []);
        pageToken = data.nextPageToken;
    } while (pageToken);

    return {
        files: allFiles,
        fetchedAt: new Date().toISOString()
    };
};

// ── Drive File Uploader ───────────────────────────────────────
export const uploadFileToDrive = async (base64Data, filename, mimeType, folderId) => {
    const token = await requestDriveAccess();

    // Strip the data:image/png;base64, prefix if present
    const base64Clean = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const binaryString = atob(base64Clean);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });

    const metadata = {
        name: filename,
        parents: [folderId]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink';
    
    let res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form
    });

    if (res.status === 401) {
        await clearDriveToken();
        const freshToken = await requestDriveAccess();
        res = await fetch(url, {
            method: 'POST',
            headers: { Authorization: `Bearer ${freshToken}` },
            body: form
        });
    }

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || 'Failed to upload to Drive');
    }

    return await res.json();
};
