"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { redeemRechargeCardFixed } from "@/app/actions/recharge-fix"
import { updateStudentPoints } from "@/app/actions/update-student-points"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { CreditCard, Loader2, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PointsSyncButton } from "@/app/components/points-sync-button"

export default function RechargePointsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [cardCode, setCardCode] = useState("")
  const [currentPoints, setCurrentPoints] = useState(0)
  const [userId, setUserId] = useState<string>("")
  const supabase = createClient()
  const [showDetails, setShowDetails] = useState(false)
  const [pointsDetails, setPointsDetails] = useState<{
    positivePoints: number;
    negativePoints: number;
  }>({ positivePoints: 0, negativePoints: 0 })

  // Fetch current points
  useEffect(() => {
    async function fetchUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user && user.id) {
          setUserId(user.id)
          await fetchPoints(user.id)
        }
      } catch (err) {
        console.error("Error fetching user data:", err)
      }
    }

    fetchUserData()
  }, [supabase])

  async function fetchPoints(id?: string) {
    try {
      const userIdToUse = id || userId
      if (!userIdToUse) return

      console.log("Attempting to fetch points for user:", userIdToUse)
      
      // Method 1: Get directly from student_points table
      try {
        console.log("Method 1: Getting points from student_points table...")
        const { data: pointsData, error: pointsError } = await supabase
          .from("student_points")
          .select("points")
          .eq("student_id", userIdToUse)
          .single();
          
        if (!pointsError && pointsData && pointsData.points > 0) {
          console.log("Points from student_points table:", pointsData.points)
          setCurrentPoints(pointsData.points)
          return
        } else {
          console.log("Could not get points from student_points table:", pointsError)
        }
      } catch (tableErr) {
        console.error("Error querying student_points table:", tableErr)
      }
      
      // Method 2: Try with RPC function 
      try {
        console.log("Method 2: Attempting to get points via RPC...")
        const { data, error } = await supabase.rpc('get_user_points_balance', {
          user_id_param: userIdToUse
        })

        if (!error && data !== null && data > 0) {
          console.log("RPC points balance:", data)
          setCurrentPoints(data)
          
          // Use server action to update student_points table
          try {
            const updateResult = await updateStudentPoints(userIdToUse, data)
            if (updateResult.success) {
              console.log("Updated student_points table via server action:", data)
            } else {
              console.error("Failed to update student_points via server action:", updateResult.error)
            }
          } catch (updateErr) {
            console.error("Error calling updateStudentPoints:", updateErr)
          }
          
          return
        } else {
          console.error("Error with RPC points calculation:", error)
        }
      } catch (rpcErr) {
        console.error("RPC error:", rpcErr)
      }

      // Method 3: Fall back to direct calculation from transactions
      try {
        console.log("Method 3: Falling back to direct points calculation...")
        const { data: transactions, error: txError } = await supabase
          .from("points_transactions")
          .select("points, is_positive")
          .eq("user_id", userIdToUse)

        if (!txError && transactions && transactions.length > 0) {
          // Log the raw transactions for debugging
          console.log("Raw transactions:", transactions)
          
          const positivePoints = transactions
            .filter(tx => tx.is_positive === true)
            .reduce((sum, tx) => sum + (tx.points || 0), 0)
          
          const negativePoints = transactions
            .filter(tx => tx.is_positive === false)
            .reduce((sum, tx) => sum + (tx.points || 0), 0)
          
          const total = positivePoints - negativePoints
          console.log(`Direct calculation: ${positivePoints} positive - ${negativePoints} negative = ${total}`)
          
          if (total > 0) {
            setCurrentPoints(total)
            
            // Use server action to update student_points table
            try {
              const updateResult = await updateStudentPoints(userIdToUse, total)
              if (updateResult.success) {
                console.log("Updated student_points table via server action:", total)
              } else {
                console.error("Failed to update student_points via server action:", updateResult.error)
              }
            } catch (updateErr) {
              console.error("Error calling updateStudentPoints:", updateErr)
            }
            
            return
          }
        } else {
          console.error("Error with direct calculation:", txError)
        }
      } catch (calcErr) {
        console.error("Error calculating points directly:", calcErr)
      }

      // Method 4: Request from API as last resort
      try {
        console.log("Method 4: Calling fix-points API...")
        const response = await fetch(`/api/fix-points?userId=${userIdToUse}`)
        
        if (response.ok) {
          const result = await response.json()
          console.log("API result:", result)
          
          if (result.success && result.totalPoints > 0) {
            setCurrentPoints(result.totalPoints)
            return
          }
        } else {
          console.error("API error:", await response.text())
        }
      } catch (apiErr) {
        console.error("API call error:", apiErr)
      }

      console.warn("All points calculation methods failed - defaulting to 0")
      setCurrentPoints(0)
    } catch (err) {
      console.error("Error in fetchPoints:", err)
    }
  }

  // Function to force recalculation of points via API
  async function forceRecalculatePoints() {
    if (!userId) return;
    
    try {
      console.log("Forcing points recalculation via API...");
      const response = await fetch(`/api/fix-points?userId=${userId}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log("Points recalculation result:", result);
        
        if (result.success) {
          setCurrentPoints(result.totalPoints);
          toast({
            title: "تم تحديث الرصيد",
            description: `رصيدك الحالي: ${result.totalPoints} نقطة`,
          });
          return true;
        }
      } else {
        console.error("Error recalculating points:", await response.text());
      }
    } catch (err) {
      console.error("Failed to force recalculate points:", err);
    }
    
    return false;
  }

  // Function to repair missing points transactions
  async function repairPointsTransactions() {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      console.log("Repairing points transactions...");
      const response = await fetch(`/api/repair-points?userId=${userId}&forceRepair=false`);
      
      if (response.ok) {
        const result = await response.json();
        console.log("Points repair result:", result);
        
        if (result.success) {
          // Update the local points state with the repaired value
          setCurrentPoints(result.totalPoints);
          
          if (result.repairResults.repairedCards.length > 0) {
            toast({
              title: "تم إصلاح الرصيد",
              description: `تم إصلاح ${result.repairResults.repairedCards.length} بطاقة شحن، رصيدك الحالي: ${result.totalPoints} نقطة`,
            });
          } else {
            toast({
              title: "لا يوجد إصلاحات مطلوبة",
              description: `رصيدك الحالي: ${result.totalPoints} نقطة`,
            });
          }
          return true;
        }
      } else {
        console.error("Error repairing points:", await response.text());
        toast({
          title: "خطأ في إصلاح الرصيد",
          description: "حدث خطأ أثناء إصلاح الرصيد. يرجى المحاولة مرة أخرى.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Failed to repair points:", err);
      toast({
        title: "خطأ في إصلاح الرصيد",
        description: "حدث خطأ أثناء إصلاح الرصيد. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
    
    return false;
  }

  // Function to manually force add points
  async function forceAddPoints(amount: number) {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      console.log(`Force adding ${amount} points...`);
      
      // Create URL with proper encoding
      const safeUserId = encodeURIComponent(userId);
      const safePoints = encodeURIComponent(amount);
      const apiUrl = `/api/force-add-points?userId=${safeUserId}&points=${safePoints}`;
      
      console.log("Calling API with URL:", apiUrl);
      const response = await fetch(apiUrl);
      
      if (response.ok) {
        const result = await response.json();
        console.log("Force add points result:", result);
        
        if (result.success) {
          // Update points display
          await fetchPoints();
          
          toast({
            title: "تم إضافة النقاط",
            description: `تمت إضافة ${amount} نقطة بنجاح. الرصيد الجديد: ${result.rpcBalanceAfter} نقطة`,
          });
          return true;
        }
      } else {
        // Get detailed error information
        const errorResponse = await response.text();
        console.error("Error adding points:", errorResponse);
        toast({
          title: "خطأ في إضافة النقاط",
          description: "حدث خطأ أثناء إضافة النقاط. يرجى المحاولة مرة أخرى.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Failed to add points:", err);
      toast({
        title: "خطأ في إضافة النقاط",
        description: "حدث خطأ أثناء إضافة النقاط. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
    
    return false;
  }

  // Function to get detailed points breakdown
  async function getPointsDetails() {
    if (!userId) return;
    
    try {
      console.log("Fetching points details...");
      const response = await fetch(`/api/fix-points?userId=${userId}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log("Points details:", result);
        
        if (result.success) {
          setPointsDetails({
            positivePoints: result.positivePoints,
            negativePoints: result.negativePoints
          });
          setShowDetails(true);
          return true;
        }
      }
    } catch (err) {
      console.error("Failed to get points details:", err);
    }
    
    return false;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      console.log("Submitting card code:", cardCode)
      const formData = new FormData()
      formData.append("cardCode", cardCode)

      const result = await redeemRechargeCardFixed(formData)
      console.log("Redemption result:", result)

      if (result.success) {
        toast({
          title: "تم شحن الرصيد",
          description: result.message,
        })
        // Reset form
        setCardCode("")
        
        // Update current points with the value from the result
        if (result.points) {
          setCurrentPoints(result.points)
          
          // Update student_points table using server action
          if (userId) {
            try {
              const updateResult = await updateStudentPoints(userId, result.points)
              if (updateResult.success) {
                console.log("Updated student_points table via server action:", result.points)
              } else {
                console.error("Failed to update student_points via server action:", updateResult.error)
              }
            } catch (updateErr) {
              console.error("Error calling updateStudentPoints:", updateErr)
            }
          }
        }
        
        // Multiple refresh attempts with increasing delays
        toast({
          title: "تم تحديث الرصيد",
          description: `تم إضافة ${result.points} نقطة، رصيدك الحالي: ${result.points} نقطة`,
        })
        
        // Refresh sequence with increasing delays
        const refreshSequence = async () => {
          console.log("First delayed refresh attempt...")
          await fetchPoints()
          
          setTimeout(async () => {
            console.log("Second delayed refresh attempt...")
            await fetchPoints()
            
            setTimeout(async () => {
              console.log("Final refresh attempt...")
              await fetchPoints()
              
              if (currentPoints === 0 || currentPoints !== result.points) {
                console.log("Points mismatch - trying force recalculation")
                
                // Last resort - try direct API recalculation
                const recalculated = await forceRecalculatePoints()
                
                if (!recalculated) {
                  console.log("Force recalculation failed - suggesting manual refresh")
                  toast({
                    title: "تنبيه",
                    description: "تم شحن الرصيد ولكن قد تحتاج لتحديث الصفحة لرؤية الرصيد الجديد",
                    variant: "default",
                  })
                  // Very last resort - force browser refresh after a delay
                  setTimeout(() => {
                    router.refresh()
                  }, 1500)
                }
              }
            }, 2000)
          }, 1000)
        }
        
        refreshSequence()
      } else {
        toast({
          title: "خطأ في شحن الرصيد",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error redeeming card:", error)
      toast({
        title: "خطأ في شحن الرصيد",
        description: "حدث خطأ أثناء شحن الرصيد. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">شحن الرصيد</h1>
        {userId && (
          <PointsSyncButton 
            userId={userId} 
            variant="outline" 
            size="sm" 
            label="تحديث الرصيد" 
          />
        )}
      </div>

      <div className="mb-6">
        <Card className="bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">رصيدك الحالي</h3>
                <p className="text-sm text-muted-foreground">إجمالي النقاط المتاحة</p>
                {showDetails && (
                  <div className="mt-2 text-xs">
                    <div className="text-green-600">النقاط الإيجابية: {pointsDetails.positivePoints}</div>
                    <div className="text-red-600">النقاط السلبية: {pointsDetails.negativePoints}</div>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end">
                <div className="text-3xl font-bold mb-1">{currentPoints} نقطة</div>
                {userId && (
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => fetchPoints()}
                      disabled={isLoading}
                      title="تحديث الرصيد"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="max-w-md mx-auto">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              شحن رصيد النقاط
            </CardTitle>
            <CardDescription>أدخل رمز كرت الشحن لإضافة النقاط إلى رصيدك</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardCode">رمز كرت الشحن</Label>
              <Input
                id="cardCode"
                placeholder="أدخل رمز كرت الشحن"
                required
                value={cardCode}
                onChange={(e) => setCardCode(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري شحن الرصيد...
                </>
              ) : (
                "شحن الرصيد"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <div className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold">تعليمات شحن الرصيد</h2>
        <ul className="list-disc list-inside space-y-2 pr-4">
          <li>يمكنك الحصول على كروت الشحن من إدارة المدرسة</li>
          <li>كل كرت يحتوي على رمز فريد يمكن استخدامه مرة واحدة فقط</li>
          <li>بعد إدخال الرمز بشكل صحيح، سيتم إضافة النقاط إلى رصيدك فوراً</li>
          <li>في حالة وجود أي مشكلة، يرجى التواصل مع إدارة المدرسة</li>
        </ul>
      </div>
    </div>
  )
}
