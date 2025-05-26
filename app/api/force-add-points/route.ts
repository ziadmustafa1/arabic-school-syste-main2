import { NextRequest, NextResponse } from 'next/server'
import { addPointsDirectly } from './handler'

export async function GET(request: NextRequest) {
  try {
    // Get userId from query params
    const userId = request.nextUrl.searchParams.get('userId')
    const points = Number(request.nextUrl.searchParams.get('points') || '0')
    const cardCode = request.nextUrl.searchParams.get('cardCode')
    
    // Debug log all parameters
    console.log("force-add-points API params:", { 
      userId, 
      points, 
      cardCode,
      rawUrl: request.nextUrl.toString()
    })
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' }, 
        { status: 400 }
      )
    }

    if (points <= 0) {
      return NextResponse.json(
        { success: false, error: 'Points must be greater than 0' }, 
        { status: 400 }
      )
    }

    // Use the shared handler function
    const result = await addPointsDirectly(userId, points, cardCode);
    
    // If result indicates failure, return error
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error adding points from API:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to add points' },
      { status: 500 }
    )
  }
} 