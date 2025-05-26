"use client"

import { useState, useEffect } from "react"
import { getRedemptionsForAdmin, updateRedemptionStatus } from "@/app/actions/rewards"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Filter, CheckCircle, XCircle, Clock, Copy, Search } from "lucide-react"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Redemption {
  id: number
  user_id: string
  redemption_code: string
  status: string
  redeemed_at: string
  delivered_at: string | null
  admin_notes: string | null
  redeemed_value: number
  user: {
    id: string
    full_name: string
    email: string
    user_code: string
  }
  reward: {
    id: number
    name: string
    points_cost: number
    image_url: string | null
  }
}

export default function AdminRedemptionsPage() {
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState("pending")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedRedemption, setSelectedRedemption] = useState<Redemption | null>(null)
  const [adminNotes, setAdminNotes] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchRedemptions()
  }, [])

  useEffect(() => {
    console.log("selectedRedemption changed:", selectedRedemption?.id);
  }, [selectedRedemption]);

  const fetchRedemptions = async () => {
    setIsLoading(true)
    const result = await getRedemptionsForAdmin()
    setIsLoading(false)

    if (result.success) {
      setRedemptions(result.data)
    } else {
      toast({
        title: "خطأ في جلب الطلبات",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  const handleUpdateStatus = async (status: string) => {
    console.log("handleUpdateStatus called with status:", status)
    if (!selectedRedemption) {
      console.error("No redemption selected!")
      return
    }
    
    console.log("Submitting form data for redemption:", selectedRedemption.id)
    setIsSubmitting(true)
    const formData = new FormData()
    formData.append("redemptionId", selectedRedemption.id.toString())
    formData.append("status", status)
    formData.append("adminNotes", adminNotes)
    
    console.log("Calling updateRedemptionStatus with formData:", 
      Object.fromEntries(formData.entries()))
    
    try {
      const result = await updateRedemptionStatus(formData)
      console.log("updateRedemptionStatus returned:", result)
      
      setIsSubmitting(false)
      
      if (result.success) {
        toast({
          title: "تم تحديث الحالة",
          description: result.message,
        })
        fetchRedemptions()
        setSelectedRedemption(null)
        setAdminNotes("")
      } else {
        console.error("Error updating status:", result.message)
        toast({
          title: "خطأ في تحديث الحالة",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Exception in handleUpdateStatus:", error)
      setIsSubmitting(false)
      toast({
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء تحديث الحالة",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">قيد الانتظار</Badge>
      case "approved":
        return <Badge variant="outline" className="bg-green-100 text-green-800">تمت الموافقة</Badge>
      case "rejected":
        return <Badge variant="outline" className="bg-red-100 text-red-800">مرفوض</Badge>
      case "delivered":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">تم التسليم</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({
      title: "تم النسخ",
      description: "تم نسخ رمز الاستبدال إلى الحافظة",
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const filteredRedemptions = redemptions
    .filter(
      (redemption) =>
        (selectedTab === "all" || redemption.status === selectedTab) &&
        (searchQuery === "" ||
          redemption.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          redemption.redemption_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          redemption.user.user_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          redemption.reward.name.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => new Date(b.redeemed_at).getTime() - new Date(a.redeemed_at).getTime())

  return (
    <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold">إدارة طلبات استبدال المكافآت</h1>
          
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-2 pr-8"
              />
            </div>
            <Button onClick={fetchRedemptions} variant="outline">
              تحديث
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>طلبات الاستبدال</CardTitle>
            <CardDescription>إدارة طلبات استبدال المكافآت المقدمة من الطلاب</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-4">
                <TabsTrigger value="pending">
                  <Clock className="ml-2 h-4 w-4" />
                  قيد الانتظار
                </TabsTrigger>
                <TabsTrigger value="approved">
                  <CheckCircle className="ml-2 h-4 w-4" />
                  تمت الموافقة
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  <XCircle className="ml-2 h-4 w-4" />
                  مرفوض
                </TabsTrigger>
                <TabsTrigger value="delivered">
                  <CheckCircle className="ml-2 h-4 w-4" />
                  تم التسليم
                </TabsTrigger>
                <TabsTrigger value="all">
                  <Filter className="ml-2 h-4 w-4" />
                  الكل
                </TabsTrigger>
              </TabsList>

              <TabsContent value={selectedTab}>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredRedemptions.length > 0 ? (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[180px]">الطالب</TableHead>
                          <TableHead>المكافأة</TableHead>
                          <TableHead>رمز الاستبدال</TableHead>
                          <TableHead>القيمة</TableHead>
                          <TableHead>التاريخ</TableHead>
                          <TableHead>الحالة</TableHead>
                          <TableHead className="text-left">الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRedemptions.map((redemption) => (
                          <TableRow key={redemption.id}>
                            <TableCell>
                              <div className="font-medium">{redemption.user.full_name}</div>
                              <div className="text-sm text-muted-foreground">{redemption.user.user_code}</div>
                            </TableCell>
                            <TableCell>{redemption.reward.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <code className="bg-gray-100 rounded px-2 py-1 text-xs ml-2 font-mono">
                                  {redemption.redemption_code}
                                </code>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() => handleCopyCode(redemption.redemption_code)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>{redemption.redeemed_value} نقطة</TableCell>
                            <TableCell className="text-sm">{formatDate(redemption.redeemed_at)}</TableCell>
                            <TableCell>{getStatusBadge(redemption.status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {redemption.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => {
                                        console.log("Approve button clicked", redemption.id)
                                        setSelectedRedemption(redemption)
                                        setAdminNotes("")
                                      }}
                                    >
                                      موافقة
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        console.log("Reject button clicked", redemption.id)
                                        setSelectedRedemption(redemption)
                                        setAdminNotes("")
                                      }}
                                    >
                                      رفض
                                    </Button>
                                  </>
                                )}
                                {redemption.status === "approved" && (
                                  <Button
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700"
                                    onClick={() => {
                                      console.log("Deliver button clicked", redemption.id)
                                      setSelectedRedemption(redemption)
                                      setAdminNotes("")
                                    }}
                                  >
                                    تأكيد التسليم
                                  </Button>
                                )}
                                {redemption.admin_notes && (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button size="sm" variant="outline">
                                        ملاحظات
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>ملاحظات الإدارة</DialogTitle>
                                      </DialogHeader>
                                      <div className="p-4 bg-gray-50 rounded-md">
                                        {redemption.admin_notes}
                                      </div>
                                      <DialogFooter>
                                        <DialogClose asChild>
                                          <Button>إغلاق</Button>
                                        </DialogClose>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">لا توجد طلبات استبدال في هذه الحالة</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Approve/Reject Dialog */}
        <Dialog
          open={!!selectedRedemption}
          onOpenChange={(open) => {
            console.log("Dialog open state changed:", open, selectedRedemption?.id)
            if (!open) setSelectedRedemption(null)
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedRedemption?.status === "pending"
                  ? "تأكيد استبدال المكافأة"
                  : selectedRedemption?.status === "approved"
                  ? "تأكيد تسليم المكافأة"
                  : "تحديث حالة الاستبدال"}
              </DialogTitle>
              <DialogDescription>
                {selectedRedemption?.status === "pending" ? (
                  "هل أنت متأكد من موافقة أو رفض طلب استبدال المكافأة؟"
                ) : selectedRedemption?.status === "approved" ? (
                  "هل تم تسليم المكافأة للطالب؟"
                ) : (
                  "تحديث حالة طلب الاستبدال"
                )}
              </DialogDescription>
            </DialogHeader>

            {selectedRedemption && (
              <div className="py-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="font-semibold">الطالب:</p>
                    <p>{selectedRedemption.user.full_name}</p>
                  </div>
                  <div>
                    <p className="font-semibold">الكود:</p>
                    <p>{selectedRedemption.user.user_code}</p>
                  </div>
                  <div>
                    <p className="font-semibold">المكافأة:</p>
                    <p>{selectedRedemption.reward.name}</p>
                  </div>
                  <div>
                    <p className="font-semibold">القيمة:</p>
                    <p>{selectedRedemption.redeemed_value} نقطة</p>
                  </div>
                  <div className="col-span-2">
                    <p className="font-semibold">رمز الاستبدال:</p>
                    <div className="flex items-center">
                      <code className="bg-gray-100 rounded px-2 py-1 text-sm ml-2 font-mono">
                        {selectedRedemption.redemption_code}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => handleCopyCode(selectedRedemption.redemption_code)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <Label htmlFor="admin_notes">
                    {selectedRedemption.status === "pending"
                      ? "ملاحظات (اختياري)"
                      : "ملاحظات التسليم (اختياري)"}
                  </Label>
                  <Textarea
                    id="admin_notes"
                    placeholder="أضف ملاحظات إضافية هنا..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setSelectedRedemption(null)}>
                إلغاء
              </Button>
              {selectedRedemption && (
                <div className="flex gap-2">
                  {selectedRedemption.status === "pending" ? (
                    <>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          console.log("Rejection action clicked")
                          handleUpdateStatus("rejected")
                        }}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <XCircle className="h-4 w-4 ml-2" />}
                        رفض
                      </Button>
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          console.log("Approval action clicked")
                          handleUpdateStatus("approved")
                        }}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle className="h-4 w-4 ml-2" />}
                        موافقة
                      </Button>
                    </>
                  ) : selectedRedemption.status === "approved" ? (
                    <Button onClick={() => {
                      console.log("Delivery confirmation clicked")
                      handleUpdateStatus("delivered")
                    }} disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <CheckCircle className="h-4 w-4 ml-2" />}
                      تأكيد التسليم
                    </Button>
                  ) : null}
                </div>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  )
} 