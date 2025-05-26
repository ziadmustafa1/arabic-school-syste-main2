import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    
    // Create a Supabase admin client to bypass RLS policies
    const supabase = createAdminClient();
    
    if (!requestData.id) {
      return NextResponse.json(
        { success: false, message: "معرف الفئة مطلوب للحذف" },
        { status: 400 }
      );
    }
    
    // Admin operations completely bypass RLS policies
    const { error } = await supabase
      .from("point_categories")
      .delete()
      .eq("id", requestData.id);
    
    if (error) {
      console.error("Server-side error deleting category:", error);
      return NextResponse.json(
        { success: false, message: error.message || "حدث خطأ أثناء حذف الفئة" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Unexpected server error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "حدث خطأ غير متوقع" },
      { status: 500 }
    );
  }
} 