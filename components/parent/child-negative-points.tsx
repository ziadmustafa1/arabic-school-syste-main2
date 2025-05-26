"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { ThumbsDown, Loader2, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface PointsTransaction {
  id: number
  points: number
  is_positive: boolean
  description: string | null
  created_at: string | null
  created_by: string
  created_by_name?: string
  point_categories?: {
    id: number
    name: string
    color: string
    is_mandatory: boolean
  }[]
  users?: any
}

interface ChildNegativePointsProps {
  childId: string
}

export function ChildNegativePoints({ childId }: ChildNegativePointsProps) {
  const supabase = createClient()
  const [transactions, setTransactions] = useState<PointsTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalNegativePoints, setTotalNegativePoints] = useState(0)

  useEffect(() => {
    const fetchNegativePointsData = async () => {
      try {
        console.log("Fetching negative points data for child ID:", childId);
        
        // First, get the basic negative transactions data
        const { data, error } = await supabase
          .from("points_transactions")
          .select("*, users!points_transactions_created_by_fkey(full_name)")
          .eq("user_id", childId)
          .eq("is_positive", false)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching negative points:", error);
          throw error;
        }
        
        console.log("Negative points data:", data);
        
        // Check if data exists
        if (!data || data.length === 0) {
          console.log("No negative points found for this student");
          setTransactions([]);
          setTotalNegativePoints(0);
          setIsLoading(false);
          return;
        }

        // Process the base transactions
        const transactionsWithNames = data.map((transaction) => ({
          ...transaction,
          created_by_name: transaction.users?.full_name || "النظام",
          // Ensure points is a number
          points: typeof transaction.points === 'number' ? transaction.points : Number(transaction.points) || 0,
          point_categories: [] // Initialize with empty array
        }));

        // Now, get categories for each transaction separately for more reliability
        for (const transaction of transactionsWithNames) {
          try {
            const { data: categoriesData, error: categoriesError } = await supabase
              .from("negative_points_categories")
              .select("category_id, categories(id, name, color, is_mandatory)")
              .eq("transaction_id", transaction.id);

            if (!categoriesError && categoriesData) {
              // Map the categories to a simpler structure
              transaction.point_categories = categoriesData.map((item) => ({
                id: item.categories?.id,
                name: item.categories?.name,
                color: item.categories?.color,
                is_mandatory: item.categories?.is_mandatory
              })).filter(cat => cat.id); // Filter out any null entries
            }
          } catch (catError) {
            console.log("Error fetching categories for transaction", transaction.id, catError);
            // Don't fail the entire operation for a single transaction's categories
          }
        }

        setTransactions(transactionsWithNames);

        // Calculate total negative points
        const negativeSum = transactionsWithNames.reduce((sum, transaction) => sum + transaction.points, 0);
        setTotalNegativePoints(negativeSum);
      } catch (error) {
        console.error("Error fetching negative points data:", error);
        toast({
          title: "خطأ في تحميل البيانات",
          description: "حدث خطأ أثناء تحميل بيانات النقاط السلبية",
          variant: "destructive",
        });
        
        // Set empty values in case of error
        setTransactions([]);
        setTotalNegativePoints(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNegativePointsData();
  }, [childId, supabase]);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-2">جاري تحميل بيانات النقاط السلبية...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-md font-medium">إجمالي النقاط السلبية</CardTitle>
          <ThumbsDown className="h-5 w-5 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-destructive">{totalNegativePoints}</div>
          <p className="text-sm text-muted-foreground">مجموع النقاط السلبية المخصومة</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            سجل النقاط السلبية
          </CardTitle>
          <CardDescription>جميع النقاط السلبية التي تم خصمها من الطالب</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="rounded-lg border border-red-100 bg-red-50/30 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ThumbsDown className="h-5 w-5 text-destructive" />
                      <span className="font-medium">نقاط سلبية</span>
                    </div>
                    <Badge variant="destructive">
                      -{transaction.points} نقطة
                    </Badge>
                  </div>
                  
                  {/* Display categories if available */}
                  {transaction.point_categories && transaction.point_categories.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {transaction.point_categories.map((category, index) => (
                        <Badge key={index} variant="outline" className="bg-purple-100 text-purple-800">
                          {category.name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <p>{transaction.description || "خصم نقاط سلبية"}</p>
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
            <div className="py-8 text-center text-muted-foreground">لا توجد نقاط سلبية مسجلة للطالب</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 