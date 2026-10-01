import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);
async function run() {
  const { data, error } = await supabase.from('vault_collections').select('*').eq('name', 'Trash');
  console.log('Trash collections:');
  console.log(JSON.stringify(data, null, 2));
  
  const { data: data2, error: error2 } = await supabase.from('vault_collections').select('*').eq('id', '67539ee2-a1b0-405d-bbc1-c33dcbd198e6');
  console.log('Collection 67539ee2:');
  console.log(JSON.stringify(data2, null, 2));
}
run();
