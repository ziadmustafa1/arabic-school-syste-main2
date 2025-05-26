"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { redeemRechargeCardFixed } from "@/app/actions/recharge-fix"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { CreditCard, Loader2, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PointsSyncButton } from "@/app/components/points-sync-button"
import { TABLES, POINT_TYPES } from "@/lib/constants"
import { syncUserPointsBalance } from "@/lib/actions/update-points-balance"

export default function TeacherRechargePointsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [cardCode, setCardCode] = useState("")
  const [currentPoints, setCurrentPoints] = useState(0)
  const [userId, setUserId] = useState<string>("")
  const supabase = createClient()

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

      // First try getting points directly from student_points table
      try {
        console.log("Attempting to get points directly from student_points table...")
        const { data: pointsData, error: pointsError } = await supabase
          .from("student_points")
          .select("points")
          .eq("student_id", userIdToUse)
          .single()

        if (!pointsError && pointsData && pointsData.points !== null) {
          console.log("Points from student_points table:", pointsData.points)
          setCurrentPoints(pointsData.points)
          return // Exit if we got points this way
        } else {
          console.error("Error getting points from student_points:", pointsError)
        }
      } catch (tableErr) {
        console.error("Error accessing student_points table:", tableErr)
      }

      // Try direct RPC call next
      try {
        console.log("Attempting to get points via RPC...")
        const { data, error } = await supabase.rpc('get_user_points_balance', {
          user_id_param: userIdToUse
        })

        if (!error && data !== null) {
          console.log("RPC points balance:", data)
          setCurrentPoints(data)
          return // Exit if we got points this way
        } else {
          console.error("Error with RPC points calculation:", error)
        }
      } catch (rpcErr) {
        console.error("RPC error:", rpcErr)
      }

      // Fall back to direct calculation
      try {
        console.log("Falling back to direct points calculation...")
        const { data: transactions, error: txError } = await supabase
          .from(TABLES.POINTS_TRANSACTIONS)
          .select("points, is_positive")
          .eq("user_id", userIdToUse)

        if (!txError && transactions) {
          const positivePoints = transactions
            .filter(tx => tx.is_positive === POINT_TYPES.POSITIVE)
            .reduce((sum, tx) => sum + tx.points, 0)
          
          const negativePoints = transactions
            .filter(tx => tx.is_positive === POINT_TYPES.NEGATIVE)
            .reduce((sum, tx) => sum + tx.points, 0)
          
          const total = positivePoints - negativePoints
          console.log(`Direct calculation: ${positivePoints} positive - ${negativePoints} negative = ${total}`)
          setCurrentPoints(total)
          return
        } else {
          console.error("Error with direct calculation:", txError)
        }
      } catch (calcErr) {
        console.error("Error calculating points directly:", calcErr)
      }

      console.warn("All points calculation methods failed - defaulting to 0")
      setCurrentPoints(0)
    } catch (err) {
      console.error("Error in fetchPoints:", err)
    }
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
        
        // Always log the detailed points information for debugging
        console.log(`Card redemption successful. Card points: ${result.points}, Current balance: ${result.balance}`)
        
        // Immediately update the UI with the balance returned from the server action
        if (result.balance && result.balance > 0) {
          console.log(`Immediately updating UI with server-returned balance: ${result.balance}`)
          setCurrentPoints(result.balance)
          
          toast({
            title: "تم تحديث الرصيد",
            description: `رصيدك الآن: ${result.balance} نقطة`,
          })
          return
        } else if (result.points > 0) {
          // If no valid balance but we have points, at least add to the UI display
          console.log(`No valid balance returned but adding card points to UI: ${result.points}`)
          setCurrentPoints(currentPoints + result.points)
          
        toast({
            title: "تم تحديث الرصيد",
            description: `تمت إضافة ${result.points} نقطة إلى رصيدك`,
        })
          return
        }
        
        // If no valid balance was returned, continue with existing sync methods
        // Instead of multiple refresh attempts with delays, try an admin server action
        if (userId) {
          toast({
            title: "جاري تحديث الرصيد...",
            description: "يرجى الانتظار لحظة",
          })
          
          try {
            // First, try immediate sync using server action (most reliable)
            console.log("Attempting direct server action sync for points...")
            const syncResult = await syncUserPointsBalance(userId, true)
            console.log("Server action sync result:", syncResult)
            
            if (syncResult.success && syncResult.data && syncResult.data.points && syncResult.data.points > 0) {
              console.log(`Points updated successfully via server action: ${syncResult.data.points}`)
              setCurrentPoints(syncResult.data.points)
              
              toast({
                title: "تم تحديث الرصيد",
                description: `رصيدك الآن: ${syncResult.data.points} نقطة`,
              })
              return
            }
            
            // If server action sync didn't work or returned zero, try direct API
            console.log("Trying fix-points API endpoint with force refresh...")
            const response = await fetch(`/api/fix-points?userId=${userId}&force=true`, {
              method: 'GET',
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate'
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log("Points sync API result:", data);
              
              if (data.success && data.totalPoints > 0) {
                console.log(`Points updated via API: ${data.totalPoints}`)
                setCurrentPoints(data.totalPoints);
                
                toast({
                  title: "تم تحديث الرصيد",
                  description: `رصيدك الآن: ${data.totalPoints} نقطة`,
                })
                return
              } else {
                console.warn("API returned success but points still zero or invalid")
              }
            } else {
              console.error("API call failed:", response.status)
            }
            
            // If we get here, both methods failed - try one last direct refresh
            await new Promise(resolve => setTimeout(resolve, 500)); // Short delay
            
            // Final attempt - direct RPC call
            console.log("Final attempt - direct RPC call")
            const freshSupabase = createClient();
            const { data: pointsData, error: pointsError } = await freshSupabase.rpc('get_user_points_balance', {
              user_id_param: userId
            });
            
            if (!pointsError && pointsData !== null && pointsData > 0) {
              console.log("Fresh points balance:", pointsData);
              setCurrentPoints(pointsData);
              
              toast({
                title: "تم تحديث الرصيد",
                description: `رصيدك الآن: ${pointsData} نقطة`,
              })
              return
            }
            
            // If all methods failed, log diagnostic info and refresh page
            console.log("All points sync methods failed - diagnostic info:")
            console.log("- User ID:", userId)
            console.log("- Card code:", result.points || "unknown")
            console.log("- Current points state:", currentPoints)
            
            toast({
              title: "تم الشحن لكن لم يتم تحديث الرصيد",
              description: "سيتم تحديث الصفحة لعرض الرصيد الجديد",
                  variant: "default",
                })
            
            // Last resort - force browser refresh after a delay
                setTimeout(() => {
                  router.refresh()
                }, 1500)
          } catch (syncErr) {
            console.error("Error syncing points:", syncErr)
            // Force refresh as last resort
            router.refresh()
              }
        }
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
            label={`تحديث الرصيد (${currentPoints})`}
            showSuccessToast={true}
            confirmDialog={true}
            id="force-sync-button"
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
              </div>
              <div className="flex items-center gap-2">
                <div className="text-3xl font-bold">{currentPoints} نقطة</div>
                {userId && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => fetchPoints()}
                    disabled={isLoading}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
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