import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function fixHiddenCollections() {
    console.log('Fetching all collections using Service Role Key...');
    const { data: cols, error } = await supabase.from('vault_collections').select('*');
    if (error) {
        console.error('Error fetching collections:', error);
        return;
    }

    let updated = 0;
    
    // We need to recursively inherit is_hidden and is_secret from parents
    const colsById = new Map();
    for (const c of cols) colsById.set(c.id, c);

    for (const c of cols) {
        if (!c.parent_id) continue;
        
        let parent = colsById.get(c.parent_id);
        let root = parent;
        while (root && root.parent_id) {
            root = colsById.get(root.parent_id);
        }

        if (root && (root.is_hidden !== c.is_hidden || root.is_secret !== c.is_secret)) {
            console.log(`Fixing permissions for subfolder: ${c.name} (inheriting from ${root.name})`);
            const { error: updateErr } = await supabase
                .from('vault_collections')
                .update({ is_hidden: root.is_hidden, is_secret: root.is_secret })
                .eq('id', c.id);
                
            if (updateErr) {
                console.error(`Failed to update ${c.name}:`, updateErr);
            } else {
                updated++;
            }
        }
    }

    console.log(`Fixed permissions on ${updated} subfolders!`);
}

fixHiddenCollections();
