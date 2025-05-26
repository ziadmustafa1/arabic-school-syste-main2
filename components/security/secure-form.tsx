"use client"

import React, { FormHTMLAttributes, FormEvent, useState } from 'react'
import { CSRFToken } from './csrf-token'
import { CSRF_CONFIG } from '@/lib/security/config'

interface SecureFormProps extends Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  /**
   * Function to handle form submission
   */
  onSubmit: (formData: FormData) => Promise<void> | void;
  
  /**
   * CSRF token to use if not reading from cookie
   */
  csrfToken?: string;
  
  /**
   * Whether to validate input on submission
   */
  validateInput?: boolean;
  
  /**
   * Whether to disable the form during submission
   */
  disableDuringSubmit?: boolean;
  
  /**
   * Component to show when form is submitting
   */
  loadingComponent?: React.ReactNode;
}

/**
 * A secure form component that adds CSRF protection and input validation
 */
export function SecureForm({
  children,
  onSubmit,
  csrfToken,
  validateInput = true,
  disableDuringSubmit = true,
  loadingComponent,
  ...props
}: SecureFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  /**
   * Basic input sanitization to prevent XSS
   */
  const sanitizeFormData = (formData: FormData): FormData => {
    if (!validateInput) return formData
    
    const sanitizedFormData = new FormData()
    
    for (const [key, value] of formData.entries()) {
      // Skip files and CSRF token, only sanitize string values
      if (
        value instanceof File || 
        key === CSRF_CONFIG.HEADER_NAME || 
        typeof value !== 'string'
      ) {
        sanitizedFormData.append(key, value)
        continue
      }
      
      // Sanitize string values
      const sanitized = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim()
        
      sanitizedFormData.append(key, sanitized)
    }
    
    return sanitizedFormData
  }
  
  /**
   * Add CSRF header to fetch requests
   */
  const addCsrfToFetch = () => {
    // Store the original fetch function
    const originalFetch = window.fetch
    
    // Replace with our custom function that adds the CSRF header
    window.fetch = function(input, init) {
      // Get CSRF token
      const token = document.querySelector(`input[name="${CSRF_CONFIG.HEADER_NAME}"]`)?.getAttribute('value')
      
      if (token) {
        // Create headers if they don't exist
        if (!init) init = {}
        if (!init.headers) init.headers = {}
        
        // Add CSRF header
        Object.assign(init.headers, {
          [CSRF_CONFIG.HEADER_NAME]: token
        })
      }
      
      // Call the original fetch with our modified init
      return originalFetch(input, init)
    }
  }
  
  // Override fetch to include CSRF tokens
  React.useEffect(() => {
    addCsrfToFetch()
  }, [])
  
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    try {
      setIsSubmitting(true)
      
      // Get form data
      const formData = new FormData(e.currentTarget)
      
      // Sanitize if needed
      const processedData = sanitizeFormData(formData)
      
      // Call the onSubmit handler
      await onSubmit(processedData)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <form {...props} onSubmit={handleSubmit}>
      <CSRFToken token={csrfToken} />
      {disableDuringSubmit && isSubmitting ? (
        <>
          {loadingComponent || (
            <div className="w-full flex justify-center items-center my-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
          <fieldset disabled className="contents">
            {children}
          </fieldset>
        </>
      ) : (
        children
      )}
    </form>
  )
} 