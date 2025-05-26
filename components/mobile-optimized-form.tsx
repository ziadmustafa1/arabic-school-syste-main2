"use client"

import type React from "react"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"

interface FormField {
  id: string
  label: string
  type: string
  placeholder?: string
  required?: boolean
  options?: { value: string; label: string }[]
  rows?: number
  description?: string
}

interface MobileOptimizedFormProps {
  fields: FormField[]
  onSubmit: (data: Record<string, string>) => void
  submitLabel: string
  isLoading?: boolean
}

export function MobileOptimizedForm({ fields, onSubmit, submitLabel, isLoading = false }: MobileOptimizedFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})

  // Memoize the fields to prevent unnecessary re-renders
  const memoizedFields = useMemo(() => fields, [fields])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }, [formData, onSubmit])

  const handleChange = useCallback((id: string, value: string) => {
    setFormData((prev) => {
      // Only update if the value has changed
      if (prev[id] === value) return prev
      return { ...prev, [id]: value }
    })
    
    setTouchedFields((prev) => {
      if (prev[id]) return prev
      return { ...prev, [id]: true }
    })
  }, [])

  const handleCheckboxChange = useCallback((id: string, checked: boolean) => {
    setFormData((prev) => {
      const newValue = checked ? "true" : "false"
      if (prev[id] === newValue) return prev
      return { ...prev, [id]: newValue }
    })
    
    setTouchedFields((prev) => {
      if (prev[id]) return prev
      return { ...prev, [id]: true }
    })
  }, [])

  const handleBlur = useCallback((id: string) => {
    setTouchedFields((prev) => {
      if (prev[id]) return prev
      return { ...prev, [id]: true }
    })
  }, [])

  // Memoize form field rendering for better performance
  const renderField = useCallback((field: FormField) => {
    const { id, type, label, placeholder, required, options, rows, description } = field
    
    return (
      <div key={id} className="space-y-2">
        <Label 
          htmlFor={id}
          className="text-base font-medium block mb-1.5"
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>

        {description && (
          <p className="text-sm text-muted-foreground mb-2">{description}</p>
        )}

        {type === "select" ? (
          <Select
            value={formData[id] || ""}
            onValueChange={(value) => handleChange(id, value)}
            required={required}
          >
            <SelectTrigger 
              id={id}
              className="h-12 text-base"
              aria-label={label}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options?.map((option) => (
                <SelectItem 
                  key={option.value} 
                  value={option.value}
                  className="text-base py-3"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : type === "textarea" ? (
          <Textarea
            id={id}
            placeholder={placeholder}
            value={formData[id] || ""}
            onChange={(e) => handleChange(id, e.target.value)}
            onBlur={() => handleBlur(id)}
            required={required}
            rows={rows || 3}
            className="text-base p-3 min-h-[100px]"
            aria-label={label}
            aria-required={required}
          />
        ) : type === "checkbox" ? (
          <div className="flex items-center space-x-2 h-12 py-3">
            <Checkbox
              id={id}
              checked={formData[id] === "true"}
              onCheckedChange={(checked) => handleCheckboxChange(id, checked as boolean)}
              className="h-5 w-5"
              aria-label={label}
              aria-required={required}
            />
            <label
              htmlFor={id}
              className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 pr-3"
            >
              {placeholder}
            </label>
          </div>
        ) : (
          <Input
            id={id}
            type={type}
            placeholder={placeholder}
            value={formData[id] || ""}
            onChange={(e) => handleChange(id, e.target.value)}
            onBlur={() => handleBlur(id)}
            required={required}
            className="h-12 text-base px-3"
            aria-label={label}
            aria-required={required}
            aria-invalid={required && touchedFields[id] && !formData[id] ? "true" : "false"}
          />
        )}
      </div>
    )
  }, [formData, touchedFields, handleChange, handleCheckboxChange, handleBlur])

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {memoizedFields.map(renderField)}
      <Button 
        type="submit" 
        className="w-full h-12 text-base mt-6" 
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            جاري التحميل...
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  )
}
