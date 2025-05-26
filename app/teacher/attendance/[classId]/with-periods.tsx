"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getAttendanceStatuses, getClassAttendance, markAttendance, getClassSchedule } from "@/app/actions/attendance"
import { toast } from "@/components/ui/use-toast"
import { formatHijriDate } from "@/lib/utils/hijri-date"
import { createClient } from "@/lib/supabase/client"

// الحصول على اليوم الحالي من الأسبوع (0 = الأحد، 1 = الإثنين، إلخ)
const getCurrentDayOfWeek = () => {
  return new Date().getDay()
}

export default function ClassAttendanceWithPeriodsPage() {
  const { classId } = useParams()
  const [date, setDate] = useState<Date>(new Date())
  const [students, setStudents] = useState<any[]>([])
  const [statuses, setStatuses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [teacherSubjects, setTeacherSubjects] = useState<any[]>([])
  const [classSchedule, setClassSchedule] = useState<any[]>([])
  const [currentSubject, setCurrentSubject] = useState<string>("")
  const [subjectId, setSubjectId] = useState<number | null>(null)
  const [currentTeacher, setCurrentTeacher] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [weekday] = useState<number>(getCurrentDayOfWeek())
  const supabase = createClient()

  // تحميل المواد وجدول الحصص
  useEffect(() => {
    let isMounted = true;

    async function loadSubjectsData() {
      try {
        setLoading(true)
        setError(null) // Clear any previous errors
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          throw new Error("لم يتم العثور على بيانات المستخدم")
        }
        setCurrentTeacher(user.id)
        
        console.log("Loading subjects for class:", classId, "Teacher:", user.id)
        
        // Load subjects
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('*')
          .order('name')
        
        if (subjectsError) throw new Error(`Error loading subjects: ${subjectsError.message}`)
        console.log("Loaded subjects:", subjectsData?.length || 0)
        
        if (!isMounted) return;
        setSubjects(subjectsData || [])
        
        // Find teacher subjects from schedule
        if (classId && user) {
          const result = await getClassSchedule(Number(classId))
          
          if (result.error) {
            console.error("Error loading class schedule:", result.error)
            throw new Error(`Error loading class schedule: ${result.error}`)
          }
          
          console.log("Class schedule loaded:", result.data?.length || 0, "items")
          if (!isMounted) return;
          setClassSchedule(result.data || [])
          
          // Filter schedules for this teacher
          const teacherSchedules = result.data?.filter(item => item.teacher_id === user.id) || []
          console.log("Teacher schedules:", teacherSchedules.length, "items")
          
          if (teacherSchedules.length === 0) {
            console.log("No schedules found for this teacher in this class")
            if (!isMounted) return;
            setError("لا توجد حصص مسندة إليك في هذا الفصل")
            setTeacherSubjects([])
            setCurrentSubject("")
            setSubjectId(null)
            return
          }
          
          // Get unique subject IDs from teacher schedules
          const teacherSubjectIds = [...new Set(teacherSchedules.map(item => item.subject_id))]
          console.log("Teacher subject IDs:", teacherSubjectIds)
          
          // Filter subjects to only those taught by this teacher
          const filteredSubjects = subjectsData?.filter(subject => 
            teacherSubjectIds.includes(subject.id)
          ) || []
          
          console.log("Filtered subjects for teacher:", filteredSubjects.length, "subjects")
          if (!isMounted) return;
          setTeacherSubjects(filteredSubjects)
          
          // Always set the first subject if available
          if (filteredSubjects.length > 0) {
            const firstSubject = filteredSubjects[0]
            console.log("Setting first subject:", firstSubject.name)
            if (!isMounted) return;
            setCurrentSubject(firstSubject.name)
            setSubjectId(firstSubject.id)
          } else {
            console.log("No subjects available for this teacher in this class")
            if (!isMounted) return;
            setCurrentSubject("")
            setSubjectId(null)
            setError("لا توجد مواد مسندة إليك في هذا الفصل")
          }
        }
        
      } catch (error: any) {
        console.error("Error loading subjects data:", error)
        if (!isMounted) return;
        setError(error.message || "حدث خطأ أثناء تحميل المواد الدراسية")
      } finally {
        if (!isMounted) return;
        setLoading(false)
      }
    }
    
    loadSubjectsData()
    
    return () => {
      isMounted = false;
    }
  }, [classId, supabase])

  // تحميل حالات الحضور
  useEffect(() => {
    async function loadStatuses() {
      const result = await getAttendanceStatuses()

      if (result.error) {
        setError(result.error)
      } else {
        setStatuses(result.data || [])
      }
    }

    loadStatuses()
  }, [])

  // تحميل بيانات الحضور عند تغيير التاريخ أو المادة
  useEffect(() => {
    if (!currentSubject || !subjectId) {
      console.log("Skipping attendance load - no subject selected")
      return;
    }

    async function loadAttendance() {
      console.log("loadAttendance called with:", {
        classId,
        currentSubject,
        subjectId,
        date: format(date, "yyyy-MM-dd")
      })

      if (!classId || !currentSubject || !subjectId) {
        console.log("Missing required data:", {
          hasClassId: !!classId,
          hasCurrentSubject: !!currentSubject,
          hasSubjectId: !!subjectId
        })
        setStudents([]);
        setLoading(false);
        return;
      }

      setLoading(true)
      const formattedDate = format(date, "yyyy-MM-dd")

      try {
        console.log("Calling getClassAttendance with:", {
          classId: Number(classId),
          date: formattedDate,
          subject: currentSubject
        })

        const result = await getClassAttendance(Number(classId), formattedDate, currentSubject)

        console.log("getClassAttendance result:", result)

        if (result.error) {
          console.error("Error from getClassAttendance:", result.error)
          setError(result.error)
        } else {
          console.log("Setting students data:", result.data?.length || 0, "students")
          setStudents(result.data || [])
        }
      } catch (err) {
        console.error("Error loading attendance data:", err)
        setError("حدث خطأ أثناء تحميل بيانات الحضور")
      } finally {
        setLoading(false)
      }
    }

    loadAttendance()
  }, [classId, date, currentSubject, subjectId])

  // تحديث المادة المحددة
  const handleSubjectChange = (subjectName: string) => {
    console.log("handleSubjectChange called with:", subjectName)
    
    if (!subjectName) {
      console.log("No subject name provided for change")
      return
    }
    
    console.log("Changing subject to:", subjectName)
    setCurrentSubject(subjectName)
    const subject = subjects.find(s => s.name === subjectName)
    if (subject) {
      console.log("Found subject ID:", subject.id)
      setSubjectId(subject.id)
      setError(null) // Clear any previous errors when subject is found
      // Trigger attendance load with new subject
      loadAttendance(subjectName, subject.id)
    } else {
      console.error("Subject not found:", subjectName)
      setSubjectId(null)
      setError("المادة المحددة غير موجودة")
    }
  }

  // تسجيل حضور الطالب
  const handleMarkAttendance = async (studentId: string, statusId: number, notes: string = "") => {
    if (!classId || saving) return

    try {
    setSaving(true)
    const formattedDate = format(date, "yyyy-MM-dd")

      const result = await markAttendance(
        studentId, 
        Number(classId), 
        statusId, 
        formattedDate, 
        notes,
        currentSubject,
        subjectId,
        currentTeacher
      )

      if (result.error) {
        toast({
          title: "خطأ",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "تم الحفظ",
          description: "تم تسجيل الحضور بنجاح",
        })

        // Update the student status in the UI
        setStudents(students.map(student => {
          if (student.student_id === studentId) {
            const status = statuses.find(s => s.id === statusId)
            return {
              ...student,
              status_id: statusId,
              notes,
              has_record: true,
              status_code: status?.code,
              status_name: status?.name,
            }
          }
          return student
        }))
      }
    } catch (error) {
      console.error("Error marking attendance:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تسجيل الحضور",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // الحصول على أيقونة حالة الحضور
  const getStatusIcon = (statusCode: string) => {
    switch (statusCode) {
      case "present":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "absent":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "late":
        return <Clock className="h-5 w-5 text-amber-500" />
      case "excused":
      case "sick":
        return <AlertCircle className="h-5 w-5 text-blue-500" />
      case "escaped":
        return <AlertCircle className="h-5 w-5 text-orange-500" />
      default:
        return null
    }
  }

  // الحصول على اسم المادة
  const getSubjectName = (subjectId: number | null) => {
    if (!subjectId) return "غير محدد"
    const subject = subjects.find(s => s.id === subjectId)
    return subject ? subject.name : "غير محدد"
  }

  if (loading && !students.length) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-3xl font-bold mb-4 md:mb-0 text-right">تسجيل حضور المواد</h1>
        </div>
        <Card className="shadow-md border-t-4 border-t-primary">
          <CardContent className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <div className="text-xl text-gray-500">جاري التحميل...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-3xl font-bold mb-4 md:mb-0 text-right">تسجيل حضور المواد</h1>
        </div>
        <Card className="shadow-md border-t-4 border-t-destructive">
          <CardContent className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center gap-2 text-destructive">
              <AlertCircle className="h-12 w-12" />
              <div className="text-xl text-center">حدث خطأ: {error}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold mb-4 md:mb-0 text-right">تسجيل حضور المواد</h1>

        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full md:w-auto flex items-center gap-2 bg-white shadow-sm hover:shadow-md transition-all">
                <CalendarIcon className="h-4 w-4" />
                <span>{format(date, "dd MMMM yyyy", { locale: ar })} - {formatHijriDate(date) || ''}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={date} onSelect={(newDate) => newDate && setDate(newDate)} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {teacherSubjects.length === 0 ? (
        <Card className="shadow-md border-t-4 border-t-primary">
          <CardContent className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center gap-2 text-center">
              <AlertCircle className="h-12 w-12 text-amber-500" />
              <div className="text-xl">لا توجد مواد مسندة إليك في هذا الفصل</div>
              <p className="text-gray-500 mt-2">
                يرجى التواصل مع إدارة المدرسة لإسناد المواد الدراسية لهذا الفصل.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
      <div className="mb-6">
            <Tabs defaultValue={currentSubject} className="w-full" onValueChange={handleSubjectChange}>
          <TabsList className="h-auto flex flex-wrap bg-slate-100 p-1 mb-2">
                {teacherSubjects.map((subject) => (
                <TabsTrigger 
                    key={subject.id} 
                    value={subject.name}
                  className="flex-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-white"
                >
                  <span className="flex flex-col items-center">
                      <span>{subject.name}</span>
                  </span>
                </TabsTrigger>
                ))}
          </TabsList>
        </Tabs>
      </div>

      <Card className="shadow-md border-t-4 border-t-primary">
        <CardHeader className="bg-slate-50 py-3">
          <CardTitle className="text-right text-lg text-primary flex justify-between items-center">
            <span>قائمة الطلاب</span>
            <span className="text-sm font-normal text-gray-600 flex items-center gap-2">
                  <span>المادة: {currentSubject}</span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {students.length === 0 ? (
            <div className="text-center p-8">
                  <p className="text-xl text-gray-600">
                    {loading 
                      ? "جاري تحميل الطلاب..." 
                      : error 
                        ? `حدث خطأ: ${error}` 
                        : "لا يوجد طلاب مسجلين في هذا الفصل أو ليس لديك صلاحية رؤية هذه المادة"}
                  </p>
                  {!loading && !error && (
                    <p className="text-gray-500 mt-2">
                      يُرجى التأكد من أنك مُعيَّن لتدريس هذه المادة لهذا الفصل.
                    </p>
                  )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-right font-bold">الرقم</TableHead>
                    <TableHead className="text-right font-bold">اسم الطالب</TableHead>
                    <TableHead className="text-right font-bold">الحالة</TableHead>
                    <TableHead className="text-right font-bold">ملاحظات</TableHead>
                    <TableHead className="text-right font-bold">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student, index) => (
                    <TableRow key={student.student_id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">{student.student_name || student.full_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(student.status_code)}
                          <span className="font-medium">{student.status_name || "لم يسجل"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{student.notes || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={student.status_id ? String(student.status_id) : ""}
                            onValueChange={(value) => {
                                  handleMarkAttendance(student.student_id, Number(value), student.notes || "")
                            }}
                            disabled={saving}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="اختر الحالة" />
                            </SelectTrigger>
                            <SelectContent>
                              {statuses.map((status) => (
                                <SelectItem key={status.id} value={String(status.id)}>
                                  {status.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="flex items-center gap-1">
                                <span className="hidden md:inline">ملاحظات</span>
                                {student.notes ? <span className="text-xs bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center">✓</span> : null}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <div className="space-y-4">
                                <h4 className="font-medium text-right text-primary">إضافة ملاحظات</h4>
                                <Textarea
                                  placeholder="أدخل ملاحظات حول حضور الطالب"
                                  className="min-h-24 text-right"
                                  defaultValue={student.notes || ""}
                                  onChange={(e) => {
                                    // تحديث الملاحظات محلياً
                                    setStudents(
                                      students.map((s) => {
                                        if (s.student_id === student.student_id) {
                                          return { ...s, notes: e.target.value }
                                        }
                                        return s
                                      }),
                                    )
                                  }}
                                />
                                <Button
                                  className="w-full"
                                  onClick={() => {
                                    const updatedStudent = students.find((s) => s.student_id === student.student_id)
                                        handleMarkAttendance(
                                      student.student_id,
                                      updatedStudent.status_id || 1,
                                      updatedStudent.notes || "",
                                    )
                                  }}
                                  disabled={saving}
                                >
                                  حفظ الملاحظات
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}
    </div>
  )
} 