import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="container mx-auto py-8 text-center">
      <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
      <p className="mt-4 text-lg">جاري تحميل المحادثات...</p>
    </div>
  )
}
