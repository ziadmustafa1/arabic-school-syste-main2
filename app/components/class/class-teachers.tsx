"use client"

import { useState, useEffect } from "react"
import { getClassTeachers } from "@/app/actions/attendance"
import { Loader2, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "@/components/ui/use-toast"

interface ClassTeachersProps {
  classId: number
}

export function ClassTeachers({ classId }: ClassTeachersProps) {
  const [teachers, setTeachers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTeachers() {
      if (!classId) return
      
      setLoading(true)
      try {
        const result = await getClassTeachers(classId)
        
        if (result.error) {
          setError(result.error)
          toast({
            variant: "destructive",
            title: "خطأ في تحميل البيانات",
            description: result.error,
          })
        } else {
          setTeachers(result.data || [])
        }
      } catch (err: any) {
        console.error("Error loading teachers:", err)
        setError(err.message || "حدث خطأ أثناء تحميل المعلمين")
      } finally {
        setLoading(false)
      }
    }
    
    loadTeachers()
  }, [classId])
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-right">المعلمون المسؤولون</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-right">المعلمون المسؤولون</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-right">المعلمون المسؤولون</CardTitle>
      </CardHeader>
      <CardContent>
        {teachers.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">لا يوجد معلمين مسؤولين لهذا الفصل</p>
        ) : (
          <div className="space-y-4">
            {teachers.map((teacher) => (
              <div key={teacher.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50">
                <Avatar>
                  <AvatarFallback>
                    {teacher.full_name?.substring(0, 2) || <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{teacher.full_name}</p>
                  <p className="text-sm text-muted-foreground">{teacher.user_code}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 