"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"

export function SchemaFixer() {
  const [results, setResults] = useState<Record<string, any> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const checkSchema = async () => {
    try {
      setIsChecking(true)
      setError(null)
      
      const response = await fetch('/api/schema/check')
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred')
      }
      
      setResults(data.results)
    } catch (err) {
      console.error("Error checking schema:", err)
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setIsChecking(false)
    }
  }

  const statusColors = {
    ok: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    fixed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    missing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  }
  
  const statusIcons = {
    ok: <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />,
    fixed: <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
    missing: <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />,
    error: <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>فحص وإصلاح قاعدة البيانات</CardTitle>
        <CardDescription>
          يمكنك استخدام هذه الأداة للتحقق من مشاكل قاعدة البيانات المعروفة وإصلاحها تلقائياً
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-4 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <p className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </p>
          </div>
        )}
        
        {results && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">نتائج الفحص:</h3>
            
            <div className="space-y-2">
              {Object.entries(results).map(([table, result]) => {
                const status = result.error ? 'error' : result.status
                return (
                  <div key={table} className="flex items-start gap-2 rounded-lg border p-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{table}</Badge>
                        <Badge className={statusColors[status as keyof typeof statusColors]}>
                          <span className="flex items-center gap-1">
                            {statusIcons[status as keyof typeof statusIcons]}
                            {status}
                          </span>
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {result.error || result.message}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={checkSchema}
          disabled={isChecking}
          className="w-full"
        >
          {isChecking ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              جاري فحص قاعدة البيانات...
            </>
          ) : (
            'فحص وإصلاح قاعدة البيانات'
          )}
        </Button>
      </CardFooter>
    </Card>
  )
} 