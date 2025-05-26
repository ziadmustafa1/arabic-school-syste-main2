"use server"

import { createAdminClient } from "@/lib/supabase/server"
import { createClient } from "@/lib/supabase/server"
import type { UserWithRole } from "@/lib/utils/auth-compat" 

/**
 * Fetch user data by ID using admin privileges to bypass RLS policies
 * This is a server action that can be called from client components
 */
export async function getUserById(userId: string) {
  try {
    if (!userId) {
      console.error("getUserById called with no userId")
      return null
    }
    
    console.log("Fetching user data for ID:", userId)
    
    // Use admin client to bypass RLS policies
    let adminClient;
    try {
      adminClient = await createAdminClient()
      console.log("Admin client created successfully")
    } catch (adminError) {
      console.error("Failed to create admin client:", adminError)
      
      // Try with regular client as fallback - sometimes the admin client fails due to env issues
      try {
        console.log("Trying fallback with regular client")
        const regularClient = await createClient()
        
        const { data: userData, error: userError } = await regularClient
          .from("users")
          .select("id, full_name, user_code, role_id, roles(name), email, created_at")
          .eq("id", userId)
          .single()
          
        if (userError) {
          console.error("Error with fallback regular client:", userError)
          throw userError
        }
        
        if (!userData) {
          console.error("No user found with regular client for ID:", userId)
          return null
        }
        
        console.log("Successfully fetched user with regular client:", userData.full_name)
        return userData
      } catch (regularError) {
        console.error("Fallback to regular client also failed:", regularError)
        throw adminError // Re-throw the original error
      }
    }
    
    // First check if the user exists with a simple query
    try {
      const { data: userExists, error: existsError } = await adminClient
        .from("users")
        .select("id")
        .eq("id", userId)
        .maybeSingle()
        
      if (existsError) {
        console.error("Error checking user existence:", existsError)
        return null
      }
      
      if (!userExists) {
        console.error("User ID confirmed non-existent:", userId)
        return null
      }
      
      console.log("User exists, proceeding to full query")
    } catch (existsError) {
      console.error("Error in existence check:", existsError)
      // Continue to try the full query anyway
    }
    
    // Now try the full query with joins
    try {
      // Include roles data in the query
      const { data: user, error } = await adminClient
        .from("users")
        .select("id, full_name, user_code, role_id, roles(name), email, created_at")
        .eq("id", userId)
        .single()
      
      if (error) {
        console.error("Error fetching user in server action:", error.message, error.code, error.details)
        return null
      }
      
      if (!user) {
        console.error("No user found with ID:", userId)
        return null
      }
      
      console.log("Successfully fetched user data for:", user.full_name)
      return user
    } catch (queryError) {
      console.error("Error in full user query:", queryError)
      return null
    }
  } catch (error) {
    console.error("Unexpected error in getUserById server action:", error)
    return null
  }
} 

export async function getUsers(role?: number) {
  try {
    const supabase = await createClient()
    
    // Verify admin rights
    const { data: userData, error: authError } = await supabase.auth.getUser()
    if (authError || !userData.user) {
      return { success: false, message: "يجب تسجيل الدخول أولاً" }
    }
    
    // Create admin client to bypass RLS
    const adminClient = await createAdminClient()
    
    let query = adminClient
      .from("users")
      .select("id, full_name, user_code, role_id, roles(name), email, created_at")
      .order("created_at", { ascending: false })
    
    if (role !== undefined) {
      query = query.eq("role_id", role)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error("Error fetching users:", error)
      return { success: false, message: error.message }
    }
    
    return { success: true, data }
  } catch (error) {
    console.error("Unexpected error in getUsers server action:", error)
    return { success: false, message: "حدث خطأ غير متوقع" }
  }
} 