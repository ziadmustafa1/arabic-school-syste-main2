// Test script to check Supabase connection and fetch users
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

async function main() {
  console.log("Starting test script...");
  
  // Check if environment variables are correctly loaded
  console.log("NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("SUPABASE_SERVICE_ROLE_KEY available:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    // Create admin client
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    
    console.log("Admin client created successfully");
    
    // Test authentication - verify service role has access
    const { data: { user }, error: authError } = await adminClient.auth.getUser();
    if (authError) {
      console.error("Auth error:", authError);
    } else {
      console.log("Auth successful - service role token is valid");
    }
    
    // Fetch users
    console.log("Fetching users...");
    const { data: users, error: usersError } = await adminClient
      .from("users")
      .select("id, full_name, user_code, role_id, roles(name)")
      .order("role_id")
      .order("full_name")
      .limit(10);
    
    if (usersError) {
      console.error("Error fetching users:", usersError);
    } else {
      console.log(`Successfully retrieved ${users?.length || 0} users`);
      if (users && users.length > 0) {
        console.log("Sample user:", {
          id: users[0].id,
          name: users[0].full_name,
          role_id: users[0].role_id,
          role_name: users[0].roles?.name || 'N/A'
        });
      } else {
        console.log("No users found in the database");
      }
    }
    
  } catch (error) {
    console.error("Fatal error:", error);
  }
}

main().catch(console.error); 