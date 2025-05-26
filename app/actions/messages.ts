"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * Send a message to another user
 */
export async function sendMessage(formData: FormData) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { session },
    } = await supabase.auth.getSession()
    
    if (!session) {
      return { success: false, message: "يجب تسجيل الدخول أولاً" }
    }

    const recipientId = formData.get("recipientId") as string
    const content = formData.get("content") as string

    if (!recipientId || !content) {
      return { success: false, message: "جميع الحقول مطلوبة" }
    }

    console.log(`Sending message from ${session.user.id} to ${recipientId}: ${content.substring(0, 30)}...`)

    // Check if recipient exists - using admin client to ensure we can see the user
    const adminClient = await createAdminClient()
    const { data: recipientData, error: recipientError } = await adminClient
      .from("users")
      .select("id, full_name")
      .eq("id", recipientId)
      .single()

    if (recipientError || !recipientData) {
      console.error("Recipient not found error:", recipientError || "No recipient data returned");
      return { success: false, message: "لم يتم العثور على المستلم" }
    }

    console.log(`Recipient confirmed: ${recipientData.full_name}`)

    // Create or find conversation
    let conversationId: number | null = null

    // Check if conversation already exists
    const { data: existingConversation, error: convQueryError } = await adminClient
      .from("conversations")
      .select("id")
      .or(
        `and(user1_id.eq.${session.user.id},user2_id.eq.${recipientId}),and(user1_id.eq.${recipientId},user2_id.eq.${session.user.id})`,
      )
      .maybeSingle()

    if (convQueryError) {
      console.error("Error checking existing conversation:", convQueryError)
      return { success: false, message: "خطأ في التحقق من المحادثة" }
    }

    if (existingConversation) {
      conversationId = existingConversation.id
      console.log(`Using existing conversation: ${conversationId}`)
    } else {
      // Create new conversation
      const { data: newConversation, error: conversationError } = await adminClient
        .from("conversations")
        .insert({
          user1_id: session.user.id,
          user2_id: recipientId,
          last_message_at: new Date().toISOString(),
        })
        .select()

      if (conversationError) {
        console.error("Error creating conversation:", conversationError)
        return { success: false, message: "خطأ في إنشاء المحادثة" }
      }

      if (!newConversation || newConversation.length === 0) {
        console.error("Failed to create conversation - no data returned")
        return { success: false, message: "فشل إنشاء المحادثة" }
      }

      conversationId = newConversation[0].id
      console.log(`Created new conversation: ${conversationId}`)
    }

    // Send message using admin client to ensure it goes through
    const { error: messageError } = await adminClient
      .from("user_messages")
      .insert({
      conversation_id: conversationId,
      sender_id: session.user.id,
      recipient_id: recipientId,
      content: content,
        is_read: false,
        created_at: new Date().toISOString(),
    })

    if (messageError) {
      console.error("Error sending message:", messageError)
      return { success: false, message: "خطأ في إرسال الرسالة" }
    }

    // Update conversation last_message_at
    const { error: updateError } = await adminClient
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversationId)

    if (updateError) {
      console.error("Error updating conversation timestamp:", updateError)
      // Non-critical error, continue
    }

    // Add notification for recipient
    try {
      await adminClient.from("notifications").insert({
      user_id: recipientId,
      title: "رسالة جديدة",
      content: "لديك رسالة جديدة",
        is_read: false,
        created_at: new Date().toISOString(),
      })
    } catch (notifyError) {
      console.error("Error creating notification:", notifyError)
      // Non-critical error, continue
    }

    // Invalidate the paths to ensure fresh data
    revalidatePath("/messages")
    revalidatePath(`/messages/${recipientId}`)

    console.log("Message sent successfully")
    return { success: true, message: "تم إرسال الرسالة بنجاح" }
  } catch (error: any) {
    console.error("Unexpected error in sendMessage:", error)
    return {
      success: false,
      message: error.message || "حدث خطأ أثناء إرسال الرسالة",
    }
  }
}

/**
 * Mark conversation messages as read
 */
export async function markConversationAsRead(formData: FormData) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { session },
    } = await supabase.auth.getSession()
    
    if (!session) {
      return { success: false, message: "يجب تسجيل الدخول أولاً" }
    }

    const conversationId = formData.get("conversationId") as string

    if (!conversationId) {
      return { success: false, message: "معرف المحادثة مطلوب" }
    }

    console.log(`Marking conversation ${conversationId} as read for user ${session.user.id}`)

    // Use admin client to ensure the operation works
    const adminClient = await createAdminClient()

    // Mark all messages as read
    const { error } = await adminClient
      .from("user_messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .eq("recipient_id", session.user.id)
      .eq("is_read", false)

    if (error) {
      console.error("Error marking messages as read:", error)
      return { success: false, message: "خطأ في تحديث حالة القراءة" }
    }

    // Revalidate the path to ensure fresh data
    revalidatePath("/messages")
    revalidatePath(`/messages/${conversationId}`)

    console.log("Conversation marked as read successfully")
    return { success: true, message: "تم تحديث المحادثة" }
  } catch (error: any) {
    console.error("Unexpected error in markConversationAsRead:", error)
    return {
      success: false,
      message: error.message || "حدث خطأ أثناء تحديث المحادثة",
    }
  }
}

/**
 * Delete a message
 */
export async function deleteMessage(formData: FormData) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { session },
    } = await supabase.auth.getSession()
    
    if (!session) {
      return { success: false, message: "يجب تسجيل الدخول أولاً" }
    }

    const messageId = formData.get("messageId") as string

    if (!messageId) {
      return { success: false, message: "معرف الرسالة مطلوب" }
    }

    console.log(`Deleting message ${messageId} for user ${session.user.id}`)

    // Use admin client to ensure operation works regardless of RLS
    const adminClient = await createAdminClient()

    // Check if user is the sender
    const { data: messageData, error: messageError } = await adminClient
      .from("user_messages")
      .select("sender_id, conversation_id")
      .eq("id", messageId)
      .single()

    if (messageError || !messageData) {
      console.error("Error verifying message ownership:", messageError)
      return { success: false, message: "لم يتم العثور على الرسالة" }
    }

    if (messageData.sender_id !== session.user.id) {
      console.warn(`User ${session.user.id} attempted to delete message ${messageId} owned by ${messageData.sender_id}`)
      return { success: false, message: "لا يمكنك حذف رسائل الآخرين" }
    }

    // Delete message
    const { error } = await adminClient
      .from("user_messages")
      .delete()
      .eq("id", messageId)

    if (error) {
      console.error("Error deleting message:", error)
      return { success: false, message: "خطأ في حذف الرسالة" }
    }

    // Revalidate the paths to ensure fresh data
    revalidatePath("/messages")
    if (messageData.conversation_id) {
      revalidatePath(`/messages/${messageData.conversation_id}`)
    }

    console.log("Message deleted successfully")
    return { success: true, message: "تم حذف الرسالة بنجاح" }
  } catch (error: any) {
    console.error("Unexpected error in deleteMessage:", error)
    return {
      success: false,
      message: error.message || "حدث خطأ أثناء حذف الرسالة",
    }
  }
}

/**
 * Get users for messaging
 */
export async function getMessagingUsers() {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { session },
    } = await supabase.auth.getSession()
    
    if (!session) {
      return { success: false, message: "يجب تسجيل الدخول أولاً", data: [] }
    }

    // Use admin client to get all users, bypassing RLS
    const adminClient = await createAdminClient()

    // Get all users except current user, ordered by role
    const { data, error } = await adminClient
      .from("users")
      .select("id, full_name, user_code, role_id, roles(name)")
      .neq("id", session.user.id)
      .order("role_id")
      .order("full_name")

    if (error) {
      console.error("Error fetching messaging users:", error)
      return { success: false, message: "خطأ في جلب المستخدمين", data: [] }
    }

    console.log(`Retrieved ${data?.length || 0} messaging users`)
    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error("Unexpected error in getMessagingUsers:", error)
    return {
      success: false,
      message: error.message || "حدث خطأ أثناء جلب المستخدمين",
      data: []
    }
  }
}

/**
 * Get unread message count for current user
 */
export async function getUnreadMessageCount() {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { session },
    } = await supabase.auth.getSession()
    
    if (!session) {
      return { success: false, message: "يجب تسجيل الدخول أولاً", count: 0 }
    }

    // Use admin client to ensure we get accurate counts
    const adminClient = await createAdminClient()

    // Get count of unread messages
    const { count, error } = await adminClient
      .from("user_messages")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", session.user.id)
      .eq("is_read", false)

    if (error) {
      console.error("Error counting unread messages:", error)
      return { success: false, message: "خطأ في جلب عدد الرسائل", count: 0 }
    }

    return { success: true, count: count || 0 }
  } catch (error: any) {
    console.error("Unexpected error in getUnreadMessageCount:", error)
    return {
      success: false,
      message: error.message || "حدث خطأ أثناء جلب عدد الرسائل",
      count: 0
    }
  }
}

/**
 * Get all conversations for the current user
 */
export async function getUserConversations() {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { session },
    } = await supabase.auth.getSession()
    
    if (!session) {
      return { success: false, message: "يجب تسجيل الدخول أولاً", data: [] }
    }

    // Use admin client to ensure we can access all data
    const adminClient = await createAdminClient()

    // Get all conversations for current user with basic info
    const { data: conversationsData, error: conversationsError } = await adminClient
      .from("conversations")
      .select(`
        id, 
        user1_id, 
        user2_id,
        last_message_at
      `)
      .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
      .order("last_message_at", { ascending: false })

    if (conversationsError) {
      console.error("Error fetching conversations:", conversationsError)
      return { success: false, message: "خطأ في جلب المحادثات", data: [] }
    }

    // Transform conversations data to include other user details
    const transformedConversations = []

    for (const conversation of conversationsData || []) {
      // Determine the other user ID
      const otherUserId = conversation.user1_id === session.user.id 
        ? conversation.user2_id 
        : conversation.user1_id

      try {
        // Get other user details
        const { data: otherUserData, error: userError } = await adminClient
          .from("users")
          .select("id, full_name, user_code, role_id, roles(name)")
          .eq("id", otherUserId)
          .single()

        // Get unread count for this conversation
        const { count: unreadCount, error: countError } = await adminClient
          .from("user_messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conversation.id)
          .eq("recipient_id", session.user.id)
          .eq("is_read", false)

        if (userError) {
          console.error(`Error fetching user ${otherUserId}:`, userError)
          
          // Use fallback data for the user
          transformedConversations.push({
            id: conversation.id,
            last_message_at: conversation.last_message_at,
            other_user: {
              id: otherUserId,
              full_name: "مستخدم غير معروف",
              user_code: "غير متوفر",
              role_id: 0,
              roles: { name: "غير محدد" }
            },
            unread_count: unreadCount || 0
          })
        } else if (otherUserData) {
          // Process role data safely
          let roleName = "غير محدد"
          
          if (otherUserData.roles) {
            if (Array.isArray(otherUserData.roles) && otherUserData.roles.length > 0) {
              const roleObj = otherUserData.roles[0] as { name?: string }
              roleName = roleObj.name || "غير محدد"
            } else if (typeof otherUserData.roles === 'object' && otherUserData.roles !== null) {
              const roleObj = otherUserData.roles as { name?: string }
              roleName = roleObj.name || "غير محدد"
            }
          }
          
          transformedConversations.push({
            id: conversation.id,
            last_message_at: conversation.last_message_at,
            other_user: {
              id: otherUserData.id,
              full_name: otherUserData.full_name || "مستخدم غير معروف",
              user_code: otherUserData.user_code || "غير متوفر",
              role_id: otherUserData.role_id || 0,
              roles: { name: roleName }
            },
            unread_count: unreadCount || 0
          })
        }
      } catch (error) {
        console.error(`Error processing conversation ${conversation.id}:`, error)
        // Skip this conversation if there's an error
      }
    }

    console.log(`Retrieved ${transformedConversations.length} conversations for user ${session.user.id}`)
    return { success: true, data: transformedConversations }
  } catch (error: any) {
    console.error("Unexpected error in getUserConversations:", error)
    return {
      success: false,
      message: error.message || "حدث خطأ أثناء جلب المحادثات",
      data: []
    }
  }
}

/**
 * Get messages for a conversation with another user
 */
export async function getConversationMessages(userId: string) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { session },
    } = await supabase.auth.getSession()
    
    if (!session) {
      return { success: false, message: "يجب تسجيل الدخول أولاً", data: [], otherUser: null }
    }

    // Use admin client to ensure we can access all data
    const adminClient = await createAdminClient()

    // Get the other user's details
    const { data: otherUser, error: userError } = await adminClient
      .from("users")
      .select("id, full_name, user_code, role_id, roles(name)")
      .eq("id", userId)
      .single()

    if (userError || !otherUser) {
      console.error("Error fetching other user:", userError)
      return { success: false, message: "لم يتم العثور على المستخدم", data: [], otherUser: null }
    }

    // Process role data safely
    let roleName = "غير محدد"
    
    if (otherUser.roles) {
      if (Array.isArray(otherUser.roles) && otherUser.roles.length > 0) {
        const roleObj = otherUser.roles[0] as { name?: string }
        roleName = roleObj.name || "غير محدد"
      } else if (typeof otherUser.roles === 'object' && otherUser.roles !== null) {
        const roleObj = otherUser.roles as { name?: string }
        roleName = roleObj.name || "غير محدد"
      }
    }

    const processedOtherUser = {
      id: otherUser.id,
      full_name: otherUser.full_name || "مستخدم غير معروف",
      user_code: otherUser.user_code || "غير متوفر",
      role_id: otherUser.role_id || 0,
      roles: { name: roleName }
    }

    // Find or create conversation
    let conversationId = null

    // Check if conversation already exists
    const { data: existingConversation, error: convError } = await adminClient
      .from("conversations")
      .select("id")
      .or(
        `and(user1_id.eq.${session.user.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${session.user.id})`,
      )
      .maybeSingle()

    if (convError) {
      console.error("Error checking conversation:", convError)
      return { 
        success: false, 
        message: "خطأ في البحث عن المحادثة", 
        data: [], 
        otherUser: processedOtherUser 
      }
    }

    if (existingConversation) {
      conversationId = existingConversation.id
    } else {
      // Create new conversation
      const { data: newConversation, error: createError } = await adminClient
        .from("conversations")
        .insert({
          user1_id: session.user.id,
          user2_id: userId,
          last_message_at: new Date().toISOString(),
        })
        .select()

      if (createError) {
        console.error("Error creating conversation:", createError)
        return { 
          success: false, 
          message: "خطأ في إنشاء المحادثة", 
          data: [], 
          otherUser: processedOtherUser 
        }
      }

      conversationId = newConversation[0].id
    }

    // Get messages
    const { data: messages, error: messagesError } = await adminClient
      .from("user_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (messagesError) {
      console.error("Error fetching messages:", messagesError)
      return { 
        success: false, 
        message: "خطأ في جلب الرسائل", 
        data: [], 
        otherUser: processedOtherUser 
      }
    }

    // Mark messages as read
    if (messages && messages.length > 0) {
      const formData = new FormData()
      formData.append("conversationId", conversationId.toString())
      await markConversationAsRead(formData)
    }

    console.log(`Retrieved ${messages?.length || 0} messages for conversation with ${otherUser.full_name}`)
    return { 
      success: true, 
      data: messages || [], 
      otherUser: processedOtherUser,
      conversationId 
    }
  } catch (error: any) {
    console.error("Unexpected error in getConversationMessages:", error)
    return {
      success: false,
      message: error.message || "حدث خطأ أثناء جلب الرسائل",
      data: [],
      otherUser: null
    }
  }
}
