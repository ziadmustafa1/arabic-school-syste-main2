import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const adminClient = await createAdminClient();
    
    // Read SQL file content
    const sqlFilePath = path.join(process.cwd(), 'scripts', 'add-notifications-functions.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute the SQL to create functions
    const { error } = await adminClient.rpc('execute_sql', {
      sql_query: sqlContent
    });
    
    if (error) {
      console.error("Error setting up notification functions:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: "Notification functions set up successfully" });
  } catch (error: any) {
    console.error("Unexpected error setting up notification functions:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
} 