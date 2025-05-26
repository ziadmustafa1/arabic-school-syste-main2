// Script to fix points balance for a single user
const { createClient } = require('@supabase/supabase-js');

async function fixUserPoints(userId) {
  try {
    // Create Supabase client with admin privileges
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      process.exit(1);
    }
    
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Connected to Supabase as admin');
    
    // Get user info
    const { data: user, error: userError } = await adminClient
      .from('users')
      .select('id, full_name, role_id')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('Error fetching user:', userError);
      process.exit(1);
    }
    
    if (!user) {
      console.error(`User with ID ${userId} not found`);
      process.exit(1);
    }
    
    console.log(`Processing user ${user.full_name} (${user.id})...`);
    
    // Calculate points properly from transactions
    const { data: transactions, error: txError } = await adminClient
      .from('points_transactions')
      .select('points, is_positive, description')
      .eq('user_id', userId);
    
    if (txError) {
      console.error(`Error fetching transactions for user ${userId}:`, txError);
      process.exit(1);
    }
    
    console.log(`Found ${transactions.length} transactions for user`);
    
    // Calculate total points manually
    let positivePoints = 0;
    let negativePoints = 0;
    
    transactions.forEach(tx => {
      if (tx.is_positive) {
        positivePoints += tx.points;
      } else {
        negativePoints += tx.points;
      }
    });
    
    const calculatedPoints = positivePoints - negativePoints;
    
    // Get current student points record if exists
    const { data: pointsData, error: pointsError } = await adminClient
      .from('student_points')
      .select('points')
      .eq('student_id', userId)
      .maybeSingle();
    
    if (pointsError) {
      console.error(`Error fetching points record for user ${userId}:`, pointsError);
      process.exit(1);
    }
    
    // Update or create the points record
    if (pointsData) {
      console.log(`Current points: ${pointsData.points}, Calculated points: ${calculatedPoints}`);
      
      // Only update if there's a difference
      if (pointsData.points !== calculatedPoints) {
        const { error: updateError } = await adminClient
          .from('student_points')
          .update({ points: calculatedPoints })
          .eq('student_id', userId);
        
        if (updateError) {
          console.error(`Error updating points for user ${userId}:`, updateError);
          process.exit(1);
        } else {
          console.log(`UPDATED: User points from ${pointsData.points} to ${calculatedPoints}`);
          console.log(`Positive points: ${positivePoints}, Negative points: ${negativePoints}`);
        }
      } else {
        console.log(`NO CHANGE: User already has correct balance of ${calculatedPoints}`);
      }
    } else {
      // No record exists, create one
      const { error: insertError } = await adminClient
        .from('student_points')
        .insert({ student_id: userId, points: calculatedPoints });
      
      if (insertError) {
        console.error(`Error creating points record for user ${userId}:`, insertError);
        process.exit(1);
      } else {
        console.log(`CREATED: New points record for user with ${calculatedPoints} points`);
        console.log(`Positive points: ${positivePoints}, Negative points: ${negativePoints}`);
      }
    }
    
    // List recent transactions for debugging
    if (transactions.length > 0) {
      console.log('Recent transactions:');
      transactions.slice(-5).forEach(tx => {
        console.log(`- ${tx.is_positive ? '+' : '-'}${tx.points} points: ${tx.description || 'No description'}`);
      });
    }
    
    console.log("Points balance fix completed successfully.");
  } catch (error) {
    console.error("Error in fix points balance script:", error);
    process.exit(1);
  }
}

// Check if a user ID was provided as an argument
if (process.argv.length < 3) {
  console.error('Please provide a user ID as an argument');
  console.log('Usage: node fix-single-user-points.js <userId>');
  process.exit(1);
}

// Run the function with the provided user ID
const userId = process.argv[2];
fixUserPoints(userId).catch(error => {
  console.error("Script failed with error:", error);
  process.exit(1);
}); 