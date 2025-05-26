import { createClient } from "@/lib/supabase/client"
import { TABLES } from "@/lib/constants"

/**
 * Create a new record (client version)
 */
export async function createRecord(record: {
  user_id: string
  title: string
  category: string
  description?: string | null
  points_value: number
  valid_from: string
  valid_until?: string | null
  created_by?: string
}) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from(TABLES.USER_RECORDS)
    .insert(record)
    .select()
    .single()

  if (error) {
    console.error("Error creating record:", error)
    throw new Error(`Failed to create record: ${error.message}`)
  }
  
  return data
}

/**
 * Update an existing record (client version)
 */
export async function updateRecord(
  recordId: string, 
  updates: {
    title?: string
    category?: string
    description?: string | null
    points_value?: number
    valid_from?: string
    valid_until?: string | null
  }
) {
  const supabase = createClient()

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
  
  return data
}

/**
 * Delete a record (client version)
 */
export async function deleteRecord(recordId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from(TABLES.USER_RECORDS)
    .delete()
    .eq('id', recordId)

  if (error) {
    console.error("Error deleting record:", error)
    throw new Error(`Failed to delete record: ${error.message}`)
  }
  
  return true
} 