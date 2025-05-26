"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { Search, Award, Check, Loader2 } from "lucide-react"

export default function TeacherBadgesPage() {
  const [badges, setBadges] = useState([])
  const [students, setStudents] = useState([])
  const [selectedBadge, setSelectedBadge] = useState(null)
  const [selectedStudents, setSelectedStudents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          toast({
            title: "خطأ في التحقق",
            description: "يرجى تسجيل الدخول من جديد",
            variant: "destructive",
          })
          return
        }

        // Get badges
        const { data: badgesData, error: badgesError } = await supabase
          .from("badges")
          .select("*")
          .order("name")
        
        if (badgesError) {
          console.error("Error loading badges:", badgesError)
          toast({
            title: "خطأ في تحميل البيانات",
            description: "حدث خطأ أثناء محاولة تحميل الشارات",
            variant: "destructive",
          })
          return
        }

        // Get students
        const { data: studentsData, error: studentsError } = await supabase
          .from("users")
          .select("id, full_name, user_code")
          .eq("role_id", 1)
          .order("full_name")
        
        if (studentsError) {
          console.error("Error loading students:", studentsError)
          toast({
            title: "خطأ في تحميل البيانات",
            description: "حدث خطأ أثناء محاولة تحميل الطلاب",
            variant: "destructive",
          })
          return
        }

        setBadges(badgesData || [])
        setStudents(studentsData || [])
        
      } catch (error) {
        console.error("Error:", error)
        toast({
          title: "خطأ غير متوقع",
          description: "حدث خطأ غير متوقع أثناء تحميل البيانات",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [supabase])

  const handleBadgeSelect = (badge) => {
    setSelectedBadge(badge === selectedBadge ? null : badge)
  }

  const toggleStudent = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const assignBadgeToStudents = async () => {
    if (!selectedBadge) {
      toast({
        title: "لم يتم تحديد شارة",
        description: "الرجاء اختيار شارة لمنحها للطلاب",
        variant: "destructive",
      })
      return
    }

    if (selectedStudents.length === 0) {
      toast({
        title: "لم يتم تحديد طلاب",
        description: "الرجاء اختيار طالب واحد على الأقل",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error("يجب تسجيل الدخول")

      // Prepare student badge assignments
      const assignments = selectedStudents.map(studentId => ({
        user_id: studentId,
        badge_id: selectedBadge.id,
        granted_by: user.id,
        granted_at: new Date().toISOString()
      }))

      // Insert badge assignments
      const { error: assignError } = await supabase
        .from("user_badges")
        .insert(assignments)
      
      if (assignError) throw assignError

      // Create notifications
      const notifications = selectedStudents.map(studentId => ({
        user_id: studentId,
        title: "شارة جديدة",
        content: `حصلت على شارة جديدة: ${selectedBadge.name}`,
      }))

      await supabase.from("notifications").insert(notifications)

      toast({
        title: "تم منح الشارة بنجاح",
        description: `تم منح شارة "${selectedBadge.name}" لـ ${selectedStudents.length} طالب`,
      })

      // Reset selections
      setSelectedBadge(null)
      setSelectedStudents([])
      
    } catch (error) {
      console.error("Error assigning badges:", error)
      toast({
        title: "خطأ في منح الشارة",
        description: error.message || "حدث خطأ أثناء محاولة منح الشارة",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter students based on search query
  const filteredStudents = students.filter(
    (student) =>
      student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.user_code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-2">جاري تحميل البيانات...</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">إدارة الشارات</h1>

      <Tabs defaultValue="assign" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="assign">منح الشارات</TabsTrigger>
          <TabsTrigger value="all">جميع الشارات</TabsTrigger>
        </TabsList>
        
        <TabsContent value="assign" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>الشارات المتاحة</CardTitle>
                <CardDescription>اختر شارة لمنحها للطلاب</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {badges.map((badge) => (
                    <Card 
                      key={badge.id}
                      className={`cursor-pointer transition-colors ${
                        selectedBadge?.id === badge.id ? 'border-primary bg-primary/10' : ''
                      }`}
                      onClick={() => handleBadgeSelect(badge)}
                    >
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        <div className="w-16 h-16 flex items-center justify-center bg-primary/10 rounded-full mb-2">
                          <Award className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="font-medium">{badge.name}</h3>
                        <p className="text-sm text-muted-foreground">{badge.points} نقطة</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>الطلاب</CardTitle>
                <CardDescription>اختر الطلاب الذين ستمنحهم الشارة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="البحث عن طالب..."
                    className="pr-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <div
                        key={student.id}
                        className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${
                          selectedStudents.includes(student.id) ? "bg-primary/10" : ""
                        }`}
                        onClick={() => toggleStudent(student.id)}
                      >
                        <div className="flex items-center">
                          <div
                            className={`h-5 w-5 border rounded-md mr-2 flex items-center justify-center ${
                              selectedStudents.includes(student.id)
                                ? "bg-primary border-primary"
                                : "border-input"
                            }`}
                          >
                            {selectedStudents.includes(student.id) && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <span className="font-medium">{student.full_name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{student.user_code}</span>
                      </div>
                    ))
                  ) : (
                    <div className="py-4 text-center text-muted-foreground">لا توجد نتائج مطابقة للبحث</div>
                  )}
                </div>

                <Button 
                  className="w-full"
                  disabled={!selectedBadge || selectedStudents.length === 0 || isSubmitting}
                  onClick={assignBadgeToStudents}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري منح الشارة...
                    </>
                  ) : (
                    <>
                      <Award className="ml-2 h-4 w-4" />
                      منح الشارة لـ {selectedStudents.length} طالب
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>جميع الشارات المتاحة</CardTitle>
              <CardDescription>قائمة بجميع الشارات المتاحة في النظام</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {badges.map((badge) => (
                  <Card key={badge.id}>
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <div className="w-16 h-16 flex items-center justify-center bg-primary/10 rounded-full mb-2">
                        <Award className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="font-medium">{badge.name}</h3>
                      <p className="text-sm text-muted-foreground">{badge.description}</p>
                      <p className="text-sm font-medium mt-1">{badge.points} نقطة</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 