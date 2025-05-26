import { Loader2 } from "lucide-react"

interface LoadingProps {
  text?: string
  size?: "small" | "medium" | "large"
  fullScreen?: boolean
}

export function Loading({
  text = "جاري التحميل...",
  size = "medium",
  fullScreen = false,
}: LoadingProps) {
  const sizeClasses = {
    small: "h-4 w-4",
    medium: "h-8 w-8",
    large: "h-12 w-12",
  }

  const renderLoader = () => (
    <div className="flex flex-col items-center justify-center gap-2">
      <Loader2 className={`animate-spin text-primary ${sizeClasses[size]}`} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        {renderLoader()}
      </div>
    )
  }

  return <div className="flex w-full items-center justify-center p-4">{renderLoader()}</div>
} 