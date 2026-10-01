import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
    console.log("Fetching collections...");
    const { data: cols, error } = await supabase.from('vault_collections').select('*').like('key_prefix', '%Android/%');
    if (error) return console.error(error);
    
    console.log(cols.map(c => ({name: c.name, parent_id: c.parent_id, key: c.key_prefix})));
    return;
    cols.sort((a, b) => a.key_prefix.length - b.key_prefix.length);
    
    for (let c of cols) {
        if (c.parent_id) continue;
        
        // Find the best parent: the collection whose key_prefix is a prefix of this one, 
        // and is the longest possible match (deepest parent)
        let bestParent = null;
        for (let p of cols) {
            if (p.id === c.id) continue;
            if (c.key_prefix.startsWith(p.key_prefix)) {
                if (!bestParent || p.key_prefix.length > bestParent.key_prefix.length) {
                    bestParent = p;
                }
            }
        }
        
        if (bestParent) {
            console.log(`Linking [${c.name}] -> Parent: [${bestParent.name}]`);
            const { error: upErr } = await supabase.from('vault_collections').update({ parent_id: bestParent.id }).eq('id', c.id);
            if (upErr) console.error("Error updating:", upErr.message);
            else updates++;
        }
    }
    console.log(`Done! Linked ${updates} collections.`);
}

fix();
