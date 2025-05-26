"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Award, FileText, Loader2, TrendingDown, TrendingUp } from "lucide-react"
import { PointsSyncButton } from "@/app/components/points-sync-button"
import { getCurrentUser } from "@/lib/utils/auth-compat"

interface PointsTransaction {
  id: number
  points: number
  is_positive: boolean
  description: string | null
  created_at: string
  created_by: string
  created_by_name?: string
}

export default function StatementPage() {
  const supabase = createClient()
  const [transactions, setTransactions] = useState<PointsTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalPoints, setTotalPoints] = useState(0)
  const [positivePoints, setPositivePoints] = useState(0)
  const [negativePoints, setNegativePoints] = useState(0)
  const [userId, setUserId] = useState<string>("")

  useEffect(() => {
    // Get the current user
    const loadUser = async () => {
      try {
        const user = await getCurrentUser()
        if (user && user.id) {
          setUserId(user.id)
        }
      } catch (error) {
        console.error("Error loading user:", error)
      }
    }
    
    loadUser()

    const fetchTransactions = async () => {
      try {
        const { data: user } = await supabase.auth.getUser()

        if (user && user.user) {
          // Get transactions
          const { data, error } = await supabase
            .from("points_transactions")
            .select("*, users!points_transactions_created_by_fkey(full_name)")
            .eq("user_id", user.user.id)
            .order("created_at", { ascending: false })

          if (error) throw error

          // Add creator name to each transaction
          const transactionsWithNames = data.map((transaction) => ({
            ...transaction,
            created_by_name: transaction.users?.full_name || "النظام",
          }))

          setTransactions(transactionsWithNames)

          // Calculate totals
          let positive = 0
          let negative = 0

          data.forEach((transaction) => {
            if (transaction.is_positive) {
              positive += transaction.points
            } else {
              negative += transaction.points
            }
          })

          setPositivePoints(positive)
          setNegativePoints(negative)
          setTotalPoints(positive - negative)
        }
      } catch (error) {
        console.error("Error fetching transactions:", error)
        toast({
          title: "خطأ في تحميل البيانات",
          description: "حدث خطأ أثناء تحميل كشف الحساب. يرجى المحاولة مرة أخرى.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransactions()
  }, [supabase])

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="mt-2">جاري تحميل كشف الحساب...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">كشف حساب النقاط</h1>
        {userId && (
          <PointsSyncButton 
            userId={userId} 
            variant="outline" 
            size="sm" 
            label="تحديث رصيد النقاط" 
          />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي النقاط</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPoints}</div>
            <p className="text-xs text-muted-foreground">الرصيد الحالي من النقاط</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">النقاط الإيجابية</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{positivePoints}</div>
            <p className="text-xs text-muted-foreground">مجموع النقاط الإيجابية المكتسبة</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">النقاط السلبية</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{negativePoints}</div>
            <p className="text-xs text-muted-foreground">مجموع النقاط السلبية المخصومة</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            سجل المعاملات
          </CardTitle>
          <CardDescription>جميع معاملات النقاط في حسابك</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-right">التاريخ</th>
                      <th className="p-3 text-right">الوصف</th>
                      <th className="p-3 text-right">النقاط</th>
                      <th className="p-3 text-right">بواسطة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="border-t">
                        <td className="p-3 text-sm">
                          {new Date(transaction.created_at).toLocaleDateString("ar-EG", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="p-3">
                          {transaction.description || (transaction.is_positive ? "إضافة نقاط" : "خصم نقاط")}
                        </td>
                        <td className="p-3">
                          <span className={transaction.is_positive ? "text-green-500" : "text-destructive"}>
                            {transaction.is_positive ? "+" : "-"}
                            {transaction.points}
                          </span>
                        </td>
                        <td className="p-3 text-sm">{transaction.created_by_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">لا توجد معاملات في سجل حسابك</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
