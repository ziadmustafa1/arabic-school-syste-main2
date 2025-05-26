"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"

export async function getCategories() {
  try {
    const adminClient = await createAdminClient()
    const { data, error } = await adminClient
      .from("card_categories")
      .select("*")
    
    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    console.error("Error fetching categories:", error)
    return { success: false, error: error.message }
  }
}

export async function getUsers() {
  try {
    const adminClient = await createAdminClient()
    const { data, error } = await adminClient
      .from("users")
      .select("id, full_name, email, role_id")
    
    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    console.error("Error fetching users:", error)
    return { success: false, error: error.message }
  }
}

export async function getAllCards() {
  try {
    const adminClient = await createAdminClient()
    const { data, error } = await adminClient
      .from("recharge_cards")
      .select("*")
      .order("created_at", { ascending: false })
    
    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    console.error("Error fetching cards:", error)
    return { success: false, error: error.message }
  }
}

export async function getAllCardsForManagement() {
  try {
    console.log("Fetching all recharge cards for management...")
    const adminClient = await createAdminClient()
    
    const { data, error } = await adminClient
      .from("recharge_cards")
      .select("*")
      .order("created_at", { ascending: false })
    
    console.log("Cards fetch result:", { count: data?.length || 0, error })
    
    if (error) throw error
    
    // Also fetch categories
    const { data: categoriesData, error: categoriesError } = await adminClient
      .from("card_categories")
      .select("*")
    
    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError)
    }
    
    // Fetch users related to the cards
    const userIds = new Set<string>()
    data?.forEach(card => {
      if (card.created_by) userIds.add(card.created_by)
      if (card.used_by) userIds.add(card.used_by)
      if (card.assigned_to) userIds.add(card.assigned_to)
    })
    
    interface UserData {
      id: string;
      full_name?: string;
      email?: string;
    }
    
    let usersData: UserData[] = []
    if (userIds.size > 0) {
      const { data: users, error: usersError } = await adminClient
        .from("users")
        .select("id, full_name, email")
        .in("id", Array.from(userIds))
      
      if (usersError) {
        console.error("Error fetching users:", usersError)
      } else {
        usersData = users as UserData[] || []
      }
    }
    
    return { 
      success: true, 
      data: {
        cards: data || [],
        categories: categoriesData || [],
        users: usersData 
      }
    }
  } catch (error: any) {
    console.error("Error in getAllCardsForManagement:", error)
    return { success: false, error: error.message }
  }
}

export async function getUsersForCards() {
  try {
    const adminClient = await createAdminClient()
    const { data, error } = await adminClient
      .from("users")
      .select("id, full_name, email")
    
    if (error) throw error
    
    const userMap: Record<string, any> = {}
    data?.forEach(user => {
      userMap[user.id] = user
    })
    
    return { success: true, data: userMap }
  } catch (error: any) {
    console.error("Error fetching users for cards:", error)
    return { success: false, error: error.message }
  }
}

export async function getLimits() {
  try {
    const adminClient = await createAdminClient()
    const { data, error } = await adminClient
      .from("card_usage_limits")
      .select("*, role:roles(id, name, code)")
      .order("role_id")
    
    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    console.error("Error fetching limits:", error)
    return { success: false, error: error.message }
  }
}

export async function updateLimit(id: number, weeklyLimit: number) {
  try {
    const adminClient = await createAdminClient()
    const { error } = await adminClient
      .from("card_usage_limits")
      .update({
        weekly_limit: weeklyLimit,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
    
    if (error) throw error
    return { success: true }
  } catch (error: any) {
    console.error("Error updating limit:", error)
    return { success: false, error: error.message }
  }
}

export async function addCategory(name: string, description: string) {
  try {
    const adminClient = await createAdminClient()
    const { data, error } = await adminClient
      .from("card_categories")
      .insert({
        name,
        description
      })
      .select()
    
    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    console.error("Error adding category:", error)
    return { success: false, error: error.message }
  }
}

export async function updateCategory(id: number, name: string, description: string) {
  try {
    const adminClient = await createAdminClient()
    const { data, error } = await adminClient
      .from("card_categories")
      .update({
        name,
        description
      })
      .eq("id", id)
      .select()
    
    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    console.error("Error updating category:", error)
    return { success: false, error: error.message }
  }
}

export async function deleteCategory(id: number) {
  try {
    const adminClient = await createAdminClient()
    
    // Check if any cards are using this category
    const { data: cards, error: checkError } = await adminClient
      .from("recharge_cards")
      .select("id")
      .eq("category_id", id)
      .limit(1)
    
    if (checkError) throw checkError
    
    if (cards && cards.length > 0) {
      return { 
        success: false, 
        error: "هناك كروت شحن مرتبطة بهذا التصنيف. قم بتغيير تصنيف الكروت أولاً."
      }
    }
    
    // Delete the category
    const { error } = await adminClient
      .from("card_categories")
      .delete()
      .eq("id", id)
    
    if (error) throw error
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting category:", error)
    return { success: false, error: error.message }
  }
}

export async function getSavedRechargeCards() {
  try {
    const adminClient = await createAdminClient()
    console.log("Fetching saved recharge cards...");
    
    const { data, error } = await adminClient
      .from("recharge_cards")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500) // Limiting to most recent 500 cards
    
    console.log("Saved cards fetch result:", { count: data?.length || 0, error });
    
    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    console.error("Error fetching saved recharge cards:", error)
    return { success: false, error: error.message }
  }
} 