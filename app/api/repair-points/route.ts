import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Define interface for transactions
interface PointsTransaction {
  id: string;
  points: number;
  is_positive: boolean;
  description: string;
  created_at: string;
  [key: string]: any;
}

// Define interface for recharge cards
interface RechargeCard {
  id: string;
  code: string;
  points: number;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
}

// Define repair results interface
interface RepairResults {
  missingTransactions: string[];
  repairedCards: Array<{
    code: string;
    points: number;
    transaction: any;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    // Get userId from query params
    const userId = request.nextUrl.searchParams.get('userId')
    const forceRepair = request.nextUrl.searchParams.get('forceRepair') === 'true'
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' }, 
        { status: 400 }
      )
    }

    // Create admin client to bypass RLS
    const adminClient = await createAdminClient()
    
    // Check all recharge cards for this user
    const { data: rechargeCards, error: cardsError } = await adminClient
      .from('recharge_cards')
      .select('id, code, points, is_used, used_by, used_at, created_at')
      .eq('used_by', userId)
      .order('used_at', { ascending: false })
    
    if (cardsError) {
      console.error('Error fetching recharge cards:', cardsError)
      return NextResponse.json(
        { error: 'Failed to fetch recharge cards' },
        { status: 500 }
      )
    }

    // Get points transactions related to recharge cards
    const { data: existingTransactions, error: existingError } = await adminClient
      .from('points_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_positive', true)
      .like('description', '%استخدام بطاقة شحن%')
    
    if (existingError) {
      console.error('Error checking existing transactions:', existingError)
    }
    
    // Build a map of card codes that already have transactions
    const transactionsMap: Record<string, PointsTransaction> = {};
    if (existingTransactions) {
      existingTransactions.forEach(tx => {
        // Store transaction by ID to avoid duplicates
        transactionsMap[tx.id] = tx;
      });
    }
    
    const repairResults: RepairResults = {
      missingTransactions: [],
      repairedCards: []
    };
    
    // Check for cards without corresponding transactions
    for (const card of rechargeCards || []) {
      // Find if there's a transaction for this card
      const transactionExists = existingTransactions?.some(tx => 
        tx.description === `استخدام بطاقة شحن` && 
        tx.created_at >= card.used_at // Transaction created after card was used
      );
      
      if (!transactionExists || forceRepair) {
        repairResults.missingTransactions.push(card.code);
        
        // Create a missing transaction
        if (card.is_used && card.used_by === userId) {
          const { data, error } = await adminClient
            .from('points_transactions')
            .insert({
              user_id: userId,
              points: card.points,
              is_positive: true,
              description: 'استخدام بطاقة شحن',
              created_by: userId,
              created_at: card.used_at || new Date().toISOString()
            })
            .select()
          
          if (error) {
            console.error(`Error repairing transaction for card ${card.code}:`, error)
          } else {
            repairResults.repairedCards.push({
              code: card.code,
              points: card.points,
              transaction: data
            });
          }
        }
      }
    }
    
    // Recalculate balance after repairs
    const { data: transactions, error: txError } = await adminClient
      .from('points_transactions')
      .select('points, is_positive')
      .eq('user_id', userId)
    
    if (txError) {
      console.error('Error fetching transactions after repair:', txError)
      return NextResponse.json({
        userId,
        repairResults,
        success: true,
        error: 'Could not recalculate final balance'
      })
    }
    
    // Calculate points
    const positivePoints = transactions
      ?.filter(tx => tx.is_positive === true)
      .reduce((sum, tx) => sum + tx.points, 0) || 0
    
    const negativePoints = transactions
      ?.filter(tx => tx.is_positive === false)
      .reduce((sum, tx) => sum + tx.points, 0) || 0
    
    const totalPoints = positivePoints - negativePoints

    return NextResponse.json({
      userId,
      repairResults,
      cardsCount: rechargeCards?.length || 0,
      positivePoints,
      negativePoints,
      totalPoints,
      transactionCount: transactions?.length || 0,
      success: true
    })
  } catch (error) {
    console.error('Points repair error:', error)
    return NextResponse.json(
      { error: 'Failed to repair points' },
      { status: 500 }
    )
  }
} 