"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getTeacherClasses } from "@/app/actions/attendance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarIcon } from "lucide-react"

export default function TeacherAttendancePage() {
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadClasses() {
      setLoading(true)
      const result = await getTeacherClasses()

      if (result.error) {
        setError(result.error)
      } else {
        setClasses(result.data || [])
      }

      setLoading(false)
    }

    loadClasses()
  }, [])

  const handleSelectClass = (classId: number) => {
    router.push(`/teacher/attendance/${classId}`)
  }

  if (loading) {
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
      <h1 className="text-3xl font-bold mb-6 text-right">تسجيل الحضور</h1>

      {classes.length === 0 ? (
        <div className="text-center p-6 bg-gray-100 rounded-lg">
          <p className="text-xl text-gray-600">لا توجد فصول مسندة إليك</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((classItem) => (
            <Card key={classItem.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-right">{classItem.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-2 text-right">
                  <p className="text-gray-600">العام الدراسي: {classItem.academic_year}</p>
                  <p className="text-gray-600">الفصل الدراسي: {classItem.semester}</p>
                </div>
                <Button
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleSelectClass(classItem.id)}
                >
                  <CalendarIcon className="h-4 w-4" />
                  <span>تسجيل الحضور</span>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
