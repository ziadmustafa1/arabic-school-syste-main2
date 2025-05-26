// Direct script to update points for specific students
import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase URL and service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

// Create Supabase client with admin privileges
const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePointsForUser(userId, newPointsValue) {
  if (!userId || newPointsValue === undefined) {
    console.error("Missing required parameters: userId and newPointsValue");
    return;
  }

  try {
    console.log(`Updating points for user ${userId} to ${newPointsValue}...`);

    // Update the student_points record
    const { data, error } = await supabase
      .from('student_points')
      .update({ points: newPointsValue })
      .eq('student_id', userId)
      .select();

    if (error) {
      console.error("Error updating points:", error.message);
      return;
    }

    console.log("Update successful:", data);

    // Also add a transaction record for this manual adjustment
    const { error: transactionError } = await supabase
      .from('point_transactions')
      .insert({
        user_id: userId,
        points: newPointsValue, // This is the new total, not the difference
        reason: 'Manual points balance correction',
        transaction_type: 'admin_adjustment'
      });

    if (transactionError) {
      console.warn("Error creating transaction record:", transactionError.message);
    } else {
      console.log("Transaction record created successfully");
    }
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

// You can call this function with a specific user ID and points value
// Example: updatePointsForUser('user123', 100)

// Check if this script is being run directly
if (process.argv.length >= 4) {
  const userId = process.argv[2];
  const newPoints = parseInt(process.argv[3], 10);
  
  if (isNaN(newPoints)) {
    console.error("Points value must be a number");
    process.exit(1);
  }
  
  updatePointsForUser(userId, newPoints)
    .then(() => {
      console.log("Points update operation completed");
      process.exit(0);
    })
    .catch(error => {
      console.error("Script failed:", error);
      process.exit(1);
    });
} else {
  console.log("Usage: node update-points.js <userId> <newPointsValue>");
  process.exit(1);
} 