"use server"

import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import fs from 'fs'
import path from 'path'
import { cookies } from 'next/headers'

// This API route should only be called by admins
export async function POST() {
  try {
    console.log("Creating exec_sql function...")
    
    // Read the SQL file content
    const sqlFilePath = path.join(process.cwd(), 'app/api/schema/exec-sql-function.sql')
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8')
    
    // Create admin client with database access
    const supabase = await createAdminClient()
    
    // Create a redirect API route instead of trying to execute SQL directly
    // The API will instruct the admin on how to add the function
    return NextResponse.json({
      success: false,
      error: "Database function exec_sql is missing",
      instructions: "Please execute the following SQL in your Supabase database SQL editor:",
      sql: sqlContent
    }, { status: 200 })
  } catch (error: any) {
    console.error("Unexpected error creating exec_sql function:", error)
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
} 