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
        .select('*');
        
    console.log("Error:", error);
    console.log("Vault Collections Count:", cols?.length);
    console.log("First 5:", JSON.stringify(cols?.slice(0, 5).map(c => ({id: c.id, name: c.name, prefix: c.key_prefix})), null, 2));
}

run();
