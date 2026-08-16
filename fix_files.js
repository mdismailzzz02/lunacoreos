import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envFile.split('\n')) {
    const parts = line.trim().split('=');
    if (parts.length >= 2) {
        env[parts[0]] = parts.slice(1).join('=');
    }
}

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl) throw new Error("No URL found in env: " + JSON.stringify(env));

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixFlattenedFiles() {
    console.log('Fetching collections...');
    const { data: collections, error: colErr } = await supabase.from('vault_collections').select('*');
    if (colErr) return console.error(colErr);

    console.log('Fetching files...');
    const { data: files, error: fileErr } = await supabase.from('vault_files').select('id, r2_key, collection_id');
    if (fileErr) return console.error(fileErr);

    console.log('--- Collections ---');
    collections.forEach(c => console.log(`[${c.id}] ${c.name}: ${c.key_prefix}`));

    console.log('--- First 10 Files ---');
    files.slice(0, 10).forEach(f => console.log(`[${f.collection_id}] ${f.r2_key}`));

    let moved = 0;

    for (const file of files) {
        // Find which collection prefix matches the file's r2_key best (longest prefix)
        let bestCol = null;
        let bestLen = -1;
        for (const col of collections) {
            if (file.r2_key.startsWith(col.key_prefix) && file.r2_key !== col.key_prefix) {
                // Check if it's a direct child (no extra slashes)
                const rest = file.r2_key.slice(col.key_prefix.length);
                if (!rest.includes('/')) {
                    if (col.key_prefix.length > bestLen) {
                        bestCol = col;
                        bestLen = col.key_prefix.length;
                    }
                }
            }
        }

        if (bestCol && bestCol.id !== file.collection_id) {
            console.log(`Moving ${file.r2_key} to ${bestCol.name}`);
            await supabase.from('vault_files').update({ collection_id: bestCol.id }).eq('id', file.id);
            moved++;
        }
    }

    console.log(`Fixed ${moved} files!`);
}

fixFlattenedFiles();
