'use server'

import { createAdminClient } from "@/lib/supabase/server"

export async function getMedalsServerAction() {
  try {
    const adminClient = await createAdminClient()
    
    // Get all medals
    const { data, error } = await adminClient
      .from("medals")
      .select("*")
      .order("min_points", { ascending: true })
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error: any) {
    console.error("Error fetching medals:", error)
    return { success: false, error: error.message }
  }
}

export async function addMedalServerAction(
  name: string, 
  description: string,
  image_url: string,
  min_points: number,
  max_points: number = 99999
) {
  try {
    const adminClient = await createAdminClient()
    
    // Insert new medal
    const { data, error } = await adminClient
      .from("medals")
      .insert({
        name,
        description,
        image_url: image_url || null,
        min_points,
        max_points
      })
      .select()
      .single()
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error: any) {
    console.error("Error adding medal:", error)
    return { success: false, error: error.message }
  }
}

export async function updateMedalServerAction(
  id: number,
  name: string,
  description: string,
  image_url: string,
  min_points: number,
  max_points: number = 99999
) {
  try {
    const adminClient = await createAdminClient()
    
    // Update medal
    const { error } = await adminClient
      .from("medals")
      .update({
        name,
        description,
        image_url: image_url || null,
        min_points,
        max_points
      })
      .eq("id", id)
    
    if (error) throw error
    
    return { success: true }
  } catch (error: any) {
    console.error("Error updating medal:", error)
    return { success: false, error: error.message }
  }
}

export async function deleteMedalServerAction(id: number) {
  try {
    const adminClient = await createAdminClient()
    
    // Check if any users have this medal
    const { data: userMedals, error: checkError } = await adminClient
      .from("user_medals")
      .select("id")
      .eq("medal_id", id)
      .limit(1)
    
    if (checkError) throw checkError
    
    if (userMedals && userMedals.length > 0) {
      return { 
        success: false, 
        error: "هناك مستخدمون حاصلون على هذا الوسام. قم بإلغاء الوسام من المستخدمين أولاً."
      }
    }
    
    // Delete medal
    const { error } = await adminClient
      .from("medals")
      .delete()
      .eq("id", id)
    
    if (error) throw error
    
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting medal:", error)
    return { success: false, error: error.message }
  }
}

export async function awardMedalToUserServerAction(medalId: number, userCode: string) {
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
    
    // Check if user already has this medal
    const { data: existingMedal, error: existingError } = await adminClient
      .from("user_medals")
      .select("id")
      .eq("user_id", userData.id)
      .eq("medal_id", medalId)
      .single()
    
    if (existingMedal) {
      return { success: false, error: "المستخدم حاصل بالفعل على هذا الوسام" }
    }
    
    // Only check existence error, not "not found" error
    if (existingError && existingError.code !== "PGRST116") {
      throw existingError
    }
    
    // Award medal to user
    const { error: awardError } = await adminClient
      .from("user_medals")
      .insert({
        user_id: userData.id,
        medal_id: medalId,
        awarded_at: new Date().toISOString()
      })
    
    if (awardError) throw awardError
    
    // Create notification for the user
    const { data: medalData } = await adminClient
      .from("medals")
      .select("name")
      .eq("id", medalId)
      .single()
    
    if (medalData) {
      await adminClient
        .from("notifications")
        .insert({
          user_id: userData.id,
          title: "تم منحك وسام جديد",
          content: `تهانينا! تم منحك وسام "${medalData.name}"`,
          type: "medal",
          reference_id: medalId
        })
    }
    
    return { success: true }
  } catch (error: any) {
    console.error("Error awarding medal to user:", error)
    return { success: false, error: error.message }
  }
} 