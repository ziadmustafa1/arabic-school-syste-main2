import { createClient, createAdminClient } from "@/lib/supabase/server"
import { handleError, createResponse } from "@/lib/utils"
import { TABLES } from "@/lib/constants"

/**
 * Fetch data from a Supabase table with proper error handling
 */
export async function fetchData<T = any>(
  table: string,
  options: {
    select?: string
    filter?: Record<string, any>
    order?: { column: string; ascending?: boolean }
    limit?: number
    single?: boolean
    useAdmin?: boolean
  } = {}
) {
  try {
    const { select = "*", filter = {}, order, limit, single = false, useAdmin = false } = options
    
    const supabase = useAdmin ? createAdminClient() : await createClient()
    
    let query = supabase.from(table).select(select)
    
    // Apply filters
    Object.entries(filter).forEach(([key, value]) => {
      if (key === 'or') {
        query = query.or(value as string)
      } else if (key === 'in' && Array.isArray(value)) {
        const [column, values] = value
        query = query.in(column, values)
      } else if (key === 'neq') {
        const [column, val] = value
        query = query.neq(column, val)
      } else if (key === 'gt') {
        const [column, val] = value
        query = query.gt(column, val)
      } else if (key === 'lt') {
        const [column, val] = value
        query = query.lt(column, val)
      } else if (key === 'gte') {
        const [column, val] = value
        query = query.gte(column, val)
      } else if (key === 'lte') {
        const [column, val] = value
        query = query.lte(column, val)
      } else if (key === 'like') {
        const [column, val] = value
        query = query.like(column, val)
      } else if (key === 'ilike') {
        const [column, val] = value
        query = query.ilike(column, val)
      } else {
        query = query.eq(key, value)
      }
    })
    
    // Apply ordering
    if (order) {
      query = query.order(order.column, { ascending: order.ascending ?? true })
    }
    
    // Apply limit
    if (limit) {
      query = query.limit(limit)
    }
    
    // Get single record if requested
    if (single) {
      query = query.single()
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error(`Error fetching data from ${table}:`, error)
      return createResponse(false, null, error.message)
    }
    
    return createResponse(true, data)
  } catch (error) {
    console.error(`Error in fetchData for ${table}:`, error)
    return createResponse(false, null, handleError(error))
  }
}

/**
 * Insert data into a Supabase table with proper error handling
 */
export async function insertData<T = any>(
  table: string,
  data: any,
  options: {
    useAdmin?: boolean
    select?: string
  } = {}
) {
  try {
    const { useAdmin = false, select } = options
    
    const supabase = useAdmin ? createAdminClient() : await createClient()
    
    let query = supabase.from(table).insert(data)
    
    if (select) {
      query = query.select(select)
    }
    
    const { data: result, error } = await query
    
    if (error) {
      console.error(`Error inserting data into ${table}:`, error)
      return createResponse(false, null, error.message)
    }
    
    return createResponse(true, result)
  } catch (error) {
    console.error(`Error in insertData for ${table}:`, error)
    return createResponse(false, null, handleError(error))
  }
}

/**
 * Update data in a Supabase table with proper error handling
 */
export async function updateData<T = any>(
  table: string,
  data: any,
  filter: Record<string, any>,
  options: {
    useAdmin?: boolean
    select?: string
  } = {}
) {
  try {
    const { useAdmin = false, select } = options
    
    const supabase = useAdmin ? createAdminClient() : await createClient()
    
    let query = supabase.from(table).update(data)
    
    // Apply filters
    Object.entries(filter).forEach(([key, value]) => {
      query = query.eq(key, value)
    })
    
    if (select) {
      query = query.select(select)
    }
    
    const { data: result, error } = await query
    
    if (error) {
      console.error(`Error updating data in ${table}:`, error)
      return createResponse(false, null, error.message)
    }
    
    return createResponse(true, result)
  } catch (error) {
    console.error(`Error in updateData for ${table}:`, error)
    return createResponse(false, null, handleError(error))
  }
}

/**
 * Delete data from a Supabase table with proper error handling
 */
export async function deleteData(
  table: string,
  filter: Record<string, any>,
  options: {
    useAdmin?: boolean
  } = {}
) {
  try {
    const { useAdmin = false } = options
    
    const supabase = useAdmin ? createAdminClient() : await createClient()
    
    let query = supabase.from(table).delete()
    
    // Apply filters
    Object.entries(filter).forEach(([key, value]) => {
      query = query.eq(key, value)
    })
    
    const { error } = await query
    
    if (error) {
      console.error(`Error deleting data from ${table}:`, error)
      return createResponse(false, null, error.message)
    }
    
    return createResponse(true)
  } catch (error) {
    console.error(`Error in deleteData for ${table}:`, error)
    return createResponse(false, null, handleError(error))
  }
}

/**
 * Get the current user with proper error handling
 */
export async function getCurrentUser() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase.auth.getUser()
    
    if (error || !data.user) {
      return createResponse(false, null, "User not found")
    }
    
    return createResponse(true, data.user)
  } catch (error) {
    console.error("Error in getCurrentUser:", error)
    return createResponse(false, null, handleError(error))
  }
}

/**
 * Get the current user's profile data with proper error handling
 */
export async function getCurrentUserProfile() {
  try {
    const userResponse = await getCurrentUser()
    
    if (!userResponse.success) {
      return userResponse
    }
    
    const { data: user } = userResponse
    
    const profileResponse = await fetchData(TABLES.USERS, {
      filter: { id: user.id },
      single: true
    })
    
    return profileResponse
  } catch (error) {
    console.error("Error in getCurrentUserProfile:", error)
    return createResponse(false, null, handleError(error))
  }
} 