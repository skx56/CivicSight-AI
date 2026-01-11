
import { createClient } from '@supabase/supabase-js';

// NOTE: These should be in .env but hardcoding placeholders for now or using process.env
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function getStorageUrl(path: string) {
    if (!path) return '';
    return `${supabaseUrl}/storage/v1/object/public/reports/${path}`;
}
