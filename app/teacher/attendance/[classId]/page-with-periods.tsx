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
import { getAttendanceStatuses, getClassAttendance, markAttendance } from "@/app/actions/attendance"
import { toast } from "@/components/ui/use-toast"
import { formatHijriDate, toHijriWithDayName } from "@/lib/utils/hijri-date"
import { createClient } from "@/lib/supabase/client"

// قائمة الحصص الدراسية
const DEFAULT_CLASS_PERIODS = [
  { id: 1, name: "الحصة الأولى", start_time: "08:00", end_time: "08:45" },
  { id: 2, name: "الحصة الثانية", start_time: "08:55", end_time: "09:40" },
  { id: 3, name: "الحصة الثالثة", start_time: "09:50", end_time: "10:35" },
  { id: 4, name: "الحصة الرابعة", start_time: "10:45", end_time: "11:30" },
  { id: 5, name: "الحصة الخامسة", start_time: "11:40", end_time: "12:25" },
  { id: 6, name: "الحصة السادسة", start_time: "12:35", end_time: "13:20" },
  { id: 7, name: "الحصة السابعة", start_time: "13:30", end_time: "14:15" },
];

export default function ClassAttendancePeriodsPage() {
  const { classId } = useParams()
  const [date, setDate] = useState<Date>(new Date())
  const [students, setStudents] = useState<any[]>([])
  const [statuses, setStatuses] = useState<any[]>([])
  const [classPeriods, setClassPeriods] = useState<any[]>(DEFAULT_CLASS_PERIODS)
  const [currentPeriod, setCurrentPeriod] = useState<string>(DEFAULT_CLASS_PERIODS[0].name)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // تحميل حصص الدراسة
  useEffect(() => {
    async function loadClassPeriods() {
      try {
        // محاولة تحميل الحصص من قاعدة البيانات
        const supabase = createClient()
        const { data, error } = await supabase.from('class_periods').select('*').order('sort_order')
        if (data && data.length > 0) {
          setClassPeriods(data)
          setCurrentPeriod(data[0].name)
        }
      } catch (error) {
        console.error("Error loading class periods:", error)
        // استخدام القيم الافتراضية في حالة الخطأ
      }
    }
    
    loadClassPeriods()
  }, [])

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

  // تحميل بيانات الحضور عند تغيير التاريخ أو الحصة
  useEffect(() => {
    async function loadAttendance() {
      if (!classId) return

      setLoading(true)
      const formattedDate = format(date, "yyyy-MM-dd")

      try {
        const result = await getClassAttendance(Number(classId), formattedDate, currentPeriod)

        if (result.error) {
          setError(result.error)
        } else {
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
  }, [classId, date, currentPeriod])

  // تغيير حالة الحضور للطالب
  const handleStatusChange = async (studentId: string, statusId: number, notes = "") => {
    if (!classId) return

    setSaving(true)
    const formattedDate = format(date, "yyyy-MM-dd")

    try {
      const result = await markAttendance(
        studentId, 
        Number(classId), 
        statusId, 
        formattedDate, 
        notes,
        currentPeriod
      )

      if (result.error) {
        toast({
          title: "خطأ",
          description: result.error,
          variant: "destructive",
        })
      } else {
        // تحديث حالة الطالب في القائمة المحلية
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
                class_period: currentPeriod
              }
            }
            return student
          }),
        )

        toast({
          title: "تم الحفظ",
          description: "تم تسجيل الحضور بنجاح",
        })
      }
    } catch (err) {
      console.error("Error saving attendance:", err)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ بيانات الحضور",
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

  if (loading && !students.length) {
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

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-3xl font-bold mb-4 md:mb-0 text-right">تسجيل الحضور</h1>
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
        <h1 className="text-3xl font-bold mb-4 md:mb-0 text-right">تسجيل الحضور</h1>

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

      <div className="mb-6">
        <Tabs defaultValue={currentPeriod} className="w-full" onValueChange={setCurrentPeriod}>
          <TabsList className="h-auto flex flex-wrap bg-slate-100 p-1 mb-2">
            {classPeriods.map((period) => (
              <TabsTrigger 
                key={period.id} 
                value={period.name}
                className="flex-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                {period.name}
                <span className="text-xs hidden sm:inline mr-1">({period.start_time} - {period.end_time})</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <Card className="shadow-md border-t-4 border-t-primary">
        <CardHeader className="bg-slate-50 py-3">
          <CardTitle className="text-right text-lg text-primary flex justify-between items-center">
            <span>قائمة الطلاب</span>
            <span className="text-sm font-normal text-gray-600">
              {currentPeriod}
            </span>
          </CardTitle>
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
                              handleStatusChange(student.student_id, Number(value), student.notes || "")
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
                                    handleStatusChange(
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
    </div>
  )
} 