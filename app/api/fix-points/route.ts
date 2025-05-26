import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Get userId from query parameters
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const forceValue = searchParams.get('value')
    const force = searchParams.get('force') === 'true'
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: "User ID is required",
        message: "معرف المستخدم مطلوب"
      }, { status: 400 })
    }

    console.log(`[fix-points] Attempting to fix points for user ${userId}, force=${force}, value=${forceValue}`)
    
    const adminClient = await createAdminClient()

    // Get current points
    const { data: pointsData, error: pointsError } = await adminClient
      .from("student_points")
      .select("points")
      .eq("student_id", userId)
      .single()
    
    const currentPoints = pointsData?.points || 0
    console.log(`[fix-points] Current points in student_points: ${currentPoints}`)
    
    // If points are already correct, or we're not forcing an update, return current value
    if (currentPoints > 0 && !force && !forceValue) {
        return NextResponse.json({
        success: true,
        message: `Points already set correctly: ${currentPoints}`,
        totalPoints: currentPoints
      })
    }
    
    let totalPoints = 0
    
    // If forceValue is provided, use it directly
    if (forceValue && !isNaN(parseInt(forceValue))) {
      totalPoints = parseInt(forceValue)
      console.log(`[fix-points] Using forced value: ${totalPoints}`)
    } else {
      // Get recharge card points
      console.log(`[fix-points] Checking recharge cards`)
      const { data: rechargeData, error: rechargeError } = await adminClient
        .from("recharge_cards")
        .select("points")
        .eq("redeemed_by", userId)
        .eq("status", "REDEEMED")
      
      if (rechargeError) {
        console.error(`[fix-points] Error getting recharge cards:`, rechargeError)
      } else if (rechargeData && rechargeData.length > 0) {
        totalPoints = rechargeData.reduce((sum, card) => sum + (card.points || 0), 0)
        console.log(`[fix-points] Found ${rechargeData.length} recharge cards with total: ${totalPoints}`)
      } else {
        console.log(`[fix-points] No recharge cards found`)
      }
      
      // If no points from recharge cards, hardcode to 1000 if specifically requested
      if (totalPoints === 0 && force) {
        totalPoints = 1000
        console.log(`[fix-points] Forcing default value of 1000 points`)
      }
    }
    
    // Update points in student_points table
    if (totalPoints > 0) {
      if (pointsData) {
        // Update existing record
        const { error: updateError } = await adminClient
          .from("student_points")
          .update({ points: totalPoints })
          .eq("student_id", userId)
        
        if (updateError) {
          console.error(`[fix-points] Error updating points:`, updateError)
          return NextResponse.json({
            success: false,
            error: updateError.message,
            message: "حدث خطأ أثناء تحديث النقاط"
          }, { status: 500 })
        }
      } else {
        // Create new record
        const { error: insertError } = await adminClient
          .from("student_points")
          .insert({ student_id: userId, points: totalPoints })
        
        if (insertError) {
          console.error(`[fix-points] Error inserting points:`, insertError)
          return NextResponse.json({
            success: false,
            error: insertError.message,
            message: "حدث خطأ أثناء إنشاء سجل النقاط"
          }, { status: 500 })
        }
      }
      
      console.log(`[fix-points] Successfully updated points to ${totalPoints}`)
        
        return NextResponse.json({
        success: true,
        message: `تم تحديث النقاط بنجاح: ${totalPoints}`,
        totalPoints
        })
      } else {
      return NextResponse.json({
        success: false,
        error: "No points calculated",
        message: "لم يتم حساب أي نقاط"
      }, { status: 404 })
    }
  } catch (error: any) {
    console.error(`[fix-points] Unexpected error:`, error)
    return NextResponse.json({
      success: false,
      error: error.message,
      message: "حدث خطأ غير متوقع"
    }, { status: 500 })
  }
}

// Helper function to update student_points table
async function updateStudentPointsTable(adminClient: any, userId: string, points: number) {
  try {
    console.log(`[fix-points] Updating student_points table for user ${userId} with ${points} points`)
    
    // Check if student_points record exists
    const { count, error: countError } = await adminClient
      .from("student_points")
      .select("*", { count: "exact", head: true })
      .eq("student_id", userId)
    
    if (countError) {
      console.error("[fix-points] Error checking for student_points record:", countError)
      return false
    }
    
    if (count && count > 0) {
      // Update existing record
      const { error: updateError } = await adminClient
        .from("student_points")
        .update({ points: points })
        .eq("student_id", userId)
      
      if (updateError) {
        console.error("[fix-points] Error updating student_points:", updateError)
        return false
      }
      
      console.log(`[fix-points] Updated existing student_points record: ${points} points`)
    } else {
      // Insert new record
      const { error: insertError } = await adminClient
        .from("student_points")
        .insert({ student_id: userId, points: points })
      
      if (insertError) {
        console.error("[fix-points] Error inserting student_points:", insertError)
        return false
      }
      
      console.log(`[fix-points] Created new student_points record: ${points} points`)
    }
    
    return true
  } catch (error) {
    console.error("[fix-points] Error in updateStudentPointsTable:", error)
    return false
  }
}

async function getPointsFromStudentPointsTable(adminClient: any, userId: string): Promise<number | null> {
  try {
    console.log(`[fix-points] Checking student_points table for user ${userId}`)
    const { data, error } = await adminClient
      .from("student_points")
      .select("points")
      .eq("student_id", userId)
      .single()
    
    if (error) {
      console.error(`[fix-points] Error getting points from student_points:`, error)
      return null
    }
    
    if (data && typeof data.points === 'number') {
      console.log(`[fix-points] Found points in student_points: ${data.points}`)
      return data.points
    }
    
    console.log(`[fix-points] No valid points found in student_points`)
    return null
  } catch (err) {
    console.error(`[fix-points] Exception checking student_points:`, err)
    return null
  }
} 