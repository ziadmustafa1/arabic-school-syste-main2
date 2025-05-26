"use server"

import { createClient } from "@/lib/supabase/server"

interface Badge {
  id: number
  name: string
  description: string | null
  image_url: string | null
  min_points: number
  max_points: number
  badge_type: string
}

interface UserBadge {
  badge_id: number
  awarded_at: string
  badges: Badge
}

/**
 * Get top users with badges and points
 */
export async function getTopUsersWithBadges(limit: number = 10) {
  try {
    const supabase = await createClient()
    
    // Get all users with basic info
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, full_name, user_code, role_id")
      .limit(20)
    
    if (userError) {
      console.error("Error fetching users:", userError)
      return { 
        success: false, 
        message: userError.message || "خطأ في جلب بيانات المستخدمين",
        data: []
      }
    }
    
    if (!userData || userData.length === 0) {
      return { success: true, data: [] }
    }
    
    const userIds = userData.map(user => user.id)
    
    // Get user badges
    const { data: badgeData, error: badgeError } = await supabase
      .from("user_badges")
      .select("user_id, badge_id, awarded_at")
      .in("user_id", userIds)
    
    if (badgeError) {
      console.error("Error fetching user badges:", badgeError)
    }
    
    // Get user points
    const { data: pointsData, error: pointsError } = await supabase
      .from("points_transactions")
      .select("user_id, points, is_positive")
      .in("user_id", userIds)
    
    if (pointsError) {
      console.error("Error fetching points transactions:", pointsError)
    }
    
    // Calculate points for each user
    const pointsByUser: Record<string, number> = {}
    if (pointsData) {
      for (const tx of pointsData) {
        const id = tx.user_id
        if (!pointsByUser[id]) pointsByUser[id] = 0
        pointsByUser[id] += tx.is_positive ? (tx.points || 0) : -(tx.points || 0)
      }
    }
    
    // Group badges by user
    const badgesByUser: Record<string, any[]> = {}
    if (badgeData) {
      for (const badge of badgeData) {
        const id = badge.user_id
        if (!badgesByUser[id]) badgesByUser[id] = []
        badgesByUser[id].push({
          badge_id: badge.badge_id,
          awarded_at: badge.awarded_at
        })
      }
    }
    
    // Combine all data
    const usersWithData = userData.map(user => ({
      ...user,
      user_badges: badgesByUser[user.id] || [],
      total_points: pointsByUser[user.id] || 0
    }))
    
    // Sort by badges count then points
    const sortedUsers = usersWithData.sort((a, b) => {
      const badgesDiff = (b.user_badges?.length || 0) - (a.user_badges?.length || 0)
      if (badgesDiff !== 0) return badgesDiff
      return b.total_points - a.total_points
    })
    
    return { 
      success: true, 
      data: sortedUsers.slice(0, limit) 
    }
  } catch (error: any) {
    console.error("Error in getTopUsersWithBadges:", error)
    return { 
      success: false, 
      message: error.message || "حدث خطأ أثناء جلب بيانات المستخدمين",
      data: []
    }
  }
}

/**
 * Check if user is eligible for new badges and award them
 */
export async function checkAndAwardBadges(userId: string) {
  try {
    const supabase = await createClient()
    
    // Get user's total points
    const { data: userPointsData, error: userPointsError } = await supabase.rpc("get_user_points_balance", {
      user_id_param: userId
    })
    
    if (userPointsError) throw userPointsError
    
    const userPoints = userPointsData || 0
    
    // Get all badges the user doesn't already have
    const { data: availableBadges, error: badgesError } = await supabase
      .from("badges")
      .select("*")
      .lte("min_points", userPoints)
      .order("min_points", { ascending: true })
    
    if (badgesError) throw badgesError
    
    // Get user's existing badges
    const { data: userBadges, error: userBadgesError } = await supabase
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", userId)
    
    if (userBadgesError) throw userBadgesError
    
    const existingBadgeIds = userBadges.map((badge: { badge_id: number }) => badge.badge_id)
    
    // Filter badges user doesn't have yet
    const newBadges = availableBadges.filter(
      (badge: Badge) => !existingBadgeIds.includes(badge.id)
    )
    
    if (newBadges.length === 0) {
      return { success: true, awarded: false, message: "لا توجد شارات جديدة" }
    }
    
    // Award new badges to user
    const badgesToAward = newBadges.map((badge: Badge) => ({
      user_id: userId,
      badge_id: badge.id,
      awarded_at: new Date().toISOString()
    }))
    
    const { error: awardError } = await supabase
      .from("user_badges")
      .insert(badgesToAward)
    
    if (awardError) throw awardError
    
    // Create notifications for each badge
    const notifications = newBadges.map((badge: Badge) => ({
      user_id: userId,
      title: "تم الحصول على شارة جديدة",
      content: `مبروك! لقد حصلت على شارة جديدة: ${badge.name}`,
    }))
    
    await supabase.from("notifications").insert(notifications)
    
    return { 
      success: true, 
      awarded: true, 
      message: `تم منح ${newBadges.length} شارة جديدة`,
      badges: newBadges
    }
  } catch (error: any) {
    console.error("Error in checking/awarding badges:", error)
    return { 
      success: false, 
      awarded: false, 
      message: error.message || "حدث خطأ أثناء التحقق من الشارات"
    }
  }
}

/**
 * Get all available badges
 */
export async function getAllBadges() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from("badges")
      .select("*")
      .order("min_points", { ascending: true })
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error: any) {
    console.error("Error fetching badges:", error)
    return { 
      success: false, 
      message: error.message || "حدث خطأ أثناء جلب الشارات",
      data: []
    }
  }
}

/**
 * Get user's badges
 */
export async function getUserBadges(userId: string) {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from("user_badges")
      .select("badge_id, awarded_at, badges(*)")
      .eq("user_id", userId)
      .order("awarded_at", { ascending: false })
    
    if (error) throw error
    
    return { 
      success: true, 
      data: data.map((item: any) => ({
        ...item.badges,
        awarded_at: item.awarded_at,
        badge_id: item.badge_id
      }))
    }
  } catch (error: any) {
    console.error("Error fetching user badges:", error)
    return { 
      success: false, 
      message: error.message || "حدث خطأ أثناء جلب شارات المستخدم",
      data: []
    }
  }
} 