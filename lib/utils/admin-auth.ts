"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

/**
 * Verifies that the current user has admin privileges
 * Will redirect to login or home page if user is not authenticated or not an admin
 * 
 * @returns The admin user data if successful
 * @throws Error if verification fails
 */
export async function verifyAdminAccess() {
  try {
    const supabase = await createClient()
    
    // Get authenticated user with server-side validation
    const { data: { user }, error: userAuthError } = await supabase.auth.getUser()
    
    if (userAuthError) {
      console.error("Auth error:", userAuthError)
      redirect("/auth/login")
    }
    
    if (!user) {
      console.warn("No authenticated user found")
      redirect("/auth/login")
    }
    
    // Get role from users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, role_id, full_name, email")
      .eq("id", user.id)
      .single()
    
    if (userError) {
      console.error("Error fetching user data:", userError)
      throw new Error("فشل في التحقق من بيانات المستخدم")
    }
    
    if (!userData) {
      console.error("User record not found in database")
      redirect("/auth/login")
    }
    
    // Check if role is admin (role_id = 4)
    if (userData.role_id !== 4) {
      console.warn(`User ${userData.id} attempted to access admin area with role ${userData.role_id}`)
      redirect("/")
    }
    
    return userData
  } catch (error: any) {
    console.error("Admin verification error:", error)
    throw error
  }
}

/**
 * Logs an admin action for auditing purposes
 * 
 * @param userId The ID of the admin performing the action
 * @param action The action being performed
 * @param details Additional details about the action
 */
export async function logAdminAction(userId: string, action: string, details?: any) {
  try {
    const supabase = await createClient()
    
    await supabase
      .from("admin_logs")
      .insert({
        admin_id: userId,
        action,
        details: details ? JSON.stringify(details) : null,
        ip_address: null, // Can't get IP address in server component
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error("Failed to log admin action:", error)
    // Don't throw error as this is not critical
  }
} 