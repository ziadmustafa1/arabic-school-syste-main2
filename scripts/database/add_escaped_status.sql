-- Script to add escaped status to the attendance system

-- Add new status for "هارب" (escaped/left early)
INSERT INTO public.attendance_status (name, code, is_present, description) VALUES
('هارب', 'escaped', false, 'الطالب غادر الفصل بدون إذن')
ON CONFLICT (code) DO NOTHING;

-- If you're running this script manually, you can uncomment this to verify:
-- SELECT * FROM public.attendance_status; 