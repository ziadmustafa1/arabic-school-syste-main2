"use client"

import { useEffect } from "react"
import { DefaultErrorComponent } from "@/components/error-boundary"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Unhandled error:", error)
  }, [error])

  return <DefaultErrorComponent error={error} reset={reset} />
} 