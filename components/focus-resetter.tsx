"use client"

import { useEffect } from "react"
import { setupFocusManagement } from "@/lib/utils/focus-management"

export function FocusResetter() {
  useEffect(() => {
    // Apply the focus management utility to fix alt-tab issues
    setupFocusManagement()
  }, [])
  
  return null
} 