"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

interface FallbackPageProps {
  title?: string
  message?: string
  loading?: boolean
  error?: string | null
}

export default function FallbackPage({
  title = "جاري التحميل",
  message = "يرجى الانتظار بينما نقوم بتحميل البيانات...",
  loading = false,
  error = null
}: FallbackPageProps) {
  const router = useRouter()

  const handleRetry = () => {
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl text-center">
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{title}</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span>حدث خطأ</span>
              </div>
            ) : (
              title
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            {error || message}
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          {!loading && (
            <Button onClick={handleRetry} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
} 