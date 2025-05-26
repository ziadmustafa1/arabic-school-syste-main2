"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { Loader2, User, Bell, Shield, Languages } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("account")
  
  const saveSettings = async () => {
    setLoading(true)
    // Simulate saving settings
    await new Promise(resolve => setTimeout(resolve, 1500))
    setLoading(false)
    toast({
      title: "تم حفظ الإعدادات",
      description: "تم حفظ إعدادات الحساب بنجاح",
    })
  }
  
  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold text-primary mb-2">الإعدادات</h1>
        <p className="text-muted-foreground mb-6">إدارة إعدادات الحساب والنظام</p>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-[400px] mb-8">
            <TabsTrigger value="account">الحساب</TabsTrigger>
            <TabsTrigger value="notifications">الإشعارات</TabsTrigger>
            <TabsTrigger value="security">الأمان والخصوصية</TabsTrigger>
          </TabsList>
          
          <TabsContent value="account">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    <span>معلومات الحساب</span>
                  </CardTitle>
                  <CardDescription>تعديل المعلومات الأساسية للحساب</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">الاسم الكامل</Label>
                    <Input id="name" placeholder="أدخل اسمك الكامل" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input id="email" type="email" placeholder="أدخل بريدك الإلكتروني" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الهاتف</Label>
                    <Input id="phone" type="tel" placeholder="أدخل رقم هاتفك" />
                  </div>
                  
                  <Button onClick={saveSettings} disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    حفظ التغييرات
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Languages className="h-5 w-5" />
                    <span>تفضيلات العرض</span>
                  </CardTitle>
                  <CardDescription>تعديل تفضيلات العرض واللغة</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">اللغة المفضلة</Label>
                    <Select defaultValue="ar">
                      <SelectTrigger id="language">
                        <SelectValue placeholder="اختر اللغة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">العربية</SelectItem>
                        <SelectItem value="en">الإنجليزية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="theme">المظهر</Label>
                    <Select defaultValue="light">
                      <SelectTrigger id="theme">
                        <SelectValue placeholder="اختر المظهر" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">فاتح</SelectItem>
                        <SelectItem value="dark">داكن</SelectItem>
                        <SelectItem value="system">حسب النظام</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Switch id="rtl" defaultChecked />
                    <Label htmlFor="rtl">استخدام واجهة من اليمين إلى اليسار (RTL)</Label>
                  </div>
                  
                  <Button onClick={saveSettings} disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    حفظ التفضيلات
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  <span>إعدادات الإشعارات</span>
                </CardTitle>
                <CardDescription>ضبط تفضيلات الإشعارات والتنبيهات</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">إشعارات النظام</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">الإشعارات داخل النظام</p>
                      <p className="text-sm text-muted-foreground">إظهار الإشعارات في لوحة التحكم</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">الإشعارات عبر البريد الإلكتروني</p>
                      <p className="text-sm text-muted-foreground">إرسال الإشعارات المهمة للبريد</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">أنواع الإشعارات</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">إشعارات الرسائل الجديدة</p>
                      <p className="text-sm text-muted-foreground">عند استلام رسالة جديدة</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">إشعارات المهام والواجبات</p>
                      <p className="text-sm text-muted-foreground">تنبيهات المهام الجديدة والمواعيد النهائية</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">إشعارات الأنشطة</p>
                      <p className="text-sm text-muted-foreground">أخبار وأنشطة المدرسة</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
                
                <Button onClick={saveSettings} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  حفظ إعدادات الإشعارات
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <span>الأمان والخصوصية</span>
                </CardTitle>
                <CardDescription>إدارة إعدادات الأمان وكلمة المرور</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">تغيير كلمة المرور</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="current-password">كلمة المرور الحالية</Label>
                    <Input id="current-password" type="password" placeholder="أدخل كلمة المرور الحالية" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
                    <Input id="new-password" type="password" placeholder="أدخل كلمة المرور الجديدة" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
                    <Input id="confirm-password" type="password" placeholder="أدخل كلمة المرور الجديدة مرة أخرى" />
                  </div>
                  
                  <Button>تغيير كلمة المرور</Button>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">إعدادات الخصوصية</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">السماح بظهور ملفي الشخصي للمستخدمين الآخرين</p>
                      <p className="text-sm text-muted-foreground">عرض معلوماتك الأساسية للآخرين</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">السماح بإظهار حالة الاتصال</p>
                      <p className="text-sm text-muted-foreground">إظهار متى تكون متصلاً على النظام</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
                
                <Button onClick={saveSettings} disabled={loading} className="mt-4">
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  حفظ إعدادات الأمان
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
} 