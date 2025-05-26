"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { transferPoints } from "@/app/actions/points"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { UserSelector } from "@/components/ui/user-selector"
import { createClient } from "@/lib/supabase/client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function TransferPointsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [userPoints, setUserPoints] = useState<number>(0)
  const [formData, setFormData] = useState({
    recipientId: "",
    recipientCode: "",
    points: "",
    description: "",
  })
  const [selectedUserCode, setSelectedUserCode] = useState<string | null>(null)
  const [transferStatus, setTransferStatus] = useState<{
    status: "idle" | "success" | "error";
    message: string;
  }>({ status: "idle", message: "" })

  // Fetch user's current points balance
  useEffect(() => {
    const fetchUserPoints = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data: pointsData, error: pointsError } = await supabase.rpc("get_user_points_balance", {
            user_id_param: user.id
          })
          
          if (pointsData !== null && !pointsError) {
            setUserPoints(pointsData)
          } else {
            console.error("Error fetching points balance:", pointsError)
            // Fallback to manual calculation
            const { data: transactions, error: txError } = await supabase
              .from("points_transactions")
              .select("points, is_positive")
              .eq("user_id", user.id)

            if (!txError && transactions) {
              const total = transactions.reduce((sum, tx) => 
                tx.is_positive ? sum + tx.points : sum - tx.points, 0)
              setUserPoints(total)
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user points:", error)
      }
    }
    
    fetchUserPoints()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleUserSelect = async (userId: string) => {
    setFormData((prev) => ({ ...prev, recipientId: userId }))
    
    // استرجاع رمز المستخدم بعد اختياره
    if (userId) {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from("users")
          .select("user_code")
          .eq("id", userId)
          .single()
          
        if (data && data.user_code) {
          setSelectedUserCode(data.user_code)
          setFormData((prev) => ({ ...prev, recipientCode: data.user_code }))
        }
      } catch (error) {
        console.error("Error fetching user code:", error)
      }
    } else {
      setSelectedUserCode(null)
      setFormData((prev) => ({ ...prev, recipientCode: "" }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setTransferStatus({ status: "idle", message: "" })

    try {
      const formDataObj = new FormData()
      formDataObj.append("recipientCode", formData.recipientCode)
      formDataObj.append("points", formData.points)
      formDataObj.append("description", formData.description)

      const result = await transferPoints(formDataObj)

      if (result.success) {
        // Show success notification
        setTransferStatus({
          status: "success",
          message: `تم تحويل ${formData.points} نقطة بنجاح إلى المستخدم ${formData.recipientCode}`
        })
        
        toast({
          title: "تم تحويل النقاط بنجاح",
          description: result.message,
        })
        
        // Update local points balance
        setUserPoints(prev => prev - parseInt(formData.points))
        
        // Reset form
        setFormData({
          recipientId: "",
          recipientCode: "",
          points: "",
          description: "",
        })
        setSelectedUserCode(null)
      } else {
        // Show error notification
        setTransferStatus({
          status: "error",
          message: result.message || "حدث خطأ أثناء تحويل النقاط"
        })
        
        toast({
          title: "خطأ في تحويل النقاط",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      setTransferStatus({
        status: "error",
        message: "حدث خطأ أثناء تحويل النقاط. يرجى المحاولة مرة أخرى."
      })
      
      toast({
        title: "خطأ في تحويل النقاط",
        description: "حدث خطأ أثناء تحويل النقاط. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">تحويل النقاط</h1>

      {/* Display current points balance */}
      <div className="mb-6 bg-muted/50 p-3 rounded-md max-w-md mx-auto">
        <p className="font-medium flex items-center justify-between">
          <span>رصيدك الحالي من النقاط:</span>
          <span className="text-xl font-bold text-primary">{userPoints}</span>
        </p>
      </div>

      {/* Display transfer status notification */}
      {transferStatus.status !== "idle" && (
        <Alert 
          variant={transferStatus.status === "success" ? "default" : "destructive"}
          className={`mb-6 max-w-md mx-auto ${transferStatus.status === "success" ? "border-green-500 bg-green-50" : ""}`}
        >
          {transferStatus.status === "success" ? 
            <CheckCircle className="h-4 w-4 ml-2" /> : 
            <AlertCircle className="h-4 w-4 ml-2" />
          }
          <AlertTitle>
            {transferStatus.status === "success" ? "تمت العملية بنجاح" : "خطأ في العملية"}
          </AlertTitle>
          <AlertDescription>
            {transferStatus.message}
          </AlertDescription>
        </Alert>
      )}

      <Card className="max-w-md mx-auto">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>تحويل النقاط إلى مستخدم آخر</CardTitle>
            <CardDescription>اختر المستخدم وعدد النقاط التي ترغب في تحويلها</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipientUser">المستخدم المستلم</Label>
              <UserSelector
                value={formData.recipientId}
                onChange={handleUserSelect}
                placeholder="اختر المستخدم المستلم"
                roles={[1, 2, 3]} // طلاب وأولياء أمور ومدرسين
              />
              {selectedUserCode && (
                <div className="mt-2 text-sm text-muted-foreground">
                  رمز المستخدم: <span className="font-medium">{selectedUserCode}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="points">عدد النقاط</Label>
              <Input
                id="points"
                name="points"
                type="number"
                min="1"
                max={userPoints.toString()}
                placeholder="أدخل عدد النقاط"
                required
                value={formData.points}
                onChange={handleChange}
              />
              {parseInt(formData.points) > userPoints && (
                <p className="text-sm text-destructive mt-1">
                  عدد النقاط يتجاوز رصيدك الحالي
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">الوصف (اختياري)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="سبب التحويل"
                value={formData.description}
                onChange={handleChange}
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col space-y-2">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={
                isLoading || 
                !formData.recipientCode || 
                parseInt(formData.points) <= 0 || 
                parseInt(formData.points) > userPoints
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري تحويل النقاط...
                </>
              ) : (
                "تحويل النقاط"
              )}
            </Button>
            {/* Add a home button in case the user doesn't want to be redirected automatically */}
            {transferStatus.status === "success" && (
              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={() => router.push("/student")}
              >
                العودة للصفحة الرئيسية
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
