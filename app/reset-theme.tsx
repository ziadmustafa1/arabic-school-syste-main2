"use client"

import { useEffect } from "react"

export function ResetTheme() {
  useEffect(() => {
    // Force light theme on page load
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
    
    // Save preference to local storage
    localStorage.setItem('theme', 'light')
    
    // Try to update any theme context
    try {
      const themeContext = window.__NEXT_DATA__?.props?.pageProps?.theme
      if (themeContext) {
        themeContext.forcedTheme = 'light'
      }
    } catch (e) {
      console.error('Error updating theme context:', e)
    }
  }, [])
  
  return null
} 