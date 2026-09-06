import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { webcrypto } from 'crypto';
import fs from 'fs';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const SALT = 'lunacoreos-passwords-v1';
const PBKDF2_ITERATIONS = 200_000;

const strToBytes = (str) => new TextEncoder().encode(str);
const b64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function deriveKey(masterPassword) {
    const keyMaterial = await webcrypto.subtle.importKey(
        'raw',
        strToBytes(masterPassword),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    return await webcrypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: strToBytes(SALT),
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
    );
}

async function decryptPassword(enc_password, enc_iv, key) {
    const plainBuffer = await webcrypto.subtle.decrypt(
        { name: 'AES-GCM', iv: b64ToBytes(enc_iv) },
        key,
        b64ToBytes(enc_password)
    );
    return new TextDecoder().decode(plainBuffer);
}

async function run() {
    console.log('Fetching passwords using Service Role Key...');
    const { data: passwords, error } = await supabase.from('passwords').select('*');
    
    if (error) {
        console.error('Error fetching:', error.message);
        return;
    }

    console.log(`Found ${passwords.length} encrypted passwords. Attempting decryption...`);
    
    const key = await deriveKey('neworder');
    const recovered = [];

    for (const p of passwords) {
        try {
            const plain = await decryptPassword(p.enc_password, p.enc_iv, key);
            recovered.push({
                site_name: p.site_name,
                site_url: p.site_url,
                username: p.username,
                password: plain,
                notes: p.notes,
                category: p.category,
                strength: p.strength,
                created_at: p.created_at,
                updated_at: p.updated_at
            });
        } catch (e) {
            // Decryption failed (wrong master password for this row, or corrupted)
        }
    }

    const csvHeader = 'name,url,username,password,notes,category\n';
    const csvRows = recovered.map(p => {
        const escapeCsv = (str) => {
            if (str === null || str === undefined) return '';
            const s = String(str).replace(/"/g, '""');
            return /[",\n]/.test(s) ? `"${s}"` : s;
        };
        return [
            escapeCsv(p.site_name),
            escapeCsv(p.site_url),
            escapeCsv(p.username),
            escapeCsv(p.password),
            escapeCsv(p.notes),
            escapeCsv(p.category)
        ].join(',');
    });
    
    fs.writeFileSync('recovered_passwords.csv', csvHeader + csvRows.join('\n'), 'utf8');

    console.log(`Successfully recovered ${recovered.length} passwords and saved them to recovered_passwords.csv!`);
}

run();
