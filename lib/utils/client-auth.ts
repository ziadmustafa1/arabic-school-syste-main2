"use client"

import { createClient } from "@/lib/supabase/client"
import type { UserWithRole } from "./auth-compat"

/**
 * Client-side only implementation to get the current user
 * Does not use server actions at all
 */
export async function getClientUser(): Promise<UserWithRole | null> {
  try {
    const supabase = createClient()
    
    // Try to get session, with better error handling
    let session;
    try {
      const { data } = await supabase.auth.getSession()
      session = data.session
    } catch (sessionError) {
      console.error("Error getting session:", sessionError)
      // Try to refresh the session if possible
      try {
        const { data } = await supabase.auth.refreshSession()
        session = data.session
      } catch (refreshError) {
        console.error("Failed to refresh session:", refreshError)
        return null
      }
    }
    
    if (!session) {
      return null
    }
    
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user.id)
      .single()
    
    if (error || !user) {
      console.error("Error fetching user client-side:", error)
      return null
    }
    
    return user as UserWithRole
  } catch (error) {
    console.error("Client-side auth error:", error)
    return null
  }
}

// Define the dashboard data interface
export interface DashboardData {
  user: {
    id: string;
    email: string | null;
    full_name: string;
    role_id: number;
    user_code?: string;
    created_at: string | null;
    updated_at: string | null;
  };
  notifications: {
    count: number;
    error?: string;
  };
  messages: {
    count: number;
    error?: string;
  };
}

// Define the response interface
export interface DashboardResponse {
  success: boolean;
  data?: DashboardData;
  error?: string;
  message?: string;
}

/**
 * Get user data for dashboard display
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