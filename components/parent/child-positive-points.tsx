"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { ThumbsUp, Loader2, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface PointsTransaction {
  id: number
  points: number
  is_positive: boolean
  description: string | null
  created_at: string | null
  created_by: string
  created_by_name?: string
  users?: any
}

interface ChildPositivePointsProps {
  childId: string
}

export function ChildPositivePoints({ childId }: ChildPositivePointsProps) {
  const supabase = createClient()
  const [transactions, setTransactions] = useState<PointsTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalPositivePoints, setTotalPositivePoints] = useState(0)

  useEffect(() => {
    const fetchPositivePointsData = async () => {
      try {
        console.log("Fetching positive points data for child ID:", childId);
        
        // Get only positive transactions
        const { data, error } = await supabase
          .from("points_transactions")
          .select("*, users!points_transactions_created_by_fkey(full_name)")
          .eq("user_id", childId)
          .eq("is_positive", true)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching positive points:", error);
          throw error;
        }
        
        console.log("Positive points data:", data);
        
        // Check if data exists
        if (!data || data.length === 0) {
          console.log("No positive points found for this student");
          setTransactions([]);
          setTotalPositivePoints(0);
          setIsLoading(false);
          return;
        }

        // Add creator name to each transaction
        const transactionsWithNames: PointsTransaction[] = data.map((transaction) => ({
          ...transaction,
          created_by_name: transaction.users?.full_name || "النظام",
          // Ensure points is a number
          points: typeof transaction.points === 'number' ? transaction.points : Number(transaction.points) || 0
        }));

        setTransactions(transactionsWithNames);

        // Calculate total positive points
        const positiveSum = transactionsWithNames.reduce((sum, transaction) => sum + transaction.points, 0);
        setTotalPositivePoints(positiveSum);
      } catch (error) {
        console.error("Error fetching positive points data:", error);
        toast({
          title: "خطأ في تحميل البيانات",
          description: "حدث خطأ أثناء تحميل بيانات النقاط الإيجابية",
          variant: "destructive",
        });
        
        // Set empty values in case of error
        setTransactions([]);
        setTotalPositivePoints(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPositivePointsData();
  }, [childId, supabase]);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-2">جاري تحميل بيانات النقاط الإيجابية...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-md font-medium">إجمالي النقاط الإيجابية</CardTitle>
          <ThumbsUp className="h-5 w-5 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-500">{totalPositivePoints}</div>
          <p className="text-sm text-muted-foreground">مجموع النقاط الإيجابية المكتسبة</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            سجل النقاط الإيجابية
          </CardTitle>
          <CardDescription>جميع النقاط الإيجابية التي حصل عليها الطالب</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="rounded-lg border border-green-100 bg-green-50/30 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-5 w-5 text-green-500" />
                      <span className="font-medium">نقاط إيجابية</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      +{transaction.points} نقطة
                    </Badge>
                  </div>
                  <p>{transaction.description || "إضافة نقاط إيجابية"}</p>
                  <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {transaction.created_at && new Date(transaction.created_at).toLocaleDateString("ar-EG", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span>بواسطة: {transaction.created_by_name}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">لا توجد نقاط إيجابية مسجلة للطالب</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 