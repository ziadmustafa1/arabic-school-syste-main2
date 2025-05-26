"use client"

import { SchemaFixer } from "@/components/admin/schema-fixer"
import { Card, CardDescription, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Database, WrenchIcon } from "lucide-react"

export default function AdminDebugPage() {
  return (
    <div className="container max-w-6xl py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">أدوات التحكم والتصحيح</h1>
        <p className="text-muted-foreground">أدوات للمسؤولين لتصحيح المشاكل وتشخيصها</p>
      </div>

      <Tabs defaultValue="database">
        <TabsList className="mb-4">
          <TabsTrigger value="database">قاعدة البيانات</TabsTrigger>
          <TabsTrigger value="system">النظام</TabsTrigger>
          <TabsTrigger value="logs">السجلات</TabsTrigger>
        </TabsList>
        
        <TabsContent value="database" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SchemaFixer />
            
            <Card>
              <CardHeader>
                <CardTitle>معلومات قاعدة البيانات</CardTitle>
                <CardDescription>
                  معلومات عامة حول قاعدة البيانات
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-md flex items-start gap-3">
                    <Database className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-yellow-800">إصلاح دالة exec_sql</h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        أداة خاصة لإصلاح دالة قاعدة البيانات الضرورية لتشغيل الإشعارات والرسائل.
                        إذا كنت تواجه مشاكل مع الإشعارات أو الرسائل، استخدم هذه الأداة.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild>
                  <Link href="/admin/database">
                    <WrenchIcon className="h-4 w-4 mr-2" />
                    إصلاح دوال قاعدة البيانات
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>معلومات النظام</CardTitle>
              <CardDescription>
                ستظهر هنا معلومات النظام المفصلة
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
        
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>سجلات النظام</CardTitle>
              <CardDescription>
                ستظهر هنا سجلات النظام المفصلة
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 