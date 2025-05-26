import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TABLES } from '@/lib/constants'
import { getCurrentUser } from '@/lib/actions/get-current-user'
import { ROLES } from '@/lib/constants'

// List records handler with admin privileges (bypasses RLS)
export async function GET(request: Request) {
  try {
    // Verify admin
    const user = await getCurrentUser()
    if (!user || user.role_id !== ROLES.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Get records with admin client (bypasses RLS)
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from(TABLES.USER_RECORDS)
      .select(`
        *,
        user:user_id (
          id,
          full_name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error listing records:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Error in records listing:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 