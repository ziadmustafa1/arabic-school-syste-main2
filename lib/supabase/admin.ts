import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { Database } from "./database.types"

// Create a server-side admin client (uses service role key)
// This bypasses Row Level Security (RLS) policies
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Supabase admin credentials missing:", { 
      supabaseUrl: !!supabaseUrl, 
      supabaseServiceKey: !!supabaseServiceKey 
    })
    throw new Error("Supabase service role key is required for admin operations")
  }
  
  // Create admin client that bypasses RLS
  return createSupabaseClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
} 