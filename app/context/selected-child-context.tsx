"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface SelectedChildContextType {
  selectedChild: { id: string, name?: string } | null
  setSelectedChild: (child: { id: string, name?: string } | null) => void
}

const SelectedChildContext = createContext<SelectedChildContextType | undefined>(undefined)

export function SelectedChildProvider({ children }: { children: ReactNode }) {
  const [selectedChild, setSelectedChild] = useState<{ id: string, name?: string } | null>(null)

  return (
    <SelectedChildContext.Provider value={{ selectedChild, setSelectedChild }}>
      {children}
    </SelectedChildContext.Provider>
  )
}

export function useSelectedChild() {
  const context = useContext(SelectedChildContext)
  if (context === undefined) {
    throw new Error("useSelectedChild must be used within a SelectedChildProvider")
  }
  return context
} 