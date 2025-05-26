"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { checkAndAwardBadges } from "./badges"
import { ROLES, POINT_TYPES, TABLES, STATUS } from "@/lib/constants"
import { processNegativePoints, applyDeductionIfNeeded } from "@/lib/deduction-cards"

// Transfer points from one user to another
export async function transferPoints(formData: FormData) {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Get current user
    const { data, error: sessionError } = await supabase.auth.getUser()
    if (sessionError || !data.user) {
      return { success: false, message: "يجب تسجيل الدخول أولاً" }
    }

    const recipientCode = formData.get("recipientCode") as string
    const points = Number.parseInt(formData.get("points") as string)
    const description = formData.get("description") as string

    if (!recipientCode || !points) {
      return { success: false, message: "جميع الحقول مطلوبة" }
    }

    if (points <= 0) {
      return { success: false, message: "يجب أن تكون النقاط أكبر من صفر" }
    }

    // Get sender's current points using admin client
    const { data: senderPoints } = await adminClient
      .from(TABLES.POINTS_TRANSACTIONS)
      .select("points, is_positive")
      .eq("user_id", data.user.id)

    // Calculate total points
    let totalPoints = 0
    if (senderPoints && senderPoints.length > 0) {
      totalPoints = senderPoints.reduce((total, transaction) => {
        return transaction.is_positive ? total + transaction.points : total - transaction.points
      }, 0)
    }

    if (totalPoints < points) {
      return { success: false, message: "لا يوجد لديك رصيد كافي من النقاط" }
    }

    // Get recipient user using admin client
    const { data: recipientUser, error: recipientError } = await adminClient
      .from(TABLES.USERS)
      .select("id")
      .eq("user_code", recipientCode)
      .single()

    if (recipientError || !recipientUser) {
      return { success: false, message: "لم يتم العثور على المستخدم المستلم" }
    }

    if (recipientUser.id === data.user.id) {
      return { success: false, message: "لا يمكن تحويل النقاط لنفسك" }
    }

    // Start a transaction - USE ADMIN CLIENT INSTEAD OF REGULAR CLIENT
    const { data: transfer, error: transferError } = await adminClient
      .from("point_transfers")
      .insert({
        sender_id: data.user.id,
        recipient_id: recipientUser.id,
        points: points,
        description: description || "تحويل نقاط",
      })
      .select()

    if (transferError) {
      console.error("Point transfer error:", transferError)
      throw new Error("فشل في إنشاء سجل التحويل، يرجى المحاولة مرة أخرى")
    }

    // Deduct points from sender - USE ADMIN CLIENT
    const { error: senderError } = await adminClient.from(TABLES.POINTS_TRANSACTIONS).insert({
      user_id: data.user.id,
      points: points,
      is_positive: POINT_TYPES.NEGATIVE,
      description: `تحويل نقاط إلى ${recipientCode}`,
      created_by: data.user.id,
    })

    if (senderError) {
      console.error("Sender points error:", senderError)
      throw new Error("فشل في خصم النقاط من حسابك، يرجى المحاولة مرة أخرى")
    }

    // Add points to recipient - USE ADMIN CLIENT
    const { error: recipientPointsError } = await adminClient.from(TABLES.POINTS_TRANSACTIONS).insert({
      user_id: recipientUser.id,
      points: points,
      is_positive: POINT_TYPES.POSITIVE,
      description: `استلام نقاط من ${data.user.id}`,
      created_by: data.user.id,
    })

    if (recipientPointsError) {
      console.error("Recipient points error:", recipientPointsError)
      throw new Error("فشل في إضافة النقاط للمستلم، يرجى المحاولة مرة أخرى")
    }

    // Check if recipient earned any badges
    await checkAndAwardBadges(recipientUser.id)

    // Add notification for recipient - USE ADMIN CLIENT
    await adminClient.from(TABLES.NOTIFICATIONS).insert({
      user_id: recipientUser.id,
      title: "استلام نقاط",
      content: `لقد استلمت ${points} نقطة من مستخدم آخر`,
    })

    // Log activity - USE ADMIN CLIENT
    await adminClient.from("activity_log").insert({
      user_id: data.user.id,
      action_type: "transfer_points",
      description: `تحويل ${points} نقطة إلى ${recipientCode}`,
    })

    return { success: true, message: "تم تحويل النقاط بنجاح" }
  } catch (error: any) {
    console.error("Transfer points error:", error)
    return {
      success: false,
      message: error.message || "حدث خطأ أثناء تحويل النقاط",
    }
  }
}

// Add points to a user (for admin)
export async function addPoints(formData: FormData) {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Get current user
    const { data, error: sessionError } = await supabase.auth.getUser()
    if (sessionError || !data.user) {
      return { success: false, message: "يجب تسجيل الدخول أولاً" }
    }

    // Check if user is admin using admin client
    const { data: userData } = await adminClient
      .from(TABLES.USERS)
      .select("role_id")
      .eq("id", data.user.id)
      .single()

    if (!userData || userData.role_id !== ROLES.ADMIN) {
      return { success: false, message: "ليس لديك صلاحية لإضافة نقاط" }
    }

    const userCode = formData.get("userCode") as string
    const points = Number.parseInt(formData.get("points") as string)
    const isPositive = formData.get("isPositive") === "true"
    const categoryId = Number.parseInt(formData.get("categoryId") as string) || null
    const description = formData.get("description") as string

    if (!userCode || !points) {
      return { success: false, message: "جميع الحقول مطلوبة" }
    }

    if (points <= 0) {
      return { success: false, message: "يجب أن تكون النقاط أكبر من صفر" }
    }

    // Get user using admin client
    const { data: user, error: userError } = await adminClient
      .from(TABLES.USERS)
      .select("id")
      .eq("user_code", userCode)
      .single()

    if (userError || !user) {
      return { success: false, message: "لم يتم العثور على المستخدم" }
    }

    // Add points transaction
    const { error: pointsError } = await supabase.from(TABLES.POINTS_TRANSACTIONS).insert({
      user_id: user.id,
      category_id: categoryId,
      points: points,
      is_positive: isPositive,
      description: description || (isPositive ? "إضافة نقاط" : "خصم نقاط"),
      created_by: data.user.id,
    })

    if (pointsError) {
      throw pointsError
    }

    if (isPositive) {
      // Check if user earned any badges
      await checkAndAwardBadges(user.id)
    } else {
      // Process negative points for deduction cards
      await processNegativePoints(user.id, categoryId?.toString() || "", points)
    }

    // Add notification for user
    await supabase.from(TABLES.NOTIFICATIONS).insert({
      user_id: user.id,
      title: isPositive ? "إضافة نقاط" : "خصم نقاط",
      content: `تم ${isPositive ? "إضافة" : "خصم"} ${points} نقطة ${description ? `(${description})` : ""}`,
    })

    // Log activity
    await supabase.from("activity_log").insert({
      user_id: data.user.id,
      action_type: isPositive ? "add_points" : "deduct_points",
      description: `${isPositive ? "إضافة" : "خصم"} ${points} نقطة للمستخدم ${userCode}`,
    })

    return {
      success: true,
      message: `تم ${isPositive ? "إضافة" : "خصم"} النقاط بنجاح`,
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "حدث خطأ أثناء إضافة النقاط",
    }
  }
}

// Redeem a reward
export async function redeemReward(formData: FormData) {
  console.log("redeemReward function called");
  
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()
    console.log("Supabase clients created");
    
    // Get current user
    const { data, error: sessionError } = await supabase.auth.getUser()
    if (sessionError || !data.user) {
      console.error("Authentication error:", sessionError);
      return { success: false, message: "يجب تسجيل الدخول أولاً" }
    }
    console.log("Current user authenticated:", data.user.id);

    const rewardId = Number.parseInt(formData.get("rewardId") as string)
    console.log("Parsed rewardId:", rewardId);

    if (!rewardId) {
      console.error("Invalid reward ID");
      return { success: false, message: "معرف المكافأة غير صالح" }
    }

    // Get user's role using admin client to bypass RLS
    const { data: userData, error: userError } = await adminClient
      .from("users")
      .select("role_id")
      .eq("id", data.user.id)
      .single()

    if (userError) {
      console.error("Error fetching user role:", userError)
      throw userError
    }
    console.log("User role fetched:", userData);

    // Get reward details
    const { data: reward, error: rewardError } = await adminClient
      .from(TABLES.REWARDS)
      .select("*")
      .eq("id", rewardId)
      .single()

    if (rewardError || !reward) {
      console.error("Error fetching reward:", rewardError);
      return { success: false, message: "لم يتم العثور على المكافأة" }
    }
    console.log("Reward details fetched:", reward);

    // Check if reward is active
    if (!reward.is_active && reward.is_active !== undefined) {
      console.error("Reward is inactive");
      return { success: false, message: "هذه المكافأة غير متاحة حالياً" }
    }

    // Check if reward is available for the user's role
    if (userData.role_id !== reward.role_id && reward.role_id !== 0 && reward.role_id !== null) {
      console.error("Reward not available for user role");
      return { success: false, message: "هذه المكافأة غير متاحة لدورك" }
    }

    // UPDATED: First check student_points table for points
    const { data: studentPoints, error: studentPointsError } = await adminClient
      .from("student_points")
      .select("points")
      .eq("student_id", data.user.id)
      .single()
    
    let availablePoints = 0;

    // If student_points record exists, use that value
    if (!studentPointsError && studentPoints) {
      console.log("Found points in student_points table:", studentPoints.points);
      availablePoints = studentPoints.points;
    } else {
      console.log("No record in student_points table, falling back to transactions");
      
      // Get user's points transactions as fallback
    const { data: transactions, error: transactionsError } = await supabase
      .from(TABLES.POINTS_TRANSACTIONS)
      .select("points, is_positive")
      .eq("user_id", data.user.id)
    
    if (transactionsError) {
      console.error("Error fetching user transactions:", transactionsError);
    }
    console.log("User transactions fetched:", transactions?.length);

      // Calculate available points from transactions
    if (transactions && transactions.length > 0) {
      availablePoints = transactions.reduce((total, transaction) => {
        return transaction.is_positive
          ? total + transaction.points
          : total - transaction.points
      }, 0)
    }
    }
    
    console.log("Available points calculated:", availablePoints);

    // Check if user has enough points
    if (availablePoints < reward.points_cost) {
      console.error("Not enough points:", availablePoints, "needed:", reward.points_cost);
      return { success: false, message: "ليس لديك نقاط كافية لاستبدال هذه المكافأة" }
    }

    // Apply any deductions from active deduction cards
    const finalPointsCost = await applyDeductionIfNeeded(data.user.id, reward.points_cost)
    console.log("Final points cost after deductions:", finalPointsCost);

    // Generate a unique redemption code
    const generateRedemptionCode = () => {
      const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar-looking characters
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      // Add a timestamp-based suffix to ensure uniqueness
      const timestamp = Date.now().toString(36).substring(6);
      return `${code}-${timestamp}`;
    }
    
    const redemptionCode = generateRedemptionCode();
    console.log("Generated redemption code:", redemptionCode);

    console.log("Beginning redemption transaction");
    
    // UPDATED: Update student_points table as well
    if (!studentPointsError && studentPoints) {
      const newPointsBalance = studentPoints.points - finalPointsCost;
      console.log("Updating student_points table with new balance:", newPointsBalance);
      
      const { error: updateError } = await adminClient
        .from("student_points")
        .update({ points: newPointsBalance, updated_at: new Date().toISOString() })
        .eq("student_id", data.user.id);
        
      if (updateError) {
        console.error("Error updating student_points:", updateError);
        // Continue with the fallback method
      }
    }

    // 1. Deduct points from user by adding a negative transaction
    console.log("Deducting points from user using adminClient to bypass RLS");
    const { error: deductionError } = await adminClient.from(TABLES.POINTS_TRANSACTIONS).insert({
      user_id: data.user.id,
      points: finalPointsCost,
      is_positive: POINT_TYPES.NEGATIVE,
      description: `استبدال مكافأة: ${reward.name}`,
      created_by: data.user.id,
    })

    if (deductionError) {
      console.error("Error deducting points:", deductionError);
      throw deductionError
    }

    // 2. Create a record in user_rewards - Fix for both missing redeemed_value and redemption_code length
    console.log("Creating user reward record using adminClient to bypass RLS");
    
    // Construct the user_rewards record with proper null checking
    const userRewardRecord: {
      user_id: string;
      reward_id: number;
      status: string;
      redemption_code: string;
      created_by: string;
      redeemed_value?: number;
    } = {
      user_id: data.user.id,
      reward_id: rewardId,
      status: STATUS.PENDING,
      redemption_code: redemptionCode.substring(0, 12), // Ensure it fits in VARCHAR(12)
      created_by: data.user.id
    };
    
    // Only add redeemed_value if finalPointsCost exists
    if (finalPointsCost) {
      userRewardRecord.redeemed_value = finalPointsCost;
    }
    
    const { error: userRewardError } = await adminClient.from(TABLES.USER_REWARDS).insert(userRewardRecord);

    if (userRewardError) {
      console.error("Error creating user reward record:", userRewardError);
      throw userRewardError
    }

    // 3. If auto-approval is on, update the status to APPROVED
    if (reward.auto_approve) {
      console.log("Auto-approving reward");
      await supabase
        .from(TABLES.USER_REWARDS)
        .update({ status: STATUS.APPROVED })
        .eq("user_id", data.user.id)
        .eq("reward_id", rewardId)
        .eq("status", STATUS.PENDING)
    }

    // 4. Log activity
    console.log("Logging activity");
    await supabase.from("activity_log").insert({
      user_id: data.user.id,
      action_type: "redeem_reward",
      description: `استبدال مكافأة ${reward.name} مقابل ${finalPointsCost} نقطة`,
    })

    // 5. Create notification for admin
    console.log("Creating admin notification");
    await supabase.from(TABLES.NOTIFICATIONS).insert({
      user_id: data.user.id, // This will be overridden by a trigger to notify admins
      title: "طلب استبدال مكافأة",
      content: `قام المستخدم ${data.user.id} بطلب استبدال مكافأة: ${reward.name}`,
      type: "admin_notification",
    })

    // 6. Create notification for user
    console.log("Creating user notification");
    await supabase.from(TABLES.NOTIFICATIONS).insert({
      user_id: data.user.id,
      title: "استبدال مكافأة",
      content: `لقد قمت باستبدال مكافأة: ${reward.name} مقابل ${finalPointsCost} نقطة. رمز الاستبدال الخاص بك: ${redemptionCode}`,
    })

    console.log("Redemption completed successfully");
    return {
      success: true,
      message: `تم استبدال المكافأة بنجاح${reward.auto_approve ? "" : " وسيتم مراجعة طلبك"}`,
      redemptionCode: redemptionCode
    }
  } catch (error: any) {
    console.error("Error in redeemReward:", error);
    return {
      success: false,
      message: error.message || "حدث خطأ أثناء استبدال المكافأة",
    }
  }
}

// Redeem a recharge card
export async function redeemRechargeCard(formData: FormData) {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Get current user
    const { data, error: sessionError } = await supabase.auth.getUser()
    if (sessionError || !data.user) {
      return { success: false, message: "يجب تسجيل الدخول أولاً" }
    }

    const cardCode = formData.get("cardCode") as string
    if (!cardCode) {
      return { success: false, message: "رمز الكرت مطلوب" }
    }

    // Log the attempt
    console.log(`User ${data.user.id} attempting to redeem card: ${cardCode}`)
    
    // Use admin client to get card details to bypass RLS
    const { data: card, error: cardError } = await adminClient
      .from("recharge_cards")
      .select("*")
      .eq("code", cardCode)
      .single()

    // Log the card search result
    console.log("Card search result:", { card, error: cardError })

    if (cardError) {
      // If the error is a 404, the card doesn't exist
      if (cardError.code === "PGRST116") {
        console.log("Card not found:", cardCode)
        return { success: false, message: "رمز الكرت غير صحيح" }
      }
      
      // Other database error
      console.error("Database error when searching for card:", cardError)
      throw cardError
    }

    if (!card) {
      console.log("Card not found (no error):", cardCode)
      return { success: false, message: "رمز الكرت غير صحيح" }
    }

    // Check if card is already used
    if (card.is_used) {
      console.log("Card already used:", cardCode)
      return { success: false, message: "تم استخدام هذا الكرت من قبل" }
    }

    // Check if card is active
    if (card.status !== 'active') {
      console.log("Card is not active:", cardCode, card.status)
      return { success: false, message: "هذا الكرت غير نشط" }
    }

    // Create a transaction to ensure atomicity
    let pointsAdded = false
    let cardMarkedAsUsed = false

    try {
      // Step 1: Add points transaction - explicitly defining only fields that exist in database schema
      console.log("Adding points transaction with exactly matching schema")
      const pointsTransaction = {
        user_id: data.user.id,
        points: card.points,
        is_positive: true,
        description: "استخدام بطاقة شحن",
        created_by: data.user.id,
        category_id: null
        // Make sure NO extra fields are added here
      }

      console.log("Points transaction to insert:", pointsTransaction)
      const { error: pointsError } = await adminClient
        .from(TABLES.POINTS_TRANSACTIONS)
        .insert(pointsTransaction)

      if (pointsError) {
        console.error("Error adding points transaction:", pointsError)
        throw pointsError
      }
      
      pointsAdded = true
      console.log("Points transaction added successfully")

      // Step 2: Mark card as used
    const { error: updateError } = await adminClient
      .from("recharge_cards")
      .update({
        is_used: true,
        used_by: data.user.id,
        used_at: new Date().toISOString()
      })
      .eq("id", card.id)

    if (updateError) {
      console.error("Error updating card:", updateError)
      throw updateError
    }

      cardMarkedAsUsed = true
      console.log("Card marked as used successfully")

      // Step 3: Add notification
      await adminClient.from(TABLES.NOTIFICATIONS).insert({
      user_id: data.user.id,
      title: "شحن رصيد",
      content: `تم شحن رصيدك بـ ${card.points} نقطة`,
      });

      // Step 4: Log activity
    await adminClient.from("activity_log").insert({
      user_id: data.user.id,
      action_type: "redeem_card",
      description: `شحن رصيد بكرت رقم ${cardCode} (${card.points} نقطة)`,
      });

    return {
      success: true,
      message: `تم شحن رصيدك بـ ${card.points} نقطة بنجاح`,
      points: card.points
      }
    } catch (err: any) {
      console.error("Error in recharge transaction:", err)
      
      // Attempt recovery - if points were added but card not marked, mark it anyway
      if (pointsAdded && !cardMarkedAsUsed) {
        try {
          await adminClient
            .from("recharge_cards")
            .update({
              is_used: true,
              used_by: data.user.id,
              used_at: new Date().toISOString()
            })
          console.log("Recovery: Card marked as used after error")
        } catch (recoveryErr) {
          console.error("Failed to mark card as used during recovery:", recoveryErr)
        }
      }
      
      throw err
    }
  } catch (error: any) {
    console.error("Error redeeming card:", error)
    return {
      success: false,
      message: error.message || "حدث خطأ أثناء شحن الرصيد",
    }
  }
}

// Link parent to student
export async function linkParentToStudent(formData: FormData) {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Get current user
    const { data, error: sessionError } = await supabase.auth.getUser()
    if (sessionError || !data.user) {
      return { success: false, message: "يجب تسجيل الدخول أولاً" }
    }

    const studentCode = formData.get("studentCode") as string

    if (!studentCode) {
      return { success: false, message: "رمز الطالب مطلوب" }
    }

    // Check if current user is a parent using admin client
    const { data: userData } = await adminClient
      .from("users")
      .select("role_id")
      .eq("id", data.user.id)
      .single()

    if (!userData || userData.role_id !== 2) {
      return { success: false, message: "يجب أن تكون ولي أمر لربط حسابك بطالب" }
    }

    // Get student using admin client
    const { data: studentData, error: studentError } = await adminClient
      .from("users")
      .select("id, role_id")
      .eq("user_code", studentCode)
      .single()

    if (studentError || !studentData) {
      return { success: false, message: "لم يتم العثور على الطالب" }
    }

    if (studentData.role_id !== 1) {
      return { success: false, message: "الرمز المدخل ليس لطالب" }
    }

    // Check if already linked using admin client
    const { data: existingLink, error: linkError } = await adminClient
      .from("parent_student")
      .select("*")
      .eq("parent_id", data.user.id)
      .eq("student_id", studentData.id)
      .maybeSingle()

    if (existingLink) {
      return { success: false, message: "هذا الطالب مرتبط بحسابك بالفعل" }
    }

    // Create link using admin client
    const { error: insertError } = await adminClient
      .from("parent_student")
      .insert({
        parent_id: data.user.id,
        student_id: studentData.id,
      })

    if (insertError) {
      throw insertError
    }

    // Add notification for student
    await supabase.from("notifications").insert({
      user_id: studentData.id,
      title: "ربط حساب ولي أمر",
      content: "تم ربط حسابك بحساب ولي أمر",
    })

    // Log activity
    await supabase.from("activity_log").insert({
      user_id: data.user.id,
      action_type: "link_student",
      description: `ربط حساب الطالب ${studentCode} بحساب ولي الأمر`,
    })

    return { success: true, message: "تم ربط الطالب بحسابك بنجاح" }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "حدث خطأ أثناء ربط الطالب بحسابك",
    }
  }
}

// Generate recharge cards (admin only)
export async function generateRechargeCards(formData: FormData) {
  try {
    // Get form data
    const countStr = formData.get("count") as string;
    const pointsStr = formData.get("points") as string;
    const categoryId = formData.get("categoryId") as string;
    const validFrom = formData.get("validFrom") as string;
    const validUntil = formData.get("validUntil") as string;
    const status = formData.get("status") as string;
    const assignedTo = formData.get("assignedTo") as string;
    const maxUsageAttemptsStr = formData.get("maxUsageAttempts") as string;
    const usageCooldownHoursStr = formData.get("usageCooldownHours") as string;

    // Validate inputs
    if (!countStr || !pointsStr) {
      return {
        success: false,
        message: "يرجى تحديد عدد الكروت والنقاط",
      };
    }

    // Parse numeric values
    const count = parseInt(countStr);
    const points = parseInt(pointsStr);
    const maxUsageAttempts = maxUsageAttemptsStr ? parseInt(maxUsageAttemptsStr) : 1;
    const usageCooldownHours = usageCooldownHoursStr ? parseInt(usageCooldownHoursStr) : 0;

    // Validate count
    if (isNaN(count) || count <= 0) {
      return {
        success: false,
        message: "يجب أن يكون عدد الكروت رقمًا موجبًا",
      };
    }

    // Add safety limits
    const MAX_CARDS_LIMIT = 1000;
    if (count > MAX_CARDS_LIMIT) {
      return {
        success: false,
        message: `لا يمكن إنشاء أكثر من ${MAX_CARDS_LIMIT} كرت في المرة الواحدة. يرجى تقليل عدد الكروت.`,
      };
    }

    // Validate points
    if (isNaN(points) || points <= 0) {
      return {
        success: false,
        message: "يجب أن تكون النقاط رقمًا موجبًا",
      };
      }
      
    // Validate date range if provided
    if (validFrom && validUntil) {
      const fromDate = new Date(validFrom);
      const untilDate = new Date(validUntil);

      if (fromDate >= untilDate) {
        return {
          success: false,
          message: "يجب أن يكون تاريخ الانتهاء بعد تاريخ البدء",
        };
      }
    }

    // Validate usage attempts
    if (isNaN(maxUsageAttempts) || maxUsageAttempts < 1) {
      return {
        success: false,
        message: "يجب أن يكون الحد الأقصى لمحاولات الاستخدام رقمًا موجبًا",
      };
    }

    // Validate cooldown hours
    if (isNaN(usageCooldownHours) || usageCooldownHours < 0) {
      return {
        success: false,
        message: "يجب أن تكون ساعات الانتظار بين المحاولات رقمًا غير سالب",
      };
    }

    // Get current user ID
    const supabase = await createClient();
    
    // ... (remaining implementation)
  } catch (error: any) {
    console.error("Error generating recharge cards:", error);
    return {
      success: false,
      message: `فشل في إنشاء كروت الشحن: ${error.message || "خطأ غير معروف"}`,
    };
  }
}
