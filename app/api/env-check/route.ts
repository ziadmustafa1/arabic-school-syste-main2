import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if necessary environment variables are defined
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY 
      ? 'Defined (value hidden for security)' 
      : 'Not set';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? 'Defined (value hidden for security)'
      : 'Not set';
    
    // Return information about environment variables (without exposing sensitive values)
    return NextResponse.json({
      environment: process.env.NODE_ENV,
      supabaseUrl,
      serviceRoleKey,
      anonKey,
      allEnvKeys: Object.keys(process.env).filter(key => 
        key.includes('SUPABASE') || 
        key.includes('DATABASE') || 
        key.includes('NEXT_PUBLIC')
      )
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
} 