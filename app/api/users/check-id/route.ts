import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    // Get URL parameters
    const url = new URL(request.url);
    const userId = url.searchParams.get('id');
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing id parameter"
      }, { status: 400 });
    }
    
    console.log("Checking user ID:", userId);
    
    // Create admin client
    const adminClient = await createAdminClient();
    
    // Get list of all users to check
    const { data: allUsers, error: listError } = await adminClient
      .from("users")
      .select("id, full_name, user_code, role_id")
      .limit(50);
      
    if (listError) {
      return NextResponse.json({ 
        success: false, 
        error: `Database error: ${listError.message}`
      }, { status: 500 });
    }
    
    // Check if the ID exists
    const exactMatch = allUsers?.find(u => u.id === userId);
    
    // Get first 5 users as sample
    const sampleUsers = allUsers?.slice(0, 5);
    
    return NextResponse.json({
      success: true,
      checkingId: userId,
      exists: !!exactMatch,
      userDetails: exactMatch,
      totalUsers: allUsers?.length || 0,
      sampleUsers: sampleUsers || []
    });
    
  } catch (error) {
    console.error("Error in check-id API:", error);
    return NextResponse.json({ 
      success: false, 
      error: `Error: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
} 