"use client"

import { createClient } from "@/lib/supabase/client"
import type { DashboardResponse, DashboardData } from "./client-auth"

/**
 * Client-side implementation to get dashboard data
 */
export async function getClientDashboardData(): Promise<DashboardResponse> {
  try {
    const supabase = createClient()
    
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return { 
        success: false, 
        error: "No active session",
        message: "يجب تسجيل الدخول أولاً" 
      }
    }
    
    // Get user data
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user.id)
      .single()
    
    if (userError || !userData) {
      console.error("Error fetching user data:", userError)
      return { 
        success: false, 
        error: userError?.message || "User data not found",
        message: "خطأ في الحصول على بيانات المستخدم" 
      }
    }
    
    // Get notifications count
    const { count: notificationsCount, error: notifError } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .eq("is_read", false)
    
    // Get messages count
    const { count: messagesCount, error: msgError } = await supabase
      .from("user_messages")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", session.user.id)
      .eq("is_read", false)
    
    return {
      success: true,
      data: {
        user: userData,
        notifications: {
          count: notificationsCount || 0,
          error: notifError?.message
        },
        messages: {
          count: messagesCount || 0,
          error: msgError?.message
        }
      }
    }
  } catch (error: any) {
    console.error("Client-side dashboard data error:", error)
    return {
      success: false,
      error: error.message,
      message: "حدث خطأ غير متوقع أثناء جلب بيانات لوحة التحكم"
    }
  }
} 