import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = await createAdminClient();

    // Create the deduction_cards table using PostgreSQL functions
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS deduction_cards (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          color TEXT,
          description TEXT,
          negative_points_threshold INTEGER NOT NULL,
          deduction_percentage INTEGER NOT NULL,
          active_duration_days INTEGER NOT NULL DEFAULT 0,
          active_duration_hours INTEGER NOT NULL DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
        );
      `
    });

    // Create the user_deduction_cards table
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS user_deduction_cards (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          deduction_card_id UUID NOT NULL REFERENCES deduction_cards(id) ON DELETE CASCADE,
          negative_points_count INTEGER NOT NULL DEFAULT 0,
          activated_at TIMESTAMP WITH TIME ZONE,
          expires_at TIMESTAMP WITH TIME ZONE,
          is_active BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
        );
      `
    });

    // Create indexes
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_user_deduction_cards_user_id ON user_deduction_cards(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_deduction_cards_deduction_card_id ON user_deduction_cards(deduction_card_id);
        CREATE INDEX IF NOT EXISTS idx_user_deduction_cards_is_active ON user_deduction_cards(is_active);
      `
    });

    // Create updated_at trigger function
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `
    });

    // Create triggers
    await supabase.rpc('exec_sql', {
      sql: `
        DROP TRIGGER IF EXISTS update_deduction_cards_updated_at ON deduction_cards;
        CREATE TRIGGER update_deduction_cards_updated_at
        BEFORE UPDATE ON deduction_cards
        FOR EACH ROW
        EXECUTE PROCEDURE update_updated_at_column();
        
        DROP TRIGGER IF EXISTS update_user_deduction_cards_updated_at ON user_deduction_cards;
        CREATE TRIGGER update_user_deduction_cards_updated_at
        BEFORE UPDATE ON user_deduction_cards
        FOR EACH ROW
        EXECUTE PROCEDURE update_updated_at_column();
      `
    });

    // Setup RLS policies
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE deduction_cards ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Admins can do everything on deduction_cards" ON deduction_cards;
        CREATE POLICY "Admins can do everything on deduction_cards" ON deduction_cards
          FOR ALL USING (
            auth.uid() IN (
              SELECT id FROM users WHERE role_id = 4
            )
          );
        
        DROP POLICY IF EXISTS "Teachers can view deduction_cards" ON deduction_cards;
        CREATE POLICY "Teachers can view deduction_cards" ON deduction_cards
          FOR SELECT USING (
            auth.uid() IN (
              SELECT id FROM users WHERE role_id = 3
            )
          );
        
        DROP POLICY IF EXISTS "Students and Parents can view active deduction_cards" ON deduction_cards;
        CREATE POLICY "Students and Parents can view active deduction_cards" ON deduction_cards
          FOR SELECT USING (
            is_active = TRUE AND
            auth.uid() IN (
              SELECT id FROM users WHERE role_id IN (1, 2)
            )
          );
        
        ALTER TABLE user_deduction_cards ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Admins can do everything on user_deduction_cards" ON user_deduction_cards;
        CREATE POLICY "Admins can do everything on user_deduction_cards" ON user_deduction_cards
          FOR ALL USING (
            auth.uid() IN (
              SELECT id FROM users WHERE role_id = 4
            )
          );
        
        DROP POLICY IF EXISTS "Teachers can view and manage user_deduction_cards" ON user_deduction_cards;
        CREATE POLICY "Teachers can view and manage user_deduction_cards" ON user_deduction_cards
          FOR ALL USING (
            auth.uid() IN (
              SELECT id FROM users WHERE role_id = 3
            )
          );
        
        DROP POLICY IF EXISTS "Students can view their own deduction cards" ON user_deduction_cards;
        CREATE POLICY "Students can view their own deduction cards" ON user_deduction_cards
          FOR SELECT USING (
            auth.uid() = user_id AND
            auth.uid() IN (
              SELECT id FROM users WHERE role_id = 1
            )
          );
        
        DROP POLICY IF EXISTS "Parents can view their children's deduction cards" ON user_deduction_cards;
        CREATE POLICY "Parents can view their children's deduction cards" ON user_deduction_cards
          FOR SELECT USING (
            auth.uid() IN (
              SELECT p.parent_id FROM parent_student p
              JOIN users u ON u.id = p.student_id
              WHERE u.id = user_deduction_cards.user_id
            ) AND
            auth.uid() IN (
              SELECT id FROM users WHERE role_id = 2
            )
          );
      `
    });

    return NextResponse.json({ success: true, message: 'Deduction cards schema created successfully' });
  } catch (error: any) {
    console.error('Error creating deduction cards schema:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
} 