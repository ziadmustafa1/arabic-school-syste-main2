"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/actions/get-current-user"

export async function getAllUsers() {
  try {
    const adminClient = await createAdminClient()
    
    // Get subjects for teacher-subject assignment
    const { data: subjects, error: subjectsError } = await adminClient
      .from("subjects")
      .select("id, name")
      .order("name", { ascending: true })
    
    // Get all users with role info
    const { data: users, error: usersError } = await adminClient
      .from("users")
      .select(`
        id, 
        full_name, 
        email, 
        user_code, 
        role_id, 
        is_banned, 
        ban_until, 
        is_confirmed
      `)
      .order("role_id", { ascending: true })
      .order("full_name", { ascending: true })
    
    if (usersError) throw usersError
    
    // Get all student points
    const { data: studentPoints, error: pointsError } = await adminClient
      .from("student_points")
      .select("student_id, points")
    
    if (pointsError) {
      console.error("Error fetching student points:", pointsError)
      // Continue with the available data, as points are not critical
    }
    
    // Create a map of student_id to points
    const pointsMap = new Map()
    if (studentPoints) {
      studentPoints.forEach(record => {
        pointsMap.set(record.student_id, record.points || 0)
      })
    }
    
    // Map users and add points where available
    const enhancedUsers = users.map(user => ({
      ...user,
      points: pointsMap.get(user.id) || 0,
      subjects: [] // Initialize empty subjects array for all users
    }))
    
    // Get teacher-subject assignments for teachers
    if (enhancedUsers.filter(u => u.role_id === 3).length > 0) {
      const { data: teacherSubjects, error: tsError } = await adminClient
        .from("teacher_subject")
        .select("teacher_id, subject_id")
      
      if (!tsError && teacherSubjects) {
        // Create a map of teacher_id to their subjects
        const teacherSubjectsMap = new Map()
        teacherSubjects.forEach(ts => {
          if (!teacherSubjectsMap.has(ts.teacher_id)) {
            teacherSubjectsMap.set(ts.teacher_id, [])
          }
          teacherSubjectsMap.get(ts.teacher_id).push({
            id: ts.subject_id,
            name: subjects?.find(s => s.id === ts.subject_id)?.name || ""
          })
        })
        
        // Add subjects to teachers
        enhancedUsers.forEach(user => {
          if (user.role_id === 3) {
            user.subjects = teacherSubjectsMap.get(user.id) || []
          }
        })
      }
    }
    
    return { 
      success: true, 
      data: { 
        users: enhancedUsers,
        subjects 
      }
    }
  } catch (error: any) {
    console.error("Error getting all users:", error)
    return { success: false, error: error.message }
  }
}

export async function updateUser(
  id: string, 
  full_name: string, 
  email: string,
  user_code: string
) {
  try {
    const adminClient = await createAdminClient()
    
    // Update the user
    const { error } = await adminClient
      .from("users")
      .update({
        full_name,
        email,
        user_code,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
    
    if (error) throw error
    
    return { success: true }
  } catch (error: any) {
    console.error("Error updating user:", error)
    return { success: false, error: error.message }
  }
}

export async function banUser(id: string, duration: string | null) {
  try {
    const adminClient = await createAdminClient()
    
    let banUntil = null
    
    // Calculate ban end date if not permanent
    if (duration) {
      const now = new Date()
      const durationValue = parseInt(duration.slice(0, -1))
      const durationUnit = duration.slice(-1)
      
      if (durationUnit === 'h') {
        now.setHours(now.getHours() + durationValue)
      } else if (durationUnit === 'd') {
        now.setDate(now.getDate() + durationValue)
      }
      
      banUntil = now.toISOString()
    }
    
    // Update the user
    const { error } = await adminClient
      .from("users")
      .update({
        is_banned: true,
        ban_until: banUntil,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
    
    if (error) throw error
    
    return { 
      success: true,
      data: {
        banUntil
      }
    }
  } catch (error: any) {
    console.error("Error banning user:", error)
    return { success: false, error: error.message }
  }
}

export async function deleteUser(id: string) {
  try {
    const adminClient = await createAdminClient()
    
    // Delete the user from auth.users which will cascade to public.users
    const { error } = await adminClient.auth.admin.deleteUser(id)
    
    if (error) throw error
    
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting user:", error)
    return { success: false, error: error.message }
  }
}

export async function approveUser(id: string) {
  try {
    const adminClient = await createAdminClient()
    
    // Update the user
    const { error } = await adminClient
      .from("users")
      .update({
        is_confirmed: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
    
    if (error) throw error
    
    return { success: true }
  } catch (error: any) {
    console.error("Error approving user:", error)
    return { success: false, error: error.message }
  }
}

export async function updateUserPoints(id: string, points: number) {
  try {
    const adminClient = await createAdminClient()
    
    // Get admin user making the change
    const currentUser = await getCurrentUser()
    if (!currentUser?.id) {
      throw new Error("Admin user ID not found")
    }
    
    // Add points transaction
    const { error } = await adminClient
      .from("points_transactions")
      .insert({
        user_id: id,
        points: Math.abs(points),
        is_positive: points >= 0,
        description: points >= 0 
          ? "إضافة نقاط بواسطة الإدارة" 
          : "خصم نقاط بواسطة الإدارة",
        created_by: currentUser.id
      })
    
    if (error) throw error

    // Calculate current points balance
    const { data: transactions, error: txError } = await adminClient
      .from("points_transactions")
      .select("points, is_positive")
      .eq("user_id", id)
    
    if (txError) throw txError
    
    // Calculate total based on transactions
    const positivePoints = transactions
      .filter(tx => tx.is_positive)
      .reduce((sum, tx) => sum + tx.points, 0)
    
    const negativePoints = transactions
      .filter(tx => !tx.is_positive)
      .reduce((sum, tx) => sum + tx.points, 0)
    
    const calculatedPoints = positivePoints - negativePoints
    
    // Check if student_points record exists
    const { count, error: countError } = await adminClient
      .from("student_points")
      .select("*", { count: "exact", head: true })
      .eq("student_id", id)
    
    if (countError) throw countError
    
    // Update or insert the student_points record
    if (count && count > 0) {
      // Update existing record
      const { error: updateError } = await adminClient
        .from("student_points")
        .update({ points: calculatedPoints })
        .eq("student_id", id)
      
      if (updateError) throw updateError
    } else {
      // Create new record
      const { error: insertError } = await adminClient
        .from("student_points")
        .insert({ student_id: id, points: calculatedPoints })
      
      if (insertError) throw insertError
    }
    
    return { 
      success: true,
      data: {
        points: calculatedPoints
      }
    }
  } catch (error: any) {
    console.error("Error updating user points:", error)
    return { success: false, error: error.message }
  }
}

export async function linkTeacherSubject(teacherId: string, subjectIds: number[]) {
  try {
    const adminClient = await createAdminClient()
    
    // First, get current subject assignments
    const { data: currentAssignments, error: fetchError } = await adminClient
      .from("teacher_subject")
      .select("subject_id")
      .eq("teacher_id", teacherId)
    
    if (fetchError) throw fetchError
    
    const currentSubjectIds = currentAssignments.map(a => a.subject_id)
    
    // Determine subjects to add and remove
    const subjectsToAdd = subjectIds.filter(id => !currentSubjectIds.includes(id))
    const subjectsToRemove = currentSubjectIds.filter(id => !subjectIds.includes(id))
    
    // Remove subjects that are no longer assigned
    if (subjectsToRemove.length > 0) {
      const { error: deleteError } = await adminClient
        .from("teacher_subject")
        .delete()
        .eq("teacher_id", teacherId)
        .in("subject_id", subjectsToRemove)
      
      if (deleteError) throw deleteError
    }
    
    // Add new subject assignments
    if (subjectsToAdd.length > 0) {
      const newAssignments = subjectsToAdd.map(subjectId => ({
        teacher_id: teacherId,
        subject_id: subjectId
      }))
      
      const { error: insertError } = await adminClient
        .from("teacher_subject")
        .insert(newAssignments)
      
      if (insertError) throw insertError
    }
    
    return { success: true }
  } catch (error: any) {
    console.error("Error linking teacher with subjects:", error)
    return { success: false, error: error.message }
  }
}

export async function getSubjects() {
  try {
    const adminClient = await createAdminClient()
    
    // Get all subjects
    const { data, error } = await adminClient
      .from("subjects")
      .select("*")
      .order("name")
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error: any) {
    console.error("Error fetching subjects:", error)
    return { success: false, error: error.message }
  }
}

export async function addSubject(name: string, description: string) {
  try {
    const adminClient = await createAdminClient()
    
    // Insert new subject
    const { data, error } = await adminClient
      .from("subjects")
      .insert({
        name,
        description
      })
      .select()
      .single()
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error: any) {
    console.error("Error adding subject:", error)
    return { success: false, error: error.message }
  }
}

export async function updateSubject(id: number, name: string, description: string) {
  try {
    const adminClient = await createAdminClient()
    
    // Update subject
    const { error } = await adminClient
      .from("subjects")
      .update({
        name,
        description
      })
      .eq("id", id)
    
    if (error) throw error
    
    return { success: true }
  } catch (error: any) {
    console.error("Error updating subject:", error)
    return { success: false, error: error.message }
  }
}

export async function deleteSubject(id: number) {
  try {
    const adminClient = await createAdminClient()
    
    // Check if any teachers are assigned to this subject
    const { data: assignments, error: checkError } = await adminClient
      .from("teacher_subject")
      .select("id")
      .eq("subject_id", id)
      .limit(1)
    
    if (checkError) throw checkError
    
    if (assignments && assignments.length > 0) {
      return { 
        success: false, 
        error: "هناك معلمين مرتبطين بهذه المادة. قم بإلغاء ارتباط المعلمين أولاً."
      }
    }
    
    // Delete subject
    const { error } = await adminClient
      .from("subjects")
      .delete()
      .eq("id", id)
    
    if (error) throw error
    
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting subject:", error)
    return { success: false, error: error.message }
  }
}

export async function getMedals() {
  // Import the server action - imports need to be dynamic for client components
  const { getMedalsServerAction } = await import('./server-admin');
  return getMedalsServerAction();
}

export async function addMedal(
  name: string, 
  description: string,
  image_url: string,
  min_points: number,
  max_points: number = 99999
) {
  try {
    const adminClient = await createAdminClient()
    
    const { data, error } = await adminClient
      .from("medals")
      .insert({
        name,
        description,
        image_url,
        min_points,  // Use min_points directly
        max_points   // Use max_points directly
      })
      .select()
      .single()
    
    if (error) {
      console.error("Error adding medal:", error)
      return {
        success: false,
        error: error.message
      }
    }
    
    return {
      success: true,
      data
    }
  } catch (error: any) {
    console.error("Error in addMedal:", error)
    return {
      success: false,
      error: error.message
    }
  }
}

export async function updateMedal(
  id: number,
  name: string,
  description: string,
  image_url: string,
  min_points: number,
  max_points: number = 99999
) {
  try {
    const adminClient = await createAdminClient()
    
    const { data, error } = await adminClient
      .from("medals")
      .update({
        name,
        description,
        image_url,
        min_points,  // Use min_points directly
        max_points   // Use max_points directly
      })
      .eq("id", id)
      .select()
      .single()
    
    if (error) {
      console.error("Error updating medal:", error)
      return {
        success: false,
        error: error.message
      }
    }
    
    return {
      success: true,
      data
    }
  } catch (error: any) {
    console.error("Error in updateMedal:", error)
    return {
      success: false,
      error: error.message
    }
  }
}

export async function deleteMedal(id: number) {
  const { deleteMedalServerAction } = await import('./server-admin');
  return deleteMedalServerAction(id);
}

export async function awardMedalToUser(medalId: number, userCode: string) {
  const { awardMedalToUserServerAction } = await import('./server-admin');
  return awardMedalToUserServerAction(medalId, userCode);
}

/**
 * Add a new badge
 */
export async function addBadge(
  name: string, 
  description: string | null, 
  imageUrl: string | null, 
  minPoints: number,
  maxPoints: number,
  badgeType: string
) {
  try {
    const currentUser = await getCurrentUser()
    
    if (currentUser.role_id !== 4) {
      return {
        success: false,
        error: "Unauthorized",
        message: "يجب أن تكون مديرًا للقيام بهذه العملية"
      }
    }
    
    const adminClient = await createAdminClient()
    
    const { data, error } = await adminClient
      .from("badges")
      .insert({
        name,
        description,
        image_url: imageUrl,
        min_points: minPoints,
        max_points: maxPoints,
        badge_type: badgeType
      })
      .select()
      .single()
    
    if (error) {
      console.error("Error adding badge:", error)
      return {
        success: false,
        error: error.message,
        message: "حدث خطأ أثناء إضافة الشارة"
      }
    }
    
    return {
      success: true,
      data,
      message: "تمت إضافة الشارة بنجاح"
    }
  } catch (error: any) {
    console.error("Unexpected error in addBadge:", error)
    return {
      success: false,
      error: error.message,
      message: "حدث خطأ غير متوقع"
    }
  }
}

/**
 * Update a badge
 */
export async function updateBadge(
  badgeId: number,
  name: string,
  description: string | null,
  imageUrl: string | null,
  minPoints: number,
  maxPoints: number,
  badgeType: string
) {
  try {
    const currentUser = await getCurrentUser()
    
    if (currentUser.role_id !== 4) {
      return {
        success: false,
        error: "Unauthorized",
        message: "يجب أن تكون مديرًا للقيام بهذه العملية"
      }
    }
    
    const adminClient = await createAdminClient()
    
    const { data, error } = await adminClient
      .from("badges")
      .update({
        name,
        description,
        image_url: imageUrl,
        min_points: minPoints,
        max_points: maxPoints,
        badge_type: badgeType
      })
      .eq("id", badgeId)
      .select()
      .single()
    
    if (error) {
      console.error("Error updating badge:", error)
      return {
        success: false,
        error: error.message,
        message: "حدث خطأ أثناء تحديث الشارة"
      }
    }
    
    return {
      success: true,
      data,
      message: "تم تحديث الشارة بنجاح"
    }
  } catch (error: any) {
    console.error("Unexpected error in updateBadge:", error)
    return {
      success: false,
      error: error.message,
      message: "حدث خطأ غير متوقع"
    }
  }
}

/**
 * Delete a badge
 */
export async function deleteBadge(badgeId: number) {
  try {
    const currentUser = await getCurrentUser()
    
    if (currentUser.role_id !== 4) {
      return {
        success: false,
        error: "Unauthorized",
        message: "يجب أن تكون مديرًا للقيام بهذه العملية"
      }
    }
    
    const adminClient = await createAdminClient()
    
    // Check if badge is in use by any users first
    const { data: badgeUsers, error: checkError } = await adminClient
      .from("user_badges")
      .select("id")
      .eq("badge_id", badgeId)
      .limit(1)
    
    if (checkError) {
      console.error("Error checking badge usage:", checkError)
      return {
        success: false,
        error: checkError.message,
        message: "حدث خطأ أثناء التحقق من استخدام الشارة"
      }
    }
    
    // If badge is in use, don't delete it
    if (badgeUsers && badgeUsers.length > 0) {
      return {
        success: false,
        error: "Badge is in use",
        message: "لا يمكن حذف الشارة لأنها مستخدمة من قبل بعض المستخدمين"
      }
    }
    
    // Delete the badge
    const { error } = await adminClient
      .from("badges")
      .delete()
      .eq("id", badgeId)
    
    if (error) {
      console.error("Error deleting badge:", error)
      return {
        success: false,
        error: error.message,
        message: "حدث خطأ أثناء حذف الشارة"
      }
    }
    
    return {
      success: true,
      message: "تم حذف الشارة بنجاح"
    }
  } catch (error: any) {
    console.error("Unexpected error in deleteBadge:", error)
    return {
      success: false,
      error: error.message,
      message: "حدث خطأ غير متوقع"
    }
  }
}

/**
 * Get all badges
 */
export async function getBadges() {
  try {
    const adminClient = await createAdminClient()
    
    // Get all badges
    const { data, error } = await adminClient
      .from("badges")
      .select("*")
      .order("min_points", { ascending: true })
    
    if (error) {
      console.error("Error fetching badges:", error)
      return {
        success: false,
        error: error.message,
        message: "حدث خطأ أثناء جلب الشارات"
      }
    }
    
    return {
      success: true,
      data
    }
  } catch (error: any) {
    console.error("Unexpected error in getBadges:", error)
    return {
      success: false,
      error: error.message,
      message: "حدث خطأ غير متوقع"
    }
  }
}

// Awards management 
export async function getAwards() {
  try {
    const adminClient = await createAdminClient()
    
    const { data, error } = await adminClient
      .from("awards")
      .select("*")
      .order("points_required", { ascending: true })
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error: any) {
    console.error("Error getting awards:", error)
    return { success: false, error: error.message }
  }
}

export async function addAward(
  name: string, 
  description: string,
  imageUrl: string,
  pointsRequired: number
) {
  try {
    const adminClient = await createAdminClient()
    
    const { data, error } = await adminClient
      .from("awards")
      .insert({
        name,
        description,
        image_url: imageUrl,
        points_required: pointsRequired
      })
      .select()
      .single()
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error: any) {
    console.error("Error adding award:", error)
    return { success: false, error: error.message }
  }
}

export async function updateAward(
  awardId: number,
  name: string,
  description: string,
  imageUrl: string,
  pointsRequired: number
) {
  try {
    const adminClient = await createAdminClient()
    
    const { data, error } = await adminClient
      .from("awards")
      .update({
        name,
        description,
        image_url: imageUrl,
        points_required: pointsRequired,
        updated_at: new Date().toISOString()
      })
      .eq("id", awardId)
      .select()
      .single()
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error: any) {
    console.error("Error updating award:", error)
    return { success: false, error: error.message }
  }
}

export async function deleteAward(awardId: number) {
  try {
    const adminClient = await createAdminClient()
    
    const { error } = await adminClient
      .from("awards")
      .delete()
      .eq("id", awardId)
    
    if (error) throw error
    
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting award:", error)
    return { success: false, error: error.message }
  }
}

export async function awardToUser(awardId: number, userId: string) {
  try {
    const adminClient = await createAdminClient()
    
    // Get the current user (admin) making the change
    const { data: adminUser } = await adminClient.auth.getUser()
    if (!adminUser?.user?.id) {
      throw new Error("Admin user ID not found")
    }
    
    const { data, error } = await adminClient
      .from("user_awards")
      .insert({
        user_id: userId,
        award_id: awardId,
        awarded_by: adminUser.user.id
      })
      .select()
      .single()
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error: any) {
    console.error("Error awarding to user:", error)
    return { success: false, error: error.message }
  }
} 