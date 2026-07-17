-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop old tables cleanly in order of foreign key dependencies
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.question_evaluations CASCADE;
DROP TABLE IF EXISTS public.evaluations CASCADE;
DROP TABLE IF EXISTS public.student_answers CASCADE;
DROP TABLE IF EXISTS public.answer_keys CASCADE;
DROP TABLE IF EXISTS public.submissions CASCADE;
DROP TABLE IF EXISTS public.exams CASCADE;
DROP TABLE IF EXISTS public.student_subjects CASCADE;
DROP TABLE IF EXISTS public.rubric_items CASCADE;
DROP TABLE IF EXISTS public.questions CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;
DROP TABLE IF EXISTS public.omr_papers CASCADE;
DROP TABLE IF EXISTS public.omr_templates CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 1. Users table (synced from auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY, -- Matches auth.users.id
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'professor')),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Subjects table (courses)
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'CS-301'
    name VARCHAR(255) NOT NULL,
    professor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subjects_professor_id ON public.subjects(professor_id);

-- 2.1. Questions table
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    question_code VARCHAR(50) NOT NULL, -- e.g. 'Q1'
    text TEXT NOT NULL,
    max_marks NUMERIC(5, 2) NOT NULL DEFAULT 10.0,
    model_answer TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (subject_id, question_code)
);

-- 2.2. Rubric items table
CREATE TABLE public.rubric_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    keyword VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    weight NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Student Subjects table (Enrollments join table)
CREATE TABLE public.student_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (student_id, subject_id)
);

-- 4. Exams table
CREATE TABLE public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    is_answer_key_confirmed BOOLEAN DEFAULT FALSE NOT NULL,
    answer_key_file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4.1. Answer Keys table (Professor Ground Truth)
CREATE TABLE public.answer_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    question_no INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    reference_answer TEXT NOT NULL,
    max_marks NUMERIC(5, 2) NOT NULL DEFAULT 10.0,
    extraction_confidence NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    source_image_region JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (exam_id, question_no)
);
CREATE INDEX IF NOT EXISTS idx_answer_keys_exam_id ON public.answer_keys(exam_id);

-- 4.2. Student Answers table (Student Extracted Text)
CREATE TABLE public.student_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    question_no INTEGER NOT NULL,
    student_answer TEXT NOT NULL,
    extraction_confidence NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    source_image_region JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (submission_id, question_no)
);
CREATE INDEX IF NOT EXISTS idx_student_answers_submission_id ON public.student_answers(submission_id);

-- 5. Submissions table
CREATE TABLE public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    professor_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Snapshotted server-side
    file_url TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('pdf', 'image', 'zip')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'released')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    evaluated_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_subject_id ON public.submissions(subject_id);
CREATE INDEX IF NOT EXISTS idx_submissions_prof_status ON public.submissions(professor_id, status);
CREATE INDEX IF NOT EXISTS idx_submissions_stud_status ON public.submissions(student_id, status);

-- 6. Evaluations table
CREATE TABLE public.evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID UNIQUE NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    professor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    total_marks NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    obtained_marks NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    overall_feedback TEXT NOT NULL DEFAULT '',
    released_at TIMESTAMP WITH TIME ZONE, -- NULL means draft mode
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Question Evaluations table
CREATE TABLE public.question_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
    question_no INTEGER NOT NULL,
    answer_key_id UUID REFERENCES public.answer_keys(id) ON DELETE CASCADE,
    student_answer_id UUID REFERENCES public.student_answers(id) ON DELETE CASCADE,
    student_answer TEXT NOT NULL,
    reference_answer TEXT NOT NULL,
    similarity_score NUMERIC(5, 2) DEFAULT 0.0,
    llm_completeness_notes TEXT DEFAULT '',
    ai_marks NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    professor_marks NUMERIC(5, 2), -- NULL means not yet reviewed/accepted
    feedback TEXT NOT NULL DEFAULT '',
    confidence NUMERIC(5, 2) NOT NULL DEFAULT 0.00
);

-- 8. Notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('submission_received', 'result_released')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. Audit Log table
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(100) NOT NULL,
    target_id UUID NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 10. OMR Templates table
CREATE TABLE public.omr_templates (
    template_id VARCHAR(50) PRIMARY KEY, -- e.g. 'OMR-101'
    title VARCHAR(255) NOT NULL,
    question_count INTEGER NOT NULL,
    marks_per_question NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
    negative_marks_per_question NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    answer_key JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 11. OMR Papers table
CREATE TABLE public.omr_papers (
    id VARCHAR(100) PRIMARY KEY,
    student_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    student_name VARCHAR(255) NOT NULL,
    student_id_code VARCHAR(100) NOT NULL,
    template_id VARCHAR(50) NOT NULL REFERENCES public.omr_templates(template_id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    submission_date VARCHAR(50) NOT NULL,
    image_path VARCHAR(255),
    selected_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    evaluation JSONB,
    evaluator_notes TEXT NOT NULL DEFAULT '',
    is_published BOOLEAN NOT NULL DEFAULT FALSE
);

-- ==========================================================================
-- Triggers & Sync Functions
-- ==========================================================================

-- Function to snapshot professor_id on submission creation
CREATE OR REPLACE FUNCTION public.snapshot_professor_id()
RETURNS trigger AS $$
BEGIN
  SELECT professor_id INTO NEW.professor_id 
  FROM public.subjects 
  WHERE id = NEW.subject_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to execute snapshotting
DROP TRIGGER IF EXISTS trg_snapshot_professor_id ON public.submissions;
CREATE TRIGGER trg_snapshot_professor_id
  BEFORE INSERT ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_professor_id();

-- Function to sync Supabase Auth users to public.users table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute auth user sync
DROP TRIGGER IF EXISTS trg_auth_user_created ON auth.users;
CREATE TRIGGER trg_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
