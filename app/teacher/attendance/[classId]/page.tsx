"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, CheckCircle, XCircle, Clock, AlertCircle, Info, Save } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getAttendanceStatuses, getClassAttendance, markAttendance } from "@/app/actions/attendance"
import { toast } from "@/components/ui/use-toast"
import { formatHijriDate, toHijriWithDayName } from "@/lib/utils/hijri-date"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { debounce } from "lodash"

export default function ClassAttendancePage() {
  const { classId } = useParams()
  const [date, setDate] = useState<Date>(new Date())
  const [students, setStudents] = useState<any[]>([])
  const [statuses, setStatuses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<any[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>("")
  const [pendingSaves, setPendingSaves] = useState<Record<string, boolean>>({})

  // تحميل المواد الدراسية
  useEffect(() => {
    async function loadSubjects() {
      try {
        const response = await fetch(`/api/classes/${classId}/subjects`)
        const data = await response.json()
        
        if (data.success && data.data?.length > 0) {
          setSubjects(data.data)
          // اختيار المادة الأولى افتراضيًا
          if (data.data.length > 0 && !selectedSubject) {
            setSelectedSubject(data.data[0].name)
          }
        } else {
          // If no subjects found, create a default one
          const defaultSubjects = [
            { id: 1, name: "المادة الافتراضية" }
          ]
          setSubjects(defaultSubjects)
          setSelectedSubject("المادة الافتراضية")
          setError(data.message || "لم يتم العثور على مواد دراسية لهذا الفصل")
        }
      } catch (err) {
        console.error("Error loading subjects:", err)
        // If API fails, still provide a default subject
        const defaultSubjects = [
          { id: 1, name: "المادة الافتراضية" }
        ]
        setSubjects(defaultSubjects)
        setSelectedSubject("المادة الافتراضية")
        setError("حدث خطأ أثناء تحميل المواد الدراسية")
      }
    }

    if (classId) {
      loadSubjects()
    }
  }, [classId, selectedSubject])

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
    async function loadAttendance() {
      if (!classId || !selectedSubject) return

      setLoading(true)
      setError(null)
      const formattedDate = format(date, "yyyy-MM-dd")

      const result = await getClassAttendance(Number(classId), formattedDate, selectedSubject)

      if (result.error) {
        setError(result.error)
      } else {
        setStudents(result.data || [])
      }

      setLoading(false)
    }

    if (selectedSubject) {
      loadAttendance()
    }
  }, [classId, date, selectedSubject])

  // تغيير حالة الحضور للطالب - مع دعم التأخير لتحسين الأداء
  const handleStatusChange = useCallback(async (studentId: string, statusId: number, notes = "") => {
    if (!classId || !selectedSubject) return
    
    // Set this student as pending save
    setPendingSaves(prev => ({ ...prev, [studentId]: true }))
    
    // تحديث حالة الطالب في القائمة المحلية فوراً للاستجابة السريعة
    setStudents(
      students.map((student) => {
        if (student.student_id === studentId) {
          const status = statuses.find((s) => s.id === statusId)
          return {
            ...student,
            status_id: statusId,
            status_name: status?.name || "",
            status_code: status?.code || "",
            is_present: status?.is_present || false,
            notes,
          }
        }
        return student
      }),
    )

    const formattedDate = format(date, "yyyy-MM-dd")

    try {
      const result = await markAttendance(studentId, Number(classId), statusId, formattedDate, notes, selectedSubject)

      if (result.error) {
        toast({
          title: "خطأ",
          description: result.error,
          variant: "destructive",
        })
      } else {
        // Only show toast for explicit save actions, not auto-saves from dropdown
        if (notes) {
          toast({
            title: "تم الحفظ",
            description: "تم تسجيل الحضور بنجاح",
          })
        }
      }
    } catch (error) {
      console.error("Error saving attendance:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الحضور",
        variant: "destructive",
      })
    } finally {
      // Remove pending status
      setPendingSaves(prev => ({ ...prev, [studentId]: false }))
    }
  }, [classId, selectedSubject, date, students, statuses])

  // Debounced version for dropdown changes to improve performance
  const debouncedStatusChange = debounce((studentId: string, statusId: number, notes = "") => {
    handleStatusChange(studentId, statusId, notes)
  }, 300)

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

  if (loading && !students.length && !error) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-3xl font-bold mb-4 md:mb-0 text-right">تسجيل الحضور</h1>
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

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold mb-4 md:mb-0 text-right">تسجيل الحضور</h1>

        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          {/* اختيار المادة الدراسية */}
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-full md:w-[200px] text-right font-medium">
              <SelectValue placeholder="اختر المادة" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.name} className="text-right font-medium">
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* اختيار التاريخ */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full md:w-auto flex items-center gap-2 bg-white shadow-sm hover:shadow-md transition-all font-medium">
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

      {/* عرض رسالة الخطأ في حال وجودها */}
      {error && (
        <Alert variant="warning" className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>تنبيه</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-md border-t-4 border-t-primary">
        <CardHeader className="bg-slate-50">
          <CardTitle className="text-right text-lg text-primary">قائمة الطلاب</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {students.length === 0 ? (
            <div className="text-center p-8">
              <p className="text-xl text-gray-600">لا يوجد طلاب في هذا الفصل</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-right font-bold text-base">الرقم</TableHead>
                    <TableHead className="text-right font-bold text-base">اسم الطالب</TableHead>
                    <TableHead className="text-right font-bold text-base">الحالة</TableHead>
                    <TableHead className="text-right font-bold text-base">ملاحظات</TableHead>
                    <TableHead className="text-right font-bold text-base">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student, index) => (
                    <TableRow key={student.student_id} className="hover:bg-slate-50">
                      <TableCell className="font-medium text-base">{index + 1}</TableCell>
                      <TableCell className="font-medium text-base">{student.student_name || student.full_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(student.status_code)}
                          <span className="font-medium text-base">{student.status_name || "لم يسجل"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate font-medium">{student.notes || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={student.status_id ? String(student.status_id) : ""}
                            onValueChange={(value) => {
                              debouncedStatusChange(student.student_id, Number(value), student.notes || "")
                            }}
                            disabled={saving || pendingSaves[student.student_id]}
                          >
                            <SelectTrigger className="w-32 font-medium text-right">
                              <SelectValue placeholder="اختر الحالة" />
                            </SelectTrigger>
                            <SelectContent>
                              {statuses.map((status) => (
                                <SelectItem key={status.id} value={String(status.id)} className="text-right font-medium">
                                  {status.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="flex items-center gap-1 font-medium">
                                <span className="hidden md:inline">ملاحظات</span>
                                {student.notes ? <span className="text-xs bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center">✓</span> : null}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <div className="space-y-4">
                                <h4 className="font-medium text-right text-primary text-base">إضافة ملاحظات</h4>
                                <Textarea
                                  placeholder="أدخل ملاحظات حول حضور الطالب"
                                  className="min-h-24 text-right font-medium"
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
                                  className="w-full flex items-center justify-center gap-2"
                                  onClick={() => {
                                    const updatedStudent = students.find((s) => s.student_id === student.student_id)
                                    handleStatusChange(
                                      student.student_id,
                                      updatedStudent.status_id || 1,
                                      updatedStudent.notes || "",
                                    )
                                  }}
                                  disabled={saving || pendingSaves[student.student_id]}
                                >
                                  <Save className="h-4 w-4" />
                                  <span>حفظ الملاحظات</span>
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
    </div>
  )
}
