import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Create a Supabase client with admin privileges using service role key
const adminSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function GET() {
  try {
    // Create helper functions
    await adminSupabase.rpc("execute_sql", {
      sql_query: `
        -- Function to check if a table exists
        CREATE OR REPLACE FUNCTION check_table_exists(table_name TEXT)
        RETURNS BOOLEAN AS $$
        DECLARE
          exists BOOLEAN;
        BEGIN
          SELECT COUNT(*) > 0 INTO exists
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1;
          
          RETURN exists;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        -- Function to execute SQL
        CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
        RETURNS VOID AS $$
        BEGIN
          EXECUTE sql_query;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `,
    })

    return NextResponse.json({ success: true, message: "Database setup completed successfully" })
  } catch (error) {
    console.error("Error setting up database:", error)
    return NextResponse.json({ success: false, error: "Failed to set up database" }, { status: 500 })
  }
}
