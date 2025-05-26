import { createClient, createAdminClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { Database } from "@/lib/supabase/database.types"

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
 * Redirects to login page if not authenticated
 */
export async function getCurrentUser(): Promise<UserWithRole> {
  const supabase = await createClient()
  
  // Use getUser() instead of getSession() for better security
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  
  if (!authUser || authError) {
    redirect("/auth/login")
  }
  
  // Use admin client to bypass RLS policies
  const adminClient = await createAdminClient()
  
  const { data: user, error } = await adminClient
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single()
  
  if (error || !user) {
    console.error("Error fetching user:", error)
    
    // Check if user exists, create if missing
    if (error?.code === '42P17') { // Infinite recursion error
      // Already using authUser from getUser() above
      
      if (authUser) {
        // Create missing user record
        const { error: insertError } = await adminClient
          .from("users")
          .insert({
            id: authUser.id,
            email: authUser.email || '',
            full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
            role_id: 1, // Default to student
            user_code: `ST${Math.floor(100000 + Math.random() * 900000)}`,
          });
          
        if (!insertError) {
          // Retry fetching the user
          const { data: newUser, error: refetchError } = await adminClient
            .from("users")
            .select("*")
            .eq("id", authUser.id)
            .single();
            
          if (!refetchError && newUser) {
            return newUser as UserWithRole;
          }
        }
      }
    }
    
    redirect("/auth/login")
  }
  
  return user as UserWithRole
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
    return user.role_id === 4
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
    return user.role_id === 3
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

// Get user profile securely with admin client to bypass RLS
export async function getUserProfile(userId: string) {
  try {
    if (!userId) {
      throw new Error("User ID is required")
    }
    
    const adminClient = await createAdminClient()
    
    const { data, error } = await adminClient
      .from("users")
      .select(`
        *,
        roles(name, permissions)
      `)
      .eq("id", userId)
      .single()
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return null
  }
} 