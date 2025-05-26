import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TABLES } from '@/lib/constants'

export async function GET(request: Request) {
  try {
    // Get records with admin client (bypasses RLS)
    const supabase = createAdminClient()
    
    // First just check the table exists and count total records
    const { count, error: countError } = await supabase
      .from(TABLES.USER_RECORDS)
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('Error counting records:', countError)
      return NextResponse.json({ 
        error: countError.message,
        phase: 'count',
        code: countError.code
      }, { status: 500 })
    }
    
    // Now get some actual records
    const { data, error } = await supabase
      .from(TABLES.USER_RECORDS)
      .select(`
        *,
        user:user_id (
          id,
          full_name
        )
      `)
      .limit(20)

    if (error) {
      console.error('Error listing records:', error)
      return NextResponse.json({ 
        error: error.message,
        phase: 'fetch',
        code: error.code
      }, { status: 500 })
    }

    return NextResponse.json({ 
      totalCount: count,
      records: data,
      serviceRoleKey: process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ? 'Available' : 'Missing'
    })
  } catch (error: any) {
    console.error('Error in debug records route:', error)
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}