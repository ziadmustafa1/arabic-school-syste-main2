"use server"

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { Database } from "@/lib/supabase/database.types";

// Create a Supabase client with admin privileges using service role
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase URL or service role key is missing');
  }
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Creates a new class and associates students and teacher
 */
export async function createClass(classData: {
  name: string;
  academic_year: string;
  semester: string;
  [key: string]: string | number | null | undefined;
}, teacherId: string | null, studentIds: string[]) {
  try {
    // Use admin client to bypass RLS
    const supabase = createAdminClient();
    
    // Insert class
    const { data: classRecord, error } = await supabase
      .from("classes")
      .insert(classData)
      .select()
      .single();
      
    if (error) {
      console.error("Error creating class:", error);
      return { success: false, error: error.message };
    }
    
    if (!classRecord) {
      return { success: false, error: "Failed to create class" };
    }
    
    const classId = classRecord.id;
    
    // Associate teacher if provided
    if (teacherId && teacherId !== "none") {
      const { error: teacherError } = await supabase
        .from("class_teacher")
        .insert({
          class_id: classId,
          teacher_id: teacherId
        });
        
      if (teacherError) {
        console.error("Error associating teacher:", teacherError);
      }
    }
    
    // Associate students if provided
    if (studentIds.length > 0) {
      const studentRelationships = studentIds.map(userId => ({
        class_id: classId,
        user_id: userId
      }));
      
      const { error: studentsError } = await supabase
        .from("class_student")
        .insert(studentRelationships);
        
      if (studentsError) {
        console.error("Error associating students:", studentsError);
      }
    }
    
    return { success: true, classId };
  } catch (error: any) {
    console.error("Unexpected error creating class:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Updates an existing class and its associations
 */
export async function updateClass(
  classId: number,
  classData: {
    name: string;
    academic_year: string;
    semester: string;
    [key: string]: string | number | null | undefined;
  },
  teacherId: string | null,
  studentIds: string[]
) {
  try {
    // Use admin client to bypass RLS
    const supabase = createAdminClient();
    
    // Update class
    const { error } = await supabase
      .from("classes")
      .update(classData)
      .eq("id", classId);
      
    if (error) {
      console.error("Error updating class:", error);
      return { success: false, error: error.message };
    }
    
    // Update teacher association
    try {
      // First delete existing teacher associations
      await supabase
        .from("class_teacher")
        .delete()
        .eq("class_id", classId);
      
      // Then add the new teacher if provided
      if (teacherId && teacherId !== "none") {
        await supabase
          .from("class_teacher")
          .insert({
            class_id: classId,
            teacher_id: teacherId
          });
      }
    } catch (teacherErr) {
      console.error("Error updating teacher association:", teacherErr);
    }
    
    // Update student associations
    try {
      // First delete existing student associations
      await supabase
        .from("class_student")
        .delete()
        .eq("class_id", classId);
      
      // Then add the new students if provided
      if (studentIds.length > 0) {
        const studentRelationships = studentIds.map(userId => ({
          class_id: classId,
          user_id: userId
        }));
        
        await supabase
          .from("class_student")
          .insert(studentRelationships);
      }
    } catch (studentsErr) {
      console.error("Error updating student associations:", studentsErr);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Unexpected error updating class:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Deletes a class and all its associations
 */
export async function deleteClass(classId: number) {
  try {
    // Use admin client to bypass RLS
    const supabase = createAdminClient();
    
    // Delete class (should cascade delete associations, but we'll clean up explicitly)
    try {
      await supabase
        .from("class_teacher")
        .delete()
        .eq("class_id", classId);
    } catch (err) {
      console.error("Error deleting teacher associations:", err);
    }
    
    try {
      await supabase
        .from("class_student")
        .delete()
        .eq("class_id", classId);
    } catch (err) {
      console.error("Error deleting student associations:", err);
    }
    
    const { error } = await supabase
      .from("classes")
      .delete()
      .eq("id", classId);
      
    if (error) {
      console.error("Error deleting class:", error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Unexpected error deleting class:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Gets student IDs for a class
 */
export async function getClassStudents(classId: number) {
  try {
    // Normal client is sufficient for read operations that don't involve security-sensitive data
    const supabase = createServerComponentClient<Database>({ cookies });
    
    const { data, error } = await supabase
      .from("class_student")
      .select("user_id")
      .eq("class_id", classId);
      
    if (error) {
      console.error("Error fetching class students:", error);
      return { success: false, error: error.message, studentIds: [] };
    }
    
    const studentIds = data.map(record => record.user_id);
    return { success: true, studentIds };
  } catch (error: any) {
    console.error("Unexpected error fetching class students:", error);
    return { success: false, error: error.message, studentIds: [] };
  }
}

/**
 * Gets teacher ID for a class
 */
export async function getClassTeacher(classId: number) {
  try {
    // Normal client is sufficient for read operations that don't involve security-sensitive data
    const supabase = createServerComponentClient<Database>({ cookies });
    
    const { data, error } = await supabase
      .from("class_teacher")
      .select("teacher_id")
      .eq("class_id", classId)
      .maybeSingle();
      
    if (error) {
      console.error("Error fetching class teacher:", error);
      return { success: false, error: error.message, teacherId: null };
    }
    
    return { 
      success: true, 
      teacherId: data?.teacher_id || null 
    };
  } catch (error: any) {
    console.error("Unexpected error fetching class teacher:", error);
    return { success: false, error: error.message, teacherId: null };
  }
} 