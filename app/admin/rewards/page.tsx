"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { createReward, updateReward, deleteReward } from "@/app/actions/rewards"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Plus, Pencil, Trash2, Gift, Filter, Upload, Image, X, AlertCircle, ExternalLink } from "lucide-react"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Reward {
  id: number
  name: string
  description: string | null
  points_cost: number
  available_quantity: number
  image_url: string | null
  role_id: number | null
  created_at: string
  updated_at: string
}

interface Role {
  id: number
  name: string
}

export default function AdminRewardsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingReward, setEditingReward] = useState<Reward | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    points_cost: 100,
    available_quantity: 10,
    image_url: "",
    role_id: null as number | null,
  })
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all")
  const [activeTab, setActiveTab] = useState<string>("url")
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isImageValid, setIsImageValid] = useState<boolean | null>(null)
  const [isValidating, setIsValidating] = useState<boolean>(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchRewards()
    fetchRoles()
  }, [])

  // Add a function to validate image URL
  const validateImageUrl = async (url: string) => {
    if (!url) {
      setIsImageValid(null)
      setPreviewImage(null)
      setImageError(null)
      return
    }
    
    setIsValidating(true)
    setImageError(null)
    
    try {
      // Create a new image element to test the URL
      const img = new Image()
      img.onload = () => {
        setIsImageValid(true)
        setPreviewImage(url)
        setIsValidating(false)
      }
      img.onerror = () => {
        setIsImageValid(false)
        setPreviewImage(null)
        setImageError("تعذر تحميل الصورة من هذا الرابط. تأكد من أن الرابط صحيح ويشير إلى صورة.")
        setIsValidating(false)
      }
      img.src = url
    } catch (error) {
      setIsImageValid(false)
      setPreviewImage(null)
      setImageError("حدث خطأ أثناء التحقق من الصورة")
      setIsValidating(false)
    }
  }

  // Add handler for image URL changes
  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setFormData({ ...formData, image_url: url })
    validateImageUrl(url)
  }

  // Add handler for file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "نوع ملف غير صالح",
        description: "يرجى اختيار ملف صورة صالح (JPG, PNG, GIF)",
        variant: "destructive",
      })
      return
    }
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "حجم الملف كبير جدًا",
        description: "يجب أن لا يتجاوز حجم الصورة 2 ميجابايت",
        variant: "destructive",
      })
      return
    }
    
    try {
      setIsValidating(true)
      
      // Create a preview URL for the image
      const objectUrl = URL.createObjectURL(file)
      setPreviewImage(objectUrl)
      
      // Upload the file to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
      const filePath = `rewards/${fileName}`
      
      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, file, { upsert: true })
      
      if (error) {
        throw error
      }
      
      // Get the public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath)
      
      // Update form data with the new image URL
      setFormData({ ...formData, image_url: publicUrl })
      setIsImageValid(true)
      setImageError(null)
      
      toast({
        title: "تم رفع الصورة بنجاح",
        description: "تم رفع الصورة وإضافة الرابط إلى النموذج",
      })
    } catch (error: any) {
      console.error("Error uploading file:", error)
      setPreviewImage(null)
      setIsImageValid(false)
      setImageError(error.message || "حدث خطأ أثناء رفع الصورة")
      toast({
        title: "خطأ في رفع الصورة",
        description: error.message || "حدث خطأ أثناء رفع الصورة",
        variant: "destructive",
      })
    } finally {
      setIsValidating(false)
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // Clear image preview and URL
  const clearImage = () => {
    setPreviewImage(null)
    setFormData({ ...formData, image_url: "" })
    setIsImageValid(null)
    setImageError(null)
  }

  const fetchRewards = async () => {
    setIsLoading(true)
    const { data, error } = await supabase.from("rewards").select("*").order("created_at", { ascending: false })
    setIsLoading(false)

    if (error) {
      toast({
        title: "خطأ في جلب المكافآت",
        description: error.message,
        variant: "destructive",
      })
      return
    }

    setRewards(data || [])
  }

  const fetchRoles = async () => {
    const { data, error } = await supabase.from("roles").select("*")

    if (error) {
      toast({
        title: "خطأ في جلب الأدوار",
        description: error.message,
        variant: "destructive",
      })
      return
    }

    setRoles(data || [])
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: parseInt(value) || 0 })
  }

  const handleRoleChange = (value: string) => {
    const roleId = value === "null" ? null : parseInt(value)
    setFormData({ ...formData, role_id: roleId })
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      points_cost: 100,
      available_quantity: 10,
      image_url: "",
      role_id: null,
    })
    setEditingReward(null)
    setPreviewImage(null)
    setIsImageValid(null)
    setImageError(null)
    setActiveTab("url")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formDataObj = new FormData()

      if (editingReward) {
        formDataObj.append("id", editingReward.id.toString())
      }

      formDataObj.append("name", formData.name)
      formDataObj.append("description", formData.description)
      formDataObj.append("points_cost", formData.points_cost.toString())
      formDataObj.append("available_quantity", formData.available_quantity.toString())
      formDataObj.append("image_url", formData.image_url)
      
      if (formData.role_id !== null) {
        formDataObj.append("role_id", formData.role_id.toString())
      }

      let result
      if (editingReward) {
        result = await updateReward(formDataObj)
      } else {
        result = await createReward(formDataObj)
      }

      if (result.success) {
        toast({
          title: editingReward ? "تم تحديث المكافأة" : "تم إنشاء المكافأة",
          description: result.message,
        })

        fetchRewards()
        setIsDialogOpen(false)
        resetForm()
      } else {
        toast({
          title: "خطأ",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const formDataObj = new FormData()
      formDataObj.append("id", id.toString())

      const result = await deleteReward(formDataObj)

      if (result.success) {
        toast({
          title: "تم حذف المكافأة",
          description: result.message,
        })

        fetchRewards()
      } else {
        toast({
          title: "خطأ في حذف المكافأة",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleEdit = (reward: Reward) => {
    setEditingReward(reward)
    setFormData({
      name: reward.name,
      description: reward.description || "",
      points_cost: reward.points_cost,
      available_quantity: reward.available_quantity,
      image_url: reward.image_url || "",
      role_id: reward.role_id,
    })
    
    // If there's an image URL, validate and preview it
    if (reward.image_url) {
      validateImageUrl(reward.image_url)
    }
    
    setIsDialogOpen(true)
  }

  const getRoleName = (roleId: number | null) => {
    if (roleId === null) return "جميع الأدوار"
    const role = roles.find((r) => r.id === roleId)
    return role ? role.name : "غير معروف"
  }

  const getRoleBadgeVariant = (roleId: number | null) => {
    if (roleId === null) return "default"
    switch (roleId) {
      case 1: return "secondary" // طالب
      case 2: return "destructive" // ولي أمر
      case 3: return "outline" // معلم
      case 4: return "default" // مدير
      default: return "default"
    }
  }

  const filteredRewards = selectedRoleFilter === "all" 
    ? rewards 
    : selectedRoleFilter === "null" 
      ? rewards.filter(reward => reward.role_id === null) 
      : rewards.filter(reward => reward.role_id === parseInt(selectedRoleFilter))

  // Function to render the image preview
  const renderImagePreview = () => {
    if (isValidating) {
      return (
        <div className="w-full h-40 flex items-center justify-center border rounded-md bg-muted/30">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">جاري التحقق من الصورة...</span>
        </div>
      )
    }
    
    if (previewImage) {
      return (
        <div className="relative w-full">
          <div className="relative w-full h-48 rounded-md overflow-hidden border">
            <img 
              src={previewImage} 
              alt="معاينة الصورة" 
              className="w-full h-full object-contain"
            />
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            className="absolute top-2 right-2 rounded-full bg-white shadow-sm"
            onClick={clearImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )
    }
    
    return null
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">إدارة المكافآت</h1>
        
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="ml-2 h-4 w-4" />
                إضافة مكافأة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    {editingReward ? "تعديل المكافأة" : "إضافة مكافأة جديدة"}
                  </DialogTitle>
                  <DialogDescription>
                    أدخل تفاصيل المكافأة أدناه. اضغط على حفظ عند الانتهاء.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">اسم المكافأة</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">وصف المكافأة</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="points_cost">تكلفة النقاط</Label>
                    <Input
                      id="points_cost"
                      name="points_cost"
                      type="number"
                      min="1"
                      value={formData.points_cost}
                      onChange={handleNumberChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="available_quantity">الكمية المتاحة</Label>
                    <Input
                      id="available_quantity"
                      name="available_quantity"
                      type="number"
                      min="0"
                      value={formData.available_quantity}
                      onChange={handleNumberChange}
                      required
                    />
                  </div>
                  
                  {/* Image Upload Section */}
                  <div className="space-y-3">
                    <Label>صورة المكافأة</Label>
                    
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="url" className="flex items-center gap-1">
                          <ExternalLink className="h-4 w-4" />
                          رابط صورة
                        </TabsTrigger>
                        <TabsTrigger value="upload" className="flex items-center gap-1">
                          <Upload className="h-4 w-4" />
                          رفع صورة
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="url" className="pt-3">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                    <Input
                      id="image_url"
                      name="image_url"
                      value={formData.image_url}
                              onChange={handleImageUrlChange}
                      placeholder="https://example.com/image.jpg"
                              className={isImageValid === false ? "border-destructive" : ""}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => validateImageUrl(formData.image_url)}
                              disabled={!formData.image_url || isValidating}
                            >
                              {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : "تحقق"}
                            </Button>
                          </div>
                          
                          {imageError && (
                            <Alert variant="destructive" className="p-3">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>{imageError}</AlertDescription>
                            </Alert>
                          )}
                          
                          {renderImagePreview()}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="upload" className="pt-3">
                        <div className="space-y-3">
                          <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-md p-6 bg-muted/30">
                            <Image className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground mb-2">اسحب الصورة هنا أو انقر للاختيار</p>
                            <p className="text-xs text-muted-foreground mb-4">JPG, PNG, GIF (الحد الأقصى 2MB)</p>
                            <input
                              type="file"
                              accept="image/*"
                              ref={fileInputRef}
                              onChange={handleFileUpload}
                              className="hidden"
                              id="file-upload"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isValidating}
                            >
                              {isValidating ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                                  جاري الرفع...
                                </>
                              ) : (
                                <>
                                  <Upload className="h-4 w-4 ml-2" />
                                  اختر ملف
                                </>
                              )}
                            </Button>
                          </div>
                          
                          {renderImagePreview()}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role_id">الدور المستهدف</Label>
                    <Select
                      value={formData.role_id === null ? "null" : formData.role_id.toString()}
                      onValueChange={handleRoleChange}
                    >
                      <SelectTrigger id="role_id">
                        <SelectValue placeholder="اختر الدور" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">جميع الأدوار</SelectItem>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      اختر الدور المستهدف للمكافأة. إذا تركت هذا الحقل فارغاً، ستكون المكافأة متاحة لجميع الأدوار.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      إلغاء
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        جاري الحفظ...
                      </>
                    ) : (
                      "حفظ"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Select value={selectedRoleFilter} onValueChange={setSelectedRoleFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="تصفية حسب الدور" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المكافآت</SelectItem>
              <SelectItem value="null">المكافآت العامة</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id.toString()}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRewards.length > 0 ? (
            <Table>
              <TableCaption>قائمة المكافآت المتاحة في النظام</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>اسم المكافأة</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>النقاط</TableHead>
                  <TableHead>الكمية</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead>الصورة</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRewards.map((reward, index) => (
                  <TableRow key={reward.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{reward.name}</TableCell>
                    <TableCell>{reward.description || "-"}</TableCell>
                    <TableCell>{reward.points_cost}</TableCell>
                    <TableCell>{reward.available_quantity}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(reward.role_id)}>
                        {getRoleName(reward.role_id)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {reward.image_url ? (
                        <div className="relative h-10 w-10 rounded overflow-hidden">
                          <img 
                            src={reward.image_url} 
                            alt={reward.name} 
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "https://placehold.co/100x100?text=Error";
                              e.currentTarget.onerror = null;
                            }}
                          />
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleEdit(reward)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>هل أنت متأكد من حذف هذه المكافأة؟</AlertDialogTitle>
                              <AlertDialogDescription>
                                لا يمكن التراجع عن هذا الإجراء. سيتم حذف المكافأة نهائيًا من قاعدة البيانات.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(reward.id)}>
                                حذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Gift className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">لا توجد مكافآت</h3>
              <p className="text-muted-foreground">
                لم يتم العثور على أي مكافآت. انقر على "إضافة مكافأة جديدة" لإضافة مكافأة.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 