"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"

/**
 * Get user deduction cards safely with admin client to bypass RLS
 */
export async function getUserDeductionCards(userId: string) {
  try {
    if (!userId) {
      console.error("getUserDeductionCards called with no userId")
      return { 
        success: false, 
        error: "User ID is required",
        message: "معرف المستخدم مطلوب" 
      }
    }
    
    console.log(`[getUserDeductionCards] Starting fetch for user: ${userId}`)
    
    // Use admin client to bypass RLS policies
    const adminClient = await createAdminClient()
    
    // First check if user exists
    const { data: userData, error: userError } = await adminClient
      .from("users")
      .select("id, full_name")
      .eq("id", userId)
      .single()
    
    if (userError) {
      console.error("[getUserDeductionCards] Error fetching user:", userError.message, userError.code)
      return { 
        success: false, 
        error: userError.message,
        message: "خطأ في التحقق من معلومات المستخدم" 
      }
    }
    
    console.log(`[getUserDeductionCards] Found user: ${userData?.full_name || 'unknown'}`)
    
    // Check if the tables exist before querying
    console.log("[getUserDeductionCards] Checking if deduction tables exist")
    const { error: checkError } = await adminClient
      .from("user_deduction_cards")
      .select("id")
      .limit(1)
    
    if (checkError) {
      console.error("[getUserDeductionCards] Table check error:", checkError.message, checkError.code)
      
      // If table doesn't exist, return empty data with success to avoid UI errors
      if (checkError.code === "42P01") {
        console.log("[getUserDeductionCards] Tables don't exist yet, returning empty data")
        return {
          success: true,
          data: [],
          message: "جداول كروت الحسم غير متوفرة حالياً"
        }
      }
      
      return { 
        success: false, 
        error: checkError.message,
        message: "خطأ في قاعدة البيانات" 
      }
    }
    
    console.log("[getUserDeductionCards] Deduction tables exist, fetching card data")
    
    // Fetch the actual data
    const { data, error } = await adminClient
      .from("user_deduction_cards")
      .select(`
        id,
        negative_points_count,
        activated_at,
        expires_at,
        is_active,
        deduction_cards:deduction_card_id(
          id,
          name,
          color,
          description,
          negative_points_threshold,
          deduction_percentage,
          active_duration_days,
          active_duration_hours,
          is_active
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
    
    if (error) {
      console.error("[getUserDeductionCards] Error fetching deduction cards:", error.message, error.code)
      return { 
        success: false, 
        error: error.message,
        message: "خطأ في الحصول على بيانات كروت الحسم" 
      }
    }
    
    if (!data || data.length === 0) {
      console.log("[getUserDeductionCards] No deduction cards found for user")
      return {
        success: true,
        data: [],
        message: "لا توجد كروت حسم"
      }
    }
    
    // Transform the data to make it easier to use in the client
    console.log(`[getUserDeductionCards] Processing ${data.length} deduction cards`)
    
    // Make sure we handle null values properly
    const transformedCards = data.map(card => {
      // Skip invalid records
      if (!card.deduction_cards) {
        console.warn("[getUserDeductionCards] Found card with missing deduction_cards relation, skipping")
        return null
      }
      
      return {
        id: card.deduction_cards.id,
        name: card.deduction_cards.name,
        color: card.deduction_cards.color,
        description: card.deduction_cards.description,
        negative_points_threshold: card.deduction_cards.negative_points_threshold,
        deduction_percentage: card.deduction_cards.deduction_percentage,
        active_duration_days: card.deduction_cards.active_duration_days,
        active_duration_hours: card.deduction_cards.active_duration_hours,
        is_active: card.deduction_cards.is_active,
        user_deduction_card_id: card.id,
        negative_points_count: card.negative_points_count,
        activated_at: card.activated_at,
        expires_at: card.expires_at,
        is_card_active: card.is_active
      }
    }).filter(Boolean) // Remove any null entries
    
    console.log(`[getUserDeductionCards] Successfully fetched ${transformedCards.length} valid deduction cards for user`)
    
    return {
      success: true,
      data: transformedCards,
      message: "تم جلب كروت الحسم بنجاح"
    }
  } catch (error: any) {
    console.error("[getUserDeductionCards] Unexpected error:", error)
    return {
      success: false,
      error: error.message,
      message: "حدث خطأ غير متوقع أثناء جلب كروت الحسم"
    }
  }
} 