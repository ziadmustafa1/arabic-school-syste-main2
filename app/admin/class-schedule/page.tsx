"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { updateClassSchedule, getClassSchedule } from "@/app/actions/attendance"

const WEEKDAYS = [
  { value: 0, label: "الأحد" },
  { value: 1, label: "الإثنين" },
  { value: 2, label: "الثلاثاء" },
  { value: 3, label: "الأربعاء" },
  { value: 4, label: "الخميس" },
  { value: 5, label: "الجمعة" },
  { value: 6, label: "السبت" },
]

export default function ClassSchedulePage() {
  const [classes, setClasses] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [periods, setPeriods] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<number | null>(null)
  const [selectedDay, setSelectedDay] = useState<number>(0)
  const [schedule, setSchedule] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Load classes, teachers, subjects, and periods
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        // Get all classes
        const { data: classesData, error: classesError } = await supabase
          .from("classes")
          .select("id, name")
          .order("name")

        if (classesError) throw new Error(`Error loading classes: ${classesError.message}`)

        // Get teachers
        const { data: teachersData, error: teachersError } = await supabase
          .from("users")
          .select("id, full_name")
          .eq("role_id", 3) // Teacher role
          .order("full_name")

        if (teachersError) throw new Error(`Error loading teachers: ${teachersError.message}`)

        // Get subjects
        const { data: subjectsData, error: subjectsError } = await supabase
          .from("subjects")
          .select("id, name, code")
          .order("name")

        if (subjectsError) throw new Error(`Error loading subjects: ${subjectsError.message}`)

        // Get class periods
        const { data: periodsData, error: periodsError } = await supabase
          .from("class_periods")
          .select("id, name, start_time, end_time, sort_order")
          .order("sort_order")

        if (periodsError) throw new Error(`Error loading periods: ${periodsError.message}`)

        setClasses(classesData || [])
        setTeachers(teachersData || [])
        setSubjects(subjectsData || [])
        setPeriods(periodsData || [])
        
        if (classesData && classesData.length > 0) {
          setSelectedClass(classesData[0].id)
        }

      } catch (err: any) {
        console.error("Error loading data:", err)
        setError(err.message || "حدث خطأ أثناء تحميل البيانات")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [supabase])

  // Load schedule when class or day changes
  useEffect(() => {
    async function loadSchedule() {
      if (!selectedClass) return

      try {
        setLoading(true)
        setError(null)

        const result = await getClassSchedule(selectedClass)
        
        if (result.error) {
          setError(result.error)
          return
        }
        
        setSchedule(result.data || [])
      } catch (err: any) {
        console.error("Error loading schedule:", err)
        setError(err.message || "حدث خطأ أثناء تحميل جدول الحصص")
      } finally {
        setLoading(false)
      }
    }

    if (selectedClass) {
      loadSchedule()
    }
  }, [selectedClass])

  // Handle schedule updates
  const handleUpdate = async (scheduleItem: any, field: string, value: string | number) => {
    if (!selectedClass || saving) return
    
    try {
      setSaving(true)
      
      // Find the existing schedule item or create a new one
      const isExisting = !!scheduleItem.id
      
      if (isExisting) {
        // Update existing schedule item
        const updatedItem = { ...scheduleItem, [field]: value }
        
        const result = await updateClassSchedule(
          updatedItem.id,
          selectedClass,
          updatedItem.subject_id,
          updatedItem.teacher_id,
          updatedItem.period_id,
          updatedItem.weekday
        )
        
        if (result.error) {
          toast({
            title: "خطأ",
            description: result.error,
            variant: "destructive",
          })
          return
        }
        
        // Update local state
        setSchedule(schedule.map(item => 
          item.id === updatedItem.id ? { ...item, [field]: value } : item
        ))
        
        toast({
          title: "تم الحفظ",
          description: "تم تحديث الجدول بنجاح",
        })
      } else {
        // Create a new schedule item
        // This is handled through a separate UI flow
      }
    } catch (err: any) {
      console.error("Error updating schedule:", err)
      toast({
        title: "خطأ",
        description: err.message || "حدث خطأ أثناء تحديث الجدول",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Filter schedule for selected day
  const filteredSchedule = schedule.filter(item => item.weekday === selectedDay)

  if (loading && !classes.length) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-xl text-gray-500">جاري التحميل...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-2 text-destructive">
            <AlertCircle className="h-12 w-12" />
            <div className="text-xl text-center">حدث خطأ: {error}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-right">إدارة جدول الحصص</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-right">اختر الفصل واليوم</CardTitle>
            <CardDescription className="text-right">حدد الفصل واليوم لإدارة جدول الحصص</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium block mb-2 text-right">الفصل:</label>
                <Select
                  value={selectedClass?.toString() || ""}
                  onValueChange={(value) => setSelectedClass(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفصل" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((classItem) => (
                      <SelectItem key={classItem.id} value={classItem.id.toString()}>
                        {classItem.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-4 md:mt-0">
                <Tabs defaultValue="0" className="w-full" onValueChange={(value) => setSelectedDay(Number(value))}>
                  <TabsList className="grid grid-cols-7">
                    {WEEKDAYS.map((day) => (
                      <TabsTrigger key={day.value} value={day.value.toString()}>
                        {day.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-right">
              جدول حصص {classes.find(c => c.id === selectedClass)?.name || ""} ليوم{" "}
              {WEEKDAYS.find(d => d.value === selectedDay)?.label || ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الحصة</TableHead>
                  <TableHead className="text-right">الوقت</TableHead>
                  <TableHead className="text-right">المادة</TableHead>
                  <TableHead className="text-right">المعلم</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((period) => {
                  // Find schedule for this period and day
                  const scheduleItem = filteredSchedule.find(item => 
                    item.period_id === period.id && item.weekday === selectedDay
                  ) || { period_id: period.id, weekday: selectedDay };
                  
                  return (
                    <TableRow key={period.id}>
                      <TableCell className="font-medium">{period.name}</TableCell>
                      <TableCell>
                        {period.start_time} - {period.end_time}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={scheduleItem.subject_id?.toString() || ""}
                          onValueChange={(value) => handleUpdate(scheduleItem, "subject_id", Number(value))}
                          disabled={saving}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="اختر المادة" />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects.map((subject) => (
                              <SelectItem key={subject.id} value={subject.id.toString()}>
                                {subject.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={scheduleItem.teacher_id?.toString() || ""}
                          onValueChange={(value) => handleUpdate(scheduleItem, "teacher_id", value)}
                          disabled={saving}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="اختر المعلم" />
                          </SelectTrigger>
                          <SelectContent>
                            {teachers.map((teacher) => (
                              <SelectItem key={teacher.id} value={teacher.id}>
                                {teacher.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {periods.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                      لا توجد حصص مضافة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 