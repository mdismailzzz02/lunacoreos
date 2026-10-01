import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    console.log("Fetching files...");
    const { data: files } = await supabase.from('vault_files').select('collection_id, size_bytes').like('r2_key', '%Photos from 2026%');
    console.log("Found files:", files.length);
}
run();
