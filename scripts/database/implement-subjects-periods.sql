-- Script to implement the subject-period relationship

-- Create table for subjects if it doesn't exist already
CREATE TABLE IF NOT EXISTS public.subjects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  code VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create table for teacher-subject assignments
CREATE TABLE IF NOT EXISTS public.teacher_subjects (
  id SERIAL PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.users(id),
  subject_id INTEGER NOT NULL REFERENCES public.subjects(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(teacher_id, subject_id)
);

-- Create table for class schedule periods
CREATE TABLE IF NOT EXISTS public.class_schedule (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL REFERENCES public.subjects(id),
  teacher_id UUID NOT NULL REFERENCES public.users(id),
  period_id INTEGER NOT NULL REFERENCES public.class_periods(id),
  weekday SMALLINT NOT NULL, -- 0 = Sunday, 1 = Monday, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_id, period_id, weekday)
);

-- Modify attendance_records to include subject and teacher
ALTER TABLE public.attendance_records 
  ADD COLUMN IF NOT EXISTS subject_id INTEGER REFERENCES public.subjects(id),
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.users(id);

-- Create index for faster queries on the new columns
CREATE INDEX IF NOT EXISTS idx_attendance_records_subject ON public.attendance_records(subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_teacher ON public.attendance_records(teacher_id);

-- Add RLS policies for the new tables
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedule ENABLE ROW LEVEL SECURITY;

-- Policies for subjects (viewable by all authenticated users)
CREATE POLICY subjects_select ON public.subjects
    FOR SELECT TO authenticated USING (true);

-- Policies for teacher_subjects
CREATE POLICY teacher_subjects_select ON public.teacher_subjects
    FOR SELECT TO authenticated USING (true);

-- Policies for class_schedule
CREATE POLICY class_schedule_select ON public.class_schedule
    FOR SELECT TO authenticated USING (true);
CREATE POLICY class_schedule_insert ON public.class_schedule
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role_id = 4)
    );
CREATE POLICY class_schedule_update ON public.class_schedule
    FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role_id = 4)
    );
CREATE POLICY class_schedule_delete ON public.class_schedule
    FOR DELETE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role_id = 4)
    );

-- Insert some demo subjects if they don't exist
INSERT INTO public.subjects (name, description, code) 
VALUES 
('اللغة العربية', 'دروس في اللغة العربية والنحو والأدب', 'ARAB'),
('الرياضيات', 'دروس في الحساب والجبر والهندسة', 'MATH'),
('العلوم', 'دروس في العلوم الطبيعية والفيزياء والكيمياء', 'SCIE'),
('الدراسات الإسلامية', 'دروس في القرآن الكريم والسنة والفقه', 'ISLM'),
('اللغة الإنجليزية', 'دروس في اللغة الإنجليزية والقواعد والمحادثة', 'ENGL')
ON CONFLICT DO NOTHING;

-- Update the attendance API to include subject and teacher information
-- This will be done in the server-side code (actions/attendance.ts) 