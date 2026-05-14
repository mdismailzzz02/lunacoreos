import * as api from './api';

/**
 * Auto-Caching Service
 * Silently caches all app content when app detects it comes online
 * Makes everything available offline without user interaction
 */

const CACHE_CONFIG = {
    journal: { key: 'cache_journal', ttl: 3600000 }, // 1 hour
    todos: { key: 'cache_todos', ttl: 1800000 }, // 30 min
    habits: { key: 'cache_habits', ttl: 3600000 },
    insights: { key: 'cache_insights', ttl: 1800000 },
    dashboard: { key: 'cache_dashboard', ttl: 900000 }, // 15 min
    media: { key: 'cache_media', ttl: 3600000 },
    bookmarks: { key: 'cache_bookmarks', ttl: 3600000 },
    writings: { key: 'cache_writings', ttl: 3600000 },
    readinglist: { key: 'cache_readinglist', ttl: 3600000 },
    watchlist: { key: 'cache_watchlist', ttl: 3600000 },
    yearlyreview: { key: 'cache_yearlyreview', ttl: 3600000 },
    delegation: { key: 'cache_delegation', ttl: 3600000 }
};

function isCacheValid(cacheKey) {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return false;
    try {
        const { cachedAt, ttl } = JSON.parse(cached);
        return Date.now() - cachedAt < ttl;
    } catch {
        return false;
    }
}

async function cacheWithTTL(cacheKey, data, ttl) {
    localStorage.setItem(cacheKey, JSON.stringify({
        data,
        cachedAt: Date.now(),
        ttl
    }));
}

function getCachedData(cacheKey) {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    try {
        const { data } = JSON.parse(cached);
        return data;
    } catch {
        return null;
    }
}

async function cacheJournal() {
    try {
        const config = CACHE_CONFIG.journal;
        if (isCacheValid(config.key)) return; // Skip if fresh
        
        const entries = await api.getEntries({ limit: 100 });
        await cacheWithTTL(config.key, entries, config.ttl);
        console.log('[OfflineCache] ✓ Journal cached');
    } catch (e) {
        console.warn('[OfflineCache] Journal cache failed:', e);
    }
}

async function cacheTodos() {
    try {
        const config = CACHE_CONFIG.todos;
        if (isCacheValid(config.key)) return;
        
        const todos = await api.getTodos({ limit: 200 });
        await cacheWithTTL(config.key, todos, config.ttl);
        console.log('[OfflineCache] ✓ Todos cached');
    } catch (e) {
        console.warn('[OfflineCache] Todos cache failed:', e);
    }
}

async function cacheHabits() {
    try {
        const config = CACHE_CONFIG.habits;
        if (isCacheValid(config.key)) return;
        
        const habits = await api.getHabits({ includeArchived: false });
        await cacheWithTTL(config.key, habits, config.ttl);
        console.log('[OfflineCache] ✓ Habits cached');
    } catch (e) {
        console.warn('[OfflineCache] Habits cache failed:', e);
    }
}

async function cacheInsights() {
    try {
        const config = CACHE_CONFIG.insights;
        if (isCacheValid(config.key)) return;
        
        const insights = await api.getInsights({ limit: 100 });
        await cacheWithTTL(config.key, insights, config.ttl);
        console.log('[OfflineCache] ✓ Insights cached');
    } catch (e) {
        console.warn('[OfflineCache] Insights cache failed:', e);
    }
}

async function cacheDashboard() {
    try {
        const config = CACHE_CONFIG.dashboard;
        if (isCacheValid(config.key)) return;
        
        const stats = await api.getDashboardStats();
        await cacheWithTTL(config.key, stats, config.ttl);
        console.log('[OfflineCache] ✓ Dashboard cached');
    } catch (e) {
        console.warn('[OfflineCache] Dashboard cache failed:', e);
    }
}

async function cacheMedia() {
    try {
        const config = CACHE_CONFIG.media;
        if (isCacheValid(config.key)) return;
        
        const media = await api.getAllMedia({ limit: 150 });
        await cacheWithTTL(config.key, media, config.ttl);
        console.log('[OfflineCache] ✓ Media cached');
    } catch (e) {
        console.warn('[OfflineCache] Media cache failed:', e);
    }
}

async function cacheBookmarks() {
    try {
        const config = CACHE_CONFIG.bookmarks;
        if (isCacheValid(config.key)) return;
        
        const bookmarks = await api.getBookmarks?.({ limit: 100 }) || [];
        await cacheWithTTL(config.key, bookmarks, config.ttl);
        console.log('[OfflineCache] ✓ Bookmarks cached');
    } catch (e) {
        console.warn('[OfflineCache] Bookmarks cache failed:', e);
    }
}

async function cacheWritings() {
    try {
        const config = CACHE_CONFIG.writings;
        if (isCacheValid(config.key)) return;
        
        const writings = await api.getWritings?.({ limit: 100 }) || [];
        await cacheWithTTL(config.key, writings, config.ttl);
        console.log('[OfflineCache] ✓ Writings cached');
    } catch (e) {
        console.warn('[OfflineCache] Writings cache failed:', e);
    }
}

async function cacheReadingList() {
    try {
        const config = CACHE_CONFIG.readinglist;
        if (isCacheValid(config.key)) return;
        
        const readingList = await api.getReadingList?.({ limit: 100 }) || [];
        await cacheWithTTL(config.key, readingList, config.ttl);
        console.log('[OfflineCache] ✓ Reading List cached');
    } catch (e) {
        console.warn('[OfflineCache] Reading List cache failed:', e);
    }
}

async function cacheWatchlist() {
    try {
        const config = CACHE_CONFIG.watchlist;
        if (isCacheValid(config.key)) return;
        
        const watchlist = await api.getWatchlist?.({ limit: 100 }) || [];
        await cacheWithTTL(config.key, watchlist, config.ttl);
        console.log('[OfflineCache] ✓ Watchlist cached');
    } catch (e) {
        console.warn('[OfflineCache] Watchlist cache failed:', e);
    }
}

async function cacheYearlyReview() {
    try {
        const config = CACHE_CONFIG.yearlyreview;
        if (isCacheValid(config.key)) return;
        
        const reviews = await api.getYearlyReviews?.({ limit: 10 }) || [];
        await cacheWithTTL(config.key, reviews, config.ttl);
        console.log('[OfflineCache] ✓ Yearly Reviews cached');
    } catch (e) {
        console.warn('[OfflineCache] Yearly Reviews cache failed:', e);
    }
}

async function cacheDelegation() {
    try {
        const config = CACHE_CONFIG.delegation;
        if (isCacheValid(config.key)) return;
        
        const delegation = await api.getDelegation?.({ limit: 100 }) || [];
        await cacheWithTTL(config.key, delegation, config.ttl);
        console.log('[OfflineCache] ✓ Delegation cached');
    } catch (e) {
        console.warn('[OfflineCache] Delegation cache failed:', e);
    }
}

export const OfflineCache = {
    // Trigger full cache sync (called when app comes online)
    async triggerSync() {
        console.log('[OfflineCache] 🔄 Starting background cache sync...');
        
        // Dispatch start event for UI
        window.dispatchEvent(new Event('offlinecache:start'));
        
        // Run all caching tasks in parallel with some spacing to avoid rate limits
        const tasks = [
            cacheDashboard(),
            cacheHabits(),
            cacheTodos().then(() => new Promise(r => setTimeout(r, 200))).then(() => cacheInsights()),
            cacheJournal(),
            cacheMedia().then(() => new Promise(r => setTimeout(r, 200))).then(() => cacheBookmarks()),
            cacheWritings(),
            cacheReadingList(),
            cacheWatchlist(),
            cacheYearlyReview(),
            cacheDelegation()
        ];
        
        await Promise.allSettled(tasks);
        console.log('[OfflineCache] ✅ Cache sync complete!');
        
        // Dispatch complete event for UI
        window.dispatchEvent(new Event('offlinecache:complete'));
    },

    // Get cached data with TTL validation
    getCached(section) {
        const config = CACHE_CONFIG[section];
        if (!config) return null;
        if (!isCacheValid(config.key)) return null;
        return getCachedData(config.key);
    },

    // Invalidate specific cache
    invalidate(section) {
        const config = CACHE_CONFIG[section];
        if (config) {
            localStorage.removeItem(config.key);
            console.log(`[OfflineCache] Invalidated ${section} cache`);
        }
    },

    // Clear all caches
    clearAll() {
        Object.values(CACHE_CONFIG).forEach(config => {
            localStorage.removeItem(config.key);
        });
        console.log('[OfflineCache] Cleared all caches');
    },

    // Initialize online/offline monitoring
    init() {
        const handleOnline = () => {
            console.log('[OfflineCache] 🌐 App is online - starting cache sync');
            this.triggerSync();
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }
};

export default OfflineCache;
