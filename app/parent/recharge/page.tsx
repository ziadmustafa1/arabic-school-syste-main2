"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { redeemRechargeCard } from "@/app/actions/points"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { CreditCard, Loader2, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PointsSyncButton } from "@/app/components/points-sync-button"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function ParentRechargePointsPage() {
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

      // Get user points balance using RPC
      const { data, error } = await supabase.rpc('get_user_points_balance', {
        user_id_param: userIdToUse
      })

      if (!error && data !== null) {
        console.log("Current points balance:", data)
        setCurrentPoints(data)
      } else {
        console.error("Error fetching points balance:", error)
        // Fallback to manual calculation
        const { data: transactions, error: txError } = await supabase
          .from("points_transactions")
          .select("points, is_positive")
          .eq("user_id", userIdToUse)

        if (!txError && transactions) {
          const total = transactions.reduce((sum, tx) => 
            tx.is_positive ? sum + tx.points : sum - tx.points, 0)
          console.log("Calculated points balance:", total)
          setCurrentPoints(total)
        }
      }
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

      const result = await redeemRechargeCard(formData)
      console.log("Redemption result:", result)

      if (result.success) {
        toast({
          title: "تم شحن الرصيد",
          description: result.message,
        })
        // Reset form
        setCardCode("")
        
        // Refresh points
        await fetchPoints()
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
    <DashboardLayout>
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
    </DashboardLayout>
  )
} 