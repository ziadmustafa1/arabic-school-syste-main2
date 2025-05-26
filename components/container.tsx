import { ReactNode } from "react"

interface ContainerProps {
  children: ReactNode
  className?: string
}

export function Container({ children, className = "" }: ContainerProps) {
  return (
    <div className={`container px-4 py-6 mx-auto max-w-7xl ${className}`}>
      {children}
    </div>
  )
} 