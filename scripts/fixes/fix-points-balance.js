// Script to fix points balance for all users
// We'll use dynamic imports to handle ESM modules in CommonJS
const { createClient } = require('@supabase/supabase-js');

async function main() {
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
    
    // Get all students
    const { data: students, error: studentsError } = await adminClient
      .from('users')
      .select('id, full_name, role_id')
      .eq('role_id', 1);  // Filter to only get students
    
    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      process.exit(1);
    }
    
    console.log(`Found ${students.length} students to process`);
    
    let updatedCount = 0;
    let noChangeCount = 0;
    let errorCount = 0;
    
    // Process each student
    for (const student of students) {
      try {
        console.log(`\nProcessing student ${student.id} (${student.full_name})...`);
        
        // Calculate points properly from transactions
        const { data: transactions, error: txError } = await adminClient
          .from('points_transactions')
          .select('points, is_positive, description')
          .eq('user_id', student.id);
        
        if (txError) {
          console.error(`Error fetching transactions for student ${student.id}:`, txError);
          errorCount++;
          continue;
        }
        
        console.log(`Found ${transactions.length} transactions for student`);
        
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
          .eq('student_id', student.id)
          .maybeSingle();
        
        if (pointsError) {
          console.error(`Error fetching points record for student ${student.id}:`, pointsError);
          errorCount++;
          continue;
        }
        
        // Update or create the points record
        if (pointsData) {
          console.log(`Current points: ${pointsData.points}, Calculated points: ${calculatedPoints}`);
          
          // Only update if there's a difference
          if (pointsData.points !== calculatedPoints) {
            const { error: updateError } = await adminClient
              .from('student_points')
              .update({ points: calculatedPoints })
              .eq('student_id', student.id);
            
            if (updateError) {
              console.error(`Error updating points for student ${student.id}:`, updateError);
              errorCount++;
            } else {
              console.log(`UPDATED: Student ${student.id} points from ${pointsData.points} to ${calculatedPoints}`);
              console.log(`Positive points: ${positivePoints}, Negative points: ${negativePoints}`);
              updatedCount++;
            }
          } else {
            console.log(`NO CHANGE: Student ${student.id} already has correct balance of ${calculatedPoints}`);
            noChangeCount++;
          }
        } else {
          // No record exists, create one
          const { error: insertError } = await adminClient
            .from('student_points')
            .insert({ student_id: student.id, points: calculatedPoints });
          
          if (insertError) {
            console.error(`Error creating points record for student ${student.id}:`, insertError);
            errorCount++;
          } else {
            console.log(`CREATED: New points record for student ${student.id} with ${calculatedPoints} points`);
            console.log(`Positive points: ${positivePoints}, Negative points: ${negativePoints}`);
            updatedCount++;
          }
        }
        
        // List recent transactions for debugging
        if (transactions.length > 0) {
          console.log('Recent transactions:');
          transactions.slice(-5).forEach(tx => {
            console.log(`- ${tx.is_positive ? '+' : '-'}${tx.points} points: ${tx.description || 'No description'}`);
          });
        }
      } catch (userError) {
        console.error(`Error processing student ${student.id}:`, userError);
        errorCount++;
      }
    }
    
    console.log("\nPoints balance reconciliation completed.");
    console.log(`- ${updatedCount} records updated/created`);
    console.log(`- ${noChangeCount} records already correct`);
    console.log(`- ${errorCount} errors encountered`);
  } catch (error) {
    console.error("Error in fix points balance script:", error);
  }
}

// Run the function
main().catch(error => {
  console.error("Script failed with error:", error);
}); 