/**
 * Script to set up the media bucket in Supabase
 * Run this once to create the bucket with public access
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Use service key for admin operations

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY in environment');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupMediaBucket() {
    try {
        console.log('🔍 Checking for media bucket...');

        // Try to list buckets
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        
        if (listError) {
            console.error('❌ Error listing buckets:', listError);
            return;
        }

        const mediaExists = buckets?.some(b => b.name === 'media');
        
        if (mediaExists) {
            console.log('✅ Media bucket already exists');
        } else {
            console.log('📦 Creating media bucket...');
            const { data, error } = await supabase.storage.createBucket('media', {
                public: true, // Make bucket public
                fileSizeLimit: 52428800 // 50MB limit
            });
            
            if (error) {
                console.error('❌ Error creating bucket:', error);
                return;
            }
            console.log('✅ Media bucket created successfully');
        }

        // Verify public access is enabled
        const { data: bucket, error: getError } = await supabase.storage.getBucket('media');
        if (getError) {
            console.error('❌ Error getting bucket info:', getError);
            return;
        }

        if (bucket?.public) {
            console.log('✅ Media bucket is public');
        } else {
            console.log('🔒 Media bucket is private. Updating to public...');
            const { error: updateError } = await supabase.storage.updateBucket('media', {
                public: true
            });
            
            if (updateError) {
                console.error('❌ Error updating bucket:', updateError);
                return;
            }
            console.log('✅ Media bucket updated to public');
        }

        console.log('\n✨ Media bucket setup complete!');
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

setupMediaBucket();
