"use client"

import { useEffect, useState } from "react"
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns"
import { ar } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react"
import { getStudentAttendanceSummary, getStudentAttendanceRecords } from "@/app/actions/attendance"
import { createClient } from "@/lib/supabase/client"

export default function StudentAttendancePage() {
  const [summary, setSummary] = useState<any>(null)
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [attendanceDates, setAttendanceDates] = useState<{ [key: string]: string }>({})

  // تحميل بيانات الحضور
  useEffect(() => {
    async function loadAttendanceData() {
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

      const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd")
      const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd")

      // الحصول على ملخص الحضور
      const summaryResult = await getStudentAttendanceSummary(user.id, startDate, endDate)

      if (summaryResult.error) {
        setError(summaryResult.error)
      } else {
        setSummary(summaryResult.data)
      }

      // الحصول على سجلات الحضور
      const recordsResult = await getStudentAttendanceRecords(user.id, startDate, endDate)

      if (recordsResult.error) {
        setError(recordsResult.error)
      } else {
        setRecords(recordsResult.data || [])

        // إعداد بيانات التقويم
        const dates: { [key: string]: string } = {}
        recordsResult.data?.forEach((record: any) => {
          dates[record.date] = record.attendance_status.code
        })

        console.log("Attendance dates loaded:", dates);
        setAttendanceDates(dates)
      }

      setLoading(false)
    }

    loadAttendanceData()
  }, [currentMonth])

  // الحصول على لون اليوم في التقويم
  const getDayColor = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd")
    const status = attendanceDates[dateStr]

    if (!status) return undefined

    switch (status) {
      case "present":
        return "bg-green-100 text-green-800"
      case "absent":
        return "bg-red-100 text-red-800"
      case "late":
        return "bg-amber-100 text-amber-800"
      case "excused":
      case "sick":
        return "bg-blue-100 text-blue-800"
      case "escaped":
        return "bg-orange-100 text-orange-800"
      default:
        return undefined
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

  if (loading && !summary) {
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

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6 text-right">سجل الحضور</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
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
                  {summary ? (
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
                        <p className="text-3xl font-bold text-amber-700">{summary.status_breakdown?.late || 0}</p>
                      </div>
                      <div className="bg-orange-100 p-4 rounded-lg text-center">
                        <p className="text-orange-600">أيام الهروب</p>
                        <p className="text-3xl font-bold text-orange-700">{summary.status_breakdown?.escaped || 0}</p>
                      </div>
                      <div className="bg-blue-100 p-4 rounded-lg text-center md:col-span-2">
                        <p className="text-blue-600">أيام الغياب بعذر</p>
                        <p className="text-3xl font-bold text-blue-700">{summary.status_breakdown?.excused || 0}</p>
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
                  {records.length === 0 ? (
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
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-right">التقويم</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center mb-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-2 rounded-md hover:bg-gray-100"
                  >
                    الشهر السابق
                  </button>
                  <button onClick={() => setCurrentMonth(new Date())} className="p-2 rounded-md hover:bg-gray-100">
                    الشهر الحالي
                  </button>
                </div>
              </div>

              <Calendar
                mode="single"
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                className="rounded-md border"
                modifiersClassNames={{
                  selected: "bg-primary text-primary-foreground",
                  present: "bg-green-100 text-green-800 font-bold rounded-md",
                  absent: "bg-red-100 text-red-800 font-bold rounded-md",
                  late: "bg-amber-100 text-amber-800 font-bold rounded-md",
                  excused: "bg-blue-100 text-blue-800 font-bold rounded-md",
                  escaped: "bg-orange-100 text-orange-800 font-bold rounded-md"
                }}
                modifiers={{
                  present: (date) => {
                    const dateStr = format(date, "yyyy-MM-dd");
                    return attendanceDates[dateStr] === "present";
                  },
                  absent: (date) => {
                    const dateStr = format(date, "yyyy-MM-dd");
                    return attendanceDates[dateStr] === "absent";
                  },
                  late: (date) => {
                    const dateStr = format(date, "yyyy-MM-dd");
                    return attendanceDates[dateStr] === "late";
                  },
                  excused: (date) => {
                    const dateStr = format(date, "yyyy-MM-dd");
                    return attendanceDates[dateStr] === "excused" || attendanceDates[dateStr] === "sick";
                  },
                  escaped: (date) => {
                    const dateStr = format(date, "yyyy-MM-dd");
                    return attendanceDates[dateStr] === "escaped";
                  }
                }}
              />

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm">حاضر</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm">غائب</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-sm">متأخر</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm">بعذر</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span className="text-sm">هروب</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
