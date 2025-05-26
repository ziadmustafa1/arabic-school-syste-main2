"use server"

import { createAdminClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// Helper types
interface CardCategory {
  id: number
  name: string
  description?: string
  color?: string
}

interface RechargeCard {
  id?: number
  code: string
  points: number
  is_used: boolean
  used_by?: string | null
  used_at?: string | null
  assigned_to?: string | null
  valid_from?: string | null
  valid_until?: string | null
  status: string
  category_id?: number | null
  max_usage_attempts?: number
  usage_cooldown_hours?: number
  failed_attempts?: number
  created_by: string
  created_at?: string
}

export async function GET() {
  try {
    const adminClient = await createAdminClient()
    
    // Get all card categories
    const { data: categories, error: categoriesError } = await adminClient
      .from("card_categories")
      .select("*")
      
    if (categoriesError) {
      return NextResponse.json({ error: categoriesError.message }, { status: 500 })
    }
    
    // Get users for assignment
    const { data: users, error: usersError } = await adminClient
      .from("users")
      .select("id, full_name, email, role_id")
      .order("full_name", { ascending: true })
      
    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      categories: categories || [],
      users: users || []
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Create cards directly with admin privileges 
export async function POST(request: NextRequest) {
  try {
    // Get request body
    const data = await request.json() as RechargeCard[]
    
    // Basic validation
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Invalid data, expected array of cards" }, { status: 400 })
    }
    
    // Create admin client
    const adminClient = await createAdminClient()
    
    // Log the cards being created
    console.log(`Creating ${data.length} recharge cards`)
    
    // Delete any existing cards with the same codes first to avoid conflicts
    const codes = data.map(card => card.code)
    if (codes.length > 0) {
      await adminClient
        .from("recharge_cards")
        .delete()
        .in("code", codes)
    }
    
    // Insert new cards
    const { data: cards, error } = await adminClient
      .from("recharge_cards")
      .insert(data)
      .select()
      
    if (error) {
      console.error("Error inserting cards:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Return success
    return NextResponse.json({ 
      success: true, 
      message: `Successfully created ${cards?.length || 0} recharge cards`,
      data: cards
    })
  } catch (error: any) {
    console.error("Error in cards API route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 