"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// Enhanced function to transfer points with additional validation and features
export async function transferPointsEnhanced(formData: FormData) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return { success: false, message: "يجب تسجيل الدخول أولاً" }
    }

    const recipientCode = formData.get("recipientCode") as string
    const points = Number.parseInt(formData.get("points") as string)
    const description = formData.get("description") as string
    const category = (formData.get("category") as string) || null

    if (!recipientCode || !points) {
      return { success: false, message: "جميع الحقول مطلوبة" }
    }

    if (points <= 0) {
      return { success: false, message: "يجب أن تكون النقاط أكبر من صفر" }
    }

    // Get sender's current points with a more efficient query using the RPC function
    const { data: senderTotalPoints, error: pointsError } = await supabase.rpc("calculate_user_points", {
      user_id_param: session.user.id,
    })

    if (pointsError) throw pointsError

    if (senderTotalPoints < points) {
      return { success: false, message: "لا يوجد لديك رصيد كافي من النقاط" }
    }

    // Get recipient user with additional information
    const { data: recipientUser, error: recipientError } = await supabase
      .from("users")
      .select("id, full_name, user_code, role_id")
      .eq("user_code", recipientCode)
      .single()

    if (recipientError || !recipientUser) {
      return { success: false, message: "لم يتم العثور على المستخدم المستلم" }
    }

    if (recipientUser.id === session.user.id) {
      return { success: false, message: "لا يمكن تحويل النقاط لنفسك" }
    }

    // Get sender information for better logging
    const { data: senderUser } = await supabase
      .from("users")
      .select("full_name, user_code")
      .eq("id", session.user.id)
      .single()

    // Start a transaction
    const { data: transfer, error: transferError } = await supabase
      .from("point_transfers")
      .insert({
        sender_id: session.user.id,
        recipient_id: recipientUser.id,
        points: points,
        description: description || "تحويل نقاط",
        category_id: category ? Number.parseInt(category) : null,
      })
      .select()

    if (transferError) {
      throw transferError
    }

    // Deduct points from sender
    const { error: senderError } = await supabase.from("points_transactions").insert({
      user_id: session.user.id,
      points: points,
      is_positive: false,
      description: `تحويل نقاط إلى ${recipientUser.full_name} (${recipientCode})`,
      created_by: session.user.id,
      category_id: category ? Number.parseInt(category) : null,
    })

    if (senderError) {
      throw senderError
    }

    // Add points to recipient
    const { error: recipientPointsError } = await supabase.from("points_transactions").insert({
      user_id: recipientUser.id,
      points: points,
      is_positive: true,
      description: `استلام نقاط من ${senderUser?.full_name || ""} (${senderUser?.user_code || ""})`,
      created_by: session.user.id,
      category_id: category ? Number.parseInt(category) : null,
    })

    if (recipientPointsError) {
      throw recipientPointsError
    }

    // Add notification for recipient with more details
    await supabase.from("notifications").insert({
      user_id: recipientUser.id,
      title: "استلام نقاط",
      content: `لقد استلمت ${points} نقطة من ${senderUser?.full_name || ""} (${senderUser?.user_code || ""})${
        description ? ` - ${description}` : ""
      }`,
    })

    // Log activity with more details
    await supabase.from("activity_log").insert({
      user_id: session.user.id,
      action_type: "transfer_points",
      description: `تحويل ${points} نقطة إلى ${recipientUser.full_name} (${recipientCode})${
        description ? ` - ${description}` : ""
      }`,
      metadata: {
        recipient_id: recipientUser.id,
        points: points,
        category_id: category ? Number.parseInt(category) : null,
      },
    })

    // Revalidate relevant paths
    revalidatePath("/student/statement")
    revalidatePath("/student")

    return {
      success: true,
      message: `تم تحويل ${points} نقطة إلى ${recipientUser.full_name} بنجاح`,
      data: {
        transferId: transfer?.[0]?.id,
        recipientName: recipientUser.full_name,
        points: points,
      },
    }
  } catch (error: any) {
    console.error("Error transferring points:", error)
    return {
      success: false,
      message: error.message || "حدث خطأ أثناء تحويل النقاط",
    }
  }
}

// Batch add points to multiple users (for admin)
export async function batchAddPoints(formData: FormData) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return { success: false, message: "يجب تسجيل الدخول أولاً" }
    }

    // Check if user is admin
    const { data: userData } = await supabase.from("users").select("role_id").eq("id", session.user.id).single()

    if (!userData || userData.role_id !== 4) {
      return { success: false, message: "ليس لديك صلاحية لإضافة نقاط" }
    }

    const userCodes = (formData.get("userCodes") as string).split(",").map((code) => code.trim())
    const points = Number.parseInt(formData.get("points") as string)
    const isPositive = formData.get("isPositive") === "true"
    const categoryId = formData.get("categoryId") as string ? Number.parseInt(formData.get("categoryId") as string) : null
    const description = formData.get("description") as string

    if (userCodes.length === 0) {
      return { success: false, message: "يجب إدخال رمز مستخدم واحد على الأقل" }
    }

    // Calculate final points value and get category details
    let finalPoints = points;
    let categoryDetails = null;
    
    if (categoryId) {
      // Get category details including mandatory/restricted status
      const { data: categoryData } = await supabase
        .from("point_categories")
        .select("default_points, is_positive, is_mandatory, is_restricted")
        .eq("id", categoryId)
        .single();
      
      // Store category details for later use
      categoryDetails = categoryData;
      
      // If category exists and no points were specified, use the category's default points
      if (categoryData) {
        // If points is 0 or not specified, use category default
        if (!points || points <= 0) {
          finalPoints = categoryData.default_points;
        }
      }
    }

    if (finalPoints <= 0) {
      return { success: false, message: "يجب أن تكون النقاط أكبر من صفر" }
    }

    // Get users
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, full_name, user_code")
      .in("user_code", userCodes)

    if (usersError) throw usersError

    if (!users || users.length === 0) {
      return { success: false, message: "لم يتم العثور على أي مستخدم بالرموز المدخلة" }
    }

    // Find missing user codes
    const foundUserCodes = users.map((user) => user.user_code)
    const missingUserCodes = userCodes.filter((code) => !foundUserCodes.includes(code))

    // Add points transactions for all found users
    const pointsTransactions = users.map((user) => ({
      user_id: user.id,
      category_id: categoryId,
      points: finalPoints,
      is_positive: isPositive,
      description: description || (isPositive ? "إضافة نقاط" : "خصم نقاط"),
      created_by: session.user.id,
    }))

    const { error: pointsError } = await supabase.from("points_transactions").insert(pointsTransactions)

    if (pointsError) throw pointsError

    // Handle restricted points for negative transactions
    if (!isPositive && categoryDetails && categoryDetails.is_restricted) {
      // Create restricted points entries for each user
      const restrictedPoints = users.map((user) => ({
        user_id: user.id,
        category_id: categoryId,
        points: finalPoints,
        created_by: session.user.id,
        is_resolved: false,
      }))

      const { error: restrictedError } = await supabase.from("restricted_points").insert(restrictedPoints)

      if (restrictedError) {
        console.error("Error creating restricted points:", restrictedError)
        // Continue execution even if this fails
      }
    }

    // Add notifications for all users with appropriate message based on category type
    const notifications = users.map((user) => {
      let title = isPositive ? "إضافة نقاط" : "خصم نقاط";
      let content = `تم ${isPositive ? "إضافة" : "خصم"} ${finalPoints} نقطة ${description ? `(${description})` : ""}`;
      
      // Add more context if this is a restricted/mandatory negative point
      if (!isPositive && categoryDetails) {
        if (categoryDetails.is_mandatory) {
          content += " - تم خصم النقاط تلقائياً";
        } else {
          content += " - يمكنك دفع هذه النقاط في أي وقت";
        }
        
        if (categoryDetails.is_restricted) {
          content += " - هذه النقاط مقيدة وتحتاج إلى إذن الإداري للدفع";
        }
      }
      
      return {
        user_id: user.id,
        title,
        content
      };
    });

    await supabase.from("notifications").insert(notifications)

    // Log activity with more detailed metadata
    await supabase.from("activity_log").insert({
      user_id: session.user.id,
      action_type: isPositive ? "batch_add_points" : "batch_deduct_points",
      description: `${isPositive ? "إضافة" : "خصم"} ${finalPoints} نقطة لـ ${users.length} مستخدم`,
      metadata: {
        user_count: users.length,
        points: finalPoints,
        is_positive: isPositive,
        category_id: categoryId,
        is_mandatory: categoryDetails?.is_mandatory,
        is_restricted: categoryDetails?.is_restricted,
        user_ids: users.map((u) => u.id),
      },
    })

    // Revalidate relevant paths
    revalidatePath("/admin/points")

    return {
      success: true,
      message: `تم ${isPositive ? "إضافة" : "خصم"} النقاط بنجاح لـ ${users.length} مستخدم`,
      data: {
        processedCount: users.length,
        missingUserCodes: missingUserCodes.length > 0 ? missingUserCodes : null,
      },
    }
  } catch (error: any) {
    console.error("Error adding points:", error)
    return {
      success: false,
      message: error.message || "حدث خطأ أثناء إضافة النقاط",
    }
  }
}

// Get user's points analytics with categories and history
export async function getUserPointsAnalytics(userId?: string) {
  try {
    const supabase = await createClient()

    // If no userId provided, get the current user
    if (!userId) {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        return { success: false, message: "يجب تسجيل الدخول أولاً" }
      }
      userId = session.user.id
    }

    // First get total points
    const { data: totalPoints, error: pointsError } = await supabase.rpc("calculate_user_points", {
      user_id_param: userId,
    })

    if (pointsError) {
      console.error("Error fetching total points:", pointsError)
      // Don't throw, continue with partial data
    }

    try {
      // Get points by category - with error handling
      const { data: categoriesData, error: categoriesError } = await supabase.rpc("get_points_by_category", {
        user_id_param: userId,
      })

      if (categoriesError) {
        console.error("Error fetching points analytics:", categoriesError)
        // Don't throw, try to use the manual query as fallback
      }

      // If the RPC fails, use a manual query as fallback
      let categoryResults = categoriesData || []
      
      if (categoriesError || !categoryResults) {
        // Fallback query to manually calculate points by category
        const { data: transactions } = await supabase
          .from("points_transactions")
          .select(`
            points,
            is_positive,
            point_categories!inner(
              id,
              name
            )
          `)
          .eq("user_id", userId)
        
        if (transactions) {
          // Manually calculate totals
          const categoryMap = new Map()
          
          transactions.forEach(tx => {
            const key = `${tx.point_categories?.id || 0}-${tx.is_positive}`
            if (!categoryMap.has(key)) {
              categoryMap.set(key, {
                category_id: tx.point_categories?.id || 0,
                category_name: tx.point_categories?.name || "غير مصنف",
                total_points: 0,
                is_positive: tx.is_positive
              })
            }
            
            const entry = categoryMap.get(key)
            entry.total_points += tx.points
          })
          
          categoryResults = Array.from(categoryMap.values())
        }
      }

      // Get recent transactions
      const { data: recentTransactions, error: transactionsError } = await supabase
        .from("points_transactions")
        .select(`
          id,
          points,
          is_positive,
          description,
          created_at,
          point_categories(id, name)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10)

      if (transactionsError) {
        console.error("Error fetching recent transactions:", transactionsError)
        // Don't throw, continue with partial data
      }

      // Get points by month for the past 6 months
      const { data: monthlyData, error: monthlyError } = await supabase.rpc("get_points_by_month", {
        user_id_param: userId,
        months_count: 6,
      })

      if (monthlyError) {
        console.error("Error fetching monthly data:", monthlyError)
        // Don't throw, continue with partial data
      }

      return {
        success: true,
        data: {
          totalPoints: totalPoints || 0,
          categoriesData: categoryResults || [],
          recentTransactions: recentTransactions || [],
          monthlyData: monthlyData || [],
        },
      }
    } catch (error) {
      console.error("Error in internal getUserPointsAnalytics:", error)
      // Return a basic response with just the total points
      return {
        success: true,
        data: {
          totalPoints: totalPoints || 0,
          categoriesData: [],
          recentTransactions: [],
          monthlyData: [],
        },
      }
    }
  } catch (error: any) {
    console.error("Error in getUserPointsAnalytics:", error)
    return {
      success: false,
      message: error.message || "حدث خطأ أثناء جلب بيانات النقاط",
    }
  }
}

// Get leaderboard with more details
export async function getEnhancedLeaderboard(
  options: { limit?: number; period?: "week" | "month" | "year" | "all" } = {},
) {
  try {
    const supabase = await createClient()
    const { limit = 10, period = "month" } = options

    const query = supabase.rpc("get_leaderboard", {
      time_period: period,
      results_limit: limit,
    })

    const { data, error } = await query

    if (error) throw error

    return {
      success: true,
      data: data || [],
    }
  } catch (error: any) {
    console.error("Error fetching leaderboard:", error)
    return {
      success: false,
      message: error.message || "حدث خطأ أثناء جلب قائمة المتصدرين",
    }
  }
}
