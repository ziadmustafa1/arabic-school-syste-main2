"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { linkParentToStudent } from "@/app/actions/points"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Loader2, User, UserPlus } from "lucide-react"
import { useSelectedChild } from "@/app/context/selected-child-context"
import { showSuccessToast, showErrorToast, showActionSuccessToast, showActionErrorToast } from "@/lib/utils/toast-messages"

interface Student {
  id: string
  full_name: string
  user_code: string
  email: string | null
}

export default function ChildrenPage() {
  const router = useRouter()
  const supabase = createClient()
  const { setSelectedChild } = useSelectedChild()
  const [isLoading, setIsLoading] = useState(true)
  const [isLinking, setIsLinking] = useState(false)
  const [studentCode, setStudentCode] = useState("")
  const [children, setChildren] = useState<Student[]>([])

  useEffect(() => {
    const fetchChildren = async () => {
      setIsLoading(true)
      try {
        const { data: user } = await supabase.auth.getUser()

        if (user && user.user) {
          const { data, error } = await supabase
            .from("parent_student")
            .select("student_id, users!parent_student_student_id_fkey(id, full_name, user_code, email)")
            .eq("parent_id", user.user.id)

          if (error) throw error

          // The data structure here is parent_student with a student property 
          // containing the actual student data
          const studentsList: Student[] = data?.map((item) => ({
            id: item.users.id,
            full_name: item.users.full_name,
            user_code: item.users.user_code,
            email: item.users.email
          })) || [];
          
          setChildren(studentsList)

          // Set the first child as selected in the global context
          if (studentsList.length > 0) {
            setSelectedChild({ 
              id: studentsList[0].id,
              name: studentsList[0].full_name
            })
          }
        }
      } catch (error) {
        console.error("Error fetching children:", error)
        showErrorToast(
          "خطأ في تحميل البيانات",
          "حدث خطأ أثناء محاولة تحميل بيانات الأبناء"
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchChildren()
  }, [supabase, setSelectedChild])

  const handleLinkStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Add validation before making API call
    if (!studentCode.trim()) {
      showErrorToast(
        "بيانات غير مكتملة",
        "الرجاء إدخال الرمز التعريفي للطالب"
      )
      return
    }
    
    setIsLinking(true)

    try {
      const formData = new FormData()
      formData.append("studentCode", studentCode)

      const result = await linkParentToStudent(formData)

      if (result.success) {
        showActionSuccessToast(
          "ربط الطالب",
          result.message
        )

        // Refresh the page to show the newly linked student
        router.refresh()
        window.location.reload()
      } else {
        showErrorToast(
          "خطأ في ربط الطالب",
          result.message
        )
      }
    } catch (error) {
      console.error("Error linking student:", error)
      showErrorToast(
        "خطأ في ربط الطالب",
        "حدث خطأ أثناء ربط الطالب. يرجى المحاولة مرة أخرى."
      )
    } finally {
      setIsLinking(false)
      setStudentCode("")
    }
  }

  // Add an unlinkStudent function with proper error handling and confirmation
  const handleUnlinkStudent = async (studentId: string) => {
    if (!confirm("هل أنت متأكد من رغبتك في إلغاء ربط هذا الطالب؟")) return;
    
    try {
      // In a real implementation, you would make a server call here
      // For now, we'll just show an example implementation
      setIsLoading(true)
      
      // Example action call (replace with actual logic)
      const result = { success: true, message: "تم إلغاء ربط الطالب بنجاح" }
      
      if (result.success) {
        showActionSuccessToast(
          "إلغاء ربط الطالب",
          result.message
        )
        // Refresh the list
        fetchChildren()
      } else {
        showErrorToast(
          "خطأ في إلغاء ربط الطالب",
          result.message
        )
      }
    } catch (error) {
      console.error("Error unlinking student:", error)
      showErrorToast(
        "خطأ في إلغاء ربط الطالب",
        "حدث خطأ أثناء إلغاء ربط الطالب. يرجى المحاولة مرة أخرى."
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="mt-2">جاري تحميل بيانات الأبناء...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">متابعة الأبناء</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold mb-4">الأبناء المرتبطين بحسابك</h2>

          {children.length > 0 ? (
            <div className="space-y-4">
              {children.map((child) => (
                <Card key={child.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {child.full_name}
                    </CardTitle>
                    <CardDescription>رمز الطالب: {child.user_code}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {child.email && <p className="text-sm text-muted-foreground">البريد الإلكتروني: {child.email}</p>}
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        // Update the selected child in context before navigating
                        setSelectedChild({ id: child.id, name: child.full_name });
                        router.push(`/parent/children/${child.id}`);
                      }}
                    >
                      عرض تفاصيل الطالب
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <User className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="mt-4 text-lg">لا يوجد أبناء مرتبطين بحسابك حالياً</p>
                <p className="text-muted-foreground">يمكنك ربط حسابك بأبنائك باستخدام النموذج المجاور</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">ربط حسابك بطالب</h2>

          <Card>
            <form onSubmit={handleLinkStudent}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  إضافة طالب
                </CardTitle>
                <CardDescription>أدخل رمز الطالب لربطه بحسابك</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="studentCode">رمز الطالب</Label>
                  <Input
                    id="studentCode"
                    placeholder="مثال: ST12345"
                    required
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    يمكنك الحصول على رمز الطالب من حساب الطالب أو من إدارة المدرسة
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isLinking}>
                  {isLinking ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري ربط الطالب...
                    </>
                  ) : (
                    "ربط الطالب بحسابك"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>تعليمات ربط الطلاب</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 pr-4">
                  <li>يجب أن يكون لدى الطالب حساب مسجل في النظام</li>
                  <li>يمكنك ربط أكثر من طالب بحسابك</li>
                  <li>بعد ربط الطالب، يمكنك متابعة نقاطه وأنشطته</li>
                  <li>في حالة وجود أي مشكلة، يرجى التواصل مع إدارة المدرسة</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
