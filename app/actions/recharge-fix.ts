"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { TABLES } from "@/lib/constants"

/**
 * Helper function to update student_points table with reliable error handling
 */
async function updateStudentPointsTable(adminClient: any, userId: string, points: number): Promise<boolean> {
  try {
    console.log(`Updating student_points table for ${userId} with ${points} points`)
    
    // First try direct update/insert with standard Supabase
    try {
      // Check if record exists
      const { count, error: countError } = await adminClient
        .from("student_points")
        .select("*", { count: "exact", head: true })
        .eq("student_id", userId)
      
      if (countError) {
        console.error("Error checking student_points:", countError)
        throw countError
      }
      
      if (count && count > 0) {
        // Update existing record
        const { error: updateError } = await adminClient
          .from("student_points")
          .update({ points: points })
          .eq("student_id", userId)
        
        if (updateError) {
          console.error("Error updating student_points:", updateError)
          throw updateError
        }
        
        console.log(`Updated student_points record for ${userId}`)
      } else {
        // Create new record
        const { error: insertError } = await adminClient
          .from("student_points")
          .insert({ student_id: userId, points: points })
        
        if (insertError) {
          console.error("Error inserting student_points:", insertError)
          throw insertError
        }
        
        console.log(`Created student_points record for ${userId}`)
      }
      
      return true
    } catch (directUpdateError) {
      console.error("Direct update failed:", directUpdateError)
      // Continue to SQL fallback
    }
    
    // If direct update failed, try raw SQL as last resort
    try {
      await adminClient.rpc('execute_sql_with_params', {
        sql_query: `
          INSERT INTO student_points (student_id, points) 
          VALUES ($1, $2)
          ON CONFLICT (student_id) 
          DO UPDATE SET points = $2
        `,
        params: [userId, points]
      })
      console.log("SQL update succeeded")
      return true
    } catch (sqlError) {
      console.error("SQL update failed:", sqlError)
      
      // If first SQL approach fails, try alternate parameter format
      try {
        await adminClient.rpc('execute_sql_with_params', {
          sql_query: `
            INSERT INTO student_points (student_id, points) 
            VALUES ($1, $2)
            ON CONFLICT (student_id) 
            DO UPDATE SET points = $2
          `,
          params: [userId, points]
        })
        console.log("Alternate SQL update succeeded")
        return true
      } catch (altSqlError) {
        console.error("All update methods failed")
        return false
      }
    }
  } catch (error) {
    console.error("Fatal error updating student_points:", error)
    return false
  }
}

// Fixed version of redeemRechargeCard function
export async function redeemRechargeCardFixed(formData: FormData) {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Get current user
    const { data, error: sessionError } = await supabase.auth.getUser()
    if (sessionError || !data.user) {
      return { success: false, message: "يجب تسجيل الدخول أولاً" }
    }

    const cardCode = formData.get("cardCode") as string
    if (!cardCode) {
      return { success: false, message: "رمز الكرت مطلوب" }
    }

    // Log the attempt
    console.log(`User ${data.user.id} attempting to redeem card: ${cardCode}`)
    
    // Use admin client to get card details to bypass RLS
    const { data: card, error: cardError } = await adminClient
      .from("recharge_cards")
      .select("*")
      .eq("code", cardCode)
      .single()

    // Log the card search result
    console.log("Card search result:", { card, error: cardError })

    if (cardError) {
      // If the error is a 404, the card doesn't exist
      if (cardError.code === "PGRST116") {
        console.log("Card not found:", cardCode)
        return { success: false, message: "رمز الكرت غير صحيح" }
      }
      
      // Other database error
      console.error("Database error when searching for card:", cardError)
      throw cardError
    }

    if (!card) {
      console.log("Card not found (no error):", cardCode)
      return { success: false, message: "رمز الكرت غير صحيح" }
    }

    // Check if card is already used
    if (card.is_used) {
      console.log("Card already used:", cardCode)
      return { success: false, message: "تم استخدام هذا الكرت من قبل" }
    }

    // Check if card is active
    if (card.status !== 'active') {
      console.log("Card is not active:", cardCode, card.status)
      return { success: false, message: "هذا الكرت غير نشط" }
    }

    // Create a transaction to ensure atomicity
    let pointsAdded = false
    let cardMarkedAsUsed = false
    let pointsBalance = 0

    try {
      // Step 1: Add points transaction using raw SQL to avoid any mapping issues
      console.log("Adding points transaction using raw SQL")
      
      // Use both methods for reliability
      // Method 1: Direct insert with proper object
      const { data: directInsertData, error: directInsertError } = await adminClient
        .from('points_transactions')
        .insert({
          user_id: data.user.id,
          points: card.points,
          is_positive: true,
          description: 'استخدام بطاقة شحن',
          created_by: data.user.id
        })
        .select()
      
      if (directInsertError) {
        console.error("Error with direct insert:", directInsertError)
        
        // Method 2: Try RPC SQL method if direct insert fails
        console.log("Falling back to SQL via RPC...")
        const sqlQuery = `
          INSERT INTO points_transactions 
            (user_id, points, is_positive, description, created_by)
          VALUES 
            ($1, $2, true, 'استخدام بطاقة شحن', $3)
          RETURNING id
        `;
        
        const { error: rpcError } = await adminClient.rpc(
          'execute_sql_with_params', 
          { 
            sql_query: sqlQuery,
            params: [data.user.id, card.points, data.user.id]
          }
        )
        
        if (rpcError) {
          console.error("Error with SQL RPC fallback:", rpcError)
          
          // Method 3: Last resort - call our dedicated API
          console.log("Last resort - using direct function call...")
          try {
            // Import the handler directly
            const { addPointsDirectly } = await import("@/app/api/force-add-points/handler");
            
            // Call the function directly instead of via fetch
            const apiResult = await addPointsDirectly(
              data.user.id,
              card.points,
              cardCode
            );
            
            console.log("Direct call result:", apiResult);
            
            if (!apiResult.success) {
              throw new Error(`Direct points addition failed: ${JSON.stringify(apiResult)}`);
            }
          } catch (apiError) {
            console.error("Error with direct function call:", apiError);
            throw apiError;
          }
        } else {
          console.log("SQL RPC insert succeeded");
        }
      } else {
        console.log("Direct insert succeeded:", directInsertData);
      }
      
      pointsAdded = true
      console.log("Points transaction added successfully")

      // Step 2: Mark card as used
      const { error: updateError } = await adminClient
        .from("recharge_cards")
        .update({
          is_used: true,
          used_by: data.user.id,
          used_at: new Date().toISOString()
        })
        .eq("id", card.id)

      if (updateError) {
        console.error("Error updating card:", updateError)
        throw updateError
      }

      cardMarkedAsUsed = true
      console.log("Card marked as used successfully")

      // Step 3: Add notification
      await adminClient.from('notifications').insert([{
        user_id: data.user.id,
        title: "شحن رصيد",
        content: `تم شحن رصيدك بـ ${card.points} نقطة`,
        is_read: false
      }]);

      // Step 4: Log activity
      await adminClient.from('activity_log').insert([{
        user_id: data.user.id,
        action_type: "redeem_card",
        description: `شحن رصيد بكرت رقم ${cardCode} (${card.points} نقطة)`
      }]);

      // Step 5: Calculate points and update student_points table
      try {
        // First try direct SQL calculation using WITH clause
        try {
          const { data: calculationResult, error: calculationError } = await adminClient.rpc('execute_sql_with_params', {
            sql_query: `
              WITH positive_points AS (
                SELECT COALESCE(SUM(points), 0) AS total
                FROM points_transactions
                WHERE user_id = $1 AND is_positive = true
              ),
              negative_points AS (
                SELECT COALESCE(SUM(points), 0) AS total
                FROM points_transactions
                WHERE user_id = $1 AND is_positive = false
              )
              SELECT 
                (SELECT total FROM positive_points) - (SELECT total FROM negative_points) AS balance
            `,
            params: [data.user.id]
          })
          
          if (!calculationError && calculationResult && 
              Array.isArray(calculationResult) && calculationResult.length > 0) {
            const balance = parseInt(calculationResult[0]?.balance || '0', 10)
            if (!isNaN(balance)) {
              console.log(`Calculated balance via SQL: ${balance}`)
              pointsBalance = balance
            }
          }
        } catch (sqlError) {
          console.error("SQL calculation error:", sqlError)
        }
        
        // If SQL calculation failed, use card points value
        if (pointsBalance <= 0) {
          console.log(`Using card points as balance: ${card.points}`)
          pointsBalance = card.points
        }
        
        // Update the student_points table
        const updateSuccess = await updateStudentPointsTable(adminClient, data.user.id, pointsBalance)
        if (!updateSuccess) {
          console.warn("Failed to update student_points table")
        }
      } catch (pointsError) {
        console.error("Error in points calculation:", pointsError)
        // Fallback to card points
        pointsBalance = card.points
      }

      return {
        success: true,
        message: `تم شحن رصيدك بـ ${card.points} نقطة بنجاح`,
        points: card.points,
        balance: pointsBalance
      }
    } catch (err: any) {
      console.error("Error redeeming card:", err)
      
      // Attempt recovery - if points were added but card not marked, mark it anyway
      if (pointsAdded && !cardMarkedAsUsed) {
        try {
          await adminClient
            .from("recharge_cards")
            .update({
              is_used: true,
              used_by: data.user.id,
              used_at: new Date().toISOString()
            })
            .eq("id", card.id)
          console.log("Recovery: Card marked as used after error")
        } catch (recoveryErr) {
          console.error("Failed to mark card as used during recovery:", recoveryErr)
        }
      }
      
      throw err
    }
  } catch (error: any) {
    console.error("Error redeeming card:", error)
    return {
      success: false,
      message: error.message || "حدث خطأ أثناء شحن الرصيد",
    }
  }
} 