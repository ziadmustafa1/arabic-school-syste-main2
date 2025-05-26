"use server"

import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Server action to update student points, bypassing RLS
 * This is needed because client-side operations will fail due to RLS policies
 */
export async function updateStudentPoints(userId: string, points: number) {
  if (!userId) {
    return {
      success: false,
      error: "User ID is required",
      message: "معرف المستخدم مطلوب"
    }
  }

  try {
    console.log(`[updateStudentPoints] Updating points for user ${userId} to ${points}`)
    const adminClient = await createAdminClient()
    
    // First check if student_points record exists
    const { count, error: countError } = await adminClient
      .from("student_points")
      .select("*", { count: "exact", head: true })
      .eq("student_id", userId)
    
    if (countError) {
      console.error("[updateStudentPoints] Error checking for student_points record:", countError)
      return {
        success: false,
        error: countError.message,
        message: "خطأ في التحقق من سجل النقاط"
      }
    }
    
    // Update or insert the student_points record
    if (count && count > 0) {
      // Update existing record
      const { error: updateError } = await adminClient
        .from("student_points")
        .update({ points: points })
        .eq("student_id", userId)
      
      if (updateError) {
        console.error("[updateStudentPoints] Error updating student_points:", updateError)
        return {
          success: false,
          error: updateError.message,
          message: "خطأ في تحديث سجل النقاط"
        }
      }
      
      console.log(`[updateStudentPoints] Updated student_points record: ${points}`)
    } else {
      // Create new record
      const { error: insertError } = await adminClient
        .from("student_points")
        .insert({ student_id: userId, points: points })
      
      if (insertError) {
        console.error("[updateStudentPoints] Error inserting student_points:", insertError)
        return {
          success: false,
          error: insertError.message,
          message: "خطأ في إنشاء سجل النقاط"
        }
      }
      
      console.log(`[updateStudentPoints] Created student_points record: ${points}`)
    }
    
    return {
      success: true,
      points: points,
      message: `تم تحديث رصيد النقاط بنجاح (${points} نقطة)`
    }
  } catch (error: any) {
    console.error("[updateStudentPoints] Unexpected error:", error)
    return {
      success: false,
      error: error.message,
      message: "حدث خطأ غير متوقع أثناء تحديث رصيد النقاط"
    }
  }
} 