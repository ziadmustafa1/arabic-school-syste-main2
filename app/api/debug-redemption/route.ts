import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Get userId from query params
    const userId = request.nextUrl.searchParams.get('userId')
    const cardCode = request.nextUrl.searchParams.get('cardCode')
    
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
      .limit(10)
    
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

    // If a specific card code is provided, get details about it
    let specificCard = null
    if (cardCode) {
      const { data: card, error: cardError } = await adminClient
        .from('recharge_cards')
        .select('*')
        .eq('code', cardCode)
        .single()
      
      if (cardError) {
        console.error('Error fetching specific card:', cardError)
      } else {
        specificCard = card
      }
    }

    // Calculate points based on the LATEST transactions
    const positivePoints = transactions
      ?.filter(tx => tx.is_positive === true)
      .reduce((sum, tx) => sum + tx.points, 0) || 0
    
    const negativePoints = transactions
      ?.filter(tx => tx.is_positive === false)
      .reduce((sum, tx) => sum + tx.points, 0) || 0
    
    const totalPoints = positivePoints - negativePoints

    // Get the RPC function result for comparison
    const { data: rpcPoints, error: rpcError } = await adminClient.rpc('get_user_points_balance', {
      user_id_param: userId
    })

    // Create a transaction if necessary (emergency fix)
    let fixResult = null
    const fixMode = request.nextUrl.searchParams.get('fix') === 'true'
    
    if (fixMode && specificCard && specificCard.is_used && specificCard.used_by === userId) {
      // Check if a transaction for this card exists
      const { data: existingTx } = await adminClient
        .from('points_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_positive', true)
        .eq('description', 'استخدام بطاقة شحن')
        .gte('created_at', specificCard.used_at || '')
        .order('created_at', { ascending: false })
      
      if (!existingTx || existingTx.length === 0) {
        // Create a new transaction for this card
        const { data: newTx, error: newTxError } = await adminClient
          .from('points_transactions')
          .insert({
            user_id: userId,
            points: specificCard.points,
            is_positive: true,
            description: 'استخدام بطاقة شحن',
            created_by: userId,
            created_at: specificCard.used_at || new Date().toISOString()
          })
          .select()
        
        if (newTxError) {
          fixResult = { error: newTxError.message }
        } else {
          fixResult = { success: true, transaction: newTx }
        }
      } else {
        fixResult = { message: 'Transaction already exists for this card', existing: existingTx }
      }
    }

    return NextResponse.json({
      userId,
      transactions,
      rechargeCards,
      specificCard,
      positivePoints,
      negativePoints,
      totalPoints,
      rpcPoints,
      fixResult,
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