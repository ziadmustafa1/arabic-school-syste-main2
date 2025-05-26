import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const regularClient = await createClient();
    
    // Check regular session
    const { data: sessionData, error: sessionError } = await regularClient.auth.getSession();
    
    // Try to get current user
    const { data: userData, error: userError } = await regularClient.auth.getUser();
    
    // Check if session exists in a consistent way
    const sessionExists = !!(sessionData?.session?.user?.id);
    
    // Try to get users table count
    let userCount = null;
    let userCountError = null;
    
    try {
      const { count, error } = await regularClient
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      userCount = count;
      userCountError = error;
    } catch (err) {
      userCountError = `Error: ${err instanceof Error ? err.message : String(err)}`;
    }
    
    // Try admin client
    let adminWorks = false;
    let adminError = null;
    let adminUserCount = null;
    
    try {
      const adminClient = await createAdminClient();
      const { count, error } = await adminClient
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      adminWorks = !error;
      adminUserCount = count;
      adminError = error;
    } catch (err) {
      adminError = `Error: ${err instanceof Error ? err.message : String(err)}`;
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      auth: {
        sessionExists,
        hasUser: !!userData?.user,
        userId: userData?.user?.id || null,
        sessionError: sessionError ? sessionError.message : null
      },
      database: {
        canAccessUsers: userCount !== null,
        userCount,
        userCountError: userCountError ? String(userCountError) : null
      },
      adminClient: {
        works: adminWorks,
        userCount: adminUserCount,
        error: adminError ? String(adminError) : null
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Unhandled error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 