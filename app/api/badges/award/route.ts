import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const adminClient = await createAdminClient();
    const { badgeId, userId } = await request.json();
    
    if (!badgeId || !userId) {
      return NextResponse.json({ 
        success: false, 
        error: "معرف الشارة ومعرف المستخدم مطلوبان" 
      }, { status: 400 });
    }
    
    // Check if user already has this badge
    const { data: existingBadge, error: existingError } = await adminClient
      .from("user_badges")
      .select("id")
      .eq("user_id", userId)
      .eq("badge_id", badgeId)
      .single();
    
    if (existingBadge) {
      return NextResponse.json({ 
        success: false, 
        error: "المستخدم حاصل بالفعل على هذه الشارة" 
      }, { status: 400 });
    }
    
    // Only check existence error, not "not found" error
    if (existingError && existingError.code !== "PGRST116") {
      throw existingError;
    }
    
    // Award badge to user
    const { error: awardError } = await adminClient
      .from("user_badges")
      .insert({
        user_id: userId,
        badge_id: badgeId,
        awarded_at: new Date().toISOString()
      });
    
    if (awardError) throw awardError;
    
    // Create notification for the user
    const { data: badgeData } = await adminClient
      .from("badges")
      .select("name")
      .eq("id", badgeId)
      .single();
    
    if (badgeData) {
      await adminClient
        .from("notifications")
        .insert({
          user_id: userId,
          title: "تم منحك شارة جديدة",
          content: `تهانينا! تم منحك شارة "${badgeData.name}"`,
          type: "badge",
          reference_id: badgeId
        });
    }
    
    return NextResponse.json({
      success: true,
      message: "تم منح الشارة بنجاح"
    });
  } catch (error) {
    console.error("Error awarding badge to user:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "خطأ غير معروف"
    }, { status: 500 });
  }
} 