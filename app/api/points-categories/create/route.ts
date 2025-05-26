import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    console.log("API: Starting point category creation");
    const requestData = await request.json();
    console.log("API: Received data:", JSON.stringify(requestData));
    
    // Create a Supabase admin client to bypass RLS policies
    let supabase;
    try {
      supabase = createAdminClient();
      console.log("API: Admin client created successfully");
    } catch (error: any) {
      console.error("API: Failed to create admin client:", error);
      return NextResponse.json(
        { success: false, message: "تعذر إنشاء اتصال قاعدة البيانات: " + (error.message || "خطأ غير معروف") },
        { status: 500 }
      );
    }
    
    // Admin operations completely bypass RLS policies
    console.log("API: Attempting to insert category");
    const { data, error } = await supabase.from("point_categories").insert([{
      name: requestData.name,
      description: requestData.description,
      default_points: requestData.default_points,
      points: requestData.default_points,
      is_positive: requestData.is_positive,
      is_mandatory: requestData.is_mandatory,
      is_restricted: requestData.is_restricted,
      created_by: requestData.created_by
    }]).select();
    
    if (error) {
      console.error("API: Server-side error creating category:", error);
      return NextResponse.json(
        { success: false, message: error.message || "حدث خطأ أثناء إنشاء الفئة" },
        { status: 500 }
      );
    }
    
    console.log("API: Category created successfully:", data);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("API: Unexpected server error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "حدث خطأ غير متوقع" },
      { status: 500 }
    );
  }
} 