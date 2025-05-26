import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const adminClient = await createAdminClient();
    
    // Get all badges
    const { data, error } = await adminClient
      .from("badges")
      .select("*")
      .order("min_points", { ascending: true });
    
    if (error) {
      console.error("API error fetching badges:", error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Unexpected error in badges API:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
} 