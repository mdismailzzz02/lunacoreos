// YouTube Data API v3 — client-side service
const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE = 'https://www.googleapis.com/youtube/v3';

async function ytFetch(endpoint, params = {}) {
    const url = new URL(`${BASE}/${endpoint}`);
    url.searchParams.set('key', API_KEY);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
    return res.json();
}

// Search for a channel by name or handle
export async function searchChannel(query) {
    // Try as a handle first (e.g. "@mkbhd")
    const handle = query.startsWith('@') ? query.slice(1) : query;
    try {
        const data = await ytFetch('channels', {
            part: 'snippet,contentDetails',
            forHandle: handle,
        });
        if (data.items?.length) return data.items[0];
    } catch (_) { }

    // Fall back to search API
    const search = await ytFetch('search', {
        part: 'snippet',
        type: 'channel',
        q: query,
        maxResults: 1,
    });
    if (!search.items?.length) return null;
    const id = search.items[0].snippet.channelId;

    const detail = await ytFetch('channels', {
        part: 'snippet,contentDetails',
        id,
    });
    return detail.items?.[0] ?? null;
}

// Get the latest N videos from a channel's uploads playlist
export async function getChannelVideos(uploadsPlaylistId, maxResults = 12) {
    const data = await ytFetch('playlistItems', {
        part: 'snippet',
        playlistId: uploadsPlaylistId,
        maxResults,
    });
    return (data.items ?? []).map(item => ({
        id: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        publishedAt: item.snippet.publishedAt,
        channelTitle: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
    }));
}

// ── LocalStorage channel store ─────────────────────────────────
const LS_KEY = 'luna_yt_channels';

export function getStoredChannels() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
    catch (_) { return []; }
}
export function storeChannels(channels) {
    localStorage.setItem(LS_KEY, JSON.stringify(channels));
}
