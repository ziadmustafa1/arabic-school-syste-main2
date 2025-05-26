"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/utils/auth"

/**
 * Get all emblems
 */
export async function getAllEmblems() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from("emblems")
      .select("*")
      .order("created_at", { ascending: false })
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error: any) {
    console.error("Error fetching emblems:", error)
    return { 
      success: false, 
      message: error.message || "حدث خطأ أثناء جلب الشارات",
      data: []
    }
  }
}

/**
 * Get user's emblems
 */
export async function getUserEmblems(userId: string) {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from("user_emblems")
      .select(`
        emblem_id, 
        awarded_at, 
        awarded_by,
        emblems(*)
      `)
      .eq("user_id", userId)
      .order("awarded_at", { ascending: false })
    
    if (error) throw error
    
    // Format the response
    const formattedData = data.map(item => ({
      ...item.emblems,
      awarded_at: item.awarded_at,
      awarded_by: item.awarded_by,
      emblem_id: item.emblem_id
    }))
    
    return { 
      success: true, 
      data: formattedData
    }
  } catch (error: any) {
    console.error("Error fetching user emblems:", error)
    return { 
      success: false, 
      message: error.message || "حدث خطأ أثناء جلب شارات المستخدم",
      data: []
    }
  }
}

/**
 * Admin: Add a new emblem
 */
export async function addEmblem(
  name: string, 
  description: string | null, 
  imageUrl: string | null, 
  pointsValue: number
) {
  try {
    const adminClient = await createAdminClient()
    
    const { data, error } = await adminClient
      .from("emblems")
      .insert({
        name,
        description,
        image_url: imageUrl,
        points_value: pointsValue
      })
      .select()
      .single()
    
    if (error) {
      console.error("Error adding emblem:", error)
      return {
        success: false,
        error: error.message,
        message: "حدث خطأ أثناء إضافة الشارة"
      }
    }
    
    return {
      success: true,
      data,
      message: "تمت إضافة الشارة بنجاح"
    }
  } catch (error: any) {
    console.error("Unexpected error in addEmblem:", error)
    return {
      success: false,
      error: error.message,
      message: "حدث خطأ غير متوقع"
    }
  }
}

/**
 * Admin: Update an emblem
 */
export async function updateEmblem(
  emblemId: number,
  name: string,
  description: string | null,
  imageUrl: string | null,
  pointsValue: number
) {
  try {
    const adminClient = await createAdminClient()
    
    const { data, error } = await adminClient
      .from("emblems")
      .update({
        name,
        description,
        image_url: imageUrl,
        points_value: pointsValue
      })
      .eq("id", emblemId)
      .select()
      .single()
    
    if (error) {
      console.error("Error updating emblem:", error)
      return {
        success: false,
        error: error.message,
        message: "حدث خطأ أثناء تحديث الشارة"
      }
    }
    
    return {
      success: true,
      data,
      message: "تم تحديث الشارة بنجاح"
    }
  } catch (error: any) {
    console.error("Unexpected error in updateEmblem:", error)
    return {
      success: false,
      error: error.message,
      message: "حدث خطأ غير متوقع"
    }
  }
}

/**
 * Admin: Delete an emblem
 */
export async function deleteEmblem(emblemId: number) {
  try {
    const adminClient = await createAdminClient()
    
    // Check if any users have this emblem
    const { data: userEmblems, error: checkError } = await adminClient
      .from("user_emblems")
      .select("id")
      .eq("emblem_id", emblemId)
      .limit(1)
    
    if (checkError) throw checkError
    
    if (userEmblems && userEmblems.length > 0) {
      return { 
        success: false, 
        error: "هناك مستخدمون حاصلون على هذه الشارة. قم بإلغاء الشارة من المستخدمين أولاً."
      }
    }
    
    // Delete emblem
    const { error } = await adminClient
      .from("emblems")
      .delete()
      .eq("id", emblemId)
    
    if (error) throw error
    
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting emblem:", error)
    return { 
      success: false, 
      message: error.message || "حدث خطأ أثناء حذف الشارة"
    }
  }
}

/**
 * Admin: Award an emblem to a user
 */
export async function awardEmblemToUser(emblemId: number, userCode: string) {
  try {
    const adminClient = await createAdminClient()
    
    // Get the user by code
    const { data: userData, error: userError } = await adminClient
      .from("users")
      .select("id")
      .eq("user_code", userCode)
      .single()
    
    if (userError) {
      if (userError.code === "PGRST116") {
        return { success: false, error: "المستخدم غير موجود" }
      }
      throw userError
    }
    
    // Get the current admin user
    const { data: adminData } = await adminClient.auth.getUser()
    if (!adminData?.user?.id) {
      return { success: false, error: "تعذر تحديد المستخدم الإداري" }
    }
    
    // Call the function to award the emblem
    const { data, error } = await adminClient.rpc('award_emblem_to_user', {
      emblem_id_param: emblemId,
      user_id_param: userData.id,
      awarded_by_param: adminData.user.id
    })
    
    if (error) throw error
    
    return { success: true }
  } catch (error: any) {
    console.error("Error awarding emblem to user:", error)
    return { success: false, error: error.message }
  }
} 