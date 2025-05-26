"use server"

import { createAdminClient } from "@/lib/supabase/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Admin function to get all users for messaging
 * This bypasses RLS policies using the service role key
 */
export async function adminGetMessagingUsers() {
  try {
    // First verify the user is logged in and is an admin
    const regularClient = await createClient()
    const { data: { session } } = await regularClient.auth.getSession()
    
    if (!session || !session.user) {
      return { success: false, message: "يجب تسجيل الدخول أولاً" }
    }
    
    // Verify admin role - this is just a basic check
    const { data: userData, error: userError } = await regularClient
      .from("users")
      .select("role_id")
      .eq("id", session.user.id)
      .single()
      
    // Only continue if user is admin (role_id 4) or is a teacher (role_id 3)
    // Adjust permissions based on your app's requirements
    if (userError || !userData || (userData.role_id !== 4 && userData.role_id !== 3)) {
      console.log("Using regular client for non-admin user")
      // Fallback to regular client for non-admin users
      return getMessagingUsersRegular(session.user.id)
    }
    
    // Use admin client for privileged operations
    console.log("Using admin client for user with role:", userData.role_id)
    const adminClient = await createAdminClient()
    
    // Get all users except current user, ordered by role
    const { data, error } = await adminClient
      .from("users")
      .select("id, full_name, user_code, role_id, roles(name)")
      .neq("id", session.user.id)
      .order("role_id")
      .order("full_name")
    
    if (error) {
      console.error("Admin client error:", error)
      // Fallback to regular client if admin client fails
      return getMessagingUsersRegular(session.user.id)
    }
    
    return { success: true, data }
  } catch (error: any) {
    console.error("Error in adminGetMessagingUsers:", error)
    return {
      success: false,
      message: error.message || "حدث خطأ أثناء جلب المستخدمين"
    }
  }
}

/**
 * Regular function to get messaging users
 * This uses the normal client without admin privileges
 */
async function getMessagingUsersRegular(userId: string) {
  try {
    const supabase = await createClient()
    
    // Get all users except current user, ordered by role
    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, user_code, role_id, roles(name)")
      .neq("id", userId)
      .order("role_id")
      .order("full_name")
    
    if (error) {
      throw error
    }
    
    return { success: true, data }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "حدث خطأ أثناء جلب المستخدمين"
    }
  }
} 