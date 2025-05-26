"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

/**
 * Synchronize a user's points balance by recalculating from transactions
 * This is a server action that can be called from client components
 */
export async function syncUserPointsBalance(userId: string, forceRefresh: boolean = false) {
  if (!userId) {
    return {
      success: false,
      error: "User ID is required",
      message: "معرف المستخدم مطلوب"
    }
  }

  try {
    console.log(`[syncUserPointsBalance] Syncing points for user ${userId}, forceRefresh=${forceRefresh}`)
    const adminClient = await createAdminClient()
    
    // First, try calculating points using the database function
    let calculatedPoints: number | null = null
    let methodUsed = "unknown"
    
    // Method 1: Direct SQL calculation (most reliable, bypasses caching)
    try {
      console.log(`[syncUserPointsBalance] Attempting direct SQL calculation for ${userId}`)
      
      const { data: directSqlResult, error: directSqlError } = await adminClient.rpc('execute_sql_with_params', {
        sql_query: `
          SELECT
            (
              SELECT COALESCE(SUM(points), 0)
              FROM points_transactions
              WHERE user_id = $1::uuid AND is_positive = true
            ) - 
            (
              SELECT COALESCE(SUM(points), 0)
              FROM points_transactions
              WHERE user_id = $1::uuid AND is_positive = false
            ) AS total_points
        `,
        params: [userId]
      })
      
      if (!directSqlError && directSqlResult && Array.isArray(directSqlResult) && directSqlResult.length > 0) {
        const pointsValue = parseInt(directSqlResult[0]?.total_points || '0', 10)
        if (!isNaN(pointsValue)) {
          calculatedPoints = pointsValue
          methodUsed = "direct-sql"
          console.log(`[syncUserPointsBalance] Direct SQL calculation successful: ${calculatedPoints}`)
        } else {
          console.error("[syncUserPointsBalance] Direct SQL returned invalid value:", directSqlResult)
        }
      } else {
        console.error("[syncUserPointsBalance] Direct SQL error or empty result:", directSqlError, directSqlResult)
      }
    } catch (sqlErr) {
      console.error("[syncUserPointsBalance] Direct SQL execution error:", sqlErr)
    }
    
    // Method 2: RPC function (if direct SQL failed)
    if (calculatedPoints === null) {
      try {
        console.log(`[syncUserPointsBalance] Attempting to calculate via RPC for ${userId}`)
        // Add some logging to debug parameter type
        console.log(`[syncUserPointsBalance] User ID type: ${typeof userId}, value: ${userId}`)
        
        // Try with explicit UUID parameter handling
        const { data: rpcResult, error: rpcError } = await adminClient.rpc('calculate_user_points', {
          user_id: userId
        })
        
        console.log(`[syncUserPointsBalance] RPC result:`, rpcResult, `Error:`, rpcError)
        
        if (!rpcError && rpcResult !== null) {
          calculatedPoints = rpcResult
          methodUsed = "rpc"
          console.log(`[syncUserPointsBalance] RPC calculation successful: ${calculatedPoints}`)
        } else {
          console.error("[syncUserPointsBalance] RPC calculation error:", rpcError)
          
          // Try direct database query as last resort
          console.log(`[syncUserPointsBalance] Trying direct database query as last resort`)
          const { data: directResult, error: directError } = await adminClient
            .from("points_transactions")
            .select("points, is_positive, created_at")
            .eq("user_id", userId)
          
          if (!directError && directResult && directResult.length > 0) {
            console.log(`[syncUserPointsBalance] Found ${directResult.length} transaction records directly`)
            // Calculate manually from these records
            const positivePoints = directResult
              .filter(tx => tx.is_positive)
              .reduce((sum, tx) => sum + tx.points, 0)
            
            const negativePoints = directResult
              .filter(tx => !tx.is_positive)
              .reduce((sum, tx) => sum + tx.points, 0)
            
            calculatedPoints = positivePoints - negativePoints
            methodUsed = "direct-query"
            console.log(`[syncUserPointsBalance] Direct query calculation: Positive=${positivePoints}, Negative=${negativePoints}, Total=${calculatedPoints}`)
          }
        }
      } catch (rpcErr) {
        console.error("[syncUserPointsBalance] RPC execution error:", rpcErr)
      }
    }
    
    // Method 3: Manual calculation (if both previous methods failed)
    if (calculatedPoints === null) {
      console.log(`[syncUserPointsBalance] Falling back to manual calculation for ${userId}`)
      
      // Get all transactions for this user
    const { data: transactions, error: txError } = await adminClient
      .from("points_transactions")
      .select("points, is_positive")
      .eq("user_id", userId)
    
    if (txError) {
      console.error("[syncUserPointsBalance] Error fetching transactions:", txError)
      return {
        success: false,
        error: txError.message,
        message: "خطأ في جلب سجل المعاملات"
      }
    }
    
    // Calculate total based on transactions
    const positivePoints = transactions
      .filter(tx => tx.is_positive)
      .reduce((sum, tx) => sum + tx.points, 0)
    
    const negativePoints = transactions
      .filter(tx => !tx.is_positive)
      .reduce((sum, tx) => sum + tx.points, 0)
    
      calculatedPoints = positivePoints - negativePoints
      methodUsed = "manual"
    
      console.log(`[syncUserPointsBalance] Manual calculation: Positive=${positivePoints}, Negative=${negativePoints}, Total=${calculatedPoints}`)
    }
    
    // If all methods above failed or returned 0 points, try additional sources
    if (calculatedPoints === null || calculatedPoints === 0) {
      console.log(`[syncUserPointsBalance] Points calculation is zero or failed, trying additional sources`)
      
      // Try to get points from recharge table, which might have more accurate data
      try {
        console.log(`[syncUserPointsBalance] Checking recharge table for points`)
        const { data: rechargeData, error: rechargeError } = await adminClient
          .from("recharge_cards")
          .select("points")
          .eq("redeemed_by", userId)
          .eq("status", "REDEEMED")
          
        if (!rechargeError && rechargeData && rechargeData.length > 0) {
          const rechargePoints = rechargeData.reduce((sum, card) => sum + (card.points || 0), 0)
          console.log(`[syncUserPointsBalance] Found ${rechargeData.length} recharge cards with total points: ${rechargePoints}`)
          
          if (rechargePoints > 0) {
            calculatedPoints = rechargePoints
            methodUsed = "recharge-cards"
            console.log(`[syncUserPointsBalance] Using recharge cards total: ${calculatedPoints}`)
          }
        } else {
          console.log(`[syncUserPointsBalance] No recharge cards found or error:`, rechargeError)
        }
      } catch (rechargeErr) {
        console.error(`[syncUserPointsBalance] Error checking recharge cards:`, rechargeErr)
      }
      
      // Try also getting points from student/recharge page calculated total
      try {
        console.log(`[syncUserPointsBalance] Trying alternative RPC calculation`)
        const { data: rpcResult } = await adminClient.rpc('calculate_user_total_points', {
          p_user_id: userId
        })
        
        if (rpcResult && rpcResult > 0) {
          console.log(`[syncUserPointsBalance] Alternative RPC returned: ${rpcResult}`)
          calculatedPoints = rpcResult
          methodUsed = "alternative-rpc"
        }
      } catch (altRpcErr) {
        console.log(`[syncUserPointsBalance] Alternative RPC error:`, altRpcErr)
      }
    }
    
    // Now ensure the calculated balance is stored in student_points table
    let updateSuccess = false
    
    // First check if student_points record exists
    const { count, error: countError } = await adminClient
      .from("student_points")
      .select("*", { count: "exact", head: true })
      .eq("student_id", userId)
    
    if (countError) {
      console.error("[syncUserPointsBalance] Error checking for student_points record:", countError)
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
        .update({ points: calculatedPoints })
        .eq("student_id", userId)
      
      updateSuccess = !updateError
      if (updateError) {
        console.error("[syncUserPointsBalance] Error updating student_points:", updateError)
      } else {
        console.log(`[syncUserPointsBalance] Updated student_points record: ${calculatedPoints}`)
      }
    } else {
      // Create new record
      const { error: insertError } = await adminClient
        .from("student_points")
        .insert({ student_id: userId, points: calculatedPoints })
      
      updateSuccess = !insertError
      if (insertError) {
        console.error("[syncUserPointsBalance] Error inserting student_points:", insertError)
      } else {
        console.log(`[syncUserPointsBalance] Created student_points record: ${calculatedPoints}`)
      }
    }
    
    // Aggressively try an alternative update method if the first attempt failed
    if (!updateSuccess) {
      try {
        console.log("[syncUserPointsBalance] Trying alternative update method")
        // Try direct SQL execution as a fallback
        await adminClient.rpc('execute_sql_with_params', {
          sql_query: `
            INSERT INTO student_points (student_id, points) 
            VALUES ($1, $2) 
            ON CONFLICT (student_id) 
            DO UPDATE SET points = $2
          `,
          params: [userId, calculatedPoints]
        })
        updateSuccess = true
        console.log("[syncUserPointsBalance] Alternative update method succeeded")
      } catch (sqlError) {
        console.error("[syncUserPointsBalance] Alternative update method failed:", sqlError)
      }
    }
    
    // If forceRefresh is true, invalidate all pages that might display points
    if (forceRefresh) {
      console.log("[syncUserPointsBalance] Force refreshing related paths")
      try {
        revalidatePath('/teacher/recharge')
        revalidatePath('/teacher/dashboard')
        revalidatePath('/student/dashboard')
        revalidatePath(`/profile/${userId}`)
        revalidatePath('/')
      } catch (refreshError) {
        console.error("[syncUserPointsBalance] Path revalidation error:", refreshError)
      }
    }
    
    return {
      success: true,
      data: {
        points: calculatedPoints,
        method: methodUsed,
        updateSuccess,
        previouslyExisted: count && count > 0
      },
      message: `تم تحديث رصيد النقاط بنجاح (${calculatedPoints} نقطة)`
    }
  } catch (error: any) {
    console.error("[syncUserPointsBalance] Unexpected error:", error)
    return {
      success: false,
      error: error.message,
      message: "حدث خطأ غير متوقع أثناء تحديث رصيد النقاط"
    }
  }
} 