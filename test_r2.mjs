import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = '.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data: cols, error } = await supabase
        .from('vault_collections')
        .select('*')
        .ilike('key_prefix', '%documents-music-folders%');
        
    console.log("Vault Collections:", JSON.stringify(cols?.map(c => ({id: c.id, name: c.name, prefix: c.key_prefix, parent_id: c.parent_id})), null, 2));
}

run();
