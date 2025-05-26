"use client"

import { useEffect, useState } from 'react'
import { CSRF_CONFIG } from '@/lib/security/config'

interface CSRFTokenProps {
  /** Optional override for token value */
  token?: string
}

/**
 * Component that adds a hidden CSRF token field to forms
 * 
 * Usage:
 * <form>
 *   <CSRFToken />
 *   ... other form fields ...
 * </form>
 */
export function CSRFToken({ token: initialToken }: CSRFTokenProps) {
  const [token, setToken] = useState<string | null>(initialToken || null)
  
  useEffect(() => {
    // Don't fetch token if it was provided as prop
    if (initialToken) return
    
    // Get CSRF token from cookie
    const getCsrfFromCookie = (): string | null => {
      const cookies = document.cookie.split(';')
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=')
        if (name === CSRF_CONFIG.COOKIE_NAME) {
          return decodeURIComponent(value)
        }
      }
      return null
    }
    
    // Use token from cookie
    const csrfToken = getCsrfFromCookie()
    if (csrfToken) {
      setToken(csrfToken)
    }
  }, [initialToken])
  
  if (!token) return null
  
  return (
    <input 
      type="hidden" 
      name={CSRF_CONFIG.HEADER_NAME} 
      value={token} 
    />
  )
} 