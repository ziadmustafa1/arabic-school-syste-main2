-- Script to create attendance tables in the database

-- Table for attendance status codes (e.g., present, absent, late)
CREATE TABLE IF NOT EXISTS public.attendance_status (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  code VARCHAR(10) NOT NULL UNIQUE,
  description TEXT,
  is_present BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing attendance records
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id SERIAL PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.users(id),
  class_id INTEGER NOT NULL,
  status_id INTEGER REFERENCES public.attendance_status(id),
  date DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, class_id, date)
);

-- Table for class-teacher relationship
CREATE TABLE IF NOT EXISTS public.class_teacher (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL,
  teacher_id UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_id, teacher_id)
);

-- Table for class-student relationship
CREATE TABLE IF NOT EXISTS public.class_student (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_id, user_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_class ON public.attendance_records(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON public.attendance_records(date);

-- Insert default attendance statuses
INSERT INTO public.attendance_status (name, code, is_present, description) VALUES
('حاضر', 'present', true, 'الطالب حاضر في الفصل'),
('غائب', 'absent', false, 'الطالب غائب'),
('متأخر', 'late', true, 'الطالب حضر متأخراً'),
('مستأذن', 'excused', false, 'الطالب مستأذن بعذر'),
('مريض', 'sick', false, 'الطالب غائب بسبب المرض')
ON CONFLICT (code) DO NOTHING;

-- Add RLS policies
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_teacher ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_student ENABLE ROW LEVEL SECURITY;

-- Policies for attendance_status (viewable by all authenticated users)
CREATE POLICY attendance_status_select ON public.attendance_status
    FOR SELECT TO authenticated USING (true);

-- Policies for attendance_records
CREATE POLICY attendance_records_insert ON public.attendance_records 
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() IN (
        SELECT teacher_id FROM public.class_teacher WHERE class_id = attendance_records.class_id
    ) OR auth.role() = 'service_role');

CREATE POLICY attendance_records_select ON public.attendance_records 
    FOR SELECT TO authenticated 
    USING (
        -- Teachers can see records for their classes
        auth.uid() IN (SELECT teacher_id FROM public.class_teacher WHERE class_id = attendance_records.class_id)
        -- Students can see their own records
        OR auth.uid() = student_id 
        -- Parents can see their children's records
        OR auth.uid() IN (SELECT parent_id FROM public.parent_student WHERE student_id = attendance_records.student_id)
        -- Admins can see all
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role_id = 4)
    );

CREATE POLICY attendance_records_update ON public.attendance_records 
    FOR UPDATE TO authenticated 
    USING (
        auth.uid() IN (SELECT teacher_id FROM public.class_teacher WHERE class_id = attendance_records.class_id)
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role_id = 4)
    );

-- Policies for class_teacher
CREATE POLICY class_teacher_select ON public.class_teacher
    FOR SELECT TO authenticated USING (true);

-- Policies for class_student
CREATE POLICY class_student_select ON public.class_student
    FOR SELECT TO authenticated USING (true);
