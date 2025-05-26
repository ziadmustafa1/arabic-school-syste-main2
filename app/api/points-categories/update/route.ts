import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    
    // Create a Supabase admin client to bypass RLS policies
    const supabase = createAdminClient();
    
    if (!requestData.id) {
      return NextResponse.json(
        { success: false, message: "معرف الفئة مطلوب للتحديث" },
        { status: 400 }
      );
    }
    
    // Admin operations completely bypass RLS policies
    const { data, error } = await supabase
      .from("point_categories")
      .update({
        name: requestData.name,
        description: requestData.description,
        default_points: requestData.default_points,
        points: requestData.default_points,
        is_positive: requestData.is_positive,
        is_mandatory: requestData.is_mandatory,
        is_restricted: requestData.is_restricted,
        created_by: requestData.created_by
      })
      .eq("id", requestData.id)
      .select();
    
    if (error) {
      console.error("Server-side error updating category:", error);
      return NextResponse.json(
        { success: false, message: error.message || "حدث خطأ أثناء تحديث الفئة" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Unexpected server error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "حدث خطأ غير متوقع" },
      { status: 500 }
    );
  }
} 