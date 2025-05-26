import { NextRequest, NextResponse } from "next/server"

// Simple API to log debugging information
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    console.log("DEBUG LOG:", data)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in debug endpoint:", error)
    return NextResponse.json({ success: false, error: String(error) })
  }
}

// Also allow GET for simple checks
export async function GET() {
  console.log("DEBUG API endpoint called with GET")
  return NextResponse.json({ success: true, message: "Debug endpoint is working" })
} 