"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

// Helper function to log errors
async function logError(step: string, data: any) {
  try {
    console.error(`DEBUG ERROR in ${step}:`, data);
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}/api/debug`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ step, data }),
    });
    return await response.json();
  } catch (e) {
    console.error("Error while logging:", e);
    return null;
  }
}

// Create a new reward
export async function createReward(formData: FormData) {
  console.log("createReward called with formData:", Object.fromEntries(formData.entries()));
  
  try {
    console.log("Getting supabase client...");
    
    const supabase = await createClient()
    console.log("Supabase client created");
    
    // Debug: Log all form fields
    const formFields = Object.fromEntries(formData.entries());
    console.log("Form fields:", formFields);

    // Get current user
    console.log("Getting user...");
    try {
      const { data, error: sessionError } = await supabase.auth.getUser()
      console.log("User response:", { data, error: sessionError });
      
      if (sessionError || !data.user) {
        const errorMsg = "يجب تسجيل الدخول أولاً";
        console.error("Auth error:", sessionError);
        await logError('auth', { error: sessionError });
        return { success: false, message: errorMsg }
      }

      // Check if user is admin
      console.log("Checking if user is admin...");
      try {
        const { data: userData, error: userError } = await supabase.from("users").select("role_id").eq("id", data.user.id).single()
        console.log("User data:", { userData, error: userError });
        
        if (userError) {
          console.error("Error getting user data:", userError);
          await logError('user_query', { error: userError });
          return { success: false, message: "حدث خطأ أثناء التحقق من صلاحياتك" }
        }

        if (!userData || userData.role_id !== 4) {
          const errorMsg = "ليس لديك صلاحية لإدارة المكافآت";
          console.error("User not admin:", userData);
          return { success: false, message: errorMsg }
        }

        const name = formData.get("name") as string
        const description = formData.get("description") as string
        const points_cost = Number.parseInt(formData.get("points_cost") as string)
        const available_quantity = Number.parseInt(formData.get("available_quantity") as string)
        const image_url = formData.get("image_url") as string || null
        const role_id = formData.get("role_id") ? Number.parseInt(formData.get("role_id") as string) : null

        console.log("Parsed form values:", { name, description, points_cost, available_quantity, image_url, role_id });

        if (!name || !points_cost || isNaN(points_cost) || isNaN(available_quantity)) {
          const errorMsg = "جميع الحقول المطلوبة غير صالحة";
          console.error("Invalid form fields:", { name, points_cost, available_quantity });
          return { success: false, message: errorMsg }
        }

        // Create admin client to bypass RLS
        console.log("Creating admin client for insert operation...");
        const adminClient = await createAdminClient();

        // Insert the reward using admin client
        console.log("Inserting reward with admin client...");
        try {
          const { data: rewardData, error } = await adminClient
            .from("rewards")
            .insert({
              name,
              description,
              points_cost,
              available_quantity,
              image_url,
              role_id,
              created_by: data.user.id,
            })
            .select()
          
          console.log("Insert result:", { rewardData, error });

          if (error) {
            console.error("Error inserting reward:", error);
            await logError('insert_reward', { error });
            throw error
          }

          // Log activity
          console.log("Logging activity...");
          try {
            const activityResult = await adminClient.from("activity_log").insert({
              user_id: data.user.id,
              action_type: "create_reward",
              description: `إنشاء مكافأة جديدة: ${name}`,
            })
            
            console.log("Activity log result:", activityResult);
            
            if (activityResult.error) {
              console.error("Error logging activity:", activityResult.error);
            }

            console.log("Returning success response...");
            return {
              success: true,
              message: "تم إنشاء المكافأة بنجاح",
              data: rewardData,
            }
          } catch (activityError) {
            console.error("Error in activity logging:", activityError);
            await logError('log_activity', { error: activityError });
            
            // Still return success since the reward was created
            return {
              success: true,
              message: "تم إنشاء المكافأة بنجاح (مع خطأ في سجل النشاط)",
              data: rewardData,
            }
          }
        } catch (insertError) {
          console.error("Error in insert operation:", insertError);
          await logError('insert_operation', { error: insertError });
          throw insertError;
        }
      } catch (userError) {
        console.error("Error in user check:", userError);
        await logError('user_check', { error: userError });
        throw userError;
      }
    } catch (authError) {
      console.error("Error in auth:", authError);
      await logError('auth_section', { error: authError });
      throw authError;
    }
  } catch (error: any) {
    console.error("Top level error in createReward:", error);
    await logError('top_level', { error: String(error), stack: error.stack });
    return {
      success: false,
      message: error.message || "حدث خطأ أثناء إنشاء المكافأة",
    }
  }
}

// Update an existing reward
export async function updateReward(formData: FormData) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data, error: sessionError } = await supabase.auth.getUser()
    if (sessionError || !data.user) {
      return { success: false, message: "يجب تسجيل الدخول أولاً" }
    }

    // Check if user is admin
    const { data: userData } = await supabase.from("users").select("role_id").eq("id", data.user.id).single()

    if (!userData || userData.role_id !== 4) {
      return { success: false, message: "ليس لديك صلاحية لإدارة المكافآت" }
    }

    const id = Number.parseInt(formData.get("id") as string)
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const points_cost = Number.parseInt(formData.get("points_cost") as string)
    const available_quantity = Number.parseInt(formData.get("available_quantity") as string)
    const image_url = formData.get("image_url") as string || null
    const role_id = formData.get("role_id") ? Number.parseInt(formData.get("role_id") as string) : null

    if (!id || !name || !points_cost || isNaN(points_cost) || isNaN(available_quantity)) {
      return { success: false, message: "جميع الحقول المطلوبة غير صالحة" }
    }

    // Create admin client to bypass RLS
    const adminClient = await createAdminClient()

    // Update the reward
    const { error } = await adminClient
      .from("rewards")
      .update({
        name,
        description,
        points_cost,
        available_quantity,
        image_url,
        role_id,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)

    if (error) {
      throw error
    }

    // Log activity
    await adminClient.from("activity_log").insert({
      user_id: data.user.id,
      action_type: "update_reward",
      description: `تعديل مكافأة: ${name}`,
    })

    return {
      success: true,
      message: "تم تحديث المكافأة بنجاح",
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "حدث خطأ أثناء تحديث المكافأة",
    }
  }
}

// Delete a reward
export async function deleteReward(formData: FormData) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data, error: sessionError } = await supabase.auth.getUser()
    if (sessionError || !data.user) {
      return { success: false, message: "يجب تسجيل الدخول أولاً" }
    }

    // Check if user is admin
    const { data: userData } = await supabase.from("users").select("role_id").eq("id", data.user.id).single()

    if (!userData || userData.role_id !== 4) {
      return { success: false, message: "ليس لديك صلاحية لإدارة المكافآت" }
    }

    const id = Number.parseInt(formData.get("id") as string)
    const name = formData.get("name") as string

    if (!id) {
      return { success: false, message: "معرف المكافأة غير صالح" }
    }

    // Create admin client to bypass RLS
    const adminClient = await createAdminClient()

    // Check if there are any redemptions for this reward
    const { data: redemptions, error: countError } = await adminClient
      .from("user_rewards")
      .select("id", { count: "exact" })
      .eq("reward_id", id)

    if (countError) throw countError

    if (redemptions && redemptions.length > 0) {
      return { 
        success: false, 
        message: "لا يمكن حذف هذه المكافأة لأنها مستخدمة في عمليات استبدال" 
      }
    }

    // Delete the reward
    const { error } = await adminClient
      .from("rewards")
      .delete()
      .eq("id", id)

    if (error) {
      throw error
    }

    // Log activity
    await adminClient.from("activity_log").insert({
      user_id: data.user.id,
      action_type: "delete_reward",
      description: `حذف مكافأة: ${name}`,
    })

    return {
      success: true,
      message: "تم حذف المكافأة بنجاح",
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "حدث خطأ أثناء حذف المكافأة",
    }
  }
}

// Update reward redemption status (approve/reject)
export async function updateRedemptionStatus(formData: FormData) {
  console.log("SERVER: updateRedemptionStatus starting with data:", Object.fromEntries(formData.entries()));
  
  try {
    const supabase = await createClient()

    // Get current user
    console.log("SERVER: Getting current user");
    const { data, error: sessionError } = await supabase.auth.getUser()
    if (sessionError || !data.user) {
      console.error("SERVER: Auth error:", sessionError);
      return { success: false, message: "يجب تسجيل الدخول أولاً" }
    }

    // Check if user is admin
    console.log("SERVER: Checking if user is admin");
    const { data: userData, error: userError } = await supabase.from("users").select("role_id").eq("id", data.user.id).single()
    
    if (userError) {
      console.error("SERVER: User data error:", userError);
      return { success: false, message: "خطأ في التحقق من بيانات المستخدم" }
    }

    if (!userData || userData.role_id !== 4) {
      console.error("SERVER: User not admin:", userData);
      return { success: false, message: "ليس لديك صلاحية لإدارة طلبات المكافآت" }
    }

    const redemptionId = Number.parseInt(formData.get("redemptionId") as string)
    const status = formData.get("status") as string
    const adminNotes = formData.get("adminNotes") as string || null

    console.log("SERVER: Parsed form data:", { redemptionId, status, adminNotes });

    if (!redemptionId || !status) {
      console.error("SERVER: Missing required data");
      return { success: false, message: "البيانات المرسلة غير مكتملة" }
    }

    // Create admin client to bypass RLS
    console.log("SERVER: Creating admin client");
    const adminClient = await createAdminClient()

    // Get the redemption details including user and reward info
    console.log("SERVER: Fetching redemption details");
    const { data: redemptionData, error: redemptionError } = await adminClient
      .from("user_rewards")
      .select(`
        id, 
        user_id, 
        redemption_code,
        status,
        user:users!user_rewards_user_id_fkey(full_name, email),
        reward:rewards(name, points_cost)
      `)
      .eq("id", redemptionId)
      .single()

    if (redemptionError || !redemptionData) {
      console.error("SERVER: Redemption data error:", redemptionError);
      return { success: false, message: "لم يتم العثور على طلب الاستبدال" }
    }

    console.log("SERVER: Redemption data retrieved successfully:", {
      id: redemptionData.id,
      status: redemptionData.status,
      user_id: redemptionData.user_id,
      user_data: redemptionData.user,
      reward_data: redemptionData.reward
    });

    // Ensure reward and user data are correctly typed
    const rewardName = (redemptionData.reward as any)?.name || "غير معروف"
    const userName = (redemptionData.user as any)?.full_name || "غير معروف"

    console.log("SERVER: Parsed user and reward data:", { userName, rewardName });

    // Update the redemption status
    const updateData: any = { 
      status, 
      admin_notes: adminNotes 
    }
    
    // If approved and being delivered, set delivered time
    if (status === "delivered") {
      updateData.delivered_at = new Date().toISOString()
    }
    
    console.log("SERVER: Updating redemption status with data:", updateData);
    const { error: updateError } = await adminClient
      .from("user_rewards")
      .update(updateData)
      .eq("id", redemptionId)

    if (updateError) {
      console.error("SERVER: Update error:", updateError);
      throw updateError
    }

    // Determine notification title and content based on status
    let notificationTitle = ""
    let notificationContent = ""
    
    switch (status) {
      case "approved":
        notificationTitle = "تمت الموافقة على طلب المكافأة"
        notificationContent = `تمت الموافقة على طلب استبدال المكافأة "${rewardName}". سيتم تسليم المكافأة قريباً.`
        break
      case "rejected":
        notificationTitle = "تم رفض طلب المكافأة"
        notificationContent = `تم رفض طلب استبدال المكافأة "${rewardName}".`
        if (adminNotes) {
          notificationContent += ` ملاحظات: ${adminNotes}`
        }
        break
      case "delivered":
        notificationTitle = "تم تسليم المكافأة"
        notificationContent = `تم تسليم المكافأة "${rewardName}" بنجاح.`
        break
      default:
        notificationTitle = "تم تحديث حالة طلب المكافأة"
        notificationContent = `تم تحديث حالة طلب استبدال المكافأة "${rewardName}" إلى: ${status}.`
    }

    // Create notification for user
    console.log("SERVER: Creating notification for user");
    const { error: notificationError } = await adminClient.from("notifications").insert({
      user_id: redemptionData.user_id,
      title: notificationTitle,
      content: notificationContent,
    })
    
    if (notificationError) {
      console.error("SERVER: Notification error:", notificationError);
      // Non-critical error, continue processing
    }

    // Log activity
    console.log("SERVER: Logging activity");
    const { error: activityError } = await adminClient.from("activity_log").insert({
      user_id: data.user.id,
      action_type: `${status}_reward_redemption`,
      description: `تم تغيير حالة طلب استبدال المكافأة "${rewardName}" للمستخدم "${userName}" إلى: ${status}.`,
    })
    
    if (activityError) {
      console.error("SERVER: Activity log error:", activityError);
      // Non-critical error, continue processing
    }
    
    console.log("SERVER: Success, returning response");
    return {
      success: true,
      message: `تم تحديث حالة طلب الاستبدال بنجاح إلى: ${status}`,
    }
  } catch (error: any) {
    console.error("SERVER: Error updating redemption status:", error)
    return {
      success: false,
      message: error.message || "حدث خطأ أثناء تحديث حالة طلب الاستبدال",
    }
  }
}

// Get all redemptions for admin
export async function getRedemptionsForAdmin() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data, error: sessionError } = await supabase.auth.getUser()
    if (sessionError || !data.user) {
      return { success: false, message: "يجب تسجيل الدخول أولاً" }
    }

    // Check if user is admin
    const { data: userData } = await supabase.from("users").select("role_id").eq("id", data.user.id).single()

    if (!userData || userData.role_id !== 4) {
      return { success: false, message: "ليس لديك صلاحية لعرض طلبات المكافآت" }
    }

    // Create admin client to bypass RLS
    console.log("Creating admin client for getRedemptionsForAdmin");
    const adminClient = await createAdminClient()
    console.log("Admin client created successfully");

    // Get all redemptions with user and reward info
    console.log("Fetching redemptions data");
    const { data: redemptionsData, error: redemptionsError } = await adminClient
      .from("user_rewards")
      .select(`
        id, 
        user_id, 
        redemption_code,
        status,
        redeemed_at,
        delivered_at,
        admin_notes,
        redeemed_value,
        created_by,
        users!user_rewards_user_id_fkey(id, full_name, email, user_code),
        rewards(id, name, points_cost, image_url)
      `)
      .order("redeemed_at", { ascending: false })

    if (redemptionsError) {
      console.error("Error fetching redemptions:", redemptionsError)
      return { success: false, message: "خطأ في جلب طلبات الاستبدال" }
    }

    console.log("Retrieved redemptions data. Count:", redemptionsData?.length);
    
    // إعادة تنظيم البيانات لتطابق الهيكل المتوقع
    const formattedData = redemptionsData.map(item => {
      console.log("Processing item ID:", item.id, "with user:", item.users);
      return {
        id: item.id,
        user_id: item.user_id,
        redemption_code: item.redemption_code,
        status: item.status,
        redeemed_at: item.redeemed_at,
        delivered_at: item.delivered_at,
        admin_notes: item.admin_notes,
        redeemed_value: item.redeemed_value,
        created_by: item.created_by,
        user: item.users,
        reward: item.rewards
      };
    });

    return {
      success: true,
      data: formattedData || []
    }
  } catch (error: any) {
    console.error("Error in getRedemptionsForAdmin:", error)
    return {
      success: false,
      message: error.message || "حدث خطأ أثناء جلب طلبات الاستبدال",
    }
  }
} 