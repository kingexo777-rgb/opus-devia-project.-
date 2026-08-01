import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

function isValidUrl(url: string): boolean {
  try {
    return new URL(url).protocol.startsWith('http');
  } catch {
    return false;
  }
}

function createSupabaseClient() {
  if (supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl)) {
    return createClient(supabaseUrl, supabaseAnonKey);
  }
  // Return a proxy that throws on any method call — prevents import-time crash
  // but lets the React tree render (router will handle auth state correctly)
  return new Proxy({} as ReturnType<typeof createClient>, {
    get(_, prop) {
      throw new Error(
        `Supabase client not initialized. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env. (Tried to access: ${String(prop)})`
      );
    },
  });
}

export const supabase = createSupabaseClient();
