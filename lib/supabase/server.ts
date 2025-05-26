import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// Define a type for backward compatibility
// Will be removed when we fully migrate to async cookies API
type UnsafeUnwrappedCookies = {
  get: (name: string) => { name: string; value: string } | undefined
  getAll: () => { name: string; value: string }[]
  set: (name: string, value: string, options?: any) => void
  delete: (name: string) => boolean
  has: (name: string) => boolean
  clear: () => void
  toString: () => string
}

// This function creates a Supabase client for use in Next.js server components (app directory only)
export async function createClient() {
  // Get the cookies instance once
  const cookieStore = await cookies()
  
  // Using the recommended pattern from Supabase docs for Next.js App Router
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          try {
            const cookie = cookieStore.get(name)
            return cookie?.value
          } catch (error) {
            console.error(`Error getting cookie "${name}":`, error)
            return undefined
          }
        },
        set(name, value, options) {
          try {
            // Only set cookies in a Server Action or Route Handler
            if (typeof cookieStore.set !== 'function') {
              console.warn(`Cookie "${name}" not set: can only be modified in a Server Action or Route Handler`)
              return
            }
            
            cookieStore.set(name, value, {
              ...options,
              path: '/',
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              maxAge: 60 * 60 * 24 * 30 // 30 days for longer persistence
            })
          } catch (error) {
            console.error(`Error setting cookie "${name}":`, error)
          }
        },
        remove(name, options) {
          try {
            // Only remove cookies in a Server Action or Route Handler
            if (typeof cookieStore.set !== 'function') {
              console.warn(`Cookie "${name}" not removed: can only be modified in a Server Action or Route Handler`)
              return
            }
            
            // Use delete method if available, otherwise set with expired date
            if (typeof cookieStore.delete === 'function') {
              cookieStore.delete(name)
            } else {
            cookieStore.set(name, '', { 
              ...options, 
              path: '/',
              maxAge: 0 
            })
            }
          } catch (error) {
            console.error(`Error removing cookie "${name}":`, error)
          }
        },
      },
      auth: {
        persistSession: true,
        storageKey: 'sb-auth-token',
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce'
      }
    }
  )
}

// This function creates a Supabase client with admin privileges using the service role key
export async function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable")
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")
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
  )
} 