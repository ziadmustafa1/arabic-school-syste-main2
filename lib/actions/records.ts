import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { TABLES } from "@/lib/constants"
import { revalidatePath } from "next/cache"

/**
 * Get records for a specific user
 */
export async function getUserRecords(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from(TABLES.USER_RECORDS)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching user records:", error)
    throw new Error(`Failed to fetch user records: ${error.message}`)
  }

  console.log(`Retrieved ${data?.length || 0} records for user ${userId}`)
  return data || []
}

/**
 * Get a specific record by ID
 */
export async function getRecordById(recordId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from(TABLES.USER_RECORDS)
    .select('*')
    .eq('id', recordId)
    .single()

  if (error) {
    console.error("Error fetching record:", error)
    throw new Error(`Failed to fetch record: ${error.message}`)
  }

  return data
}

/**
 * Get records by category
 */
export async function getRecordsByCategory(userId: string, category: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from(TABLES.USER_RECORDS)
    .select('*')
    .eq('user_id', userId)
    .eq('category', category)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching records by category:", error)
    throw new Error(`Failed to fetch records by category: ${error.message}`)
  }

  return data
}

/**
 * Create a new record
 */
export async function createRecord(record: {
  user_id: string
  title: string
  category: string
  description?: string
  points_value: number
  valid_from: string
  valid_until?: string
  created_by?: string
}) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from(TABLES.USER_RECORDS)
    .insert(record)
    .select()
    .single()

  if (error) {
    console.error("Error creating record:", error)
    throw new Error(`Failed to create record: ${error.message}`)
  }

  // Revalidate the records page
  revalidatePath('/my-records')
  
  return data
}

/**
 * Update an existing record
 */
export async function updateRecord(
  recordId: string, 
  updates: {
    title?: string
    category?: string
    description?: string
    points_value?: number
    valid_from?: string
    valid_until?: string
  }
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from(TABLES.USER_RECORDS)
    .update(updates)
    .eq('id', recordId)
    .select()
    .single()

  if (error) {
    console.error("Error updating record:", error)
    throw new Error(`Failed to update record: ${error.message}`)
  }

  // Revalidate the records page
  revalidatePath('/my-records')
  
  return data
}

/**
 * Delete a record
 */
export async function deleteRecord(recordId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from(TABLES.USER_RECORDS)
    .delete()
    .eq('id', recordId)

  if (error) {
    console.error("Error deleting record:", error)
    throw new Error(`Failed to delete record: ${error.message}`)
  }

  // Revalidate the records page
  revalidatePath('/my-records')
  
  return true
} 