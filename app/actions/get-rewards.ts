"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"

export async function getRewardsForUser() {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()
    
    // Get current user
    const { data, error: sessionError } = await supabase.auth.getUser()
    if (sessionError || !data.user) {
      return { success: false, message: "يجب تسجيل الدخول أولاً" }
    }
    
    // Get the user's role_id using the admin client to bypass RLS
    const { data: userData, error: userRoleError } = await adminClient
      .from("users")
      .select("role_id")
      .eq("id", data.user.id)
      .single()
    
    if (userRoleError) {
      console.error("Error fetching user role:", userRoleError)
      return { success: false, message: "خطأ في الحصول على بيانات المستخدم" }
    }
    
    // Fetch rewards - only show rewards for all roles (null) or specifically for this role
    const { data: rewardsData, error: rewardsError } = await adminClient
      .from("rewards")
      .select("*")
      .or(`role_id.is.null,role_id.eq.${userData.role_id}`)
      .gt("available_quantity", 0)
      .order("points_cost", { ascending: true })
    
    if (rewardsError) {
      return { success: false, message: "خطأ في الحصول على المكافآت" }
    }
    
    // Fetch user's redeemed rewards first (we'll need this regardless of the points calculation method)
    const { data: userRewardsData, error: userRewardsError } = await adminClient
      .from("user_rewards")
      .select("*, reward:rewards(*)")
      .eq("user_id", data.user.id)
      .order("redeemed_at", { ascending: false })
    
    if (userRewardsError) {
      return { success: false, message: "خطأ في الحصول على المكافآت المستردة" }
    }
    
    // UPDATED APPROACH: First try to get points from student_points table
    const { data: studentPoints, error: studentPointsError } = await adminClient
      .from("student_points")
      .select("points")
      .eq("student_id", data.user.id)
      .single()
      
    if (!studentPointsError && studentPoints) {
      console.log("Using points from student_points table:", studentPoints.points)
      // Return with points from student_points table
      return {
        success: true,
        data: {
          rewards: rewardsData || [],
          userPoints: studentPoints.points,
          userRewards: userRewardsData || []
        }
      }
    }
    
    console.log("Couldn't find points in student_points, falling back to RPC")
    
    // Fallback to RPC function 
    const { data: totalPoints, error: pointsError } = await adminClient
      .rpc("calculate_user_points", { user_id_param: data.user.id })
    
    if (pointsError) {
      console.error("Error calling calculate_user_points:", pointsError)
      // Fallback to manual calculation if RPC fails
      
      // Fetch all points transactions
      const { data: pointsTransactions, error: transactionsError } = await adminClient
        .from("points_transactions")
        .select("points, is_positive")
        .eq("user_id", data.user.id)
      
      if (transactionsError) {
        return { 
          success: false, 
          message: "خطأ في جلب معاملات النقاط: " + transactionsError.message
        }
      }
      
      // Calculate total points manually from all transactions
      let userPoints = 0
      if (pointsTransactions && pointsTransactions.length > 0) {
        userPoints = pointsTransactions.reduce((total, transaction) => {
          if (transaction.is_positive) {
            return total + transaction.points
          } else {
            return total - transaction.points
          }
        }, 0)
      }
      
      // Get current points from the user's transactions
      return {
        success: true,
        data: {
          rewards: rewardsData || [],
          userPoints: userPoints,
          userRewards: userRewardsData || []
        }
      }
    }
    
    // Use RPC result if available
    return {
      success: true,
      data: {
        rewards: rewardsData || [],
        userPoints: totalPoints || 0,
        userRewards: userRewardsData || []
      }
    }
  } catch (error: any) {
    console.error("Error in getRewardsForUser:", error)
    return {
      success: false,
      message: error.message || "حدث خطأ أثناء الحصول على المكافآت"
    }
  }
} 