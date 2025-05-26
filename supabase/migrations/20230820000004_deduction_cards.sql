-- Create the deduction_cards table
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

-- Create the user_deduction_cards table for tracking assigned cards
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_deduction_cards_user_id ON user_deduction_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_deduction_cards_deduction_card_id ON user_deduction_cards(deduction_card_id);
CREATE INDEX IF NOT EXISTS idx_user_deduction_cards_is_active ON user_deduction_cards(is_active);

-- Create functions to automatically update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_deduction_cards_updated_at
BEFORE UPDATE ON deduction_cards
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_deduction_cards_updated_at
BEFORE UPDATE ON user_deduction_cards
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Create RLS policies for deduction_cards
ALTER TABLE deduction_cards ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can do everything on deduction_cards" ON deduction_cards
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role_id = 4
    )
  );

-- Teachers can view deduction_cards
CREATE POLICY "Teachers can view deduction_cards" ON deduction_cards
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role_id = 3
    )
  );

-- Students and parents can view active deduction_cards
CREATE POLICY "Students and Parents can view active deduction_cards" ON deduction_cards
  FOR SELECT USING (
    is_active = TRUE AND
    auth.uid() IN (
      SELECT id FROM users WHERE role_id IN (1, 2)
    )
  );

-- RLS policies for user_deduction_cards
ALTER TABLE user_deduction_cards ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can do everything on user_deduction_cards" ON user_deduction_cards
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role_id = 4
    )
  );

-- Teachers can view and manage user_deduction_cards
CREATE POLICY "Teachers can view and manage user_deduction_cards" ON user_deduction_cards
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role_id = 3
    )
  );

-- Students can view their own deduction cards
CREATE POLICY "Students can view their own deduction cards" ON user_deduction_cards
  FOR SELECT USING (
    auth.uid() = user_id AND
    auth.uid() IN (
      SELECT id FROM users WHERE role_id = 1
    )
  );

-- Parents can view their children's deduction cards
CREATE POLICY "Parents can view their children's deduction cards" ON user_deduction_cards
  FOR SELECT USING (
    auth.uid() IN (
      SELECT p.parent_id FROM parent_students p
      JOIN users u ON u.id = p.student_id
      WHERE u.id = user_deduction_cards.user_id
    ) AND
    auth.uid() IN (
      SELECT id FROM users WHERE role_id = 2
    )
  ); 