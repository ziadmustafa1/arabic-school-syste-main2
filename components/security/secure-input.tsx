"use client"

import React, { useState, ChangeEvent, InputHTMLAttributes } from 'react'
import { Input } from '@/components/ui/input'

interface SecureInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  /**
   * Callback for when the input changes
   */
  onChange?: (value: string) => void;
  
  /**
   * Whether to sanitize HTML and script tags
   */
  sanitize?: boolean;
  
  /**
   * Custom sanitization function
   */
  customSanitizer?: (value: string) => string;
}

/**
 * A secure input component that sanitizes input
 */
export function SecureInput({
  sanitize = true,
  customSanitizer,
  onChange,
  ...props
}: SecureInputProps) {
  const [value, setValue] = useState(props.defaultValue?.toString() || '')
  
  /**
   * Default sanitizer function
   */
  const defaultSanitizer = (input: string): string => {
    if (!sanitize) return input
    
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .replace(/data:/gi, '')
      .trim()
  }
  
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    
    // Apply custom sanitizer if provided, otherwise use default
    const sanitizedValue = customSanitizer 
      ? customSanitizer(rawValue) 
      : defaultSanitizer(rawValue)
    
    setValue(sanitizedValue)
    
    if (onChange) {
      onChange(sanitizedValue)
    }
  }
  
  return (
    <Input
      {...props}
      value={value}
      onChange={handleChange}
    />
  )
} 