import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="container mx-auto py-6 text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
      <p className="mt-2">جاري تحميل المحادثة...</p>
    </div>
  )
} 