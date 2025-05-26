"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

/**
 * Get dashboard data safely for client components
 * This bypasses RLS policies using admin client
 */
export async function getDashboardData() {
  try {
    // Make sure we have cookies
    const cookieStore = cookies()
    if (!cookieStore) {
      return { 
        success: false, 
        error: "No cookie access",
        message: "خطأ في الوصول إلى ملفات تعريف الارتباط" 
      }
    }
    
    // Create clients with error handling
    let supabase, adminClient;
    try {
      supabase = await createClient()
      adminClient = await createAdminClient()
    } catch (clientError) {
      console.error("Failed to create Supabase clients:", clientError)
      return { 
        success: false, 
        error: "Client creation error",
        message: "خطأ في إنشاء عملاء Supabase" 
      }
    }
    
    // Validate clients
    if (!supabase || !adminClient) {
      console.error("Invalid Supabase clients")
      return { 
        success: false, 
        error: "Invalid clients",
        message: "عملاء Supabase غير صالحين" 
      }
    }
    
    // Get current user
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData?.user?.id) {
      console.error("Auth error in getDashboardData:", authError)
      return { 
        success: false, 
        error: "Authentication error",
        message: "يجب تسجيل الدخول أولاً" 
      }
    }
    
    // Get user data safely using admin client
    const { data: userData, error: userError } = await adminClient
      .from("users")
      .select("*")
      .eq("id", authData.user.id)
      .single()
    
    if (userError) {
      console.error("User data error in getDashboardData:", userError.message, userError.code)
      return { 
        success: false, 
        error: userError.message,
        message: "خطأ في الحصول على بيانات المستخدم" 
      }
    }
    
    if (!userData) {
      console.error("No user data found for ID:", authData.user.id)
      return { 
        success: false, 
        error: "User not found",
        message: "لم يتم العثور على بيانات المستخدم" 
      }
    }
    
    // Get notifications count with error handling
    let notificationsCount = 0;
    try {
      const { count, error: notifError } = await adminClient
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", authData.user.id)
        .eq("is_read", false)
        
      if (!notifError) {
        notificationsCount = count || 0;
      }
    } catch (notifError) {
      console.error("Error fetching notifications:", notifError);
    }
    
    // Get messages count with error handling
    let messagesCount = 0;
    try {
      const { count, error: msgError } = await adminClient
        .from("user_messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", authData.user.id)
        .eq("is_read", false)
        
      if (!msgError) {
        messagesCount = count || 0;
      }
    } catch (msgError) {
      console.error("Error fetching messages:", msgError);
    }
    
    // Return the populated data
    return {
      success: true,
      data: {
        user: userData,
        notifications: {
          count: notificationsCount
        },
        messages: {
          count: messagesCount
        }
      }
    }
  } catch (error: any) {
    console.error("Unexpected error in getDashboardData:", error)
    return {
      success: false,
      error: error.message,
      message: "حدث خطأ غير متوقع أثناء جلب بيانات لوحة التحكم"
    }
  }
} 