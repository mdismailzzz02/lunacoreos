import { createClient } from '@supabase/supabase-js';

// The LifeOS dashboard runs on a COMPLETELY separate Supabase instance from the main LunaCore app.
// We use these environment variables to keep the databases strictly isolated.
// If the env variables aren't set yet, we fall back to the known LifeOS credentials.
const supabaseUrl = import.meta.env.VITE_LIFEOS_SUPABASE_URL || 'https://rpxhmlzrcklnkxhjsucc.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_LIFEOS_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJweGhtbHpyY2tsbmt4aGpzdWNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjc2MTMsImV4cCI6MjA5NjYwMzYxM30.tifrrM9x5j73d_pt4n6zHZNFPhncIYQwzQLI11u7OEk';

export const lifeosSupabase = createClient(supabaseUrl, supabaseAnonKey);
