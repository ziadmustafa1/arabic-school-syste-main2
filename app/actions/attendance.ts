"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

// الحصول على حالات الحضور
export async function getAttendanceStatuses() {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  const { data, error } = await adminClient.from("attendance_status").select("*").order("id")

  if (error) {
    console.error("Error fetching attendance statuses:", error)
    return { error: error.message }
  }

  return { data }
}

// الحصول على طلاب الفصل مع حالة الحضور لتاريخ معين
export async function getClassAttendance(classId: number, date: string, subjectName?: string) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  try {
    console.log("getClassAttendance called with:", { classId, date, subjectName })

    // Get current user (teacher)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error("User error:", userError)
      return { error: "غير مصرح لك بتنفيذ هذا الإجراء" }
    }

    console.log("Current user:", user.id)

    // Check if subject name is provided
    if (!subjectName) {
      console.log("Subject name not provided for attendance check")
      return { error: "يجب تحديد المادة الدراسية", data: [] }
    }

    // Get the subject ID from subject name
    const { data: subjectData, error: subjectError } = await adminClient
      .from('subjects')
      .select('id')
      .eq('name', subjectName)
      .single()
    
    if (subjectError) {
      console.error("Error loading subject:", subjectError, "Subject name:", subjectName)
      return { error: "المادة المحددة غير موجودة", data: [] }
    }

    console.log("Found subject:", subjectData)

    const subjectId = subjectData?.id
    
    if (!subjectId) {
      console.error("No subject ID found for name:", subjectName)
      return { error: "لم يتم العثور على هذه المادة", data: [] }
    }
    
    // Get all attendance statuses for reference
    const { data: statusList, error: statusError } = await adminClient
      .from("attendance_status")
      .select("*")
    
    if (statusError) {
      console.error("Error fetching attendance statuses:", statusError)
      return { error: "خطأ في تحميل حالات الحضور" }
    }
    
    // For admins, bypass the teacher check
    const { data: userData, error: roleError } = await adminClient
      .from('users')
      .select('role_id')
      .eq('id', user.id)
      .single()
    
    if (roleError) {
      console.error("Error checking user role:", roleError)
      return { error: "حدث خطأ أثناء التحقق من الصلاحيات" }
    }

    console.log("User role data:", userData)
    
    const isAdmin = userData?.role_id === 4
    
    // If not admin, check if teacher is assigned to this subject/class
    if (!isAdmin) {
      // Check if the teacher is assigned to this class and subject
      const { data: scheduleData, error: scheduleError } = await adminClient
        .from("class_schedule")
        .select("*")
        .eq("class_id", classId)
        .eq("subject_id", subjectId)
        .eq("teacher_id", user.id)
        
      if (scheduleError) {
        console.error("Error checking teacher assignment:", scheduleError)
        return { error: scheduleError.message }
      }
        
      console.log("Teacher schedule check:", scheduleData)

      // If teacher is not assigned to this subject in this class
      if (!scheduleData || scheduleData.length === 0) {
        // Check if the teacher is associated with the class at all
        const { data: classTeacher, error: ctError } = await adminClient
          .from("class_teacher")
          .select("*")
          .eq("class_id", classId)
          .eq("teacher_id", user.id)
          .single()
        
        console.log("Class teacher check:", classTeacher)
        
        if (ctError || !classTeacher) {
          return { data: [] } // Return empty data for better UX
        }
      }
    }

    // First get all students in the class
    const { data: classStudents, error: studentsError } = await adminClient
      .from("class_student")
      .select(`
        user_id,
        users:user_id (
          id, 
          full_name,
          user_code
        )
      `)
      .eq("class_id", classId)

    if (studentsError) {
      console.error("Error fetching class students:", studentsError)
      return { error: studentsError.message }
    }

    console.log("Found class students:", classStudents?.length || 0)

    // Get attendance records for this class, date, and subject
    let query = adminClient
      .from("attendance_records")
      .select(`
        id,
        student_id,
        status_id,
        notes,
        subject_id,
        teacher_id,
        created_at,
        updated_at
      `)
      .eq("class_id", classId)
      .eq("date", date)
      .eq("subject_id", subjectId)
    
    const { data: attendanceRecords, error: recordsError } = await query

    if (recordsError) {
      console.error("Error fetching attendance records:", recordsError)
      return { error: recordsError.message }
    }

    console.log("Found attendance records:", attendanceRecords?.length || 0)
    if (attendanceRecords?.length > 0) {
      console.log("Sample record:", attendanceRecords[0])
    }

    // Combine the data
    const result = classStudents.map((item) => {
      // Extract user data safely with proper typing
      const userData = item.users as unknown;
      // Now cast to the expected shape
      const student = Array.isArray(userData) 
        ? { id: userData[0]?.id, full_name: userData[0]?.full_name, user_code: userData[0]?.user_code }
        : userData as { id: string; full_name: string; user_code: string };
      
      // Find attendance record for this student, class, date and subject
      const record = attendanceRecords?.find(rec => rec.student_id === student.id);
      
      // Look up status information if record exists
      let statusInfo = null;
      if (record?.status_id) {
        statusInfo = statusList?.find(s => s.id === record.status_id);
        console.log(`Student ${student.id} status:`, statusInfo)
      }
      
      return {
        student_id: student.id,
        student_name: student.full_name,
        full_name: student.full_name,
        user_code: student.user_code,
        status_id: record?.status_id || null,
        status_name: statusInfo?.name || null,
        status_code: statusInfo?.code || null,
        is_present: statusInfo?.is_present || false,
        notes: record?.notes || "",
        has_record: !!record,
        record_id: record?.id || null,
        subject_id: subjectId,
        teacher_id: record?.teacher_id || user.id
      };
    });

    console.log("Returning combined result:", result.length, "students")
    return { data: result }
  } catch (error: any) {
    console.error("Error in class attendance:", error)
    return { error: error.message }
  }
}

// تسجيل حضور طالب
export async function markAttendance(
  studentId: string, 
  classId: number, 
  statusId: number, 
  date: string, 
  notes = "", 
  subjectName?: string,
  subjectId?: number | null,
  teacherId?: string | null
) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  console.log(`Marking attendance: Student=${studentId}, Class=${classId}, Status=${statusId}, Date=${date}, Subject=${subjectName}`)

  // الحصول على المستخدم الحالي
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.error("Authentication error: No user found")
    return { error: "غير مصرح لك بتنفيذ هذا الإجراء" }
  }

  try {
    // Check if user is an admin
    const { data: userData, error: roleError } = await adminClient
      .from('users')
      .select('role_id')
      .eq('id', user.id)
      .single()
    
    if (roleError) {
      console.error("Error checking user role:", roleError)
      return { error: "خطأ في التحقق من صلاحيات المستخدم" }
    }
    
    const isAdmin = userData?.role_id === 4
    console.log(`User is admin: ${isAdmin}`)

    // If teacher ID is not provided, use current user ID
    const actualTeacherId = teacherId || user.id
    console.log(`Teacher ID: ${actualTeacherId}`)

    // If subject ID not provided but subject name is, get subject ID
    let actualSubjectId = subjectId
    if (!actualSubjectId && subjectName) {
      const { data: subject, error: subjectError } = await adminClient
        .from('subjects')
        .select('id')
        .eq('name', subjectName)
        .single()
        
      if (subjectError) {
        console.error("Error finding subject by name:", subjectError, "Subject name:", subjectName)
        return { error: "المادة المحددة غير صحيحة" }
      }
      
      actualSubjectId = subject?.id
      console.log(`Found subject ID: ${actualSubjectId} for subject name: ${subjectName}`)
    }

    if (!actualSubjectId) {
      console.error("No subject ID could be determined")
      return { error: "لم يتم تحديد المادة بشكل صحيح" }
    }

    // Check if teacher is assigned to this subject and class
    if (!isAdmin && actualSubjectId) {
      const { data: scheduleData, error: scheduleError } = await adminClient
        .from("class_schedule")
        .select("id")
        .eq("class_id", classId)
        .eq("subject_id", actualSubjectId)
        .eq("teacher_id", actualTeacherId)
        
      if (scheduleError) {
        console.error("Error checking teacher assignment:", scheduleError)
      } else if (!scheduleData || scheduleData.length === 0) {
        // Check if teacher is assigned to this class generally
        const { data: classTeacher, error: ctError } = await adminClient
          .from("class_teacher")
          .select("id")
          .eq("class_id", classId)
          .eq("teacher_id", actualTeacherId)
          .single()
          
        if (ctError || !classTeacher) {
          console.error("Teacher is not assigned to this class:", ctError)
          return { error: "ليس لديك صلاحية تسجيل الحضور لهذا الفصل" }
        }
        
        console.log("Teacher is assigned to class but not specifically to this subject - allowing")
      }
    }

    // التحقق من وجود سجل حضور سابق
    console.log(`Checking for existing record: Student=${studentId}, Class=${classId}, Date=${date}, Subject=${actualSubjectId}`)
    let query = adminClient
      .from("attendance_records")
      .select("id, status_id, notes")
      .eq("student_id", studentId)
      .eq("class_id", classId)
      .eq("date", date)
    
    // Filter by subject
    if (actualSubjectId) {
      query = query.eq("subject_id", actualSubjectId)
    }
    
    const { data: existingRecord, error: findError } = await query.maybeSingle()
    
    if (findError && findError.code !== 'PGRST116') {
      console.error("Error checking for existing record:", findError)
      return { error: findError.message }
    }

    console.log("Existing record:", existingRecord)
    
    let result

    if (existingRecord) {
      console.log(`Updating existing record ID=${existingRecord.id} with status=${statusId}, notes=${notes}`)
      // تحديث السجل الموجود
      result = await adminClient
        .from("attendance_records")
        .update({
          status_id: statusId,
          notes,
          subject_id: actualSubjectId,
          teacher_id: actualTeacherId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRecord.id)
        .select()
    } else {
      console.log(`Creating new attendance record with status=${statusId}, notes=${notes}`)
      // إنشاء سجل جديد
      result = await adminClient
        .from("attendance_records")
        .insert({
          student_id: studentId,
          class_id: classId,
          status_id: statusId,
          date,
          notes,
          subject_id: actualSubjectId,
          teacher_id: actualTeacherId,
          created_by: user.id,
        })
        .select()
    }

    if (result.error) {
      console.error("Error marking attendance:", result.error)
      return { error: result.error.message }
    }
    
    console.log("Attendance record saved successfully:", result.data)

    // Revalidate the page to refresh the UI
    revalidatePath(`/teacher/attendance/${classId}`)
    return { success: true, data: result.data }
  } catch (error: any) {
    console.error("Unexpected error marking attendance:", error)
    return { error: error.message || "حدث خطأ غير متوقع" }
  }
}

// الحصول على ملخص حضور الطالب
export async function getStudentAttendanceSummary(studentId: string, startDate: string, endDate: string) {
  const adminClient = await createAdminClient()

  try {
    // First, get all the attendance records
    const { data: records, error: recordsError } = await adminClient
      .from("attendance_records")
      .select("id, status_id, date")
      .eq("student_id", studentId)
      .gte("date", startDate)
      .lte("date", endDate)

    if (recordsError) {
      console.error("Error fetching attendance records:", recordsError)
      return { error: recordsError.message }
    }

    // Then, get all the attendance statuses
    const { data: statuses, error: statusesError } = await adminClient
      .from("attendance_status")
      .select("id, name, code, is_present")

    if (statusesError) {
      console.error("Error fetching attendance statuses:", statusesError)
      return { error: statusesError.message }
    }

    // Calculate summary statistics
    const totalDays = records.length
    let presentDays = 0
    const statusBreakdown: Record<string, number> = {}

    // Initialize all statuses with 0 count
    statuses.forEach(status => {
      statusBreakdown[status.code] = 0
    })

    // Count records by status
    records.forEach(record => {
      const status = statuses.find(s => s.id === record.status_id)
      if (status) {
        if (status.is_present) {
          presentDays++
        }
        statusBreakdown[status.code] = (statusBreakdown[status.code] || 0) + 1
      }
    })

    const absentDays = totalDays - presentDays
    const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0

    // For backward compatibility with existing code
    const summary = {
      total_days: totalDays,
      present_days: presentDays,
      absent_days: absentDays,
      attendance_rate: attendanceRate,
      late_days: statusBreakdown['late'] || 0,
      excused_days: statusBreakdown['excused'] || 0,
      status_breakdown: statusBreakdown
    }

    return { data: summary }
  } catch (error: any) {
    console.error("Error calculating attendance summary:", error)
    return { error: error.message }
  }
}

// الحصول على سجلات حضور الطالب
export async function getStudentAttendanceRecords(studentId: string, startDate: string, endDate: string) {
  const adminClient = await createAdminClient()

  try {
    // Get attendance records
    const { data: records, error: recordsError } = await adminClient
      .from("attendance_records")
      .select("id, date, notes, class_id, status_id")
      .eq("student_id", studentId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false })

    if (recordsError) {
      console.error("Error fetching attendance records:", recordsError)
      return { error: recordsError.message }
    }

    // Get classes
    const classIds = [...new Set(records.map(r => r.class_id))]
    const { data: classes, error: classesError } = await adminClient
      .from("classes")
      .select("id, name")
      .in("id", classIds)

    if (classesError) {
      console.error("Error fetching classes:", classesError)
      return { error: classesError.message }
    }

    // Get statuses
    const statusIds = [...new Set(records.map(r => r.status_id))]
    const { data: statuses, error: statusesError } = await adminClient
      .from("attendance_status")
      .select("id, name, code, is_present")
      .in("id", statusIds)

    if (statusesError) {
      console.error("Error fetching statuses:", statusesError)
      return { error: statusesError.message }
    }

    // Combine data
    const result = records.map(record => {
      const classData = classes.find(c => c.id === record.class_id)
      const statusData = statuses.find(s => s.id === record.status_id)
      
      return {
        id: record.id,
        date: record.date,
        notes: record.notes,
        classes: classData,
        attendance_status: statusData
      }
    })

    return { data: result }
  } catch (error: any) {
    console.error("Error fetching student attendance records:", error)
    return { error: error.message }
  }
}

// الحصول على فصول المعلم
export async function getTeacherClasses() {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  try {
    // الحصول على المستخدم الحالي
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: "غير مصرح لك بتنفيذ هذا الإجراء" }
    }

    // Get class-teacher relations
    const { data: classTeachers, error: relationsError } = await adminClient
      .from("class_teacher")
      .select("class_id")
      .eq("teacher_id", user.id)

    if (relationsError) {
      console.error("Error fetching teacher-class relations:", relationsError)
      return { error: relationsError.message }
    }

    // Get class details
    const classIds = classTeachers.map(ct => ct.class_id)
    const { data: classes, error: classesError } = await adminClient
      .from("classes")
      .select("id, name, academic_year, semester")
      .in("id", classIds)

    if (classesError) {
      console.error("Error fetching classes:", classesError)
      return { error: classesError.message }
    }

    return { data: classes }
  } catch (error: any) {
    console.error("Error fetching teacher classes:", error)
    return { error: error.message }
  }
}

// الحصول على معلمي الفصل
export async function getClassTeachers(classId: number) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  try {
    if (!classId) {
      return { error: "معرف الفصل مطلوب" }
    }

    // Get teacher IDs from class_teacher table
    const { data: classTeachers, error: teachersError } = await adminClient
      .from("class_teacher")
      .select("teacher_id")
      .eq("class_id", classId)

    if (teachersError) {
      console.error("Error fetching class-teacher relations:", teachersError)
      return { error: teachersError.message }
    }

    if (!classTeachers || classTeachers.length === 0) {
      return { data: [] }
    }

    // Get teacher details
    const teacherIds = classTeachers.map(ct => ct.teacher_id)
    const { data: teachers, error: teacherDetailsError } = await adminClient
      .from("users")
      .select("id, full_name, user_code, email")
      .in("id", teacherIds)
      .eq("role_id", 3)

    if (teacherDetailsError) {
      console.error("Error fetching teacher details:", teacherDetailsError)
      return { error: teacherDetailsError.message }
    }

    return { data: teachers || [] }
  } catch (error: any) {
    console.error("Error fetching class teachers:", error)
    return { error: error.message }
  }
}

// الحصول على جدول الفصل
export async function getClassSchedule(classId: number) {
  const adminClient = await createAdminClient()

  try {
    if (!classId) {
      return { error: "معرف الفصل مطلوب" }
    }

    console.log("Fetching schedule for class ID:", classId)

    // Get schedule data
    const { data: scheduleData, error: scheduleError } = await adminClient
      .from("class_schedule")
      .select(`
        *,
        subjects:subject_id (
          id,
          name
        ),
        teachers:teacher_id (
          id,
          full_name
        )
      `)
      .eq("class_id", classId)

    if (scheduleError) {
      console.error("Error fetching class schedule:", scheduleError)
      return { error: scheduleError.message }
    }

    console.log("Schedule data found:", scheduleData?.length || 0, "items")
    if (scheduleData) {
      console.log("Schedule details:", scheduleData.map(item => ({
        subject: item.subjects?.name,
        teacher: item.teachers?.full_name,
        weekday: item.weekday,
        period: item.period_id
      })))
    }

    return { data: scheduleData || [] }
  } catch (error: any) {
    console.error("Error fetching class schedule:", error)
    return { error: error.message }
  }
}

// تحديث جدول الفصل
export async function updateClassSchedule(
  scheduleId: number | null,
  classId: number,
  subjectId: number | null,
  teacherId: string | null,
  periodId: number,
  weekday: number
) {
  const adminClient = await createAdminClient()
  
  try {
    if (!classId) {
      return { error: "معرف الفصل مطلوب" }
    }

    if (scheduleId) {
      // Update existing schedule item
      const { error: updateError } = await adminClient
        .from("class_schedule")
        .update({
          class_id: classId,
          subject_id: subjectId,
          teacher_id: teacherId,
          period_id: periodId,
          weekday: weekday,
          updated_at: new Date().toISOString()
        })
        .eq("id", scheduleId)

      if (updateError) {
        console.error("Error updating class schedule:", updateError)
        return { error: updateError.message }
      }
    } else if (subjectId && teacherId) {
      // Create new schedule item
      const { error: insertError } = await adminClient
        .from("class_schedule")
        .insert({
          class_id: classId,
          subject_id: subjectId,
          teacher_id: teacherId,
          period_id: periodId,
          weekday: weekday
        })

      if (insertError) {
        console.error("Error inserting class schedule:", insertError)
        return { error: insertError.message }
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error("Error updating class schedule:", error)
    return { error: error.message }
  }
}
