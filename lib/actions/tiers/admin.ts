"use server"

import { createAdminClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/utils/auth"
import { revalidatePath } from "next/cache"

/**
 * Create a new tier
 */
export async function createTier(
  name: string, 
  description: string | null, 
  minPoints: number, 
  maxPoints: number,
  color: string | null
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (currentUser.role_id !== 4) {
      return {
        success: false,
        error: "Unauthorized",
        message: "يجب أن تكون مديرًا للقيام بهذه العملية"
      }
    }
    
    if (minPoints >= maxPoints) {
      return {
        success: false,
        error: "Invalid points range",
        message: "الحد الأدنى للنقاط يجب أن يكون أقل من الحد الأقصى"
      }
    }
    
    const adminClient = await createAdminClient()
    
    // Check if there's any overlap with existing tiers
    const { data: overlappingTiers, error: overlapError } = await adminClient
      .from("tiers")
      .select("id, name")
      .or(`min_points.lte.${maxPoints},max_points.gte.${minPoints}`)
    
    if (overlapError) throw overlapError
    
    if (overlappingTiers && overlappingTiers.length > 0) {
      return {
        success: false,
        error: "Overlapping tiers",
        message: `هناك تداخل مع طبقات أخرى: ${overlappingTiers.map(t => t.name).join(', ')}`
      }
    }
    
    // Insert the new tier
    const { data, error } = await adminClient
      .from("tiers")
      .insert({
        name,
        description,
        min_points: minPoints,
        max_points: maxPoints,
        color
      })
      .select()
      .single()
    
    if (error) throw error
    
    revalidatePath('/admin/tiers')
    
    return {
      success: true,
      data,
      message: "تمت إضافة الطبقة بنجاح"
    }
  } catch (error: any) {
    console.error("Error creating tier:", error)
    return {
      success: false,
      error: error.message,
      message: "حدث خطأ أثناء إنشاء الطبقة"
    }
  }
}

/**
 * Update an existing tier
 */
export async function updateTier(
  tierId: number,
  name: string, 
  description: string | null, 
  minPoints: number, 
  maxPoints: number,
  color: string | null
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (currentUser.role_id !== 4) {
      return {
        success: false,
        error: "Unauthorized",
        message: "يجب أن تكون مديرًا للقيام بهذه العملية"
      }
    }
    
    if (minPoints >= maxPoints) {
      return {
        success: false,
        error: "Invalid points range",
        message: "الحد الأدنى للنقاط يجب أن يكون أقل من الحد الأقصى"
      }
    }
    
    const adminClient = await createAdminClient()
    
    // Check if there's any overlap with existing tiers (excluding this tier)
    const { data: overlappingTiers, error: overlapError } = await adminClient
      .from("tiers")
      .select("id, name")
      .neq("id", tierId)
      .or(`min_points.lte.${maxPoints},max_points.gte.${minPoints}`)
    
    if (overlapError) throw overlapError
    
    if (overlappingTiers && overlappingTiers.length > 0) {
      return {
        success: false,
        error: "Overlapping tiers",
        message: `هناك تداخل مع طبقات أخرى: ${overlappingTiers.map(t => t.name).join(', ')}`
      }
    }
    
    // Update the tier
    const { data, error } = await adminClient
      .from("tiers")
      .update({
        name,
        description,
        min_points: minPoints,
        max_points: maxPoints,
        color
      })
      .eq("id", tierId)
      .select()
      .single()
    
    if (error) throw error
    
    revalidatePath('/admin/tiers')
    
    return {
      success: true,
      data,
      message: "تم تحديث الطبقة بنجاح"
    }
  } catch (error: any) {
    console.error("Error updating tier:", error)
    return {
      success: false,
      error: error.message,
      message: "حدث خطأ أثناء تحديث الطبقة"
    }
  }
}

/**
 * Delete a tier
 */
export async function deleteTier(tierId: number) {
  try {
    const currentUser = await getCurrentUser();
    
    if (currentUser.role_id !== 4) {
      return {
        success: false,
        error: "Unauthorized",
        message: "يجب أن تكون مديرًا للقيام بهذه العملية"
      }
    }
    
    const adminClient = await createAdminClient()
    
    // Check if there are any users with this tier
    const { data: userTiers, error: userTiersError } = await adminClient
      .from("user_tiers")
      .select("id")
      .eq("tier_id", tierId)
      .limit(1)
    
    if (userTiersError) throw userTiersError
    
    if (userTiers && userTiers.length > 0) {
      return {
        success: false,
        error: "Tier in use",
        message: "لا يمكن حذف هذه الطبقة لأنها مستخدمة من قبل بعض المستخدمين"
      }
    }
    
    // Delete the tier
    const { error } = await adminClient
      .from("tiers")
      .delete()
      .eq("id", tierId)
    
    if (error) throw error
    
    revalidatePath('/admin/tiers')
    
    return {
      success: true,
      message: "تم حذف الطبقة بنجاح"
    }
  } catch (error: any) {
    console.error("Error deleting tier:", error)
    return {
      success: false,
      error: error.message,
      message: "حدث خطأ أثناء حذف الطبقة"
    }
  }
}

/**
 * Create a new level
 */
export async function createLevel(
  tierId: number,
  name: string, 
  levelNumber: number,
  description: string | null, 
  minPoints: number, 
  maxPoints: number,
  rewardPoints: number
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (currentUser.role_id !== 4) {
      return {
        success: false,
        error: "Unauthorized",
        message: "يجب أن تكون مديرًا للقيام بهذه العملية"
      }
    }
    
    if (minPoints >= maxPoints) {
      return {
        success: false,
        error: "Invalid points range",
        message: "الحد الأدنى للنقاط يجب أن يكون أقل من الحد الأقصى"
      }
    }
    
    const adminClient = await createAdminClient()
    
    // Get the tier to check if points are within tier range
    const { data: tier, error: tierError } = await adminClient
      .from("tiers")
      .select("min_points, max_points")
      .eq("id", tierId)
      .single()
    
    if (tierError) throw tierError
    
    if (minPoints < tier.min_points || maxPoints > tier.max_points) {
      return {
        success: false,
        error: "Points out of tier range",
        message: `نقاط المستوى يجب أن تكون ضمن نطاق الطبقة (${tier.min_points} - ${tier.max_points})`
      }
    }
    
    // Check if there's any overlap with existing levels in this tier
    const { data: overlappingLevels, error: overlapError } = await adminClient
      .from("levels")
      .select("id, name")
      .eq("tier_id", tierId)
      .or(`min_points.lte.${maxPoints},max_points.gte.${minPoints}`)
    
    if (overlapError) throw overlapError
    
    if (overlappingLevels && overlappingLevels.length > 0) {
      return {
        success: false,
        error: "Overlapping levels",
        message: `هناك تداخل مع مستويات أخرى: ${overlappingLevels.map(l => l.name).join(', ')}`
      }
    }
    
    // Check if the level number is already used
    const { data: existingLevelNumber, error: levelNumberError } = await adminClient
      .from("levels")
      .select("id")
      .eq("tier_id", tierId)
      .eq("level_number", levelNumber)
      .limit(1)
    
    if (levelNumberError) throw levelNumberError
    
    if (existingLevelNumber && existingLevelNumber.length > 0) {
      return {
        success: false,
        error: "Level number in use",
        message: `رقم المستوى ${levelNumber} مستخدم بالفعل في هذه الطبقة`
      }
    }
    
    // Insert the new level
    const { data, error } = await adminClient
      .from("levels")
      .insert({
        tier_id: tierId,
        name,
        level_number: levelNumber,
        description,
        min_points: minPoints,
        max_points: maxPoints,
        reward_points: rewardPoints
      })
      .select()
      .single()
    
    if (error) throw error
    
    revalidatePath('/admin/tiers')
    
    return {
      success: true,
      data,
      message: "تمت إضافة المستوى بنجاح"
    }
  } catch (error: any) {
    console.error("Error creating level:", error)
    return {
      success: false,
      error: error.message,
      message: "حدث خطأ أثناء إنشاء المستوى"
    }
  }
}

/**
 * Update an existing level
 */
export async function updateLevel(
  levelId: number,
  tierId: number,
  name: string, 
  levelNumber: number,
  description: string | null, 
  minPoints: number, 
  maxPoints: number,
  rewardPoints: number
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (currentUser.role_id !== 4) {
      return {
        success: false,
        error: "Unauthorized",
        message: "يجب أن تكون مديرًا للقيام بهذه العملية"
      }
    }
    
    if (minPoints >= maxPoints) {
      return {
        success: false,
        error: "Invalid points range",
        message: "الحد الأدنى للنقاط يجب أن يكون أقل من الحد الأقصى"
      }
    }
    
    const adminClient = await createAdminClient()
    
    // Get the tier to check if points are within tier range
    const { data: tier, error: tierError } = await adminClient
      .from("tiers")
      .select("min_points, max_points")
      .eq("id", tierId)
      .single()
    
    if (tierError) throw tierError
    
    if (minPoints < tier.min_points || maxPoints > tier.max_points) {
      return {
        success: false,
        error: "Points out of tier range",
        message: `نقاط المستوى يجب أن تكون ضمن نطاق الطبقة (${tier.min_points} - ${tier.max_points})`
      }
    }
    
    // Check if there's any overlap with existing levels in this tier (excluding this level)
    const { data: overlappingLevels, error: overlapError } = await adminClient
      .from("levels")
      .select("id, name")
      .eq("tier_id", tierId)
      .neq("id", levelId)
      .or(`min_points.lte.${maxPoints},max_points.gte.${minPoints}`)
    
    if (overlapError) throw overlapError
    
    if (overlappingLevels && overlappingLevels.length > 0) {
      return {
        success: false,
        error: "Overlapping levels",
        message: `هناك تداخل مع مستويات أخرى: ${overlappingLevels.map(l => l.name).join(', ')}`
      }
    }
    
    // Check if the level number is already used by another level
    const { data: existingLevelNumber, error: levelNumberError } = await adminClient
      .from("levels")
      .select("id")
      .eq("tier_id", tierId)
      .eq("level_number", levelNumber)
      .neq("id", levelId)
      .limit(1)
    
    if (levelNumberError) throw levelNumberError
    
    if (existingLevelNumber && existingLevelNumber.length > 0) {
      return {
        success: false,
        error: "Level number in use",
        message: `رقم المستوى ${levelNumber} مستخدم بالفعل في هذه الطبقة`
      }
    }
    
    // Update the level
    const { data, error } = await adminClient
      .from("levels")
      .update({
        tier_id: tierId,
        name,
        level_number: levelNumber,
        description,
        min_points: minPoints,
        max_points: maxPoints,
        reward_points: rewardPoints
      })
      .eq("id", levelId)
      .select()
      .single()
    
    if (error) throw error
    
    revalidatePath('/admin/tiers')
    
    return {
      success: true,
      data,
      message: "تم تحديث المستوى بنجاح"
    }
  } catch (error: any) {
    console.error("Error updating level:", error)
    return {
      success: false,
      error: error.message,
      message: "حدث خطأ أثناء تحديث المستوى"
    }
  }
}

/**
 * Delete a level
 */
export async function deleteLevel(levelId: number) {
  try {
    const currentUser = await getCurrentUser();
    
    if (currentUser.role_id !== 4) {
      return {
        success: false,
        error: "Unauthorized",
        message: "يجب أن تكون مديرًا للقيام بهذه العملية"
      }
    }
    
    const adminClient = await createAdminClient()
    
    // Check if there are any users with this level
    const { data: userLevels, error: userLevelsError } = await adminClient
      .from("user_tiers")
      .select("id")
      .eq("current_level_id", levelId)
      .limit(1)
    
    if (userLevelsError) throw userLevelsError
    
    if (userLevels && userLevels.length > 0) {
      return {
        success: false,
        error: "Level in use",
        message: "لا يمكن حذف هذا المستوى لأنه مستخدم من قبل بعض المستخدمين"
      }
    }
    
    // Delete the level
    const { error } = await adminClient
      .from("levels")
      .delete()
      .eq("id", levelId)
    
    if (error) throw error
    
    revalidatePath('/admin/tiers')
    
    return {
      success: true,
      message: "تم حذف المستوى بنجاح"
    }
  } catch (error: any) {
    console.error("Error deleting level:", error)
    return {
      success: false,
      error: error.message,
      message: "حدث خطأ أثناء حذف المستوى"
    }
  }
}

/**
 * Create a tier reward
 */
export async function createTierReward(
  name: string,
  description: string | null,
  tierId: number,
  levelId: number | null,
  rewardType: 'points' | 'badge' | 'coupon' | 'special',
  pointsValue: number = 0,
  badgeId: number | null = null,
  couponCode: string | null = null,
  specialData: any = null
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (currentUser.role_id !== 4) {
      return {
        success: false,
        error: "Unauthorized",
        message: "يجب أن تكون مديرًا للقيام بهذه العملية"
      }
    }
    
    const adminClient = await createAdminClient()
    
    // Validate based on reward type
    if (rewardType === 'points' && pointsValue <= 0) {
      return {
        success: false,
        error: "Invalid points value",
        message: "يجب أن تكون قيمة النقاط أكبر من الصفر"
      }
    }
    
    if (rewardType === 'badge' && !badgeId) {
      return {
        success: false,
        error: "Badge required",
        message: "يجب اختيار شارة للمكافأة"
      }
    }
    
    if (rewardType === 'coupon' && !couponCode) {
      return {
        success: false,
        error: "Coupon code required",
        message: "يجب إدخال رمز كوبون للمكافأة"
      }
    }
    
    // Create the reward
    const { data, error } = await adminClient
      .from("tier_rewards")
      .insert({
        name,
        description,
        tier_id: tierId,
        level_id: levelId,
        reward_type: rewardType,
        points_value: rewardType === 'points' ? pointsValue : 0,
        badge_id: rewardType === 'badge' ? badgeId : null,
        coupon_code: rewardType === 'coupon' ? couponCode : null,
        special_data: rewardType === 'special' ? specialData : null
      })
      .select()
      .single()
    
    if (error) throw error
    
    revalidatePath('/admin/tiers/rewards')
    
    return {
      success: true,
      data,
      message: "تمت إضافة المكافأة بنجاح"
    }
  } catch (error: any) {
    console.error("Error creating tier reward:", error)
    return {
      success: false,
      error: error.message,
      message: "حدث خطأ أثناء إنشاء المكافأة"
    }
  }
}

/**
 * Update a tier reward
 */
export async function updateTierReward(
  rewardId: number,
  name: string,
  description: string | null,
  tierId: number,
  levelId: number | null,
  rewardType: 'points' | 'badge' | 'coupon' | 'special',
  pointsValue: number = 0,
  badgeId: number | null = null,
  couponCode: string | null = null,
  specialData: any = null
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (currentUser.role_id !== 4) {
      return {
        success: false,
        error: "Unauthorized",
        message: "يجب أن تكون مديرًا للقيام بهذه العملية"
      }
    }
    
    const adminClient = await createAdminClient()
    
    // Validate based on reward type
    if (rewardType === 'points' && pointsValue <= 0) {
      return {
        success: false,
        error: "Invalid points value",
        message: "يجب أن تكون قيمة النقاط أكبر من الصفر"
      }
    }
    
    if (rewardType === 'badge' && !badgeId) {
      return {
        success: false,
        error: "Badge required",
        message: "يجب اختيار شارة للمكافأة"
      }
    }
    
    if (rewardType === 'coupon' && !couponCode) {
      return {
        success: false,
        error: "Coupon code required",
        message: "يجب إدخال رمز كوبون للمكافأة"
      }
    }
    
    // Update the reward
    const { data, error } = await adminClient
      .from("tier_rewards")
      .update({
        name,
        description,
        tier_id: tierId,
        level_id: levelId,
        reward_type: rewardType,
        points_value: rewardType === 'points' ? pointsValue : 0,
        badge_id: rewardType === 'badge' ? badgeId : null,
        coupon_code: rewardType === 'coupon' ? couponCode : null,
        special_data: rewardType === 'special' ? specialData : null
      })
      .eq("id", rewardId)
      .select()
      .single()
    
    if (error) throw error
    
    revalidatePath('/admin/tiers/rewards')
    
    return {
      success: true,
      data,
      message: "تم تحديث المكافأة بنجاح"
    }
  } catch (error: any) {
    console.error("Error updating tier reward:", error)
    return {
      success: false,
      error: error.message,
      message: "حدث خطأ أثناء تحديث المكافأة"
    }
  }
}

/**
 * Delete a tier reward
 */
export async function deleteTierReward(rewardId: number) {
  try {
    const currentUser = await getCurrentUser();
    
    if (currentUser.role_id !== 4) {
      return {
        success: false,
        error: "Unauthorized",
        message: "يجب أن تكون مديرًا للقيام بهذه العملية"
      }
    }
    
    const adminClient = await createAdminClient()
    
    // Check if there are any users who have received this reward
    const { data: userRewards, error: userRewardsError } = await adminClient
      .from("user_tier_rewards")
      .select("id")
      .eq("tier_reward_id", rewardId)
      .limit(1)
    
    if (userRewardsError) throw userRewardsError
    
    if (userRewards && userRewards.length > 0) {
      return {
        success: false,
        error: "Reward in use",
        message: "لا يمكن حذف هذه المكافأة لأنها ممنوحة لبعض المستخدمين بالفعل"
      }
    }
    
    // Delete the reward
    const { error } = await adminClient
      .from("tier_rewards")
      .delete()
      .eq("id", rewardId)
    
    if (error) throw error
    
    revalidatePath('/admin/tiers/rewards')
    
    return {
      success: true,
      message: "تم حذف المكافأة بنجاح"
    }
  } catch (error: any) {
    console.error("Error deleting tier reward:", error)
    return {
      success: false,
      error: error.message,
      message: "حدث خطأ أثناء حذف المكافأة"
    }
  }
}

/**
 * Manually grant a tier reward to a user
 */
export async function grantTierRewardToUser(rewardId: number, userCode: string) {
  try {
    const currentUser = await getCurrentUser();
    
    if (currentUser.role_id !== 4) {
      return {
        success: false,
        error: "Unauthorized",
        message: "يجب أن تكون مديرًا للقيام بهذه العملية"
      }
    }
    
    const adminClient = await createAdminClient()
    
    // Find the user by code
    const { data: userData, error: userError } = await adminClient
      .from("users")
      .select("id")
      .eq("user_code", userCode)
      .single()
    
    if (userError) {
      if (userError.code === "PGRST116") {
        return { 
          success: false, 
          error: "المستخدم غير موجود", 
          message: "لم يتم العثور على مستخدم بهذا الرمز" 
        }
      }
      throw userError
    }
    
    // Get the reward details
    const { data: rewardData, error: rewardError } = await adminClient
      .from("tier_rewards")
      .select(`
        id, 
        name, 
        reward_type, 
        points_value, 
        badge_id, 
        coupon_code,
        tier_id,
        level_id
      `)
      .eq("id", rewardId)
      .single()
    
    if (rewardError) throw rewardError
    
    // Check if the user already has this reward
    const { data: existingReward, error: existingError } = await adminClient
      .from("user_tier_rewards")
      .select("id")
      .eq("user_id", userData.id)
      .eq("tier_reward_id", rewardId)
      .single()
    
    if (!existingError) {
      return { 
        success: false, 
        error: "Reward already granted", 
        message: "المستخدم حاصل بالفعل على هذه المكافأة" 
      }
    }
    
    // Award the reward to the user
    const { error: awardError } = await adminClient
      .from("user_tier_rewards")
      .insert({
        user_id: userData.id,
        tier_reward_id: rewardId,
        awarded_at: new Date().toISOString()
      })
    
    if (awardError) throw awardError
    
    // Handle different reward types
    if (rewardData.reward_type === 'points' && rewardData.points_value > 0) {
      // Add points transaction
      await adminClient
        .from("points_transactions")
        .insert({
          user_id: userData.id,
          points: rewardData.points_value,
          is_positive: true,
          description: `مكافأة المستوى: ${rewardData.name}`,
          created_by: currentUser.id
        })
    }
    
    if (rewardData.reward_type === 'badge' && rewardData.badge_id) {
      // Award the badge
      await adminClient
        .from("user_badges")
        .insert({
          user_id: userData.id,
          badge_id: rewardData.badge_id,
          awarded_at: new Date().toISOString()
        })
        .onConflict(['user_id', 'badge_id'])
        .ignore()
    }
    
    // Create notification
    await adminClient
      .from("notifications")
      .insert({
        user_id: userData.id,
        title: "مكافأة جديدة",
        content: `مبروك! حصلت على مكافأة "${rewardData.name}"`,
        type: "tier_reward",
        reference_id: rewardId,
        created_at: new Date().toISOString()
      })
    
    return { 
      success: true,
      message: "تم منح المكافأة للمستخدم بنجاح"
    }
  } catch (error: any) {
    console.error("Error granting reward to user:", error)
    return {
      success: false,
      error: error.message,
      message: "حدث خطأ أثناء منح المكافأة للمستخدم"
    }
  }
} 