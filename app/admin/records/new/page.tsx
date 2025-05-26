"use client"

import { useState } from "react"
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
import { ChevronRight, Loader2, TrendingUp, TrendingDown } from "lucide-react"
import { toast } from "sonner"
import { UserCombobox } from "@/components/ui/user-combobox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

// Record categories
const CATEGORIES = [
  { id: "تعليمي", name: "تعليمي" },
  { id: "مجتمعي", name: "مجتمعي" },
  { id: "احترافي", name: "احترافي" },
  { id: "سلوكي", name: "سلوكي" },
]

export default function NewRecordPage() {
  const router = useRouter()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    points_value: "100",
    valid_from: new Date(),
    valid_until: null as Date | null,
    user_id: "",
    selected_user_name: "",
    is_positive: "true", // Default to positive
  })

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
        user_id: formData.user_id,
        title: formData.title,
        category: formData.category,
        description: formData.description || null,
        points_value: parseInt(formData.points_value) || 100,
        valid_from: formData.valid_from.toISOString(),
        valid_until: formData.valid_until ? formData.valid_until.toISOString() : null,
        is_positive: formData.is_positive === "true",
      }

      // Create record using API endpoint
      const response = await fetch('/api/admin/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recordData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create record')
      }

      toast.success("تم إنشاء السجل بنجاح")
      
      // Give a moment for the database to update
      await new Promise(resolve => setTimeout(resolve, 500))
      
      router.push("/admin/records")
      router.refresh() // Force Next.js to refresh the page data
    } catch (error: any) {
      console.error("Error creating record:", error)
      toast.error(error.message || "حدث خطأ أثناء إنشاء السجل")
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

  const handleRecordTypeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      is_positive: value
    }))
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
            <CardTitle>إنشاء سجل جديد</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user">المستخدم</Label>
                <UserCombobox onSelect={handleUserSelect} />
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
                <Label>نوع السجل</Label>
                <RadioGroup 
                  defaultValue={formData.is_positive} 
                  value={formData.is_positive}
                  onValueChange={handleRecordTypeChange}
                  className="flex flex-row space-x-4 space-x-reverse rtl:space-x-reverse"
                >
                  <div className="flex items-center space-x-2 space-x-reverse rtl:space-x-reverse">
                    <RadioGroupItem value="true" id="positive" />
                    <Label htmlFor="positive" className="flex items-center">
                      <TrendingUp className="h-4 w-4 ml-2 text-green-500" />
                      إيجابي (زيادة النقاط)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse rtl:space-x-reverse">
                    <RadioGroupItem value="false" id="negative" />
                    <Label htmlFor="negative" className="flex items-center">
                      <TrendingDown className="h-4 w-4 ml-2 text-red-500" />
                      سلبي (خصم النقاط)
                    </Label>
                  </div>
                </RadioGroup>
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
            <CardFooter>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full md:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  "إنشاء السجل"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </Container>
  )
} 