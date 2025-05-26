import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    console.log("Users API endpoint called");
    const url = new URL(request.url);
    const currentUserId = url.searchParams.get('excludeId');
    
    if (!currentUserId) {
      console.log("User ID missing in request");
      return NextResponse.json(
        { success: false, message: 'User ID required' },
        { status: 400 }
      );
    }
    
    console.log(`Creating admin client for user ${currentUserId}`);
    const supabase = await createAdminClient();
    
    // Get all users except current user, ordered by role
    console.log("Fetching users from database");
    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, user_code, role_id, roles(name)")
      .neq("id", currentUserId)
      .order("role_id")
      .order("full_name");
    
    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }
    
    if (!data || data.length === 0) {
      console.log("No users found in the database");
      // Return empty array but still with success=true
      return NextResponse.json({ 
        success: true, 
        data: [],
        message: "No users found"
      });
    }
    
    console.log(`Found ${data.length} users`);
    
    // Format the response to match expected structure
    const formattedUsers = data.map(user => {
      // Handle different shapes of the roles field
      let roleName = "غير محدد";
      
      if (user.roles) {
        if (Array.isArray(user.roles)) {
          roleName = user.roles.length > 0 && user.roles[0] 
            ? (user.roles[0] as any).name || "غير محدد" 
            : "غير محدد";
        } else if (typeof user.roles === 'object') {
          roleName = (user.roles as any).name || "غير محدد";
        }
      }
      
      return {
        id: user.id,
        full_name: user.full_name,
        user_code: user.user_code,
        role_id: user.role_id,
        roles: {
          name: roleName
        }
      };
    });
    
    console.log(`Returning ${formattedUsers.length} formatted users`);
    return NextResponse.json({ 
      success: true, 
      data: formattedUsers
    });
  } catch (error) {
    console.error('Fatal error in users API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 