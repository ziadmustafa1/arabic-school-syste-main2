"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"

export function ThemeToggleFix() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  // Only render after component mounts to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
    
    // Try to force a theme reload when component mounts
    const currentTheme = localStorage.getItem("theme") || "light"
    document.documentElement.classList.remove("light", "dark")
    
    if (currentTheme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.add("light")
    }
    
    setTheme(currentTheme)
  }, [setTheme])

  if (!mounted) return null

  // Simple toggle function that directly manipulates the DOM in addition to using next-themes
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    
    // Update local storage
    localStorage.setItem("theme", newTheme)
    
    // Directly modify the document
    document.documentElement.classList.remove("light", "dark")
    document.documentElement.classList.add(newTheme)
    
    // Also use the next-themes API
    setTheme(newTheme)
  }

  return (
    <Button 
      variant="outline" 
      size="icon" 
      onClick={toggleTheme}
      className="bg-background"
    >
      {theme === "light" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
      <span className="sr-only">تبديل الوضع (فاتح/داكن)</span>
    </Button>
  )
} 