import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const adminClient = await createAdminClient();
    const userId = req.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId parameter is required" },
        { status: 400 }
      );
    }

    // Get all points transactions for the user
    const { data: transactions, error: txError } = await adminClient
      .from("points_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (txError) {
      return NextResponse.json(
        { success: false, error: txError.message },
        { status: 500 }
      );
    }

    // Calculate the sum manually
    const positivePoints = transactions
      ?.filter(tx => tx.is_positive === true)
      .reduce((sum, tx) => sum + tx.points, 0) || 0;

    const negativePoints = transactions
      ?.filter(tx => tx.is_positive === false)
      .reduce((sum, tx) => sum + tx.points, 0) || 0;

    const totalPoints = positivePoints - negativePoints;

    // Try RPC function
    const { data: rpcPoints, error: rpcError } = await adminClient.rpc("get_user_points_balance", {
      user_id_param: userId,
    });

    // Get user details
    const { data: userData, error: userError } = await adminClient
      .from("users")
      .select("full_name, user_code, role_id")
      .eq("id", userId)
      .single();

    return NextResponse.json({
      success: true,
      user: userData,
      points: {
        manual: {
          positive: positivePoints,
          negative: negativePoints,
          total: totalPoints,
        },
        rpc: rpcPoints,
      },
      transactions: transactions,
      _diagnosticInfo: {
        rpcError: rpcError,
        userError: userError,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "An error occurred" },
      { status: 500 }
    );
  }
} 