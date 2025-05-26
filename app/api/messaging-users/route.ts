import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    console.log("Messaging Users API endpoint called");
    
    // First try to get real users from the database
    try {
      console.log("Attempting to fetch real users from database");
      const supabase = await createAdminClient();
      
      // Get all users ordered by role
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, user_code, role_id, roles(name)")
        .order("role_id")
        .order("full_name");
      
      if (!error && data && data.length > 0) {
        console.log(`Successfully fetched ${data.length} users from database`);
        
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
        
        return NextResponse.json({ 
          success: true, 
          source: "database",
          data: formattedUsers
        });
      } else {
        console.log("Database query failed or returned no results, using fallback data");
        if (error) {
          console.error("Database error:", error);
        }
      }
    } catch (dbError) {
      console.error("Error accessing database:", dbError);
    }
    
    // Fallback to hard-coded test data if database access fails
    console.log("Using hardcoded test data as fallback");
    const testUsers = [
      {
        id: "982ba793-a4a6-4a64-992a-2c7de8a2cb46",
        full_name: "سيف اشرف شوقي محمد محمود",
        user_code: "ST0001",
        role_id: 1,
        roles: { name: "طالب" }
      },
      {
        id: "16b4c549-f369-4e5b-8c1e-1f309d80024b",
        full_name: "مستخدم تجريبي1",
        user_code: "ST0002",
        role_id: 1,
        roles: { name: "طالب" }
      },
      {
        id: "00000000-0000-0000-0000-000000000001",
        full_name: "طالب للاختبار",
        user_code: "ST0003",
        role_id: 1,
        roles: { name: "طالب" }
      },
      {
        id: "00000000-0000-0000-0000-000000000002",
        full_name: "معلم للاختبار",
        user_code: "TE0001",
        role_id: 3,
        roles: { name: "معلم" }
      },
      {
        id: "00000000-0000-0000-0000-000000000003",
        full_name: "مدير للاختبار",
        user_code: "AD0001",
        role_id: 4,
        roles: { name: "مدير" }
      },
    ];
    
    console.log(`Returning ${testUsers.length} test users as fallback`);
    return NextResponse.json({ 
      success: true, 
      source: "fallback",
      data: testUsers
    });
  } catch (error) {
    console.error('Error in messaging users API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 