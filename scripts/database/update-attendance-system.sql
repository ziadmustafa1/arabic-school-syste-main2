-- Script to update the attendance system

-- Add new status for "هارب" (escaped/left early)
INSERT INTO public.attendance_status (name, code, is_present, description) VALUES
('هارب', 'escaped', false, 'الطالب غادر الفصل بدون إذن')
ON CONFLICT (code) DO NOTHING;

-- Add class_period field to attendance_records table
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS class_period VARCHAR(50);

-- Create index for faster queries on the period field
CREATE INDEX IF NOT EXISTS idx_attendance_records_period ON public.attendance_records(class_period);

-- Update the unique constraint to include class_period
ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_student_id_class_id_date_key;
ALTER TABLE public.attendance_records ADD CONSTRAINT attendance_records_student_id_class_id_date_period_key 
  UNIQUE(student_id, class_id, date, class_period);

-- Create table for school periods/sessions
CREATE TABLE IF NOT EXISTS public.class_periods (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default class periods
INSERT INTO public.class_periods (name, start_time, end_time, sort_order) VALUES
('الحصة الأولى', '08:00:00', '08:45:00', 1),
('الحصة الثانية', '08:55:00', '09:40:00', 2),
('الحصة الثالثة', '09:50:00', '10:35:00', 3),
('الحصة الرابعة', '10:45:00', '11:30:00', 4),
('الحصة الخامسة', '11:40:00', '12:25:00', 5),
('الحصة السادسة', '12:35:00', '13:20:00', 6),
('الحصة السابعة', '13:30:00', '14:15:00', 7)
ON CONFLICT DO NOTHING;

-- Add RLS policies
ALTER TABLE public.class_periods ENABLE ROW LEVEL SECURITY;

-- Policies for class_periods (viewable by all authenticated users)
CREATE POLICY class_periods_select ON public.class_periods
    FOR SELECT TO authenticated USING (true); 