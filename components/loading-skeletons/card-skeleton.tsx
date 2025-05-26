import React, { memo } from 'react'
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface CardSkeletonProps {
  count?: number
  withHeader?: boolean
  withFooter?: boolean
  withImage?: boolean
  withAction?: boolean
  className?: string
}

interface TableSkeletonProps {
  rows?: number
  columns?: number
}

export const CardSkeleton = memo(function CardSkeleton({
  count = 1,
  withHeader = true,
  withFooter = false,
  withImage = false,
  withAction = false,
  className
}: CardSkeletonProps) {
  // Optimize DOM creation with single array generation
  const skeletons = React.useMemo(() => {
    return Array(count).fill(0).map((_, i) => (
      <Card key={i} className="overflow-hidden animate-pulse performance-paint">
        {withImage && (
          <div className="aspect-video bg-muted" />
        )}
        
        {withHeader && (
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
        )}
        
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </CardContent>
        
        {withFooter && (
          <CardFooter className="flex justify-between items-center">
            <Skeleton className="h-9 w-24 rounded-md" />
            {withAction && <Skeleton className="h-9 w-9 rounded-md" />}
          </CardFooter>
        )}
      </Card>
    ))
  }, [count, withHeader, withFooter, withImage, withAction])

  return (
    <div className={cn("grid gap-4", className, {
      "md:grid-cols-2 lg:grid-cols-3": count > 2,
      "md:grid-cols-2": count === 2
    })}>
      {skeletons}
    </div>
  )
})

export const TableSkeleton = memo(function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  // Pre-generate column and row arrays for better performance
  const columnArray = React.useMemo(() => Array(columns).fill(0), [columns])
  const rowArray = React.useMemo(() => Array(rows).fill(0), [rows])

  return (
    <div className="w-full border rounded-md overflow-hidden content-visibility-auto">
      <div className="bg-muted p-4">
        <div className="flex space-x-3 rtl:space-x-reverse">
          {columnArray.map((_, i) => (
            <Skeleton key={i} className="h-5 w-24" />
          ))}
        </div>
      </div>
      <div className="divide-y">
        {rowArray.map((_, i) => (
          <div key={i} className="p-4">
            <div className="flex justify-between items-center space-x-3 rtl:space-x-reverse">
              {columnArray.map((_, j) => (
                <Skeleton key={j} className={`h-4 ${j === 0 ? 'w-12' : j === columns - 1 ? 'w-16' : 'w-full'}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}) 