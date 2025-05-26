import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Get userId from query params
    const userId = request.nextUrl.searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' }, 
        { status: 400 }
      )
    }

    // Create admin client to bypass RLS
    const adminClient = await createAdminClient()
    
    // Get all recent points transactions for this user with timestamps
    const { data: transactions, error: txError } = await adminClient
      .from('points_transactions')
      .select('id, points, is_positive, description, created_at, created_by')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (txError) {
      console.error('Error fetching transactions:', txError)
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    // Get recharge cards for this user
    const { data: rechargeCards, error: cardsError } = await adminClient
      .from('recharge_cards')
      .select('id, code, points, is_used, used_by, used_at, created_at')
      .eq('used_by', userId)
      .order('used_at', { ascending: false })
      .limit(10)

    if (cardsError) {
      console.error('Error fetching recharge cards:', cardsError)
    }

    return NextResponse.json({
      userId,
      transactions,
      rechargeCards,
      success: true
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch debug data' },
      { status: 500 }
    )
  }
} 