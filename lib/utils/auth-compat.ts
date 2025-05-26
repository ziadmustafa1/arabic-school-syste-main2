"use client"

import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/database.types"
// We'll keep this import for compatibility, but won't use it for now
// import { getCurrentUserServer } from "@/lib/actions/auth"
import { getClientUser } from "./client-auth"

export type UserWithRole = {
  id: string
  email: string
  full_name: string
  role_id: number
  user_code?: string
  created_at: string
}

/**
 * Get the current authenticated user with their profile information from the database
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<UserWithRole | null> {
  try {
    // Use client-side implementation only - no server actions
    const user = await getClientUser()
    return user
  } catch (error) {
    // Better error handling with detailed logging
    console.error("Error fetching user:", error)
    
    // Try fallback method for specific cases like cookie errors
    try {
      // Try direct Supabase auth session check as fallback
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        return null
      }
      
      // Attempt to get user with minimal query
      const { data: userData } = await supabase
        .from("users")
        .select("id, email, full_name, role_id, user_code, created_at")
        .eq("id", session.user.id)
        .single()
      
      if (userData) {
        return userData as UserWithRole
      }
    } catch (fallbackError) {
      console.error("Fallback auth method also failed:", fallbackError)
    }
    
    return null
  }
}

/**
 * Get the role name for a given role ID
 */
export function getRoleName(roleId: number): string {
  const roles = {
    1: "طالب",
    2: "ولي أمر",
    3: "معلم",
    4: "مدير"
  }

  return roles[roleId as keyof typeof roles] || "غير معروف"
}

/**
 * Check if the current user has admin access
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    return user?.role_id === 4 || false
  } catch (error) {
    return false
  }
}

/**
 * Check if the current user is a teacher
 */
export async function isTeacher(): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    return user?.role_id === 3 || false
  } catch (error) {
    return false
  }
}

/**
 * Get the current user's dashboard URL based on their role
 */
export function getDashboardUrl(roleId: number): string {  
  const dashboardPaths = {
    1: "/student",
    2: "/parent",
    3: "/teacher",
    4: "/admin"
  }

  return dashboardPaths[roleId as keyof typeof dashboardPaths] || "/"
} 