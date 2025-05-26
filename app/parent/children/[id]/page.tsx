"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { Loader2, User, Award, Calendar, ThumbsUp, ThumbsDown, ArrowLeft } from "lucide-react"
import { ChildPointsSummary } from "@/components/parent/child-points-summary"
import { ChildAttendance } from "@/components/parent/child-attendance"
import { ChildPositivePoints } from "@/components/parent/child-positive-points"
import { ChildNegativePoints } from "@/components/parent/child-negative-points"

interface Student {
  id: string
  full_name: string
  user_code: string
  email: string | null
}

export default function ChildDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [childData, setChildData] = useState<Student | null>(null)
  const [activeTab, setActiveTab] = useState("points")
  const [refreshKey, setRefreshKey] = useState(0)
  const [componentsReady, setComponentsReady] = useState(false)
  const childId = params.id as string

  useEffect(() => {
    const fetchChildData = async () => {
      try {
        // Get current user
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) {
          router.push("/auth/login")
          return
        }

        // Check if the child belongs to this parent
        const { data: relationship, error: relationshipError } = await supabase
          .from("parent_student")
          .select("*")
          .eq("parent_id", userData.user.id)
          .eq("student_id", childId)
          .single()

        if (relationshipError || !relationship) {
          toast({
            title: "غير مصرح",
            description: "ليس لديك صلاحية لعرض بيانات هذا الطالب",
            variant: "destructive",
          })
          router.push("/parent/children")
          return
        }

        // Get child data
        const { data: child, error: childError } = await supabase
          .from("users")
          .select("id, full_name, user_code, email")
          .eq("id", childId)
          .single()

        if (childError || !child) {
          throw new Error("لم يتم العثور على بيانات الطالب")
        }

        console.log("Child data loaded:", child.id);
        setChildData(child)
        
        // Check if this student has points
        const { count: pointsCount, error: pointsError } = await supabase
          .from("points_transactions")
          .select('*', { count: 'exact', head: true })
          .eq('user_id', child.id);
          
        console.log(`Points check for child ${child.id}: count=${pointsCount}, error=`, pointsError);
        
        // Small delay to ensure components mount properly
        setTimeout(() => {
          setComponentsReady(true);
        }, 300);
      } catch (error) {
        console.error("Error fetching child data:", error)
        toast({
          title: "خطأ في تحميل البيانات",
          description: "حدث خطأ أثناء تحميل بيانات الطالب",
          variant: "destructive",
        })
        router.push("/parent/children")
      } finally {
        setIsLoading(false)
      }
    }

    if (childId) {
      fetchChildData()
    }
    
    return () => {
      // Cleanup on unmount
      setComponentsReady(false);
    }
  }, [childId, supabase, router])
  
  // Handle tab change to refresh data when switching tabs
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    console.log("Changing tab to:", value);
    // Refresh the component data when switching tabs
    setRefreshKey(prev => prev + 1)
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="mr-2">جاري تحميل بيانات الطالب...</span>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => router.push("/parent/children")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">تفاصيل الطالب: {childData?.full_name}</h1>
          </div>
        </div>

        <div className="mb-6">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{childData?.full_name}</h2>
                <p className="text-muted-foreground">رمز الطالب: {childData?.user_code}</p>
                {childData?.email && <p className="text-muted-foreground">البريد الإلكتروني: {childData?.email}</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="points" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              <span className="hidden sm:inline">النقاط</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">الحضور</span>
            </TabsTrigger>
            <TabsTrigger value="positive_points" className="flex items-center gap-2">
              <ThumbsUp className="h-4 w-4" />
              <span className="hidden sm:inline">النقاط الإيجابية</span>
            </TabsTrigger>
            <TabsTrigger value="negative_points" className="flex items-center gap-2">
              <ThumbsDown className="h-4 w-4" />
              <span className="hidden sm:inline">النقاط السلبية</span>
            </TabsTrigger>
          </TabsList>
          <div className="mt-6">
            {componentsReady ? (
              <>
                <TabsContent value="points">
                  <ChildPointsSummary childId={childId} key={`points-${refreshKey}`} />
                </TabsContent>
                <TabsContent value="attendance">
                  <ChildAttendance childId={childId} key={`attendance-${refreshKey}`} />
                </TabsContent>
                <TabsContent value="positive_points">
                  <ChildPositivePoints childId={childId} key={`positive-${refreshKey}`} />
                </TabsContent>
                <TabsContent value="negative_points">
                  <ChildNegativePoints childId={childId} key={`negative-${refreshKey}`} />
                </TabsContent>
              </>
            ) : (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="mr-2">جاري تحميل بيانات النقاط...</span>
              </div>
            )}
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
