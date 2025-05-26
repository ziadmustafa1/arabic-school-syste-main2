import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const adminClient = await createAdminClient()
    
    // Create a simple points transaction function
    const { error } = await adminClient.rpc('execute_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION add_points_simple(
          p_user_id UUID,
          p_points INTEGER,
          p_is_positive BOOLEAN,
          p_description TEXT,
          p_created_by UUID
        ) RETURNS VOID AS $$
        BEGIN
          INSERT INTO points_transactions (
            user_id, 
            points, 
            is_positive, 
            description, 
            created_by
          )
          VALUES (
            p_user_id,
            p_points,
            p_is_positive,
            p_description,
            p_created_by
          );
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    })

    if (error) {
      console.error("Error creating function:", error)
      return NextResponse.json(
        { success: false, error },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: "RPC function created successfully" 
    })
  } catch (e: any) {
    console.error("Error in DB fix route:", e)
    return NextResponse.json(
      { success: false, error: e.message || "Unknown error" },
      { status: 500 }
    )
  }
} 