import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Check if we're running on the client side
const isClient = typeof window !== 'undefined';

// This is a version of createClient compatible with the pages directory
// Use this instead of createClient from server.ts when working with pages/* files
export function createLegacyClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// This function creates a Supabase client with admin privileges using the service role key
// Same implementation as in server.ts but duplicated for compatibility
export function createAdminClient() {
  // If running on client side, return a regular client with anon key
  // This is a safe fallback that prevents client-side errors
  if (isClient) {
    console.warn("Admin client should not be used on the client side - using anonymous client instead");
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  
  // Server-side code
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
} 