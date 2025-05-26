import { notFound } from "next/navigation"
import { format, parseISO } from "date-fns"
import { getRecordById } from "@/lib/actions/records"
import { getCurrentUser } from "@/lib/actions/get-current-user"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Container } from "@/components/container"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { 
  Trophy, 
  Award, 
  Medal, 
  Calendar, 
  Clock, 
  ChevronRight, 
  Share2
} from "lucide-react"
import Link from "next/link"

export default async function RecordDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  try {
    const record = await getRecordById(params.id)
    
    // Make sure the record belongs to the current user
    if (record.user_id !== user.id) {
      return notFound()
    }

    // Determine the category icon
    const getCategoryIcon = (category: string) => {
      switch (category.toLowerCase()) {
        case "تعليمي":
          return <Award className="h-6 w-6" />
        case "مجتمعي":
          return <Trophy className="h-6 w-6" />
        case "احترافي":
          return <Medal className="h-6 w-6" />
        default:
          return <Award className="h-6 w-6" />
      }
    }

    // Determine if record is active
    const isActive = () => {
      const now = new Date()
      const validFrom = parseISO(record.valid_from)
      const validUntil = record.valid_until ? parseISO(record.valid_until) : null
      
      if (now < validFrom) {
        return false
      }
      
      if (validUntil && now > validUntil) {
        return false
      }
      
      return true
    }

    return (
      <DashboardLayout>
        <Container>
          <div className="flex items-center gap-2 mb-6">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/my-records">
                <ChevronRight className="h-4 w-4 ml-1" />
                العودة إلى السجلات
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant={isActive() ? "default" : "outline"}>
                      {isActive() ? "ساري" : "منتهي"}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        رقم السجل: {record.record_code}
                      </span>
                    </div>
                  </div>
                  <CardTitle className="text-2xl mt-2">{record.title}</CardTitle>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {getCategoryIcon(record.category)}
                    <span className="text-lg">{record.category}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {record.description && (
                    <div>
                      <h3 className="font-medium mb-2">الوصف</h3>
                      <p className="text-muted-foreground">
                        {record.description}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="font-medium mb-2">فترة الصلاحية</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm">البداية</p>
                          <p className="font-medium">{format(parseISO(record.valid_from), "dd/MM/yyyy")}</p>
                        </div>
                      </div>
                      
                      {record.valid_until && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm">النهاية</p>
                            <p className="font-medium">{format(parseISO(record.valid_until), "dd/MM/yyyy")}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-medium mb-2">القيمة</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        <span className="font-bold text-lg">{record.points_value} نقطة</span>
                      </div>
                      
                      <Button variant="outline" size="sm">
                        <Share2 className="h-4 w-4 ml-2" />
                        مشاركة
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>معلومات السجل</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">تاريخ الإنشاء</p>
                    <p>{format(parseISO(record.created_at), "dd/MM/yyyy")}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">الحالة</p>
                    <Badge variant={isActive() ? "default" : "outline"}>
                      {isActive() ? "ساري" : "منتهي"}
                    </Badge>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">رقم السجل</p>
                    <p className="font-mono">{record.record_code}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </Container>
      </DashboardLayout>
    )
  } catch (error) {
    console.error("Error loading record:", error)
    return notFound()
  }
} 