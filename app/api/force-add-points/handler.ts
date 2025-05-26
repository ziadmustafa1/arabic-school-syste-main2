import { createAdminClient } from "@/lib/supabase/server";

/**
 * Direct function to add points to a user's balance
 * This can be called directly from server actions without going through the API
 */
export async function addPointsDirectly(
  userId: string,
  points: number,
  cardCode?: string | null
) {
  try {
    console.log("addPointsDirectly params:", { userId, points, cardCode });

    if (!userId) {
      return { success: false, error: "User ID is required" };
    }

    if (points <= 0) {
      return { success: false, error: "Points must be greater than 0" };
    }

    // Create admin client to bypass RLS
    const adminClient = await createAdminClient();

    // Get current points before adding new transaction
    const { data: pointsBefore, error: rpcError } = await adminClient.rpc("get_user_points_balance", {
      user_id_param: userId,
    });

    if (rpcError) {
      console.error("Error getting current points balance:", rpcError);
    }

    // Define insert object explicitly to avoid unexpected fields
    const insertObject = {
      user_id: userId,
      points: points,
      is_positive: true,
      description: cardCode ? `استخدام بطاقة شحن (${cardCode})` : "تصحيح رصيد النقاط",
      created_by: userId,
      created_at: new Date().toISOString(),
    };

    console.log("Transaction insert object:", insertObject);

    // Try direct insert first
    const { data: transaction, error: insertError } = await adminClient
      .from("points_transactions")
      .insert(insertObject)
      .select();

    if (insertError) {
      console.error("Error adding points:", insertError);
      
      // Try SQL approach as fallback
      try {
        const sqlQuery = `
          INSERT INTO points_transactions 
            (user_id, points, is_positive, description, created_by, created_at)
          VALUES 
            ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `;
        
        const { data: sqlResult, error: sqlError } = await adminClient.rpc("execute_sql_with_params", {
          sql_query: sqlQuery,
          params: [
            userId,
            points,
            true,
            insertObject.description,
            userId,
            insertObject.created_at,
          ],
        });
        
        if (sqlError) {
          console.error("Error with SQL approach:", sqlError);
          return { success: false, error: sqlError.message };
        }
        
        console.log("SQL insert succeeded:", sqlResult);
      } catch (sqlErr) {
        console.error("Error with SQL fallback:", sqlErr);
        return { success: false, error: "Failed to add points" };
      }
    } else {
      console.log("Direct insert succeeded:", transaction);
    }

    // Get updated points balance
    const { data: pointsAfter, error: rpcAfterError } = await adminClient.rpc("get_user_points_balance", {
      user_id_param: userId,
    });

    if (rpcAfterError) {
      console.error("Error getting updated points balance:", rpcAfterError);
    }

    // Add notification
    await adminClient.from("notifications").insert({
      user_id: userId,
      title: "شحن رصيد",
      content: `تم شحن رصيدك بـ ${points} نقطة`,
      is_read: false,
    });

    return {
      success: true,
      pointsAdded: points,
      balanceBefore: pointsBefore,
      balanceAfter: pointsAfter,
    };
  } catch (error) {
    console.error("Error in addPointsDirectly:", error);
    return { success: false, error: "Failed to add points" };
  }
} 