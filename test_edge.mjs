import fs from 'fs';

const envPath = '.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const url = `${env.VITE_SUPABASE_URL}/functions/v1/r2-presign?op=list&prefix=documents-music-folders/ashtavakra-geeta/&page_size=5&delimiter=/`;

async function run() {
    console.log("Fetching:", url);
    const res = await fetch(url, {
        headers: {
            'apikey': env.VITE_SUPABASE_ANON_KEY
        }
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}

run();
