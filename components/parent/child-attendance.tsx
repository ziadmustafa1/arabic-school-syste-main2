"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { CalendarIcon, Loader2, CheckCircle, XCircle, Clock, AlertCircle, FileText, Info } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AttendanceRecord {
  id: number
  date: string
  status_id?: number
  status_name?: string
  status_code?: string
  is_present?: boolean
  class_name?: string
  notes?: string | null
  student_id?: string
}

interface AttendanceSummary {
  total_days: number
  present_days: number
  absent_days: number
  late_days: number
  excused_days: number
}

interface ChildAttendanceProps {
  childId: string
}

export function ChildAttendance({ childId }: ChildAttendanceProps) {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary>({
    total_days: 0,
    present_days: 0,
    absent_days: 0,
    late_days: 0,
    excused_days: 0
  })
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedDateRecords, setSelectedDateRecords] = useState<AttendanceRecord[]>([])
  const [tableNotFound, setTableNotFound] = useState(false)

  // Get current date in YYYY-MM-DD format
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()

  // Calculate start and end dates for the current academic year
  // Assuming academic year starts in September and ends in June
  const academicYearStart = new Date(
    currentMonth < 8 ? currentYear - 1 : currentYear,
    8, // September
    1,
  )

  const academicYearEnd = new Date(
    currentMonth < 8 ? currentYear : currentYear + 1,
    5, // June
    30,
  )

  const startDate = academicYearStart.toISOString().split("T")[0]
  const endDate = academicYearEnd.toISOString().split("T")[0]

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        console.log("Attempting to fetch attendance data for student:", childId)
        
        // Try to query the attendance tables if they exist
        const { data, error } = await supabase
          .from("attendance")
          .select("*")
          .eq("student_id", childId)
          .order("date", { ascending: false })
        
        if (error) {
          console.error("Attendance table query failed:", error)
          // Check for empty error object or table doesn't exist error
          if (error.code === "42P01" || Object.keys(error).length === 0) {
            console.log("Attendance table likely doesn't exist, showing fallback UI")
            setTableNotFound(true)
          }
          setAttendanceRecords([])
          setAttendanceSummary({
            total_days: 0,
            present_days: 0,
            absent_days: 0,
            late_days: 0,
            excused_days: 0
          })
          return
        }
        
        // Process any data we found
        if (data && data.length > 0) {
          console.log("Found attendance records:", data.length)
          
          // Format the attendance records
          const formattedRecords = data.map(record => ({
            id: record.id,
            date: record.date,
            status_id: record.status_id,
            status_name: record.status_name || "غير معروف",
            status_code: record.status_code || "",
            is_present: record.is_present || false,
            class_name: record.class_name || "الفصل",
            notes: record.notes
          }))
          
          setAttendanceRecords(formattedRecords)
          
          // Calculate attendance summary
          const summary = {
            total_days: 0,
            present_days: 0,
            absent_days: 0,
            late_days: 0,
            excused_days: 0
          }
          
          // Get unique dates
          const uniqueDates = new Set(formattedRecords.map(record => record.date))
          summary.total_days = uniqueDates.size
          
          // Count attendance types
          formattedRecords.forEach(record => {
            if (record.is_present) {
              summary.present_days++
            } else if (record.status_code?.includes("absent")) {
              summary.absent_days++
            } else if (record.status_code?.includes("late")) {
              summary.late_days++
            } else if (record.status_code?.includes("excused")) {
              summary.excused_days++
            }
          })
          
          setAttendanceSummary(summary)
        } else {
          // No records found
          console.log("No attendance records found for this student")
          setAttendanceRecords([])
          setAttendanceSummary({
            total_days: 0,
            present_days: 0,
            absent_days: 0,
            late_days: 0,
            excused_days: 0
          })
        }
      } catch (error) {
        console.error("Error fetching attendance data:", error)
        setAttendanceRecords([])
        setAttendanceSummary({
          total_days: 0,
          present_days: 0,
          absent_days: 0,
          late_days: 0,
          excused_days: 0
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchAttendanceData()
  }, [childId, supabase])

  useEffect(() => {
    // Filter records for selected date
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split("T")[0]
      const records = attendanceRecords.filter((record) => record.date === dateString)
      setSelectedDateRecords(records)
    } else {
      setSelectedDateRecords([])
    }
  }, [selectedDate, attendanceRecords])

  // Function to get date class names for the calendar
  const getDayClassName = (date: Date) => {
    const dateString = date.toISOString().split("T")[0]
    const records = attendanceRecords.filter((record) => record.date === dateString)

    if (records.length === 0) return ""

    // If there are multiple records for a day, prioritize the most severe status
    if (records.some((record) => !record.is_present || record.status_code?.includes("absent"))) {
      return "bg-red-100 text-red-800"
    } else if (records.some((record) => record.status_code?.includes("late"))) {
      return "bg-yellow-100 text-yellow-800"
    } else if (records.some((record) => record.status_code?.includes("excused"))) {
      return "bg-blue-100 text-blue-800"
    } else {
      return "bg-green-100 text-green-800"
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-2">جاري تحميل بيانات الحضور...</span>
      </div>
    )
  }
  
  // Show info message if table doesn't exist
  if (tableNotFound) {
    return (
      <div className="space-y-6">
        <Alert className="bg-blue-50 border-blue-200 text-blue-800">
          <Info className="h-4 w-4" />
          <AlertDescription>
            يتم حالياً تطوير نظام الحضور. ستتمكن قريباً من رؤية سجل حضور الطالب والإحصائيات.
          </AlertDescription>
        </Alert>
        
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">أيام الحضور</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">0</div>
              <p className="text-xs text-muted-foreground">من إجمالي 0 يوم</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">أيام الغياب</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">0</div>
              <p className="text-xs text-muted-foreground">من إجمالي 0 يوم</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">أيام التأخير</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">0</div>
              <p className="text-xs text-muted-foreground">من إجمالي 0 يوم</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">أيام الاستئذان</CardTitle>
              <AlertCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">0</div>
              <p className="text-xs text-muted-foreground">من إجمالي 0 يوم</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
  
  // No records found for this student
  if (attendanceRecords.length === 0) {
    return (
      <div className="space-y-6">
        <Alert className="bg-blue-50 border-blue-200 text-blue-800">
          <Info className="h-4 w-4" />
          <AlertDescription>
            لا توجد سجلات حضور لهذا الطالب. سيتم إضافة البيانات بمجرد توفرها.
          </AlertDescription>
        </Alert>
        
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">أيام الحضور</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">0</div>
              <p className="text-xs text-muted-foreground">من إجمالي 0 يوم</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">أيام الغياب</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">0</div>
              <p className="text-xs text-muted-foreground">من إجمالي 0 يوم</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">أيام التأخير</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">0</div>
              <p className="text-xs text-muted-foreground">من إجمالي 0 يوم</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">أيام الاستئذان</CardTitle>
              <AlertCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">0</div>
              <p className="text-xs text-muted-foreground">من إجمالي 0 يوم</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">أيام الحضور</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{attendanceSummary.present_days}</div>
            <p className="text-xs text-muted-foreground">من إجمالي {attendanceSummary.total_days} يوم</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">أيام الغياب</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{attendanceSummary.absent_days}</div>
            <p className="text-xs text-muted-foreground">من إجمالي {attendanceSummary.total_days} يوم</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">أيام التأخير</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{attendanceSummary.late_days}</div>
            <p className="text-xs text-muted-foreground">من إجمالي {attendanceSummary.total_days} يوم</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">أيام الاستئذان</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{attendanceSummary.excused_days}</div>
            <p className="text-xs text-muted-foreground">من إجمالي {attendanceSummary.total_days} يوم</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              تقويم الحضور
            </CardTitle>
            <CardDescription>سجل حضور الطالب خلال العام الدراسي</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              modifiersClassNames={{
                selected: "bg-primary text-primary-foreground",
              }}
              modifiers={{
                disabled: [{ before: new Date(startDate) }, { after: new Date(endDate) }],
              }}
              classNames={{
                day_today: "bg-muted font-bold text-primary",
                day: (date) => getDayClassName(date),
              }}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <span className="text-xs">حاضر</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-red-500"></div>
                <span className="text-xs">غائب</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                <span className="text-xs">متأخر</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                <span className="text-xs">مستأذن</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              تفاصيل الحضور
            </CardTitle>
            <CardDescription>
              {selectedDate
                ? `تفاصيل الحضور ليوم ${selectedDate.toLocaleDateString("ar-EG", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}`
                : "اختر يومًا من التقويم لعرض التفاصيل"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDateRecords.length > 0 ? (
              <div className="space-y-4">
                {selectedDateRecords.map((record) => (
                  <div key={record.id} className="rounded-lg border p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="font-medium">{record.class_name}</h4>
                      <Badge
                        variant={
                          record.is_present
                            ? "success"
                            : !record.is_present
                              ? "destructive"
                              : record.status_code?.includes("late")
                                ? "warning"
                                : "outline"
                        }
                      >
                        {record.status_name}
                      </Badge>
                    </div>
                    {record.notes && <p className="text-sm text-muted-foreground">{record.notes}</p>}
                  </div>
                ))}
              </div>
            ) : selectedDate ? (
              <div className="py-8 text-center text-muted-foreground">لا توجد سجلات حضور لهذا اليوم</div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">اختر يومًا من التقويم لعرض تفاصيل الحضور</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
