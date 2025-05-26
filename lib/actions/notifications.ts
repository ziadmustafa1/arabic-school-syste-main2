"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { ApiResponse } from "@/lib/types/errors"

// Interface for notification type based on database schema
export interface Notification {
  id: number
  user_id: string
  title: string
  content: string
  message?: string
  is_read: boolean
  created_at: string
  type?: "info" | "warning" | "success" | "error"
}

// For type safety when handling database records
interface DatabaseNotification {
  id: number
  user_id: string
  title: string
  content: string
  is_read?: boolean | null
  read?: boolean | null
  message?: string
  created_at: string | null
  type?: string
}

/**
 * Get unread notifications count for a user
 */
export async function getUnreadNotificationsCount(userId: string) {
  try {
    if (!userId) {
      console.error("getUnreadNotificationsCount called with no userId")
      return { 
        success: false, 
        error: "User ID is required",
        message: "معرف المستخدم مطلوب" 
      }
    }
    
    // Use admin client to bypass RLS policies
    const adminClient = await createAdminClient()
    
    // Get count of unread notifications
    const { count, error } = await adminClient
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false)
    
    if (error) {
      console.error("Error fetching notifications count:", error.message)
      return { 
        success: false, 
        error: error.message,
        message: "خطأ في الحصول على عدد الإشعارات" 
      }
    }
    
    return {
      success: true,
      data: {
        count: count || 0,
        message: "تم جلب عدد الإشعارات بنجاح"
      }
    }
  } catch (error: any) {
    console.error("Unexpected error in getUnreadNotificationsCount:", error)
    return {
      success: false,
      error: error.message,
      message: "حدث خطأ غير متوقع أثناء جلب عدد الإشعارات"
    }
  }
}

// Get all notifications for current user
export async function getUserNotifications(): Promise<ApiResponse<Notification[]>> {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return { 
        success: false, 
        error: "User not authenticated", 
        data: [] 
      }
    }

    // Use admin client to bypass RLS
    const adminClient = await createAdminClient()
    
    const { data, error } = await adminClient
      .from("notifications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    // Standardize field name if needed and map to our interface
    const notifications = (data || []).map((note: DatabaseNotification) => {
      // Handle potential schema differences (some DBs use content, others use message)
      const messageContent = note.message || note.content;
      
      // Ensure is_read field is correct regardless of schema differences
      const isRead = note.is_read !== undefined && note.is_read !== null 
        ? note.is_read 
        : (note.read !== undefined && note.read !== null ? note.read : false);
      
      // Normalize notification type for consistent UI display  
      const rawType = note.type || "info";
      let notificationType = rawType as "info" | "warning" | "success" | "error";
      
      // Special handling for different notification categories to ensure consistent UI
      if (rawType.includes("card") || rawType.includes("badge") || 
          rawType.includes("point") || rawType.includes("reward")) {
        notificationType = "success";
      } else if (rawType.includes("warn")) {
        notificationType = "warning";
      } else if (rawType.includes("error")) {
        notificationType = "error";
      }
      
      return {
        id: note.id,
        user_id: note.user_id,
        title: note.title,
        content: note.content,
        message: messageContent,
        is_read: isRead,
        created_at: note.created_at || new Date().toISOString(),
        type: notificationType
      };
    });

    return {
      success: true,
      data: notifications
    }
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return {
      success: false,
      error: "Failed to fetch notifications",
      data: []
    }
  }
}

// Mark a notification as read
export async function markNotificationAsRead(id: number): Promise<ApiResponse<null>> {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return { 
        success: false, 
        error: "User not authenticated",
        data: null 
      }
    }

    // Use admin client to bypass RLS
    const adminClient = await createAdminClient()
    
    // Use a raw query approach with the admin client
    const { data, error } = await adminClient.from('notifications')
      .update({ is_read: true })
      .match({ id, user_id: session.user.id })
      .select('id') // Only select ID to avoid returning the full record

    if (error) throw error

    return {
      success: true,
      data: null
    }
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return {
      success: false,
      error: "Failed to mark notification as read",
      data: null
    }
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(): Promise<ApiResponse<null>> {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return { 
        success: false, 
        error: "User not authenticated",
        data: null 
      }
    }

    // Use admin client to bypass RLS
    const adminClient = await createAdminClient()
    
    let success = false;
    let error = null;
    
    // Approach 1: Try to use the mark_all_notifications_read function if it exists
    try {
      const { data, error: funcError } = await adminClient.rpc(
        'mark_all_notifications_read', 
        { user_id_param: session.user.id }
      );
      
      if (!funcError && data && data.success) {
        console.log("Successfully marked all notifications as read using database function");
        return { success: true, data: null }
      }
      
      error = funcError;
      if (funcError) {
        console.error("Error using mark_all_notifications_read function:", funcError);
      }
    } catch (e) {
      console.error("Exception calling mark_all_notifications_read function:", e);
      error = error || e;
    }
    
    // Approach 2: Direct update with explicit updated_at field
    if (!success) {
      try {
        const { error: updateError } = await adminClient
          .from('notifications')
          .update({ 
            is_read: true,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', session.user.id)
          .eq('is_read', false)
        
        if (!updateError) {
          success = true;
          console.log("Successfully marked all notifications as read using direct update");
          return { success: true, data: null }
        }
        
        error = updateError;
        console.error("Error in direct update approach:", updateError);
      } catch (e) {
        console.error("Exception in direct update approach:", e);
        error = error || e;
      }
    }
    
    // Approach 3: Try RPC as a fallback
    if (!success) {
      try {
        const { error: rpcError } = await adminClient.rpc('update_all_notifications_read', {
          user_id_param: session.user.id
        });
        
        if (!rpcError) {
          success = true;
          console.log("Successfully marked all notifications as read using RPC");
          return { success: true, data: null }
        }
        
        error = rpcError;
        console.error("Error in RPC approach:", rpcError);
      } catch (rpcExc) {
        console.error("Exception in RPC approach:", rpcExc);
        error = error || rpcExc;
      }
    }

    // Approach 4: Direct SQL as last resort
    if (!success) {
      try {
        await adminClient.rpc('exec_sql', {
          sql_query: `
            UPDATE notifications 
            SET is_read = true,
                updated_at = NOW()
            WHERE user_id = '${session.user.id}' 
            AND is_read = false
          `
        });
        success = true;
        console.log("Successfully marked all notifications as read using direct SQL");
        return { success: true, data: null }
      } catch (directError: any) {
        console.error("Error in direct SQL approach:", directError);
        error = error || directError;
      }
    }

    if (!success && error) {
      console.error("All approaches failed in markAllNotificationsAsRead");
      throw error;
    }

    return {
      success: success,
      data: null
    }
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return {
      success: false,
      error: "Failed to mark all notifications as read",
      data: null
    }
  }
}

// Delete a notification
export async function deleteNotification(id: number): Promise<ApiResponse<null>> {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return { 
        success: false, 
        error: "User not authenticated",
        data: null 
      }
    }

    // Use admin client to bypass RLS
    const adminClient = await createAdminClient()
    
    // Use standard delete method which doesn't trigger updated_at issues
    const { error } = await adminClient
      .from("notifications")
      .delete()
      .match({ id, user_id: session.user.id })

    if (error) throw error

    return {
      success: true,
      data: null
    }
  } catch (error) {
    console.error("Error deleting notification:", error)
    return {
      success: false,
      error: "Failed to delete notification",
      data: null
    }
  }
} 