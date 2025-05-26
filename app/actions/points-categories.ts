'use server';

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface CategoryData {
  id?: number;
  name: string;
  description: string;
  default_points: number;
  is_positive: boolean;
  is_mandatory: boolean;
  is_restricted: boolean;
  created_by: string;
}

// Add function to fetch all categories
export async function getCategories() {
  console.log("Server Action: Fetching categories");
  
  try {
    // Attempt to use admin client
    let supabase;
    try {
      supabase = await createAdminClient();
    } catch (error) {
      console.error("Server Action: Failed to create admin client", error);
      throw new Error("فشل في الاتصال بقاعدة البيانات: لم يتم تعريف مفتاح الخدمة");
    }
    
    const { data, error } = await supabase
      .from("point_categories")
      .select("*")
      .order("created_at", { ascending: false });
      
    if (error) {
      console.error("Server Action: Error fetching categories:", error);
      throw new Error(error.message || "حدث خطأ أثناء جلب فئات النقاط");
    }
    
    console.log(`Server Action: Successfully fetched ${data?.length || 0} categories`);
    
    return { success: true, data };
  } catch (error: any) {
    console.error("Server Action: Unexpected error:", error);
    return { 
      success: false, 
      error: error.message || "حدث خطأ غير متوقع",
      data: []
    };
  }
}

export async function createCategory(data: CategoryData) {
  console.log("Server Action: Creating category", data);
  
  try {
    // Attempt to use admin client first
    let supabase;
    try {
      supabase = await createAdminClient();
      console.log("Server Action: Admin client created successfully");
    } catch (error) {
      console.error("Server Action: Failed to create admin client", error);
      throw new Error("فشل في الاتصال بقاعدة البيانات: لم يتم تعريف مفتاح الخدمة");
    }
    
    const { data: result, error } = await supabase
      .from("point_categories")
      .insert([{
        name: data.name,
        description: data.description,
        default_points: data.default_points,
        points: data.default_points,
        is_positive: data.is_positive,
        is_mandatory: data.is_mandatory,
        is_restricted: data.is_restricted,
        created_by: data.created_by
      }])
      .select();
      
    if (error) {
      console.error("Server Action: Error creating category:", error);
      throw new Error(error.message || "حدث خطأ أثناء إنشاء الفئة");
    }
    
    console.log("Server Action: Category created successfully:", result);
    
    // Revalidate the admin points-categories page
    revalidatePath('/admin/points-categories');
    
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Server Action: Unexpected error:", error);
    return { 
      success: false, 
      error: error.message || "حدث خطأ غير متوقع" 
    };
  }
}

export async function updateCategory(data: CategoryData) {
  console.log("Server Action: Updating category", data);
  
  try {
    if (!data.id) {
      throw new Error("معرف الفئة مطلوب للتحديث");
    }
    
    // Attempt to use admin client
    let supabase;
    try {
      supabase = await createAdminClient();
    } catch (error) {
      console.error("Server Action: Failed to create admin client", error);
      throw new Error("فشل في الاتصال بقاعدة البيانات: لم يتم تعريف مفتاح الخدمة");
    }
    
    const { data: result, error } = await supabase
      .from("point_categories")
      .update({
        name: data.name,
        description: data.description,
        default_points: data.default_points,
        points: data.default_points,
        is_positive: data.is_positive,
        is_mandatory: data.is_mandatory,
        is_restricted: data.is_restricted,
        created_by: data.created_by
      })
      .eq("id", data.id)
      .select();
      
    if (error) {
      console.error("Server Action: Error updating category:", error);
      throw new Error(error.message || "حدث خطأ أثناء تحديث الفئة");
    }
    
    console.log("Server Action: Category updated successfully:", result);
    
    // Revalidate the admin points-categories page
    revalidatePath('/admin/points-categories');
    
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Server Action: Unexpected error:", error);
    return { 
      success: false, 
      error: error.message || "حدث خطأ غير متوقع" 
    };
  }
}

export async function deleteCategory(id: number) {
  console.log("Server Action: Deleting category", id);
  
  try {
    // Attempt to use admin client
    let supabase;
    try {
      supabase = await createAdminClient();
    } catch (error) {
      console.error("Server Action: Failed to create admin client", error);
      throw new Error("فشل في الاتصال بقاعدة البيانات: لم يتم تعريف مفتاح الخدمة");
    }
    
    const { error } = await supabase
      .from("point_categories")
      .delete()
      .eq("id", id);
      
    if (error) {
      console.error("Server Action: Error deleting category:", error);
      throw new Error(error.message || "حدث خطأ أثناء حذف الفئة");
    }
    
    console.log("Server Action: Category deleted successfully");
    
    // Revalidate the admin points-categories page
    revalidatePath('/admin/points-categories');
    
    return { success: true };
  } catch (error: any) {
    console.error("Server Action: Unexpected error:", error);
    return { 
      success: false, 
      error: error.message || "حدث خطأ غير متوقع" 
    };
  }
} 