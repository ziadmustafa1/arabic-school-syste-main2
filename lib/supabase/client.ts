import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/supabase/database.types"

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Enhanced cookie options to fix parsing and persistence errors
      cookies: {
        get(name: string) {
          // Safely get cookie value
          try {
            if (typeof document === 'undefined') {
              return undefined
            }
            
            const cookies = document.cookie.split(';')
            for (let i = 0; i < cookies.length; i++) {
              const cookie = cookies[i].trim()
              if (cookie.startsWith(name + '=')) {
                const value = cookie.substring(name.length + 1)
                try {
                  // Skip decoding for special formats to prevent parsing errors
                  if (value.startsWith('base64-') || value.startsWith('eyJ')) {
                    return value
                  }
                  return decodeURIComponent(value)
                } catch (e) {
                  console.warn('Error decoding cookie:', e)
                  return value // Return raw value if decoding fails
                }
              }
            }
            return undefined
          } catch (e) {
            console.warn('Error reading cookie:', e)
            return undefined
          }
        },
        set(name: string, value: string) {
          if (typeof document === 'undefined') {
            return
          }
          
          // Use safer cookie options with longer expiration (30 days)
          const secure = window.location.protocol === 'https:'
          
          // Don't encode values that are already in special formats
          const encodedValue = value.startsWith('base64-') || value.startsWith('eyJ') 
            ? value 
            : encodeURIComponent(value)
            
          document.cookie = `${name}=${encodedValue}; path=/; max-age=2592000; SameSite=Lax${secure ? '; Secure' : ''}`
        },
        remove(name: string) {
          if (typeof document === 'undefined') {
            return
          }
          
          // Ensure removal by setting multiple paths
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
          document.cookie = `${name}=; path=/auth; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
          document.cookie = `${name}=; path=${window.location.pathname}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
        }
      },
      auth: {
        persistSession: true,
        storageKey: 'sb-auth-token',
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    }
  )
}

// Note: Admin client can only be used server-side, so it's not available here
// Client components should use the normal client and let server actions handle admin operations
