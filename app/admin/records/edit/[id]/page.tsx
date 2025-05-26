"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Container } from "@/components/container"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { ChevronRight, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { updateRecord } from "@/lib/actions/records-client"
import { UserCombobox } from "@/components/ui/user-combobox"
import { TABLES } from "@/lib/constants"

// Record categories
const CATEGORIES = [
  { id: "تعليمي", name: "تعليمي" },
  { id: "مجتمعي", name: "مجتمعي" },
  { id: "احترافي", name: "احترافي" },
]

export default function EditRecordPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const recordId = params.id

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    points_value: "0",
    valid_from: new Date(),
    valid_until: null as Date | null,
    user_id: "",
    selected_user_name: ""
  })

  // Fetch record data on mount
  useEffect(() => {
    async function fetchRecord() {
      setIsLoading(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from(TABLES.USER_RECORDS)
          .select(`
            *,
            user:user_id (
              id,
              full_name
            )
          `)
          .eq('id', recordId)
          .single()
        
        if (error) throw error
        
        if (data) {
          setFormData({
            title: data.title || "",
            category: data.category || "",
            description: data.description || "",
            points_value: data.points_value.toString() || "0",
            valid_from: data.valid_from ? new Date(data.valid_from) : new Date(),
            valid_until: data.valid_until ? new Date(data.valid_until) : null,
            user_id: data.user_id || "",
            selected_user_name: data.user?.full_name || ""
          })
        }
      } catch (error) {
        console.error("Error fetching record:", error)
        toast.error("حدث خطأ أثناء جلب بيانات السجل")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchRecord()
  }, [recordId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!formData.title.trim()) {
        throw new Error("يرجى إدخال عنوان السجل")
      }

      if (!formData.category) {
        throw new Error("يرجى اختيار فئة السجل")
      }

      if (!formData.user_id) {
        throw new Error("يرجى اختيار المستخدم")
      }

      // Prepare record data
      const recordData = {
        id: recordId,
        title: formData.title,
        category: formData.category,
        description: formData.description || null,
        points_value: parseInt(formData.points_value) || 0,
        valid_from: formData.valid_from.toISOString(),
        valid_until: formData.valid_until ? formData.valid_until.toISOString() : null
      }

      // Update record using API endpoint
      const response = await fetch('/api/admin/records', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recordData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update record')
      }

      toast.success("تم تحديث السجل بنجاح")
      
      // Give a moment for the database to update
      await new Promise(resolve => setTimeout(resolve, 500))
      
      router.push("/admin/records")
      router.refresh() // Force Next.js to refresh the page data
    } catch (error: any) {
      console.error("Error updating record:", error)
      toast.error(error.message || "حدث خطأ أثناء تحديث السجل")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleDateChange = (field: "valid_from" | "valid_until", date: Date | null) => {
    setFormData(prev => ({ ...prev, [field]: date }))
  }

  const handleUserSelect = (userId: string, userName: string) => {
    setFormData(prev => ({ 
      ...prev, 
      user_id: userId,
      selected_user_name: userName
    }))
  }

  if (isLoading) {
    return (
      <Container>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </Container>
    )
  }

  return (
    <Container>
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/records">
              <ChevronRight className="h-4 w-4 ml-1" />
              العودة إلى السجلات
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>تعديل السجل</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user">المستخدم</Label>
                <UserCombobox 
                  onSelect={handleUserSelect} 
                  defaultValue={formData.user_id}
                />
                {formData.selected_user_name && (
                  <p className="text-sm text-muted-foreground">
                    المستخدم المحدد: {formData.selected_user_name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">عنوان السجل</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="أدخل عنوان السجل"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">الفئة</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر فئة السجل" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">الوصف (اختياري)</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="وصف السجل"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="points_value">قيمة النقاط</Label>
                <Input
                  id="points_value"
                  name="points_value"
                  type="number"
                  value={formData.points_value}
                  onChange={handleInputChange}
                  min="1"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>تاريخ البداية</Label>
                  <DatePicker
                    selected={formData.valid_from}
                    onSelect={(date) => handleDateChange("valid_from", date)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>تاريخ الانتهاء (اختياري)</Label>
                  <DatePicker
                    selected={formData.valid_until}
                    onSelect={(date) => handleDateChange("valid_until", date)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2 space-x-reverse">
              <Button 
                variant="outline" 
                onClick={() => router.push("/admin/records")}
                type="button"
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري التحديث...
                  </>
                ) : (
                  "تحديث السجل"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </Container>
  )
} 