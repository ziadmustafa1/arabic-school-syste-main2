"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { ApiResponse, DatabaseError } from "@/lib/types/errors"
import { cookies } from "next/headers"
import { syncUserPointsBalance } from "./update-points-balance"

// Use any type for now to avoid TypeScript errors with database schema
type SupabaseClient = any;

interface NegativePointsEntry {
  id: string | number
  user_id: string
  points: number
  reason: string
  status: "pending" | "paid" | "cancelled"
  created_at: string
  paid_at: string | null
  category_id: number | null
  auto_processed?: boolean
  point_categories?: {
    id: number
    name: string
    is_mandatory: boolean | null
  } | null
  // Virtual field - not in the database
  is_optional?: boolean
}

interface StudentPoints {
  id?: number
  student_id: string
  points: number
}

interface PendingEntry extends NegativePointsEntry {
  status: "pending";
}

/**
 * Get negative points for a student
 */
export async function getNegativePoints(userId: string) {
  try {
    if (!userId) {
      console.error("getNegativePoints called with no userId")
      return { 
        success: false, 
        error: "User ID is required",
        message: "معرف المستخدم مطلوب" 
      }
    }
    
    console.log("[getNegativePoints] Checking if negative points table exists")
    
    // Use admin client to bypass RLS policies
    // Using try-catch to avoid adminClient.schema issues
    let adminClient: SupabaseClient;
    try {
      adminClient = await createAdminClient();
    } catch (err: any) {
      console.error("[getNegativePoints] Error creating admin client:", err.message);
      return { 
        success: false, 
        error: "Error creating admin client",
        message: "خطأ في إنشاء اتصال قاعدة البيانات" 
      }
    }
    
    // Force refresh cache to ensure we have the latest data
    try {
      await adminClient.from('negative_points').select('id').limit(1)
      console.log("[getNegativePoints] Refreshed database cache");
    } catch (err: any) {
      console.warn("[getNegativePoints] Could not refresh cache:", err.message);
      // If this is a table not found error, return an empty result
      if (err.code === "42P01") {
        console.error("[getNegativePoints] Table doesn't exist:", err.message)
        return { 
          success: true, 
          data: [],
          message: "لا توجد نقاط سلبية" 
        }
      }
    }
    
    // Fetch actual negative points data - using try/catch to handle potential errors
    let negativePointsData;
    try {
      const { data, error } = await adminClient
        .from("negative_points")
        .select("*, point_categories!negative_points_category_id_fkey(id, name, is_mandatory)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
      
      if (error) {
        console.error("[getNegativePoints] Error fetching negative points:", error.message, error.code)
        return { 
          success: false, 
          error: error.message,
          message: "خطأ في الحصول على بيانات النقاط السلبية" 
        }
      }
      
      negativePointsData = data;
    } catch (err: any) {
      console.error("[getNegativePoints] Error fetching negative points:", err.message)
      return { 
        success: false, 
        error: err.message,
        message: "خطأ في الحصول على بيانات النقاط السلبية" 
      }
    }
    
    if (!negativePointsData || negativePointsData.length === 0) {
      return {
        success: true,
        data: [],
        mandatoryTotal: 0,
        optionalTotal: 0,
        message: "لا توجد نقاط سلبية"
      }
    }
    
    // Filter pending entries and separate mandatory and optional entries
    console.log(`[getNegativePoints] Total entries before filtering: ${negativePointsData.length}`);
    const pendingEntries = negativePointsData.filter((entry: NegativePointsEntry): entry is PendingEntry => {
      const isPending = entry.status === "pending";
      if (!isPending && entry.status === "paid") {
        console.log(`[getNegativePoints] Skipping paid entry ${entry.id}: ${entry.reason}`);
      }
      return isPending;
    });
    console.log(`[getNegativePoints] Pending entries after filtering: ${pendingEntries.length}`);
    
    // Get mandatory entries (either no category or category with is_mandatory=true)
    const mandatoryEntries = pendingEntries.filter((entry: PendingEntry) => 
      !entry.category_id || 
      (entry.point_categories && entry.point_categories.is_mandatory !== false)
    )
    
    // Get optional entries (category with is_mandatory=false)
    const optionalEntries = pendingEntries.filter((entry: PendingEntry) => 
      entry.category_id && 
      entry.point_categories && 
      entry.point_categories.is_mandatory === false
    )
    
    // Calculate totals
    const mandatoryPointsTotal = mandatoryEntries.reduce((sum: number, entry: PendingEntry) => sum + entry.points, 0)
    const optionalPointsTotal = optionalEntries.reduce((sum: number, entry: PendingEntry) => sum + entry.points, 0)
    const totalNegativePoints = mandatoryPointsTotal
    
    console.log(`[getNegativePoints] Found ${negativePointsData.length} entries, ${pendingEntries.length} pending (${mandatoryEntries.length} mandatory, ${optionalEntries.length} optional)`)
    console.log(`[getNegativePoints] Mandatory: ${mandatoryPointsTotal}, Optional: ${optionalPointsTotal}, Total: ${totalNegativePoints}`)
    
    // Prepare data with virtual is_optional flag for the frontend
    const entriesWithMetadata = negativePointsData.map((entry: NegativePointsEntry) => {
      const isOptional = entry.category_id && 
                        entry.point_categories && 
                        entry.point_categories.is_mandatory === false
      
      return {
        ...entry,
        is_optional: isOptional
      }
    })
    
    // If there are negative points, ensure student_points table has the right balance
    if (totalNegativePoints > 0) {
      try {
        // Get current points from student_points
        const { data: pointsData, error: pointsError } = await adminClient
          .from("student_points")
          .select("points")
          .eq("student_id", userId)
          .single()
        
        if (!pointsError && pointsData) {
          console.log(`[getNegativePoints] Current points in student_points: ${pointsData.points}`)
          
          // Also get calculated points from transactions
          const { data: calcPoints, error: calcError } = await adminClient.rpc('get_user_points_balance', {
            user_id_param: userId
          })
          
          if (!calcError && calcPoints !== null) {
            console.log(`[getNegativePoints] Calculated points from transactions: ${calcPoints}`)
            
            // Update student_points with calculated balance if different
            if (pointsData.points !== calcPoints) {
              console.log(`[getNegativePoints] Updating student_points to match calculated value`)
              await adminClient
                .from("student_points")
                .update({ points: calcPoints })
                .eq("student_id", userId)
            }
          }
        }
      } catch (error) {
        console.error("[getNegativePoints] Error syncing points (non-critical):", error)
        // This is not critical, so we continue even if it fails
      }
    }
    
    return {
      success: true,
      data: entriesWithMetadata,
      mandatoryTotal: mandatoryPointsTotal,
      optionalTotal: optionalPointsTotal,
      message: mandatoryPointsTotal > 0 
        ? `لديك ${mandatoryPointsTotal} نقطة سلبية إجبارية و ${optionalPointsTotal} نقطة سلبية اختيارية`
        : `لديك ${optionalPointsTotal} نقطة سلبية اختيارية`
    }
  } catch (error: any) {
    console.error("[getNegativePoints] Unexpected error:", error)
    return {
      success: false,
      error: error.message,
      message: "حدث خطأ غير متوقع أثناء جلب النقاط السلبية"
    }
  }
}

/**
 * Pay negative points for a student - supports partial payment for optional points
 */
export async function payNegativePoints({ 
  entryId, 
  userId, 
  partialAmount 
}: { 
  entryId: string, 
  userId: string,
  partialAmount?: number // Optional parameter for partial payments
}) {
  try {
    if (!entryId || !userId) {
      console.error("[payNegativePoints] Missing required parameters", { entryId, userId })
      return { 
        success: false, 
        error: "Missing required parameters",
        message: "معلومات غير كافية لتسديد النقاط" 
      }
    }
    
    console.log(`[payNegativePoints] Processing payment for entry ${entryId} by user ${userId}, partial amount: ${partialAmount !== undefined ? partialAmount : 'N/A'}`)
    
    // Use admin client to bypass RLS policies
    const adminClient: SupabaseClient = await createAdminClient()
    
    // Initialize transaction tracking variables
    let completedSteps = {
      fetchedEntry: false,
      createdTransaction: false,
      updatedPointsBalance: false,
      markedEntryAsPaid: false,
      syncedBalance: false
    }
    
    try {
      // First get the entry to confirm it exists and get the point value
      const { data: entry, error: entryError } = await adminClient
        .from("negative_points")
        .select("*, point_categories!negative_points_category_id_fkey(id, name, is_mandatory)")
        .eq("id", entryId)
        .eq("user_id", userId)
        .single()
      
      if (entryError) {
        console.error("[payNegativePoints] Error fetching entry:", entryError.message, entryError.code)
        return { 
          success: false, 
          error: entryError.message,
          message: "لم يتم العثور على النقاط السلبية المطلوبة" 
        }
      }
      
      if (!entry) {
        return { 
          success: false, 
          error: "Entry not found",
          message: "لم يتم العثور على النقاط السلبية المطلوبة" 
        }
      }
      
      completedSteps.fetchedEntry = true
      
      if (entry.status !== "pending") {
        console.error("[payNegativePoints] Entry is not pending:", entry.status)
        return { 
          success: false, 
          error: "Entry is not pending",
          message: "لا يمكن تسديد نقاط تم تسديدها أو إلغاؤها مسبقاً" 
        }
      }
      
      // Check if this is an optional payment
      const isOptional = entry.point_categories && entry.point_categories.is_mandatory === false
      
      console.log(`[payNegativePoints] Entry found with ${entry.points} points, status: ${entry.status}, isOptional: ${isOptional}`)
      
      // Determine how many points to pay
      let pointsToPay = 0
      let remainingPoints = 0
      
      // Handle optional points with partial payment
      if (isOptional && typeof partialAmount === 'number' && partialAmount > 0 && partialAmount < entry.points) {
        console.log(`[payNegativePoints] Processing PARTIAL payment: ${partialAmount} of ${entry.points} points`)
        pointsToPay = partialAmount
        remainingPoints = entry.points - partialAmount
      } else {
        console.log(`[payNegativePoints] Processing FULL payment: ${entry.points} points`)
        pointsToPay = entry.points
        remainingPoints = 0
      }
      
      // Check if user has enough points to pay
      const { data: pointsData, error: pointsError } = await adminClient
        .from("student_points")
        .select("points")
        .eq("student_id", userId)
        .single()
      
      if (pointsError && pointsError.code !== "PGRST116") {
        // PGRST116 means no row found, which is fine for new students (they'll have 0 points)
        console.error("[payNegativePoints] Error fetching points balance:", pointsError.message, pointsError.code)
        
        // More user-friendly error messages for specific database errors
        if (pointsError.code === "42P01") {
          return { 
            success: false, 
            error: pointsError.message,
            message: "لم يتم العثور على سجل النقاط الخاص بك. يرجى التواصل مع إدارة النظام."
          }
        }
        
        return { 
          success: false, 
          error: pointsError.message,
          message: "حدث خطأ أثناء التحقق من رصيد النقاط. يرجى المحاولة مرة أخرى لاحقاً." 
        }
      }
      
      // Try to get the most accurate points value
      let currentPoints = pointsData?.points || 0
      console.log(`[payNegativePoints] Initial points from student_points table: ${currentPoints}`)
      
      // Always get the correct points from fix-points API before proceeding
      try {
        console.log("[payNegativePoints] Calling fix-points API to get accurate points")
        // Use fetch to call our API (works in server components too)
        const fixPointsResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/fix-points?userId=${userId}&force=true&value=1000`)
        const fixPointsResult = await fixPointsResponse.json()
        
        if (fixPointsResult.success && fixPointsResult.totalPoints > 0) {
          console.log(`[payNegativePoints] Fixed points successfully: ${fixPointsResult.totalPoints}`)
          currentPoints = fixPointsResult.totalPoints
          
          // Also update student_points table to ensure consistency
          try {
            await adminClient
              .from("student_points")
              .upsert({ student_id: userId, points: currentPoints })
            console.log(`[payNegativePoints] Updated student_points with ${currentPoints} points from fix-points API`)
          } catch (upsertError) {
            console.error("[payNegativePoints] Error updating points:", upsertError)
          }
        } else {
          console.log(`[payNegativePoints] Fix-points API failed: ${JSON.stringify(fixPointsResult)}`)
          
          // If fix-points API failed, try direct calculation from recharge cards
          if (currentPoints < pointsToPay) {
            console.log("[payNegativePoints] Checking recharge cards for points")
            const { data: rechargeData, error: rechargeError } = await adminClient
              .from("recharge_cards")
              .select("points")
              .eq("redeemed_by", userId)
              .eq("status", "REDEEMED")
              
            if (!rechargeError && rechargeData && rechargeData.length > 0) {
              const rechargePoints = rechargeData.reduce((sum: number, card: { points: number }) => sum + (card.points || 0), 0)
              console.log(`[payNegativePoints] Found ${rechargeData.length} recharge cards with total: ${rechargePoints}`)
              
              if (rechargePoints > 0) {
                currentPoints = rechargePoints
                
                // Update student_points with this more accurate value
                try {
                  await adminClient
                    .from("student_points")
                    .upsert({ student_id: userId, points: currentPoints })
                  console.log(`[payNegativePoints] Updated student_points with ${currentPoints} points from recharge cards`)
                } catch (upsertError) {
                  console.error("[payNegativePoints] Error updating points:", upsertError)
                }
              }
            }
            
            // If still not enough points, try other methods
            if (currentPoints < pointsToPay) {
              // First try via syncUserPointsBalance
              console.log("[payNegativePoints] Trying to sync points balance")
              const { syncUserPointsBalance } = await import("@/lib/actions/update-points-balance")
              const syncResult = await syncUserPointsBalance(userId, true)
              
              if (syncResult.success && syncResult.data && syncResult.data.points && syncResult.data.points > 0) {
                console.log(`[payNegativePoints] Got points from sync: ${syncResult.data.points}`)
                currentPoints = syncResult.data.points
              } else {
                // Try direct calculation from transactions
                console.log("[payNegativePoints] Sync failed, trying direct RPC calculation")
                const { data: rpcResult } = await adminClient.rpc('calculate_user_points', {
                  user_id: userId
                })
                
                if (rpcResult && rpcResult > 0) {
                  console.log(`[payNegativePoints] Got points from RPC: ${rpcResult}`)
                  currentPoints = rpcResult
                  
                  // Update student_points with this more accurate value
                  try {
                    await adminClient
                      .from("student_points")
                      .upsert({ student_id: userId, points: currentPoints })
                    console.log(`[payNegativePoints] Updated student_points with ${currentPoints} points`)
                  } catch (upsertError) {
                    console.error("[payNegativePoints] Error updating points:", upsertError)
                  }
                }
              }
            }
          }
        }
      } catch (pointsError) {
        console.error("[payNegativePoints] Error getting alternative points calculation:", pointsError)
      }
      
      console.log(`[payNegativePoints] Final points calculation: ${currentPoints}`)
      
      if (currentPoints < pointsToPay) {
        console.error(`[payNegativePoints] Not enough points: ${currentPoints} < ${pointsToPay}`)
        return { 
          success: false, 
          error: "Not enough points",
          message: `رصيد النقاط غير كافٍ. لديك ${currentPoints} نقطة وتحتاج ${pointsToPay} نقطة. يمكنك تجميع المزيد من النقاط أولاً.` 
        }
      }
      
      console.log(`[payNegativePoints] User has ${currentPoints} points, proceeding with payment of ${pointsToPay} points`)
      
      // Clean up the reason text to avoid nesting
      const cleanReason = entry.reason
        .replace(/تسديد النقاط السلبية: /g, '')
        .replace(/تسديد نقاط سلبية لتسديد /g, '')
        .replace(/جزئي لتسديد النقاط السلبية/g, '')
        .replace(/خصم نقاط/g, '')
        .replace(/مشاكل داخل الفصل/g, 'مشاكل داخل الفصل')
        .trim()
      
      // Create simple, clean transaction description
      const transactionDescription = remainingPoints > 0
        ? `تسديد جزئي (${pointsToPay} من ${entry.points}): ${cleanReason}`
        : `تسديد نقاط سلبية: ${cleanReason}`

      // Step 1: Create transaction record
      try {
        const { error: transactionError } = await adminClient
          .from("points_transactions")
          .insert({
            user_id: userId,
            points: pointsToPay,
            is_positive: false,
            description: transactionDescription,
            created_by: userId,
            category_id: entry.category_id
          })

        if (transactionError) {
          console.error("[payNegativePoints] Error creating transaction:", transactionError.message);
          throw transactionError;
        }
        
        completedSteps.createdTransaction = true;
        console.log("[payNegativePoints] Created transaction record successfully");
      } catch (err) {
        console.error("[payNegativePoints] Exception creating transaction record:", err);
        throw err;
      }
      
      // Step 2: Update student points balance
      const newPointsBalance = currentPoints - pointsToPay
      console.log(`[payNegativePoints] Updating points balance from ${currentPoints} to ${newPointsBalance}`)
      
      try {
        if (pointsData) {
          // If student has an existing points record, update it
          const { error: updatePointsError } = await adminClient
            .from("student_points")
            .update({ points: newPointsBalance })
            .eq("student_id", userId)
          
          if (updatePointsError) {
            console.error("[payNegativePoints] Error updating points balance:", updatePointsError.message);
            throw updatePointsError;
          }
        } else {
          // If student doesn't have a points record, create one
          const { error: insertPointsError } = await adminClient
            .from("student_points")
            .insert({ student_id: userId, points: newPointsBalance })
          
          if (insertPointsError) {
            console.error("[payNegativePoints] Error creating points record:", insertPointsError.message);
            throw insertPointsError;
          }
        }
        
        completedSteps.updatedPointsBalance = true;
        console.log("[payNegativePoints] Updated points balance successfully");
      } catch (err) {
        console.error("[payNegativePoints] Exception updating points balance:", err);
        throw err;
      }
      
      // Step 3: Handle partial payment or mark entry as paid
      try {
        if (remainingPoints > 0) {
          // This is a PARTIAL payment - create a new entry for it
          console.log(`[payNegativePoints] Creating partial payment record for ${pointsToPay} points`)
          const partialPaymentReason = `تسديد جزئي (${pointsToPay} من ${entry.points}): ${cleanReason}`
          
          // Create a new entry for the partial payment
          const { error: partialPaymentError } = await adminClient
            .from("negative_points")
            .insert({
              user_id: userId,
              points: pointsToPay,
              reason: partialPaymentReason,
              status: "paid",
              paid_at: new Date().toISOString(),
              category_id: entry.category_id
            })
          
          if (partialPaymentError) {
            console.error("[payNegativePoints] Error creating partial payment entry:", partialPaymentError.message);
            throw partialPaymentError;
          }
          
          // Update the original entry with remaining amount
          const { error: updateError } = await adminClient
            .from("negative_points")
            .update({
              points: remainingPoints,
              reason: `متبقي ${remainingPoints} نقطة من الأصل ${entry.points}: ${cleanReason}`
            })
            .eq("id", entryId)
          
          if (updateError) {
            console.error("[payNegativePoints] Error updating original entry:", updateError.message);
            throw updateError;
          }
          
          console.log(`[payNegativePoints] Updated original entry with remaining ${remainingPoints} points`);
        } else {
          // This is a FULL payment - just mark the entry as paid, DON'T create new entries
          console.log(`[payNegativePoints] Marking entry ${entryId} as fully paid`);
          
          const { error: updateError } = await adminClient
            .from("negative_points")
            .update({ 
              status: "paid", 
              paid_at: new Date().toISOString(),
              // Don't change the reason for full payments - maintain original reason
            })
            .eq("id", entryId)
          
          if (updateError) {
            console.error("[payNegativePoints] Error updating entry status:", updateError.message);
            throw updateError;
          }
          
          console.log(`[payNegativePoints] Marked entry ${entryId} as fully paid`);
        }
        
        completedSteps.markedEntryAsPaid = true;
      } catch (err) {
        console.error("[payNegativePoints] Exception handling payment completion:", err);
        throw err;
      }
      
      // Step 4: Create payment record for tracking
      try {
        const { error: paymentRecordError } = await adminClient
          .from("negative_point_payments")
          .insert({
            user_id: userId,
            points_paid: pointsToPay,
            category_id: entry.category_id,
            payment_type: remainingPoints > 0 ? "PARTIAL" : "FULL",
            payment_status: "COMPLETED",
            notes: remainingPoints > 0 ? `تسديد جزئي: ${pointsToPay} من أصل ${entry.points}` : "تسديد كامل"
          });
          
        if (paymentRecordError) {
          console.warn("[payNegativePoints] Error creating payment record (non-critical):", paymentRecordError.message);
          // Continue despite this error as it's just a record
        } else {
          console.log("[payNegativePoints] Created payment record successfully");
        }
      } catch (err) {
        console.warn("[payNegativePoints] Exception creating payment record (non-critical):", err);
        // Continue despite this error
      }
      
      // Get final balance for response message
      let finalBalance = newPointsBalance;
      try {
        // Instead of getting from the database which might have been reset,
        // reuse the currentPoints value that we used for the transaction
        finalBalance = currentPoints - pointsToPay;
        console.log(`[payNegativePoints] Calculating final balance directly: ${currentPoints} - ${pointsToPay} = ${finalBalance}`);
        
        // Force update student_points with this final balance to ensure consistency
        await adminClient
          .from("student_points")
          .upsert({ student_id: userId, points: finalBalance })
          .select();
          
        console.log(`[payNegativePoints] Forced update of student_points with final balance: ${finalBalance}`);
        
        // Double-check the value was saved correctly
        const { data: verifyBalance } = await adminClient
          .from("student_points")
          .select("points")
          .eq("student_id", userId)
          .single();
          
        if (verifyBalance) {
          console.log(`[payNegativePoints] Verified student_points now contains: ${verifyBalance.points}`);
          finalBalance = verifyBalance.points;
        }
      } catch (balanceError) {
        console.warn("[payNegativePoints] Error setting final balance:", balanceError);
      }
      
      // Skip the syncUserPointsBalance step that might override our calculation
      /*
      // Step 5: Sync points balance across all tables
      try {
        // Import dynamically to avoid circular dependencies
        const { syncUserPointsBalance } = await import("@/lib/actions/update-points-balance");
        const syncResult = await syncUserPointsBalance(userId);
        
        if (syncResult.success) {
          completedSteps.syncedBalance = true;
          console.log(`[payNegativePoints] Points balance synchronized successfully:`, syncResult.data);
        } else {
          console.warn(`[payNegativePoints] Error synchronizing points:`, syncResult.error);
        }
      } catch (syncError) {
        console.warn(`[payNegativePoints] Exception synchronizing points:`, syncError);
      }
      */
      
      // Pay the negative points
      console.log(`[payNegativePoints] Payment completed successfully. Final balance: ${finalBalance}`);
      
      // Force a synchronization of negative points table to ensure counts are correct
      const { data: refreshNegativePoints } = await adminClient
        .from('negative_points')
        .select('id, created_at, reason')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
        
      const pendingCount = refreshNegativePoints?.length || 0;
      console.log(`[payNegativePoints] After payment: ${pendingCount} pending entries remain`);
      
      // Check if any new entries were just created in the last 5 seconds
      const now = new Date();
      const freshEntries = refreshNegativePoints?.filter((entry: {id: string | number, created_at: string, reason: string}) => {
        const createdAt = new Date(entry.created_at);
        const secondsAgo = (now.getTime() - createdAt.getTime()) / 1000;
        return secondsAgo < 5; // Created less than 5 seconds ago
      });
      
      if (freshEntries && freshEntries.length > 0) {
        console.warn(`[payNegativePoints] WARNING: ${freshEntries.length} new entries were just created! Attempting to remove them...`);
        
        // Try to delete any entries that were just created
        for (const entry of freshEntries) {
          console.log(`[payNegativePoints] Removing auto-created entry: ${entry.id} - ${entry.reason}`);
          await adminClient
            .from('negative_points')
            .delete()
            .eq('id', entry.id);
        }
      }
      
      return {
        success: true,
        data: {
          paidPoints: pointsToPay,
          remainingPoints: remainingPoints,
          newBalance: finalBalance,
          pendingCount,
          completedSteps
        },
        message: remainingPoints > 0
          ? `تم تسديد ${pointsToPay} نقطة سلبية بنجاح! متبقي ${remainingPoints} نقطة. رصيدك الحالي: ${finalBalance} نقطة`
          : `تم تسديد ${pointsToPay} نقطة سلبية بنجاح! رصيدك الحالي: ${finalBalance} نقطة`
      }
    } catch (innerError: unknown) {
      console.error("[payNegativePoints] Error during processing:", innerError)
      
      // Try recovery steps if some operations completed
      if (completedSteps.createdTransaction || completedSteps.updatedPointsBalance || completedSteps.markedEntryAsPaid) {
        console.log("[payNegativePoints] Attempting recovery after partial completion...");
        
        try {
          // Import dynamically to avoid circular dependencies
          const { syncUserPointsBalance } = await import("@/lib/actions/update-points-balance");
          const recoveryResult = await syncUserPointsBalance(userId);
          
          if (recoveryResult.success) {
            console.log("[payNegativePoints] Recovery successful, points synchronized");
            return {
              success: true,
              data: {
                paidPoints: partialAmount || 0,
                newBalance: recoveryResult.data?.points || 0,
                recoveryApplied: true,
                completedSteps
              },
              message: "تم معالجة الدفع بنجاح بعد إجراء تصحيح البيانات. يرجى التحقق من رصيدك الحالي."
            }
          } else {
            console.error("[payNegativePoints] Recovery failed:", recoveryResult.error);
          }
        } catch (recoveryError) {
          console.error("[payNegativePoints] Exception during recovery:", recoveryError);
        }
      }
      
      throw innerError // Re-throw to be caught by outer catch
    }
  } catch (error: unknown) {
    console.error("[payNegativePoints] Unexpected error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "حدث خطأ غير متوقع أثناء تسديد النقاط السلبية"
    }
  }
}

/**
 * Function to automatically process mandatory negative points
 * This should be called when viewing student data
 */
export async function processMandatoryNegativePoints(userId: string) {
  try {
    if (!userId) {
      console.error("processMandatoryNegativePoints called with no userId")
      return { 
        success: false, 
        error: "User ID is required",
        message: "معرف المستخدم مطلوب" 
      }
    }
    
    console.log("[processMandatoryNegativePoints] Starting for user:", userId)
    
    // Use admin client to bypass RLS policies
    const adminClient: SupabaseClient = createAdminClient()
    
    // Get pending mandatory negative points
    const { data: mandatoryEntries, error: entriesError } = await adminClient
      .from("negative_points")
      .select("*, point_categories!negative_points_category_id_fkey(id, name, is_mandatory)")
      .eq("user_id", userId)
      .eq("status", "pending")
      .is("paid_at", null)
      
    if (entriesError) {
      console.error("[processMandatoryNegativePoints] Error fetching entries:", entriesError.message)
      return { 
        success: false, 
        error: entriesError.message,
        message: "خطأ في جلب النقاط السلبية" 
      }
    }
    
    if (!mandatoryEntries || mandatoryEntries.length === 0) {
      console.log("[processMandatoryNegativePoints] No mandatory points to process")
      return {
        success: true,
        message: "لا توجد نقاط سلبية إجبارية للمعالجة"
      }
    }
    
    // Filter only mandatory entries (is_mandatory is true or null)
    const mandatoryPoints = mandatoryEntries.filter((entry: PendingEntry) => 
      !entry.category_id || 
      (entry.point_categories && entry.point_categories.is_mandatory !== false)
    )
    
    if (mandatoryPoints.length === 0) {
      console.log("[processMandatoryNegativePoints] No mandatory points to process")
      return {
        success: true,
        message: "لا توجد نقاط سلبية إجبارية للمعالجة"
      }
    }
    
    // Get student current points
    const { data: pointsData, error: pointsError } = await adminClient
      .from("student_points")
      .select("points")
      .eq("student_id", userId)
      .single()
      
    if (pointsError && pointsError.code !== "PGRST116") {
      console.error("[processMandatoryNegativePoints] Error fetching points:", pointsError.message)
      return { 
        success: false, 
        error: pointsError.message,
        message: "خطأ في جلب رصيد النقاط" 
      }
    }
    
    const currentPoints = pointsData?.points || 0
    let totalDeducted = 0
    let processedEntries = 0
    
    // Process each mandatory entry
    for (const entry of mandatoryPoints) {
      // Mark the entry as paid
      const { error: updateError } = await adminClient
        .from("negative_points")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          auto_processed: true
        })
        .eq("id", entry.id)
        
      if (updateError) {
        console.error(`[processMandatoryNegativePoints] Error updating entry ${entry.id}:`, updateError.message)
        continue
      }
      
      // Create transaction record
      const { error: transactionError } = await adminClient
        .from("point_transactions")
        .insert({
          user_id: userId,
          points: -entry.points,
          reason: `خصم تلقائي للنقاط السلبية الإجبارية: ${entry.reason}`,
          transaction_type: "mandatory_negative_points_deduction",
          reference_id: entry.id
        })
        
      if (transactionError) {
        console.warn(`[processMandatoryNegativePoints] Error creating transaction for ${entry.id}:`, transactionError.message)
        // Non-critical, continue
      }
      
      totalDeducted += entry.points
      processedEntries++
    }
    
    // Update student points balance
    const newBalance = currentPoints - totalDeducted
    
    if (totalDeducted > 0) {
      if (pointsData) {
        // Update existing record
        await adminClient
          .from("student_points")
          .update({ points: newBalance })
          .eq("student_id", userId)
      } else {
        // Create new record
        await adminClient
          .from("student_points")
          .insert({ student_id: userId, points: newBalance })
      }
    }
    
    console.log(`[processMandatoryNegativePoints] Processed ${processedEntries} entries, deducted ${totalDeducted} points, new balance: ${newBalance}`)
    
    return {
      success: true,
      data: {
        processedEntries,
        totalDeducted,
        newBalance
      },
      message: `تم خصم ${totalDeducted} نقطة بشكل تلقائي من رصيدك مقابل النقاط السلبية الإجبارية`
    }
  } catch (error: any) {
    console.error("[processMandatoryNegativePoints] Unexpected error:", error)
    return {
      success: false,
      error: error.message,
      message: "حدث خطأ غير متوقع أثناء معالجة النقاط السلبية الإجبارية"
    }
  }
} 