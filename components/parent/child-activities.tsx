"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Activity, Calendar, Clock, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ActivityRecord {
  id: number
  activity_type: string
  title: string
  description: string
  date: string
  status: string
  participants_count: number
}

interface ChildActivitiesProps {
  childId: string
}

export function ChildActivities({ childId }: ChildActivitiesProps) {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [activities, setActivities] = useState<ActivityRecord[]>([])
  const [upcomingCount, setUpcomingCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)

  useEffect(() => {
    const fetchActivitiesData = async () => {
      try {
        // Get student activities
        const { data, error } = await supabase.rpc("get_student_activities", {
          student_uuid: childId,
        })

        if (error) throw error
        setActivities(data || [])

        // Count upcoming and completed activities
        let upcoming = 0
        let completed = 0
        data?.forEach((activity: ActivityRecord) => {
          if (activity.status === "upcoming") {
            upcoming++
          } else if (activity.status === "completed") {
            completed++
          }
        })
        setUpcomingCount(upcoming)
        setCompletedCount(completed)
      } catch (error) {
        console.error("Error fetching activities data:", error)
        toast({
          title: "خطأ في تحميل البيانات",
          description: "حدث خطأ أثناء تحميل بيانات الأنشطة",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchActivitiesData()
  }, [childId, supabase])

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-2">جاري تحميل بيانات الأنشطة...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الأنشطة</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activities.length}</div>
            <p className="text-xs text-muted-foreground">عدد الأنشطة التي شارك فيها الطالب</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الأنشطة القادمة</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{upcomingCount}</div>
            <p className="text-xs text-muted-foreground">عدد الأنشطة القادمة</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الأنشطة المكتملة</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{completedCount}</div>
            <p className="text-xs text-muted-foreground">عدد الأنشطة التي اكتملت</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            الأنشطة والفعاليات
          </CardTitle>
          <CardDescription>الأنشطة والفعاليات التي شارك فيها الطالب</CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="font-medium">{activity.title}</h4>
                    <Badge
                      variant={
                        activity.status === "upcoming"
                          ? "outline"
                          : activity.status === "completed"
                            ? "success"
                            : "default"
                      }
                    >
                      {activity.status === "upcoming" ? "قادم" : activity.status === "completed" ? "مكتمل" : "جاري"}
                    </Badge>
                  </div>
                  <p className="text-sm">{activity.description}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(activity.date).toLocaleDateString("ar-EG", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{activity.participants_count} مشارك</span>
                    </div>
                    <Badge variant="secondary">{activity.activity_type}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">لم يشارك الطالب في أي أنشطة بعد</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
