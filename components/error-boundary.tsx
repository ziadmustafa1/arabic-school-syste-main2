"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Home, RefreshCw } from "lucide-react"

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Add error handler
    const errorHandler = (error: ErrorEvent) => {
      console.error("Error caught by boundary:", error)
      setHasError(true)
      setError(error.error)
    }

    // Listen for errors
    window.addEventListener("error", errorHandler)

    // Clean up
    return () => {
      window.removeEventListener("error", errorHandler)
    }
  }, [])

  const handleReset = () => {
    setHasError(false)
    setError(null)
    // Force refresh the component
    window.location.reload()
  }

  if (hasError) {
    if (fallback) return <>{fallback}</>

    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader className="text-red-700">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> حدث خطأ غير متوقع
            </CardTitle>
            <CardDescription>
              نعتذر، حدث خطأ أثناء عرض هذه الصفحة. يمكنك المحاولة مرة أخرى أو العودة للصفحة الرئيسية.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-900">
              {error ? error.message : "خطأ غير معروف"}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between gap-2">
            <Button variant="outline" onClick={handleReset} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" /> إعادة المحاولة
            </Button>
            <Button variant="default" onClick={() => window.location.href = "/"} className="flex-1">
              <Home className="mr-2 h-4 w-4" /> الصفحة الرئيسية
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

export function DefaultErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center p-4">
      <Card className="w-full max-w-md border-red-200">
        <CardHeader className="text-red-700">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" /> حدث خطأ غير متوقع
          </CardTitle>
          <CardDescription>
            نعتذر، حدث خطأ أثناء تحميل هذه الصفحة. يمكنك المحاولة مرة أخرى أو العودة للصفحة الرئيسية.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-900">{error.message}</div>
        </CardContent>
        <CardFooter className="flex justify-between gap-2">
          <Button variant="outline" onClick={reset} className="flex-1">
            <RefreshCw className="mr-2 h-4 w-4" /> إعادة المحاولة
          </Button>
          <Button variant="default" onClick={() => window.location.href = "/"} className="flex-1">
            <Home className="mr-2 h-4 w-4" /> الصفحة الرئيسية
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
} 