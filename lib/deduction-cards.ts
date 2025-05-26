import { createClient } from '@/lib/supabase/server'
import { addHours, addDays } from 'date-fns'

interface DeductionCard {
  id: string
  name: string
  color: string
  description: string
  negative_points_threshold: number
  deduction_percentage: number
  active_duration_days: number
  active_duration_hours: number
  is_active: boolean
}

interface PointTransaction {
  id: string
  user_id: string
  points: number
  is_positive: boolean
  created_at: string
}

interface UserDeductionCard {
  id: string
  user_id: string
  deduction_card_id: string
  deduction_card: DeductionCard
  negative_points_count: number
  activated_at: string | null
  expires_at: string | null
  is_active: boolean
}

/**
 * Process negative points and check if a deduction card should be activated
 * @param userId The user ID
 * @param negativePointsCategory The negative points category ID
 * @param negativePointsValue The negative points value
 */
export async function processNegativePoints(userId: string, negativePointsCategory: string, negativePointsValue: number) {
  const supabase = await createClient()
  
  try {
    // Get user's active deduction card if any
    const { data: activeCard, error: activeCardError } = await supabase
      .from('user_deduction_cards')
      .select(`
        *,
        deduction_card:deduction_card_id(*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()
    
    if (activeCardError) throw activeCardError
    
    // Get all deduction cards ordered by threshold
    const { data: deductionCards, error: cardsError } = await supabase
      .from('deduction_cards')
      .select('*')
      .eq('is_active', true)
      .order('negative_points_threshold', { ascending: true })
    
    if (cardsError) throw cardsError
    
    if (!deductionCards || deductionCards.length === 0) {
      // No deduction cards in the system
      return
    }
    
    // Get user's negative points count in the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: negativePoints, error: pointsError } = await supabase
      .from('points_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_positive', false)
      .gte('created_at', thirtyDaysAgo.toISOString())
    
    if (pointsError) throw pointsError
    
    // Calculate total negative points
    const totalNegativePoints = negativePoints
      ? negativePoints.reduce((total: number, point: PointTransaction) => total + Math.abs(point.points), Math.abs(negativePointsValue))
      : Math.abs(negativePointsValue)
    
    if (activeCard) {
      // Check if the active card has expired
      const expiryDate = activeCard.expires_at ? new Date(activeCard.expires_at) : null
      const now = new Date()
      
      if (expiryDate && expiryDate > now) {
        // Active card is still valid, check if we need to upgrade to next card
        const currentCardIndex = deductionCards.findIndex((card: DeductionCard) => card.id === activeCard.deduction_card.id)
        
        if (currentCardIndex < deductionCards.length - 1) {
          // There's a next card
          const nextCard = deductionCards[currentCardIndex + 1]
          
          if (totalNegativePoints >= nextCard.negative_points_threshold) {
            // Deactivate current card
            await supabase
              .from('user_deduction_cards')
              .update({ is_active: false })
              .eq('id', activeCard.id)
            
            // Activate next card
            await activateDeductionCard(userId, nextCard.id)
          }
        }
      } else {
        // Active card has expired, deactivate it
        await supabase
          .from('user_deduction_cards')
          .update({ is_active: false })
          .eq('id', activeCard.id)
        
        // Check for a new card to activate
        await checkAndActivateAppropriateCard(userId, totalNegativePoints, deductionCards)
      }
    } else {
      // No active card, check if we need to activate one
      await checkAndActivateAppropriateCard(userId, totalNegativePoints, deductionCards)
    }
  } catch (error) {
    console.error('Error processing negative points for deduction cards:', error)
  }
}

/**
 * Check and activate the appropriate deduction card based on negative points
 */
async function checkAndActivateAppropriateCard(
  userId: string, 
  totalNegativePoints: number, 
  deductionCards: DeductionCard[]
) {
  // Find the highest threshold card that applies
  let cardToActivate = null
  
  for (let i = deductionCards.length - 1; i >= 0; i--) {
    if (totalNegativePoints >= deductionCards[i].negative_points_threshold) {
      cardToActivate = deductionCards[i]
      break
    }
  }
  
  if (cardToActivate) {
    await activateDeductionCard(userId, cardToActivate.id)
  }
}

/**
 * Activate a deduction card for a user
 */
async function activateDeductionCard(userId: string, deductionCardId: string) {
  const supabase = await createClient()
  
  try {
    // Get the deduction card details
    const { data: card, error: cardError } = await supabase
      .from('deduction_cards')
      .select('*')
      .eq('id', deductionCardId)
      .single()
    
    if (cardError) throw cardError
    
    const now = new Date()
    const expiresAt = addHours(addDays(now, card.active_duration_days), card.active_duration_hours)
    
    // Create user deduction card record
    const { error: insertError } = await supabase
      .from('user_deduction_cards')
      .insert({
        user_id: userId,
        deduction_card_id: deductionCardId,
        activated_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_active: true
      })
    
    if (insertError) throw insertError
    
    // Create a notification for the user
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'تفعيل كرت حسم',
        content: `تم تفعيل كرت الحسم (${card.name}) بنسبة حسم ${card.deduction_percentage}% لمدة ${card.active_duration_days} يوم و ${card.active_duration_hours} ساعة.`,
        type: 'deduction_card',
        is_read: false
      })
  } catch (error) {
    console.error('Error activating deduction card:', error)
  }
}

/**
 * Apply deduction based on active card for a transaction or reward
 * @param userId The user ID
 * @param originalValue The original value to apply deduction to
 * @returns The value after deduction
 */
export async function applyDeductionIfNeeded(userId: string, originalValue: number): Promise<number> {
  // Only apply deduction to positive values
  if (originalValue <= 0) return originalValue
  
  const supabase = await createClient()
  
  try {
    // Get user's active deduction card if any
    const { data: activeCard, error: activeCardError } = await supabase
      .from('user_deduction_cards')
      .select(`
        *,
        deduction_card:deduction_card_id(*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()
    
    if (activeCardError) throw activeCardError
    
    if (!activeCard) return originalValue
    
    // Check if the card has expired
    const expiryDate = activeCard.expires_at ? new Date(activeCard.expires_at) : null
    const now = new Date()
    
    if (!expiryDate || expiryDate <= now) {
      // Card has expired, deactivate it
      await supabase
        .from('user_deduction_cards')
        .update({ is_active: false })
        .eq('id', activeCard.id)
      
      return originalValue
    }
    
    // Apply deduction percentage
    const deductionPercentage = activeCard.deduction_card.deduction_percentage
    const deductedValue = originalValue * (1 - deductionPercentage / 100)
    
    return Math.round(deductedValue)
  } catch (error) {
    console.error('Error applying deduction:', error)
    return originalValue
  }
} 