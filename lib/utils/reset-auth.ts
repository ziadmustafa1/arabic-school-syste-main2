"use client"

import { createClient } from "@/lib/supabase/client"

/**
 * Utility function to reset the Supabase authentication state
 * This can help fix corrupted cookies or auth state
 */
export async function resetAuth() {
  // Get Supabase client
  const supabase = createClient()
  
  try {
    // Sign out to clear session
    await supabase.auth.signOut()
    
    // Clear all cookies
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';')
      
      // Known Supabase cookie prefixes/names
      const supabaseCookiePrefixes = ['sb-', 'supabase']
      
      // Remove all cookies with Supabase prefix
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim()
        const cookieName = cookie.split('=')[0]
        
        // Check if this is a Supabase cookie
        const isSupabaseCookie = supabaseCookiePrefixes.some(prefix => cookieName.startsWith(prefix))
        
        if (isSupabaseCookie) {
          // Delete from multiple paths to ensure complete cleanup
          const paths = ['/', '/auth', '/api', window.location.pathname]
          
          paths.forEach(path => {
            document.cookie = `${cookieName}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
          })
          
          console.log(`Cleared cookie: ${cookieName}`)
        }
      }
    }
    
    // Clear localStorage items related to auth
    if (typeof localStorage !== 'undefined') {
      const authKeys = ['supabase.auth.token', 'sb-auth-token']
      
      authKeys.forEach(key => {
        try {
          localStorage.removeItem(key)
        } catch (e) {
          console.warn(`Failed to remove localStorage item: ${key}`, e)
        }
      })
    }
    
    // Reload the page to ensure all state is cleared
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error resetting auth:', error)
    return { success: false, error }
  }
} 