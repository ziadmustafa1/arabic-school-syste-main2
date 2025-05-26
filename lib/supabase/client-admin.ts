import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Create a client-side admin client (uses service role key)
// WARNING: This should only be used in admin-protected routes
export function createClientAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
  
  console.log("Creating client admin client with credentials:", { 
    supabaseUrl: supabaseUrl ? "Available" : "Missing",
    supabaseServiceKey: supabaseServiceKey ? "Available" : "Missing"
  })
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Supabase credentials missing:", { 
      supabaseUrl: !!supabaseUrl, 
      supabaseServiceKey: !!supabaseServiceKey 
    })
    throw new Error("Supabase service role key is required")
  }
  
  // Create direct admin client for client-side use only
  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
} 