"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Award, TrendingUp, TrendingDown, Loader2, FileText } from "lucide-react"

interface PointsTransaction {
  id: number
  points: number
  is_positive: boolean
  description: string | null
  created_at: string | null
  created_by: string
  created_by_name?: string
  user_id?: string
  category_id?: number | null
  users?: any
}

interface ChildPointsSummaryProps {
  childId: string
}

export function ChildPointsSummary({ childId }: ChildPointsSummaryProps) {
  const supabase = createClient()
  const [transactions, setTransactions] = useState<PointsTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalPoints, setTotalPoints] = useState(0)
  const [positivePoints, setPositivePoints] = useState(0)
  const [negativePoints, setNegativePoints] = useState(0)

  useEffect(() => {
    const fetchPointsData = async () => {
      try {
        console.log("Fetching points data for child ID:", childId);
        
        // Get transactions
        const { data, error } = await supabase
          .from("points_transactions")
          .select("*, users!points_transactions_created_by_fkey(full_name)")
          .eq("user_id", childId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching transactions:", error);
          throw error;
        }

        console.log("Points transactions data:", data);
        
        // Check if data exists
        if (!data || data.length === 0) {
          console.log("No points transactions found for this student");
          
          setTransactions([]);
          setPositivePoints(0);
          setNegativePoints(0);
          setTotalPoints(0);
          setIsLoading(false);
          return;
        }

        // Add creator name to each transaction and ensure data is valid
        const transactionsWithNames: PointsTransaction[] = data.map((transaction) => ({
          ...transaction,
          created_by_name: transaction.users?.full_name || "النظام",
          // Ensure points is a number
          points: typeof transaction.points === 'number' ? transaction.points : Number(transaction.points) || 0
        }));

        setTransactions(transactionsWithNames);

        // Calculate totals
        let positive = 0;
        let negative = 0;

        transactionsWithNames.forEach((transaction) => {
          if (transaction.is_positive) {
            positive += transaction.points;
          } else {
            negative += transaction.points;
          }
        });

        console.log("Points calculation:", { positive, negative, total: positive - negative });
        
        setPositivePoints(positive);
        setNegativePoints(negative);
        setTotalPoints(positive - negative);
      } catch (error) {
        console.error("Error fetching points data:", error);
        toast({
          title: "خطأ في تحميل البيانات",
          description: "حدث خطأ أثناء تحميل بيانات النقاط",
          variant: "destructive",
        });
        
        // Set empty values in case of error
        setTransactions([]);
        setPositivePoints(0);
        setNegativePoints(0);
        setTotalPoints(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPointsData();
  }, [childId, supabase]);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-2">جاري تحميل بيانات النقاط...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
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
            سجل معاملات النقاط
          </CardTitle>
          <CardDescription>جميع معاملات النقاط للطالب</CardDescription>
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
                          {transaction.created_at && new Date(transaction.created_at).toLocaleDateString("ar-EG", {
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
            <div className="text-center py-8 text-muted-foreground">لا توجد معاملات في سجل النقاط</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
