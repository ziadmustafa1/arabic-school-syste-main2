"use server"

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

// Get the current user with additional user data from database
export async function getCurrentUser() {
  try {
    const supabase = await createClient()
    
    // Get the user's auth data
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error("Auth error or no user:", authError)
      return null
    }
    
    // Get the user's additional data from the users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single()
    
    if (userError) {
      console.error("Error fetching user data:", userError)
      return null
    }
    
    return userData
  } catch (error) {
    console.error("Error in getCurrentUser:", error)
    return null
  }
} 