import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createAdminClient();

    // Check the notifications table schema
    const { data: schema, error: schemaError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'notifications'
        ORDER BY ordinal_position;
      `
    });

    if (schemaError) {
      return NextResponse.json({ error: schemaError.message }, { status: 500 });
    }

    // Get a sample of notifications data
    const { data: sample, error: sampleError } = await supabase
      .from('notifications')
      .select('*')
      .limit(5);

    if (sampleError) {
      return NextResponse.json({ error: sampleError.message }, { status: 500 });
    }

    return NextResponse.json({ schema, sample });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
