import { getVaultCollections, getVaultFiles, getLikedVaultFiles } from './api';

/**
 * Concurrency Limiter for parallel fetches
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function limitConcurrency(tasks, limit, onProgress) {
    const results = [];
    const executing = new Set();
    let completed = 0;

    for (const task of tasks) {
        const p = Promise.resolve().then(() => task());
        results.push(p);
        executing.add(p);

        const clean = () => {
            executing.delete(p);
            completed++;
            onProgress(completed, tasks.length, tasks.status); 
        };
        p.then(clean).catch(clean);

        if (executing.size >= limit) {
            await Promise.race(executing);
        }
    }
    return Promise.all(results);
}

/**
 * Preloader Service - Updated for Supabase R2
 */
export const Preloader = {
    async start(onProgress) {
        try {
            console.log('[Preloader] Starting R2 metadata sync...');
            
            // 1. Get collections
            const collections = await getVaultCollections();
            if (!collections || collections.length === 0) {
                console.warn('[Preloader] No collections found to sync.');
                onProgress(0, 0, 'No collections found'); 
                return;
            }

            // 2. Fetch the first page for every collection to cache metadata
            const tasks = collections.map(col => async () => {
                try {
                    const res = await getVaultFiles(col.id, 1, 50);
                    const contents = res.files || [];
                    // Cache in local storage for instant loading
                    localStorage.setItem(`luna_vault_cache_${col.id}`, JSON.stringify({
                        items: contents,
                        updatedAt: Date.now()
                    }));
                } catch (err) {
                    console.error(`[Preloader] Failed to pre-fetch collection ${col.name}:`, err);
                }
            });

            // 3. Fetch Liked Images
            tasks.push(async () => {
                try {
                    const likedItems = await getLikedVaultFiles();
                    localStorage.setItem('luna_vault_liked_cache', JSON.stringify({
                        items: likedItems,
                        updatedAt: Date.now()
                    }));
                } catch (err) {
                    console.error(`[Preloader] Failed to pre-fetch liked items:`, err);
                }
            });

            tasks.status = 'Vault Data';

            if (tasks.length === 0) {
                onProgress(0, 0, 'Nothing to sync');
            } else {
                await limitConcurrency(tasks, 3, onProgress);
            }

            console.log(`[Preloader] Sync Complete!`);
        } catch (e) {
            console.error('[Preloader] Engine Error:', e);
            onProgress(0, 0); // Reset UI on error
        }
    }
};
