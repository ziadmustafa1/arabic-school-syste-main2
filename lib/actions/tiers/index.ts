"use server"

import { createAdminClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/utils/auth"

/**
 * Get all tiers with their levels
 */
export async function getAllTiers() {
  try {
    const adminClient = await createAdminClient()
    
    // Get all tiers
    const { data: tiers, error: tiersError } = await adminClient
      .from("tiers")
      .select("*")
      .order("min_points", { ascending: true })
    
    if (tiersError) throw tiersError
    
    // Get all levels for these tiers
    const { data: levels, error: levelsError } = await adminClient
      .from("levels")
      .select("*")
      .order("tier_id", { ascending: true })
      .order("level_number", { ascending: true })
    
    if (levelsError) throw levelsError
    
    // Group levels by tier
    const tiersWithLevels = tiers.map(tier => {
      const tierLevels = levels.filter(level => level.tier_id === tier.id);
      return {
        ...tier,
        levels: tierLevels
      }
    });
    
    return { 
      success: true, 
      data: tiersWithLevels
    }
  } catch (error: any) {
    console.error("Error fetching tiers:", error)
    return { 
      success: false, 
      error: error.message,
      message: "حدث خطأ أثناء جلب بيانات الطبقات والمستويات"
    }
  }
}

/**
 * Get user's current tier and level information
 */
export async function getUserTierInfo(userId?: string) {
  try {
    // If userId is not provided, get current user
    let userIdToUse = userId;
    
    if (!userIdToUse) {
      const currentUser = await getCurrentUser();
      userIdToUse = currentUser.id;
    }
    
    const adminClient = await createAdminClient()
    
    // MODIFIED: First try to get points from student_points table (most accurate)
    let userPoints = 0;
    
    // 1. Check student_points table first (most accurate source)
    try {
      const { data: studentPoints, error: studentPointsError } = await adminClient
        .from("student_points")
        .select("points")
        .eq("student_id", userIdToUse)
        .single();
      
      if (!studentPointsError && studentPoints && studentPoints.points >= 0) {
        userPoints = studentPoints.points;
        console.log(`[getUserTierInfo] Got points from student_points table: ${userPoints}`);
      } else {
        console.log(`[getUserTierInfo] No points found in student_points table, falling back to RPC`);
        
        // 2. Fall back to RPC function if not found in student_points
        const { data: pointsData } = await adminClient.rpc('calculate_user_points', {
          user_id: userIdToUse
        });
        
        userPoints = pointsData || 0;
        console.log(`[getUserTierInfo] Got points from RPC: ${userPoints}`);
        
        // 3. Update student_points table if it doesn't match what we got from RPC
        if (userPoints > 0) {
          try {
            // Check if record exists first
            const { count } = await adminClient
              .from("student_points")
              .select("*", { count: "exact", head: true })
              .eq("student_id", userIdToUse);
              
            if (count && count > 0) {
              // Update existing record
              await adminClient
                .from("student_points")
                .update({ points: userPoints })
                .eq("student_id", userIdToUse);
            } else {
              // Create new record
              await adminClient
                .from("student_points")
                .insert({ student_id: userIdToUse, points: userPoints });
            }
            
            console.log(`[getUserTierInfo] Updated student_points table with ${userPoints} points`);
          } catch (updateError) {
            console.error(`[getUserTierInfo] Error updating student_points:`, updateError);
          }
        }
      }
    } catch (pointsError) {
      console.error(`[getUserTierInfo] Error getting points:`, pointsError);
      
      // Fall back to RPC as a last resort
      const { data: pointsData } = await adminClient.rpc('calculate_user_points', {
        user_id: userIdToUse
      });
      
      userPoints = pointsData || 0;
    }
    
    // Get user's current tier
    const { data: userTiers, error: userTiersError } = await adminClient
      .from("user_tiers")
      .select(`
        id,
        tier_id,
        current_level_id,
        achieved_at,
        tiers (
          id,
          name,
          description,
          min_points,
          max_points,
          color,
          icon_url
        ),
        levels (
          id,
          name,
          tier_id,
          level_number,
          description,
          min_points,
          max_points,
          icon_url,
          reward_points
        )
      `)
      .eq("user_id", userIdToUse)
      .order("achieved_at", { ascending: false })
    
    if (userTiersError) throw userTiersError
    
    // Find which tier the user should be in based on points
    const { data: currentTier, error: currentTierError } = await adminClient
      .from("tiers")
      .select("*")
      .lte("min_points", userPoints)
      .gte("max_points", userPoints)
      .order("min_points", { ascending: true })
      .limit(1)
      .single()
    
    if (currentTierError && currentTierError.code !== 'PGRST116') {
      // Ignore not found error, but throw other errors
      throw currentTierError
    }
    
    // Find the current level within tier
    let currentLevel = null;
    if (currentTier) {
      const { data: levelData, error: levelError } = await adminClient
        .from("levels")
        .select("*")
        .eq("tier_id", currentTier.id)
        .lte("min_points", userPoints)
        .gte("max_points", userPoints)
        .order("level_number", { ascending: true })
        .limit(1)
        .single()
      
      if (levelError && levelError.code !== 'PGRST116') {
        // Ignore not found error, but throw other errors
        throw levelError
      }
      
      currentLevel = levelData;
    }
    
    // Get the next tier and points needed
    let nextTier = null;
    let pointsToNextTier = 0;
    
    if (currentTier) {
      const { data: nextTierData, error: nextTierError } = await adminClient
        .from("tiers")
        .select("*")
        .gt("min_points", currentTier.max_points)
        .order("min_points", { ascending: true })
        .limit(1)
        .single()
      
      if (nextTierError && nextTierError.code !== 'PGRST116') {
        // Ignore not found error, but throw other errors
        throw nextTierError
      }
      
      if (nextTierData) {
        nextTier = nextTierData;
        pointsToNextTier = nextTier.min_points - userPoints;
      }
    }
    
    // Get the next level within current tier
    let nextLevel = null;
    let pointsToNextLevel = 0;
    
    if (currentTier && currentLevel) {
      const { data: nextLevelData, error: nextLevelError } = await adminClient
        .from("levels")
        .select("*")
        .eq("tier_id", currentTier.id)
        .gt("min_points", currentLevel.max_points)
        .order("min_points", { ascending: true })
        .limit(1)
        .single()
      
      if (nextLevelError && nextLevelError.code !== 'PGRST116') {
        // Ignore not found error, but throw other errors
        throw nextLevelError
      }
      
      if (nextLevelData) {
        nextLevel = nextLevelData;
        pointsToNextLevel = nextLevel.min_points - userPoints;
      }
    }
    
    return {
      success: true,
      data: {
        points: userPoints,
        tierHistory: userTiers || [],
        currentTier,
        currentLevel,
        nextTier,
        nextLevel,
        pointsToNextTier,
        pointsToNextLevel,
        progress: currentLevel ? {
          levelProgress: currentLevel ? Math.min(100, Math.round(((userPoints - currentLevel.min_points) / (currentLevel.max_points - currentLevel.min_points)) * 100)) : 0,
          tierProgress: currentTier ? Math.min(100, Math.round(((userPoints - currentTier.min_points) / (currentTier.max_points - currentTier.min_points)) * 100)) : 0
        } : null
      }
    }
  } catch (error: any) {
    console.error("Error fetching user tier info:", error)
    return { 
      success: false, 
      error: error.message,
      message: "حدث خطأ أثناء جلب بيانات مستوى المستخدم"
    }
  }
}

/**
 * Get tier rewards available for a specific tier or level
 */
export async function getTierRewards(tierId?: number, levelId?: number) {
  try {
    const adminClient = await createAdminClient()
    
    let query = adminClient
      .from("tier_rewards")
      .select(`
        *,
        tiers (id, name),
        levels (id, name, level_number)
      `)
    
    if (tierId) {
      query = query.eq("tier_id", tierId)
    }
    
    if (levelId) {
      query = query.eq("level_id", levelId)
    }
    
    const { data, error } = await query.order("id", { ascending: true })
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error: any) {
    console.error("Error fetching tier rewards:", error)
    return { 
      success: false, 
      error: error.message,
      message: "حدث خطأ أثناء جلب بيانات المكافآت"
    }
  }
}

/**
 * Get user's tier rewards
 */
export async function getUserTierRewards(userId?: string) {
  try {
    // If userId is not provided, get current user
    let userIdToUse = userId;
    
    if (!userIdToUse) {
      const currentUser = await getCurrentUser();
      userIdToUse = currentUser.id;
    }
    
    const adminClient = await createAdminClient()
    
    const { data, error } = await adminClient
      .from("user_tier_rewards")
      .select(`
        id,
        awarded_at,
        tier_rewards (
          id,
          name,
          description,
          reward_type,
          points_value,
          coupon_code,
          special_data,
          tier_id,
          level_id,
          tiers (id, name),
          levels (id, name, level_number)
        )
      `)
      .eq("user_id", userIdToUse)
      .order("awarded_at", { ascending: false })
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error: any) {
    console.error("Error fetching user tier rewards:", error)
    return { 
      success: false, 
      error: error.message,
      message: "حدث خطأ أثناء جلب بيانات مكافآت المستخدم"
    }
  }
} 