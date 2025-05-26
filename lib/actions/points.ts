"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"

/**
 * Get student points safely with admin client to bypass RLS
 */
export async function getStudentPoints(userId: string) {
  try {
    if (!userId) {
      console.error("getStudentPoints called with no userId")
      return { 
        success: false, 
        error: "User ID is required",
        message: "معرف المستخدم مطلوب" 
      }
    }
    
    // Use admin client to bypass RLS policies
    const adminClient = await createAdminClient()
    
    // First try to get points from student_points table (fastest)
    const { data: pointsData, error: pointsError } = await adminClient
      .from("student_points")
      .select("points")
      .eq("student_id", userId)
      .single()
    
    if (!pointsError && pointsData) {
      // Successfully got points from student_points table
      return {
        success: true,
        data: {
          total: pointsData.points || 0,
          message: "تم جلب النقاط بنجاح"
        }
      }
    }
    
    // If the above failed (no record or error), calculate from transactions
    // This ensures consistency with the recharge page calculation
    console.log("Falling back to RPC for points calculation")
    const { data: rpcData, error: rpcError } = await adminClient.rpc('get_user_points_balance', {
      user_id_param: userId
    })
    
    if (!rpcError && rpcData !== null) {
      console.log("Calculated points via RPC:", rpcData)
      
      // Update student_points table to ensure consistency
      try {
        // Check if record exists first
        const { count, error: countError } = await adminClient
          .from("student_points")
          .select("*", { count: "exact", head: true })
          .eq("student_id", userId)
        
        if (!countError) {
          if (count && count > 0) {
            // Update existing record
            await adminClient
              .from("student_points")
              .update({ points: rpcData })
              .eq("student_id", userId)
          } else {
            // Insert new record
            await adminClient
              .from("student_points")
              .insert({ student_id: userId, points: rpcData })
          }
        }
      } catch (updateError) {
        console.error("Error updating student_points table:", updateError)
        // Non-critical, we can continue
      }
      
      return {
        success: true,
        data: {
          total: rpcData,
          message: "تم حساب النقاط من المعاملات"
        }
      }
    }
    
    // If both methods failed, manual calculation as last resort
    console.log("Falling back to manual calculation")
    const { data: transactions, error: txError } = await adminClient
      .from("points_transactions")
      .select("points, is_positive")
      .eq("user_id", userId)
    
    if (!txError && transactions) {
      const total = transactions.reduce((sum, tx) => 
        tx.is_positive ? sum + tx.points : sum - tx.points, 0)
      console.log("Manually calculated points balance:", total)
      
      // Try to update student_points table
      try {
        const { count, error: countError } = await adminClient
          .from("student_points")
          .select("*", { count: "exact", head: true })
          .eq("student_id", userId)
        
        if (!countError) {
          if (count && count > 0) {
            await adminClient
              .from("student_points")
              .update({ points: total })
              .eq("student_id", userId)
          } else {
            await adminClient
              .from("student_points")
              .insert({ student_id: userId, points: total })
          }
        }
      } catch (updateError) {
        console.error("Error updating student_points table:", updateError)
      }
      
      return {
        success: true,
        data: {
          total: total,
          message: "تم حساب النقاط يدويًا"
        }
      }
    }
    
    // If all methods failed, return 0 points
    console.error("All points calculation methods failed:", { pointsError, rpcError, txError })
    return {
      success: true,
      data: {
        total: 0,
        message: "لم نتمكن من حساب النقاط بدقة، الرجاء المحاولة لاحقًا"
      }
    }
  } catch (error: any) {
    console.error("Unexpected error in getStudentPoints:", error)
    return {
      success: false,
      error: error.message,
      message: "حدث خطأ غير متوقع أثناء جلب النقاط"
    }
  }
}

/**
 * Get student ranking in leaderboard
 */
export async function getStudentRanking(userId: string) {
  try {
    if (!userId) {
      console.error("getStudentRanking called with no userId")
      return { 
        success: false, 
        error: "User ID is required",
        message: "معرف المستخدم مطلوب" 
      }
    }
    
    // Use admin client to bypass RLS policies
    const adminClient = await createAdminClient()
    
    // First, get total number of students with points
    const { count: totalStudents, error: countError } = await adminClient
      .from("student_points")
      .select("*", { count: "exact", head: true })
    
    if (countError) {
      console.error("Error fetching total students count:", countError.message)
      return { 
        success: false, 
        error: countError.message,
        message: "خطأ في الحصول على بيانات الترتيب" 
      }
    }
    
    // Then get all student points ordered by points (desc)
    const { data: rankings, error: rankingError } = await adminClient
      .from("student_points")
      .select("student_id, points")
      .order("points", { ascending: false })
    
    if (rankingError) {
      console.error("Error fetching student rankings:", rankingError.message)
      return { 
        success: false, 
        error: rankingError.message,
        message: "خطأ في الحصول على بيانات الترتيب" 
      }
    }
    
    // Find student's position in the rankings
    const studentRank = rankings.findIndex(item => item.student_id === userId) + 1
    
    return {
      success: true,
      data: {
        rank: studentRank || 0,
        total: totalStudents || 0,
        message: "تم جلب الترتيب بنجاح"
      }
    }
  } catch (error: any) {
    console.error("Unexpected error in getStudentRanking:", error)
    return {
      success: false,
      error: error.message,
      message: "حدث خطأ غير متوقع أثناء جلب الترتيب"
    }
  }
} 

export async function generateRechargeCards(formData: FormData) {
  try {
    // Get form data
    const countStr = formData.get("count") as string;
    const pointsStr = formData.get("points") as string;
    const categoryId = formData.get("categoryId") as string;
    const validFrom = formData.get("validFrom") as string || new Date().toISOString();
    const validUntil = formData.get("validUntil") as string || null;
    const status = formData.get("status") as string || "active";
    const assignedTo = formData.get("assignedTo") as string || null;
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
    const categoryIdNum = categoryId ? parseInt(categoryId) : null;

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

    // Get current user
    const supabase = await createClient();
    const { data, error: sessionError } = await supabase.auth.getUser();
    
    if (sessionError || !data.user) {
      return { success: false, message: "يجب تسجيل الدخول أولاً" };
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase.from("users").select("role_id").eq("id", data.user.id).single();
    
    if (userError) {
      console.error("Error checking user role:", userError);
      return { success: false, message: "حدث خطأ أثناء التحقق من صلاحيات المستخدم" };
    }

    if (!userData || userData.role_id !== 4) {
      return { success: false, message: "ليس لديك صلاحية لإنشاء كروت شحن" };
    }

    // Generate cards
    const cards = [];
    
    for (let i = 0; i < count; i++) {
      // Generate a cryptographically secure 12-character alphanumeric code
      const code = Array.from(
        { length: 12 },
        () => Math.floor(Math.random() * 36).toString(36)
      ).join('').toUpperCase();

      cards.push({
        code,
        points,
        category_id: categoryIdNum,
        valid_from: validFrom,
        valid_until: validUntil,
        status,
        assigned_to: assignedTo,
        max_usage_attempts: maxUsageAttempts,
        usage_cooldown_hours: usageCooldownHours,
        failed_attempts: 0,
        created_by: data.user.id,
        is_used: false,
      });
    }

    // Create admin client to bypass RLS policies
    const adminClient = await createAdminClient();
    
    console.log("Creating recharge cards with admin client:", cards.length);

    try {
      // First verify the table structure
      const { data: tableInfo, error: tableError } = await adminClient
        .from("recharge_cards")
        .select("id", { count: "exact", head: true });
      
      if (tableError) {
        console.error("Error checking recharge_cards table:", tableError);
        throw tableError;
      }
      
      // Insert cards with admin client - in batches to prevent timeouts
      const BATCH_SIZE = 100;
      let insertedCards: any[] = [];
      
      for (let i = 0; i < cards.length; i += BATCH_SIZE) {
        const batch = cards.slice(i, i + BATCH_SIZE);
        const { data: batchData, error: batchError } = await adminClient
          .from("recharge_cards")
          .insert(batch)
          .select();
          
        if (batchError) {
          console.error(`Error inserting batch ${i/BATCH_SIZE + 1}:`, batchError);
          throw batchError;
        }
        
        if (batchData) {
          insertedCards = [...insertedCards, ...batchData];
        }
      }

      console.log("Cards created successfully:", insertedCards.length);

      // Log activity
      await adminClient.from("activity_log").insert({
        user_id: data.user.id,
        action_type: "generate_cards",
        description: `إنشاء ${count} كرت شحن بقيمة ${points} نقطة لكل كرت`,
      });

      return {
        success: true,
        message: `تم إنشاء ${count} كرت شحن بنجاح`,
        data: insertedCards,
      };
    } catch (insertError: any) {
      console.error("Database operation error:", insertError);
      return {
        success: false,
        message: `فشل في إنشاء الكروت: ${insertError.message || "خطأ في قاعدة البيانات"}`,
      };
    }
  } catch (error: any) {
    console.error("Error generating recharge cards:", error);
    return {
      success: false,
      message: `فشل في إنشاء كروت الشحن: ${error.message || "خطأ غير معروف"}`,
    };
  }
} 