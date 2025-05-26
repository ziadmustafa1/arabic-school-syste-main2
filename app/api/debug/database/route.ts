import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createAdminClient()
    const result: Record<string, any> = {}
    
    // Check for conversations table
    try {
      const { data: conversationsData, error: conversationsError } = await supabase
        .from("conversations")
        .select("count(*)")
        .limit(1)
        
      result.conversations = {
        exists: !conversationsError,
        error: conversationsError ? conversationsError.message : null,
        count: conversationsData?.[0]?.count || 0
      }
    } catch (error) {
      result.conversations = {
        exists: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
    
    // Check for user_messages table
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from("user_messages")
        .select("count(*)")
        .limit(1)
        
      result.user_messages = {
        exists: !messagesError,
        error: messagesError ? messagesError.message : null,
        count: messagesData?.[0]?.count || 0
      }
    } catch (error) {
      result.user_messages = {
        exists: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
    
    // Check exec_sql function
    try {
      const { data: execSqlData, error: execSqlError } = await supabase
        .rpc("exec_sql", { sql: "SELECT 1 as test" })
        
      result.exec_sql = {
        exists: !execSqlError,
        error: execSqlError ? execSqlError.message : null
      }
    } catch (error) {
      result.exec_sql = {
        exists: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
    
    return NextResponse.json({
      success: true,
      status: "Database diagnostic complete",
      issues_found: Object.values(result).some(item => !item.exists),
      result
    })
    
  } catch (error) {
    console.error("Database diagnostic error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }, { status: 500 })
  }
} 