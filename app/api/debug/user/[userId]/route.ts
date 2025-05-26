import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const userId = params.userId;
  
  try {
    console.log("Debug endpoint called for user ID:", userId);
    
    // Check if userId is valid
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: "No userId provided",
        step: "validation"
      }, { status: 400 });
    }
    
    // Step 1: Try to create the admin client
    let adminClient;
    try {
      adminClient = await createAdminClient();
      console.log("Admin client created successfully");
    } catch (error) {
      console.error("Failed to create admin client:", error);
      return NextResponse.json({ 
        success: false, 
        error: `Admin client creation failed: ${error instanceof Error ? error.message : String(error)}`,
        step: "admin_client_creation"
      }, { status: 500 });
    }
    
    // Step 2: Direct database query for user with minimal fields
    try {
      console.log("Attempting basic query for user existence");
      const { data: userExists, error: userExistsError } = await adminClient
        .from("users")
        .select("id")
        .eq("id", userId)
        .maybeSingle();
      
      if (userExistsError) {
        console.error("Basic query error:", userExistsError);
        return NextResponse.json({ 
          success: false, 
          error: `Basic query error: ${userExistsError.message}`,
          errorCode: userExistsError.code,
          details: userExistsError.details,
          step: "basic_query"
        }, { status: 500 });
      }
      
      if (!userExists) {
        console.log("User ID does not exist in database:", userId);
        return NextResponse.json({ 
          success: false, 
          error: "User ID does not exist in database",
          step: "user_existence" 
        }, { status: 404 });
      }
      
      console.log("User exists in database, ID confirmed");
    } catch (error) {
      console.error("Error checking user existence:", error);
      return NextResponse.json({ 
        success: false, 
        error: `Error checking user existence: ${error instanceof Error ? error.message : String(error)}`,
        step: "user_existence_check"
      }, { status: 500 });
    }
    
    // Step 3: Try the full query with all fields and joins
    try {
      console.log("Attempting full query with roles join");
      const { data: fullUser, error: fullUserError } = await adminClient
        .from("users")
        .select("id, full_name, user_code, role_id, roles(name), email, created_at")
        .eq("id", userId)
        .single();
      
      if (fullUserError) {
        console.error("Full query error:", fullUserError);
        return NextResponse.json({ 
          success: false, 
          error: `Full query error: ${fullUserError.message}`,
          errorCode: fullUserError.code,
          details: fullUserError.details,
          step: "full_query"
        }, { status: 500 });
      }
      
      if (!fullUser) {
        console.log("Full query returned no user data");
        return NextResponse.json({ 
          success: false, 
          error: "Full query returned no user data",
          step: "full_query_data" 
        }, { status: 404 });
      }
      
      // Check the roles field specifically
      const rolesData = fullUser.roles;
      const rolesInfo = {
        type: typeof rolesData,
        isArray: Array.isArray(rolesData),
        isEmpty: Array.isArray(rolesData) ? rolesData.length === 0 : rolesData === null,
        value: rolesData
      };
      
      console.log("User data retrieved successfully with roles");
      return NextResponse.json({ 
        success: true, 
        user: fullUser,
        rolesInfo
      });
      
    } catch (error) {
      console.error("Error in full user query:", error);
      return NextResponse.json({ 
        success: false, 
        error: `Error in full user query: ${error instanceof Error ? error.message : String(error)}`,
        step: "full_query_execution"
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error("Unexpected error in debug endpoint:", error);
    return NextResponse.json({ 
      success: false, 
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      step: "general"
    }, { status: 500 });
  }
} 