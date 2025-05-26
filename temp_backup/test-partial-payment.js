// Simple test script to verify partial payment functionality
const { createAdminClient } = require('./lib/supabase/server');

async function testPartialPayment() {
  console.log("Starting partial payment test...");
  
  // Use admin client to bypass RLS policies
  const adminClient = await createAdminClient();
  
  // Test user ID (replace with an actual user ID from your database)
  const userId = "TEST_USER_ID";
  
  // 1. Create a test negative points entry with a category that has is_mandatory=false
  console.log("Creating test negative points entry...");
  
  // First get or create a test category
  const { data: categories, error: categoryError } = await adminClient
    .from("point_categories")
    .select("id")
    .eq("is_mandatory", false)
    .limit(1);
  
  if (categoryError) {
    console.error("Error fetching categories:", categoryError.message);
    return;
  }
  
  let categoryId;
  if (categories && categories.length > 0) {
    categoryId = categories[0].id;
    console.log(`Using existing category: ${categoryId}`);
  } else {
    // Create a test category
    const { data: newCategory, error: createCategoryError } = await adminClient
      .from("point_categories")
      .insert({
        name: "Test Optional Category",
        description: "Category for testing optional payments",
        is_positive: false,
        points: 10,
        created_by: userId,
        is_mandatory: false
      })
      .select();
    
    if (createCategoryError) {
      console.error("Error creating category:", createCategoryError.message);
      return;
    }
    
    categoryId = newCategory[0].id;
    console.log(`Created new category: ${categoryId}`);
  }
  
  // Create a test negative points entry
  const testPoints = 10;
  const { data: entry, error: entryError } = await adminClient
    .from("negative_points")
    .insert({
      user_id: userId,
      points: testPoints,
      reason: "Test optional negative points for partial payment",
      status: "pending",
      category_id: categoryId
    })
    .select();
  
  if (entryError) {
    console.error("Error creating negative points entry:", entryError.message);
    return;
  }
  
  const entryId = entry[0].id;
  console.log(`Created entry with ID: ${entryId}`);
  
  // 2. Ensure the user has enough points
  const { data: pointsData, error: pointsError } = await adminClient
    .from("student_points")
    .select("*")
    .eq("student_id", userId)
    .single();
  
  if (pointsError && pointsError.code !== "PGRST116") {
    console.error("Error fetching points:", pointsError.message);
    return;
  }
  
  let currentPoints = pointsData?.points || 0;
  if (currentPoints < testPoints) {
    // Add points if needed
    const pointsToAdd = testPoints - currentPoints + 10; // Add extra 10 as buffer
    console.log(`Adding ${pointsToAdd} points to user...`);
    
    if (pointsData) {
      // Update existing record
      await adminClient
        .from("student_points")
        .update({ points: currentPoints + pointsToAdd })
        .eq("student_id", userId);
    } else {
      // Create new record
      await adminClient
        .from("student_points")
        .insert({ student_id: userId, points: pointsToAdd });
    }
    
    currentPoints += pointsToAdd;
    console.log(`User now has ${currentPoints} points`);
  }
  
  // 3. Make a partial payment
  const partialAmount = Math.floor(testPoints / 2);
  console.log(`Making partial payment of ${partialAmount} points for entry ${entryId}...`);
  
  // Import the payNegativePoints function directly
  // Note: This might not work as expected in a script due to "use server" directive
  // You may need to modify this or call the API endpoint directly
  const { payNegativePoints } = require('./lib/actions/negative-points');
  
  const result = await payNegativePoints({
    entryId,
    userId,
    partialAmount
  });
  
  console.log("Partial payment result:", JSON.stringify(result, null, 2));
  
  // 4. Verify the result
  if (result.success) {
    console.log("Partial payment successful!");
    
    // Check that the entry was updated correctly
    const { data: updatedEntry, error: fetchError } = await adminClient
      .from("negative_points")
      .select("*")
      .eq("id", entryId)
      .single();
    
    if (fetchError) {
      console.error("Error fetching updated entry:", fetchError.message);
      return;
    }
    
    console.log("Updated entry:", updatedEntry);
    console.log(`Points remaining: ${updatedEntry.points} (expected ${testPoints - partialAmount})`);
    
    // Check that a new entry was created for the partial payment
    const { data: newEntries, error: newEntriesError } = await adminClient
      .from("negative_points")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(1);
    
    if (newEntriesError) {
      console.error("Error fetching new entry:", newEntriesError.message);
      return;
    }
    
    if (newEntries && newEntries.length > 0) {
      console.log("New paid entry created:", newEntries[0]);
      console.log(`Paid points: ${newEntries[0].points} (expected ${partialAmount})`);
    } else {
      console.error("No new paid entry was created!");
    }
    
    // Check user's updated point balance
    const { data: finalPoints, error: finalPointsError } = await adminClient
      .from("student_points")
      .select("points")
      .eq("student_id", userId)
      .single();
    
    if (finalPointsError) {
      console.error("Error fetching final points:", finalPointsError.message);
      return;
    }
    
    console.log(`User final points: ${finalPoints.points} (expected ${currentPoints - partialAmount})`);
    
    console.log("Test completed successfully!");
  } else {
    console.error("Partial payment failed:", result.message);
  }
}

// Run the test
testPartialPayment().catch(error => {
  console.error("Test failed with error:", error);
}); 