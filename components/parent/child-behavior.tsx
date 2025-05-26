"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Star, Award, ThumbsUp, ThumbsDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface BehaviorRecord {
  id: number
  type: string
  description: string
  points: number
  created_at: string
  created_by_name: string
}

interface BadgeType {
  id: number
  name: string
  description: string
  badge_type: string
  image_url: string
  points_threshold: number
  created_at: string
}

interface ChildBehaviorProps {
  childId: string
}

export function ChildBehavior({ childId }: ChildBehaviorProps) {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [behaviorRecords, setBehaviorRecords] = useState<BehaviorRecord[]>([])
  const [badges, setBadges] = useState<BadgeType[]>([])
  const [positiveCount, setPositiveCount] = useState(0)
  const [negativeCount, setNegativeCount] = useState(0)

  useEffect(() => {
    const fetchBehaviorData = async () => {
      try {
        // Get behavior records
        const { data: recordsData, error: recordsError } = await supabase.rpc("get_student_behavior_records", {
          student_uuid: childId,
        })

        if (recordsError) throw recordsError
        setBehaviorRecords(recordsData || [])

        // Count positive and negative records
        let positive = 0
        let negative = 0
        recordsData?.forEach((record: BehaviorRecord) => {
          if (record.type === "positive") {
            positive++
          } else {
            negative++
          }
        })
        setPositiveCount(positive)
        setNegativeCount(negative)

        // Get student badges
        const { data: badgesData, error: badgesError } = await supabase.rpc("get_student_badges", {
          student_uuid: childId,
        })

        if (badgesError) throw badgesError
        setBadges(badgesData || [])
      } catch (error) {
        console.error("Error fetching behavior data:", error)
        toast({
          title: "خطأ في تحميل البيانات",
          description: "حدث خطأ أثناء تحميل بيانات السلوك",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchBehaviorData()
  }, [childId, supabase])

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-2">جاري تحميل بيانات السلوك...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الشارات المكتسبة</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{badges.length}</div>
            <p className="text-xs text-muted-foreground">إجمالي الشارات التي حصل عليها الطالب</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">السلوكيات الإيجابية</CardTitle>
            <ThumbsUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{positiveCount}</div>
            <p className="text-xs text-muted-foreground">عدد السلوكيات الإيجابية المسجلة</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">السلوكيات السلبية</CardTitle>
            <ThumbsDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{negativeCount}</div>
            <p className="text-xs text-muted-foreground">عدد السلوكيات السلبية المسجلة</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            الشارات والإنجازات
          </CardTitle>
          <CardDescription>الشارات والإنجازات التي حصل عليها الطالب</CardDescription>
        </CardHeader>
        <CardContent>
          {badges.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {badges.map((badge) => (
                <div key={badge.id} className="flex flex-col items-center rounded-lg border p-4 text-center">
                  {badge.image_url ? (
                    <img src={badge.image_url || "/placeholder.svg"} alt={badge.name} className="mb-2 h-16 w-16" />
                  ) : (
                    <Award className="mb-2 h-16 w-16 text-primary" />
                  )}
                  <h4 className="font-medium">{badge.name}</h4>
                  <p className="text-sm text-muted-foreground">{badge.description}</p>
                  <Badge variant="outline" className="mt-2">
                    {badge.badge_type}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">لم يحصل الطالب على أي شارات بعد</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            سجل السلوك
          </CardTitle>
          <CardDescription>سجل السلوكيات الإيجابية والسلبية للطالب</CardDescription>
        </CardHeader>
        <CardContent>
          {behaviorRecords.length > 0 ? (
            <div className="space-y-4">
              {behaviorRecords.map((record) => (
                <div key={record.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {record.type === "positive" ? (
                        <ThumbsUp className="h-5 w-5 text-green-500" />
                      ) : (
                        <ThumbsDown className="h-5 w-5 text-destructive" />
                      )}
                      <span className="font-medium">{record.type === "positive" ? "سلوك إيجابي" : "سلوك سلبي"}</span>
                    </div>
                    <Badge variant={record.type === "positive" ? "success" : "destructive"}>
                      {record.points > 0 ? "+" : ""}
                      {record.points} نقطة
                    </Badge>
                  </div>
                  <p>{record.description}</p>
                  <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {new Date(record.created_at).toLocaleDateString("ar-EG", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                    <span>بواسطة: {record.created_by_name}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">لا توجد سجلات سلوك للطالب</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
