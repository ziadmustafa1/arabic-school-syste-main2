import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: { classId: string } }
) {
  try {
    // In Next.js App Router, params don't need to be awaited
    const classId = params.classId
    
    if (!classId) {
      return NextResponse.json(
        { success: false, message: 'Class ID required' },
        { status: 400 }
      )
    }
    
    const supabase = await createAdminClient()
    
    // Since class_schedule doesn't exist, we'll get all subjects directly
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('*')
      .order('name')
      
    if (subjectsError) {
      console.error('Error fetching subjects:', subjectsError)
      return NextResponse.json(
        { success: false, message: subjectsError.message },
        { status: 500 }
      )
    }
    
    // If no subjects found at all
    if (!subjects || subjects.length === 0) {
      return NextResponse.json(
        { success: false, message: 'لم يتم العثور على مواد دراسية' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      success: true, 
      data: subjects
    })
    
  } catch (error: any) {
    console.error('Error in subjects API:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
} 