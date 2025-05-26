import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TABLES } from '@/lib/constants'
import { getCurrentUser } from '@/lib/actions/get-current-user'
import { ROLES } from '@/lib/constants'

// Create record handler
export async function POST(request: Request) {
  try {
    // Verify admin
    const user = await getCurrentUser()
    if (!user || user.role_id !== ROLES.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get record data from request
    const recordData = await request.json()
    
    // Generate a random record code if not provided
    if (!recordData.record_code) {
      const prefix = 'R';
      const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const timestamp = Date.now().toString().slice(-5);
      recordData.record_code = `${prefix}${randomPart}${timestamp}`.substring(0, 10);
    }
    
    // Add created_by if not set
    if (!recordData.created_by && user) {
      recordData.created_by = user.id;
    }
    
    // Create record with admin client (bypasses RLS)
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from(TABLES.USER_RECORDS)
      .insert(recordData)
      .select()
      .single()

    if (error) {
      console.error('Error creating record:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Error in record creation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Update record handler
export async function PUT(request: Request) {
  try {
    // Verify admin
    const user = await getCurrentUser()
    if (!user || user.role_id !== ROLES.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get record data and ID from request
    const { id, ...updates } = await request.json()
    
    // Update record with admin client (bypasses RLS)
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from(TABLES.USER_RECORDS)
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating record:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Error in record update:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Delete record handler
export async function DELETE(request: Request) {
  try {
    // Verify admin
    const user = await getCurrentUser()
    if (!user || user.role_id !== ROLES.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get record ID from URL
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 })
    }
    
    // Delete record with admin client (bypasses RLS)
    const supabase = createAdminClient()
    const { error } = await supabase
      .from(TABLES.USER_RECORDS)
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting record:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in record deletion:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 