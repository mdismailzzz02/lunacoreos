import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envPath = '.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { error } = await supabase.from('finance').insert([{ id: 'TX-123' }]);
    console.log("Insert TX-123 error:", error);
}

run();
