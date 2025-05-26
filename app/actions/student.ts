"use server"

import { createClient } from "@/lib/supabase/server"

export async function getMyCards() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: authData, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authData.user) {
      throw new Error("غير مصرح")
    }
    
    const userId = authData.user.id
    
    // Fetch assigned cards
    const { data, error } = await supabase
      .from("recharge_cards")
      .select("*, category:card_categories(*)")
      .eq("assigned_to", userId)
      .eq("status", "active")
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error: any) {
    console.error("Error getting student cards:", error)
    return { success: false, error: error.message }
  }
} 