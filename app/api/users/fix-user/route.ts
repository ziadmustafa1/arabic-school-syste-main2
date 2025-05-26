import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    // Get URL parameters
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: "No userId provided in query parameters"
      }, { status: 400 });
    }
    
    console.log("Checking user ID:", userId);
    
    // Create admin client
    const adminClient = await createAdminClient();
    
    // 1. Check users table for all possible matching variants
    const { data: exactUser, error: exactError } = await adminClient
      .from("users")
      .select("id, full_name, user_code, role_id")
      .eq("id", userId)
      .maybeSingle();
      
    if (exactError) {
      console.error("Error checking for exact match:", exactError);
    }
    
    // 2. Try a case-insensitive match for UUID
    // This can help if there's a casing issue with the UUID
    const { data: caseInsensitiveUsers, error: caseError } = await adminClient
      .from("users")
      .select("id, full_name, user_code, role_id")
      .ilike("id", userId)
      .limit(5);
      
    if (caseError) {
      console.error("Error checking for case-insensitive match:", caseError);
    }
    
    // 3. Get some sample working user IDs to compare with
    const { data: sampleUsers, error: sampleError } = await adminClient
      .from("users")
      .select("id, full_name, user_code, role_id")
      .limit(5);
      
    if (sampleError) {
      console.error("Error getting sample users:", sampleError);
    }
    
    // 4. Check if the ID looks similar to any existing IDs
    let similarUsers = [];
    if (sampleUsers && sampleUsers.length > 0) {
      // Compare character by character with each sample user ID
      // This could help identify formatting issues
      similarUsers = sampleUsers.map(user => {
        const originalId = user.id;
        const differences = [];
        
        if (originalId.length !== userId.length) {
          differences.push(`Length mismatch: Expected ${originalId.length}, got ${userId.length}`);
        } else {
          for (let i = 0; i < originalId.length; i++) {
            if (originalId[i] !== userId[i]) {
              differences.push(`Char at position ${i}: Expected '${originalId[i]}', got '${userId[i]}'`);
            }
          }
        }
        
        return {
          sampleId: originalId,
          name: user.full_name,
          differences: differences,
          similarityScore: differences.length === 0 ? 100 : 
                           100 - (differences.length / originalId.length * 100)
        };
      }).filter(item => item.similarityScore > 70); // Only include fairly similar IDs
    }
    
    // 5. Get conversations that this user is part of
    const { data: conversations, error: convError } = await adminClient
      .from("conversations")
      .select("id, user1_id, user2_id")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .limit(5);
      
    if (convError) {
      console.error("Error checking conversations:", convError);
    }
    
    return NextResponse.json({
      success: true,
      userId: userId,
      exactMatch: exactUser,
      caseInsensitiveMatches: caseInsensitiveUsers || [],
      sampleUsers: sampleUsers || [],
      similarUsers: similarUsers,
      conversations: conversations || [],
      recommendation: exactUser ? "User ID exists" : 
                    (caseInsensitiveUsers && caseInsensitiveUsers.length > 0) ? 
                    `Try using one of the case-insensitive matches` :
                    (similarUsers.length > 0) ? 
                    `Try one of the similar user IDs` :
                    "User ID does not exist in the database"
    });
    
  } catch (error) {
    console.error("Error in fix-user API:", error);
    return NextResponse.json({ 
      success: false, 
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
} 