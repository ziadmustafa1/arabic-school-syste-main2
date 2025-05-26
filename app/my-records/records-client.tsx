"use client"

import { useState } from "react"
import { format, isAfter, isBefore, parseISO } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Trophy, Award, Medal, Calendar, Search } from "lucide-react"
import Link from "next/link"

type Record = {
  id: number
  record_code: string
  title: string
  category: string
  description: string | null
  points_value: number
  valid_from: string
  valid_until: string | null
  created_at: string
}

interface RecordsClientProps {
  records: Record[]
  userId: string
}

export function RecordsClient({ records, userId }: RecordsClientProps) {
  const [searchTerm, setSearchTerm] = useState("")

  // Get unique categories
  const categories = Array.from(new Set(records.map(record => record.category)))

  // Filter records by search term
  const filteredRecords = records.filter(record => 
    record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.record_code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "تعليمي":
        return <Award className="h-5 w-5" />
      case "مجتمعي":
        return <Trophy className="h-5 w-5" />
      case "احترافي":
        return <Medal className="h-5 w-5" />
      default:
        return <Award className="h-5 w-5" />
    }
  }

  // Check if record is active
  const isRecordActive = (record: Record) => {
    const now = new Date()
    const validFrom = parseISO(record.valid_from)
    const validUntil = record.valid_until ? parseISO(record.valid_until) : null
    
    if (isBefore(now, validFrom)) {
      return false
    }
    
    if (validUntil && isAfter(now, validUntil)) {
      return false
    }
    
    return true
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="البحث في السجلات..."
          className="max-w-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">الكل</TabsTrigger>
          {categories.map((category) => (
            <TabsTrigger key={category} value={category}>
              {category}
            </TabsTrigger>
          ))}
          <TabsTrigger value="active">السارية</TabsTrigger>
          <TabsTrigger value="expired">المنتهية</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <RecordsList records={filteredRecords} />
        </TabsContent>

        {categories.map((category) => (
          <TabsContent key={category} value={category} className="space-y-4">
            <RecordsList 
              records={filteredRecords.filter(record => record.category === category)} 
            />
          </TabsContent>
        ))}

        <TabsContent value="active" className="space-y-4">
          <RecordsList 
            records={filteredRecords.filter(record => isRecordActive(record))} 
          />
        </TabsContent>

        <TabsContent value="expired" className="space-y-4">
          <RecordsList 
            records={filteredRecords.filter(record => !isRecordActive(record))} 
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function RecordsList({ records }: { records: Record[] }) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Trophy className="h-12 w-12 text-muted-foreground mb-2" />
        <h3 className="text-lg font-medium">لا توجد سجلات</h3>
        <p className="text-sm text-muted-foreground">
          لم يتم العثور على أي سجلات تطابق المعايير المحددة
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {records.map((record) => (
        <RecordCard key={record.id} record={record} />
      ))}
    </div>
  )
}

function RecordCard({ record }: { record: Record }) {
  // Define isRecordActive directly in this component
  const isRecordActive = (record: Record) => {
    const now = new Date()
    const validFrom = parseISO(record.valid_from)
    const validUntil = record.valid_until ? parseISO(record.valid_until) : null
    
    if (isBefore(now, validFrom)) {
      return false
    }
    
    if (validUntil && isAfter(now, validUntil)) {
      return false
    }
    
    return true
  }
  
  const isActive = isRecordActive(record)
  
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "تعليمي":
        return <Award className="h-5 w-5" />
      case "مجتمعي":
        return <Trophy className="h-5 w-5" />
      case "احترافي":
        return <Medal className="h-5 w-5" />
      default:
        return <Award className="h-5 w-5" />
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant={isActive ? "default" : "outline"}>
            {isActive ? "ساري" : "منتهي"}
          </Badge>
          <span className="text-xs font-medium text-muted-foreground">
            {record.record_code}
          </span>
        </div>
        <CardTitle className="text-lg mt-2">{record.title}</CardTitle>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          {getCategoryIcon(record.category)}
          <span>{record.category}</span>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        {record.description && (
          <p className="text-sm text-muted-foreground mb-4">
            {record.description}
          </p>
        )}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              من {format(parseISO(record.valid_from), "dd/MM/yyyy")}
              {record.valid_until && ` إلى ${format(parseISO(record.valid_until), "dd/MM/yyyy")}`}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t bg-muted/50 pt-2">
        <div className="flex items-center justify-between w-full">
          <span className="text-sm font-medium">{record.points_value} نقطة</span>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/my-records/${record.id}`}>عرض التفاصيل</Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
} 