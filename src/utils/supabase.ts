import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wwnliuxwvfeeubqczatx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseAnonKey) {
  console.warn('Warning: VITE_SUPABASE_ANON_KEY is not defined in the environment. Client-side authentication may not function correctly.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
