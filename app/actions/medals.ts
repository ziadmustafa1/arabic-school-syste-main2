"use server"

import { createClient } from "@/lib/supabase/server"

interface Medal {
  id: number
  name: string
  description: string | null
  image_url: string | null
  min_points: number
  max_points: number
  awarded_at?: string
}

/**
 * Get all available medals
 */
export async function getAllMedals() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from("medals")
      .select("*")
      .order("min_points", { ascending: true })
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error: any) {
    console.error("Error fetching medals:", error)
    return { 
      success: false, 
      message: error.message || "حدث خطأ أثناء جلب الميداليات",
      data: []
    }
  }
}

/**
 * Get user's medals
 */
export async function getUserMedals(userId: string) {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from("user_medals")
      .select("medal_id, awarded_at, medals(*)")
      .eq("user_id", userId)
      .order("awarded_at", { ascending: false })
    
    if (error) throw error
    
    // Transform the data to a more usable format
    return { 
      success: true, 
      data: data.map((item: any) => ({
        ...item.medals,
        awarded_at: item.awarded_at,
        medal_id: item.medal_id
      }))
    }
  } catch (error: any) {
    console.error("Error fetching user medals:", error)
    return { 
      success: false, 
      message: error.message || "حدث خطأ أثناء جلب ميداليات المستخدم",
      data: []
    }
  }
} 