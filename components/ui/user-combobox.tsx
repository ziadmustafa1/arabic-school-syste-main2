"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { createClient } from "@/lib/supabase/client"

interface UserComboboxProps {
  onSelect: (userId: string, userName: string) => void
  defaultValue?: string
}

export function UserCombobox({ onSelect, defaultValue }: UserComboboxProps) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(defaultValue || "")
  const [users, setUsers] = useState<{id: string, full_name: string, user_code: string}[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, user_code')
          .order('full_name', { ascending: true })
          .limit(100)
        
        if (error) throw error
        
        setUsers(data || [])
      } catch (error) {
        console.error("Error fetching users:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchUsers()
  }, [])

  const filteredUsers = searchTerm 
    ? users.filter(user => 
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.user_code.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : users

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value
            ? users.find((user) => user.id === value)?.full_name
            : "اختر المستخدم..."}
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 shrink-0 opacity-50 animate-spin" />
          ) : (
            <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput 
            placeholder="ابحث عن مستخدم..." 
            onValueChange={(value) => setSearchTerm(value)}
          />
          {loading ? (
            <div className="flex justify-center items-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <CommandEmpty>لم يتم العثور على مستخدمين</CommandEmpty>
              <CommandGroup className="max-h-60 overflow-y-auto">
                {filteredUsers.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.id}
                    onSelect={() => {
                      setValue(user.id)
                      onSelect(user.id, user.full_name)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === user.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{user.full_name}</span>
                      <span className="text-xs text-muted-foreground">{user.user_code}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
} 