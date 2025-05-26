"use server"

// Import the required dependencies
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { TABLES } from "@/lib/constants"

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

    try {
      // Step 1: Add points transaction using raw SQL to avoid any ORM field mapping issues
      console.log("Using raw SQL to insert points transaction")
      
      const { error: pointsError } = await adminClient.rpc('execute_sql_with_params', {
        sql_query: `
          INSERT INTO points_transactions 
            (user_id, points, is_positive, description, created_by)
          VALUES 
            ($1, $2, true, $3, $4)
        `,
        params: [data.user.id, card.points, 'استخدام بطاقة شحن', data.user.id]
      })

      if (pointsError) {
        console.error("Error adding points transaction:", pointsError)
        throw pointsError
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

      // Step 3: Add notification using raw SQL to avoid any ORM field mapping issues
      await adminClient.rpc('execute_sql_with_params', {
        sql_query: `
          INSERT INTO notifications
            (user_id, title, content, is_read)
          VALUES
            ($1, $2, $3, false)
        `,
        params: [data.user.id, 'شحن رصيد', `تم شحن رصيدك بـ ${card.points} نقطة`]
      });

      // Step 4: Log activity using raw SQL
      await adminClient.rpc('execute_sql_with_params', {
        sql_query: `
          INSERT INTO activity_log
            (user_id, action_type, description)
          VALUES
            ($1, $2, $3)
        `,
        params: [data.user.id, 'redeem_card', `شحن رصيد بكرت رقم ${cardCode} (${card.points} نقطة)`]
      });

      return {
        success: true,
        message: `تم شحن رصيدك بـ ${card.points} نقطة بنجاح`,
        points: card.points
      }
    } catch (err: any) {
      console.error("Error in recharge transaction:", err)
      
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