"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Database, RefreshCw, CheckCircle, AlertCircle } from "lucide-react"

export default function DatabaseAdminPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<{
    success: boolean;
    message: string;
    details: string[];
  } | null>(null)

  const runDatabaseMigration = async () => {
    setIsLoading(true)
    setResults(null)
    
    try {
      const response = await fetch('/api/admin/database/verify-messaging', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      setResults(data)
      
      if (data.success) {
        toast({
          title: "تم بنجاح",
          description: "تم إصلاح قاعدة البيانات بنجاح.",
          variant: "default",
        })
          } else {
        toast({
          title: "حدث خطأ",
          description: data.message || "حدث خطأ أثناء إصلاح قاعدة البيانات.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fixing database:", error)
      toast({
        title: "حدث خطأ",
        description: "حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      })
      setResults({
        success: false,
        message: "حدث خطأ أثناء الاتصال بالخادم",
        details: [error instanceof Error ? error.message : "خطأ غير معروف"]
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8 text-right">إصلاح قاعدة البيانات</h1>
      
      <div className="grid gap-6">
        <Card>
        <CardHeader>
            <CardTitle className="text-xl font-bold text-right">إصلاح جداول الرسائل</CardTitle>
            <CardDescription className="text-right">
              استخدم هذه الأداة لإصلاح مشاكل قاعدة البيانات المتعلقة بنظام الرسائل.
              سيتم التحقق من وجود الجداول والوظائف المطلوبة وإنشائها إذا لزم الأمر.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-md text-right">
                <p className="font-medium">تحذير</p>
                <p className="text-sm text-muted-foreground mt-1">
                  يرجى التأكد من عمل نسخة احتياطية من قاعدة البيانات قبل المتابعة.
                  قد تؤدي هذه العملية إلى تغييرات في هيكل قاعدة البيانات.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="flex-1"></div>
            <Button onClick={runDatabaseMigration} disabled={isLoading} className="min-w-[160px]">
              {isLoading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الإصلاح...
                </>
          ) : (
            <>
                  <Database className="ml-2 h-4 w-4" />
                  إصلاح قاعدة البيانات
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
        
        {results && (
          <Card className={results.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <CardHeader>
              <CardTitle className="flex text-right items-center text-xl font-bold">
                {results.success ? (
                  <CheckCircle className="ml-2 h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="ml-2 h-5 w-5 text-red-600" />
                )}
                {results.success ? "تم الإصلاح بنجاح" : "حدث خطأ أثناء الإصلاح"}
              </CardTitle>
              <CardDescription className="text-right">
                {results.message}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-right">
              <div className="space-y-2">
                <p className="font-medium">تفاصيل العملية:</p>
                <ul className="list-disc list-inside space-y-1">
                  {results.details.map((detail, idx) => (
                    <li key={idx} className="text-sm">{detail}</li>
                  ))}
                </ul>
              </div>
        </CardContent>
      </Card>
        )}
      </div>
    </div>
  )
} 