"use client"

import { useEffect, useState } from "react"
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns"
import { ar } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { getStudentAttendanceSummary, getStudentAttendanceRecords } from "@/app/actions/attendance"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react"

export default function ParentAttendancePage() {
  const [children, setChildren] = useState<any[]>([])
  const [selectedChild, setSelectedChild] = useState<string | null>(null)
  const [summary, setSummary] = useState<any>(null)
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())

  // تحميل قائمة الأبناء
  useEffect(() => {
    async function loadChildren() {
      setLoading(true)

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError("يرجى تسجيل الدخول لعرض سجلات الحضور")
        setLoading(false)
        return
      }

      // الحصول على قائمة الأبناء
      const { data, error } = await supabase
        .from("parent_student")
        .select(`
          student:student_id (
            id,
            full_name,
            user_code
          )
        `)
        .eq("parent_id", user.id)

      if (error) {
        setError(error.message)
      } else {
        const childrenList = data.map((item) => item.student)
        setChildren(childrenList)

        // تحديد الابن الأول افتراضيًا
        if (childrenList.length > 0) {
          setSelectedChild(childrenList[0].id)
        }
      }

      setLoading(false)
    }

    loadChildren()
  }, [])

  // تحميل بيانات الحضور عند تغيير الابن المحدد أو الشهر
  useEffect(() => {
    async function loadAttendanceData() {
      if (!selectedChild) return

      setLoading(true)

      const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd")
      const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd")

      // الحصول على ملخص الحضور
      const summaryResult = await getStudentAttendanceSummary(selectedChild, startDate, endDate)

      if (summaryResult.error) {
        setError(summaryResult.error)
      } else {
        setSummary(summaryResult.data)
      }

      // الحصول على سجلات الحضور
      const recordsResult = await getStudentAttendanceRecords(selectedChild, startDate, endDate)

      if (recordsResult.error) {
        setError(recordsResult.error)
      } else {
        setRecords(recordsResult.data || [])
      }

      setLoading(false)
    }

    if (selectedChild) {
      loadAttendanceData()
    }
  }, [selectedChild, currentMonth])

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
      default:
        return null
    }
  }

  if (loading && children.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-500">جاري التحميل...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-red-500">حدث خطأ: {error}</div>
      </div>
    )
  }

  if (children.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6 text-right">سجل الحضور</h1>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-xl text-gray-600">لا يوجد أبناء مسجلين</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6 text-right">سجل الحضور</h1>

      <div className="mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-1 text-right">اختر الابن</label>
            <Select value={selectedChild || ""} onValueChange={setSelectedChild}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الابن" />
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-1 text-right">اختر الشهر</label>
            <Select
              value={format(currentMonth, "yyyy-MM")}
              onValueChange={(value) => {
                const [year, month] = value.split("-").map(Number)
                setCurrentMonth(new Date(year, month - 1))
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الشهر" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => {
                  const date = subMonths(new Date(), i)
                  return (
                    <SelectItem key={format(date, "yyyy-MM")} value={format(date, "yyyy-MM")}>
                      {format(date, "MMMM yyyy", { locale: ar })}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {selectedChild && (
        <Tabs defaultValue="summary">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="summary">ملخص الحضور</TabsTrigger>
            <TabsTrigger value="records">سجلات الحضور</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <Card>
              <CardHeader>
                <CardTitle className="text-right">
                  ملخص الحضور لشهر {format(currentMonth, "MMMM yyyy", { locale: ar })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="text-xl text-gray-500">جاري التحميل...</div>
                  </div>
                ) : summary ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-100 p-4 rounded-lg text-center">
                      <p className="text-gray-600">إجمالي الأيام</p>
                      <p className="text-3xl font-bold">{summary.total_days}</p>
                    </div>
                    <div className="bg-green-100 p-4 rounded-lg text-center">
                      <p className="text-green-600">أيام الحضور</p>
                      <p className="text-3xl font-bold text-green-700">{summary.present_days}</p>
                    </div>
                    <div className="bg-red-100 p-4 rounded-lg text-center">
                      <p className="text-red-600">أيام الغياب</p>
                      <p className="text-3xl font-bold text-red-700">{summary.absent_days}</p>
                    </div>
                    <div className="bg-amber-100 p-4 rounded-lg text-center">
                      <p className="text-amber-600">أيام التأخير</p>
                      <p className="text-3xl font-bold text-amber-700">{summary.late_days}</p>
                    </div>
                    <div className="bg-blue-100 p-4 rounded-lg text-center md:col-span-2">
                      <p className="text-blue-600">أيام الغياب بعذر</p>
                      <p className="text-3xl font-bold text-blue-700">{summary.excused_days}</p>
                    </div>
                    <div className="bg-purple-100 p-4 rounded-lg text-center md:col-span-2">
                      <p className="text-purple-600">نسبة الحضور</p>
                      <p className="text-3xl font-bold text-purple-700">{summary.attendance_rate}%</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6">
                    <p className="text-xl text-gray-600">لا توجد بيانات حضور لهذا الشهر</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records">
            <Card>
              <CardHeader>
                <CardTitle className="text-right">
                  سجلات الحضور لشهر {format(currentMonth, "MMMM yyyy", { locale: ar })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="text-xl text-gray-500">جاري التحميل...</div>
                  </div>
                ) : records.length === 0 ? (
                  <div className="text-center p-6">
                    <p className="text-xl text-gray-600">لا توجد سجلات حضور لهذا الشهر</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">الفصل</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">ملاحظات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{format(new Date(record.date), "dd/MM/yyyy")}</TableCell>
                          <TableCell>{record.classes.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(record.attendance_status.code)}
                              <span>{record.attendance_status.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{record.notes || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
