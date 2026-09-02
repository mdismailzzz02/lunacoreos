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

export async function getChannelById(id) {
    try {
        const detail = await ytFetch('channels', {
            part: 'snippet,contentDetails,statistics',
            id,
        });
        return detail.items?.[0] ?? null;
    } catch (_) {
        return null;
    }
}

export async function getChannelVideos(uploadsPlaylistId, maxResults = 25, pageToken = '') {
    const params = {
        part: 'snippet',
        playlistId: uploadsPlaylistId,
        maxResults,
    };
    if (pageToken) params.pageToken = pageToken;

    const data = await ytFetch('playlistItems', params);
    
    const items = data.items ?? [];
    if (items.length === 0) return { items: [], nextPageToken: null };

    const videoIds = items.map(item => item.snippet.resourceId.videoId).join(',');
    
    let videosData = { items: [] };
    try {
        videosData = await ytFetch('videos', {
            part: 'snippet,contentDetails,liveStreamingDetails',
            id: videoIds,
        });
    } catch (err) {
        console.warn('Failed to fetch rich video details:', err);
    }

    const detailsMap = new Map();
    (videosData.items ?? []).forEach(v => {
        detailsMap.set(v.id, v);
    });

    const processedItems = items.map(item => {
        const vid = item.snippet.resourceId.videoId;
        const details = detailsMap.get(vid) || {};
        
        // Detection logic
        const isLive = details.snippet?.liveBroadcastContent === 'live';
        const duration = details.contentDetails?.duration || '';
        const isShort = duration.includes('M') ? false : (duration.includes('S') && parseInt(duration.replace('PT', '').replace('S', '')) <= 60);

        return {
            id: vid,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
            publishedAt: item.snippet.publishedAt,
            channelTitle: item.snippet.channelTitle,
            channelId: item.snippet.channelId,
            isLive,
            isShort,
            duration
        };
    });

    return {
        items: processedItems,
        nextPageToken: data.nextPageToken || null
    };
}

// Search for videos globally
export async function searchGlobalVideos(query, maxResults = 20, pageToken = '') {
    const params = {
        part: 'snippet',
        type: 'video',
        q: query,
        maxResults,
    };
    if (pageToken) params.pageToken = pageToken;

    const data = await ytFetch('search', params);
    
    const items = data.items ?? [];
    if (items.length === 0) return { items: [], nextPageToken: null };

    const videoIds = items.map(item => item.id.videoId).join(',');
    
    let videosData = { items: [] };
    try {
        videosData = await ytFetch('videos', {
            part: 'snippet,contentDetails,liveStreamingDetails',
            id: videoIds,
        });
    } catch (err) {
        console.warn('Failed to fetch rich video details for search:', err);
    }

    const detailsMap = new Map();
    (videosData.items ?? []).forEach(v => {
        detailsMap.set(v.id, v);
    });

    const processedItems = items.map(item => {
        const vid = item.id.videoId;
        const details = detailsMap.get(vid) || {};
        
        const isLive = details.snippet?.liveBroadcastContent === 'live';
        const duration = details.contentDetails?.duration || '';
        const isShort = duration.includes('M') ? false : (duration.includes('S') && parseInt(duration.replace('PT', '').replace('S', '')) <= 60);

        return {
            id: vid,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
            publishedAt: item.snippet.publishedAt,
            channelTitle: item.snippet.channelTitle,
            channelId: item.snippet.channelId,
            isLive,
            isShort,
            duration
        };
    });

    return {
        items: processedItems,
        nextPageToken: data.nextPageToken || null
    };
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
