-- ============================================================
-- TaskMaster Database Schema for Supabase (PostgreSQL)
-- Implements complete relational schema for small team task management
-- ============================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 2. Create Tables
-- ============================================================

-- 2.1 Users table (Integrates with Supabase Auth)
CREATE TABLE IF NOT EXISTS public."Users" (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    "Name" TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT, -- For schema completeness; Supabase Auth manages encrypted auth.users
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.2 Skills table
CREATE TABLE IF NOT EXISTS public."Skills" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.3 UsersSkills junction table
CREATE TABLE IF NOT EXISTS public."UsersSkills" (
    "User_Id" UUID NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    "Skill_Id" UUID NOT NULL REFERENCES public."Skills"(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY ("User_Id", "Skill_Id")
);

-- 2.4 Projects table
CREATE TABLE IF NOT EXISTS public."Projects" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.5 Status table
CREATE TABLE IF NOT EXISTS public."Status" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#64748b',
    position INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.6 TaskTypes table
CREATE TABLE IF NOT EXISTS public."TaskTypes" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.7 Tasks core table
CREATE TABLE IF NOT EXISTS public."Tasks" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status_id UUID REFERENCES public."Status"(id) ON DELETE SET NULL,
    "Task_Parent_Id" UUID REFERENCES public."Tasks"(id) ON DELETE CASCADE,
    "Project_id" UUID REFERENCES public."Projects"(id) ON DELETE SET NULL,
    position INT DEFAULT 0,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.8 TasksUsers junction table for assignments
CREATE TABLE IF NOT EXISTS public."TasksUsers" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Task_Id" UUID NOT NULL REFERENCES public."Tasks"(id) ON DELETE CASCADE,
    "User_Id" UUID NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'assignee',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_task_user UNIQUE ("Task_Id", "User_Id")
);

-- 2.9 TaskTypes_Tasks junction table
CREATE TABLE IF NOT EXISTS public."TaskTypes_Tasks" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Task_Id" UUID NOT NULL REFERENCES public."Tasks"(id) ON DELETE CASCADE,
    "TaskType_Id" UUID NOT NULL REFERENCES public."TaskTypes"(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_task_type UNIQUE ("Task_Id", "TaskType_Id")
);

-- 2.10 Resources table
CREATE TABLE IF NOT EXISTS public."Resources" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    "Task_Id" UUID NOT NULL REFERENCES public."Tasks"(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.11 Files table (Links to Supabase Storage)
CREATE TABLE IF NOT EXISTS public."Files" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Url" TEXT NOT NULL,
    "Resource_Id" UUID NOT NULL REFERENCES public."Resources"(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.12 Softwares table
CREATE TABLE IF NOT EXISTS public."Softwares" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    icon_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.13 Tasks_Softwares junction table
CREATE TABLE IF NOT EXISTS public."Tasks_Softwares" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Task_Id" UUID NOT NULL REFERENCES public."Tasks"(id) ON DELETE CASCADE,
    "Software_Id" UUID NOT NULL REFERENCES public."Softwares"(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_task_software UNIQUE ("Task_Id", "Software_Id")
);

-- ============================================================
-- 3. Indexes for High Performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_status_id ON public."Tasks"(status_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public."Tasks"("Project_id");
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON public."Tasks"("Task_Parent_Id");
CREATE INDEX IF NOT EXISTS idx_tasks_users_task_id ON public."TasksUsers"("Task_Id");
CREATE INDEX IF NOT EXISTS idx_tasks_users_user_id ON public."TasksUsers"("User_Id");
CREATE INDEX IF NOT EXISTS idx_tasktypes_tasks_task_id ON public."TaskTypes_Tasks"("Task_Id");
CREATE INDEX IF NOT EXISTS idx_tasks_softwares_task_id ON public."Tasks_Softwares"("Task_Id");
CREATE INDEX IF NOT EXISTS idx_tasks_softwares_software_id ON public."Tasks_Softwares"("Software_Id");
CREATE INDEX IF NOT EXISTS idx_resources_task_id ON public."Resources"("Task_Id");
CREATE INDEX IF NOT EXISTS idx_files_resource_id ON public."Files"("Resource_Id");

-- ============================================================
-- 4. Automatic User Sync Trigger from Supabase Auth
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public."Users" (id, "Name", email, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        "Name" = EXCLUDED."Name",
        email = EXCLUDED.email,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public."Users".avatar_url),
        updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 5. Supabase Storage Bucket Setup
-- ============================================================
-- Create bucket for task attachments if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies
DROP POLICY IF EXISTS "Public task attachments access" ON storage.objects;
CREATE POLICY "Public task attachments access" ON storage.objects
    FOR SELECT USING (bucket_id = 'task-attachments');

DROP POLICY IF EXISTS "Authenticated users can upload task attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload task attachments" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'task-attachments');

DROP POLICY IF EXISTS "Authenticated users can delete task attachments" ON storage.objects;
CREATE POLICY "Authenticated users can delete task attachments" ON storage.objects
    FOR DELETE USING (bucket_id = 'task-attachments');

-- ============================================================
-- 6. Row Level Security (RLS) Policies
-- ============================================================
ALTER TABLE public."Users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Skills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UsersSkills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Status" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TaskTypes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TasksUsers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TaskTypes_Tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Resources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Softwares" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Tasks_Softwares" ENABLE ROW LEVEL SECURITY;

-- Allow team full access on all tables
DROP POLICY IF EXISTS "Team access Users" ON public."Users";
CREATE POLICY "Team access Users" ON public."Users" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Team access Skills" ON public."Skills";
CREATE POLICY "Team access Skills" ON public."Skills" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Team access UsersSkills" ON public."UsersSkills";
CREATE POLICY "Team access UsersSkills" ON public."UsersSkills" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Team access Projects" ON public."Projects";
CREATE POLICY "Team access Projects" ON public."Projects" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Team access Status" ON public."Status";
CREATE POLICY "Team access Status" ON public."Status" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Team access TaskTypes" ON public."TaskTypes";
CREATE POLICY "Team access TaskTypes" ON public."TaskTypes" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Team access Tasks" ON public."Tasks";
CREATE POLICY "Team access Tasks" ON public."Tasks" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Team access TasksUsers" ON public."TasksUsers";
CREATE POLICY "Team access TasksUsers" ON public."TasksUsers" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Team access TaskTypes_Tasks" ON public."TaskTypes_Tasks";
CREATE POLICY "Team access TaskTypes_Tasks" ON public."TaskTypes_Tasks" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Team access Resources" ON public."Resources";
CREATE POLICY "Team access Resources" ON public."Resources" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Team access Files" ON public."Files";
CREATE POLICY "Team access Files" ON public."Files" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Team access Softwares" ON public."Softwares";
CREATE POLICY "Team access Softwares" ON public."Softwares" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Team access Tasks_Softwares" ON public."Tasks_Softwares";
CREATE POLICY "Team access Tasks_Softwares" ON public."Tasks_Softwares" FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 7. Seed Initial Data (Default Statuses, Types, Project)
-- ============================================================
INSERT INTO public."Status" (name, description, color, position)
VALUES 
    ('Backlog', 'Tasks awaiting prioritization or grooming', '#64748b', 0),
    ('To Do', 'Ready to start development', '#3b82f6', 1),
    ('In Progress', 'Actively being worked on', '#f59e0b', 2),
    ('In Review', 'Code review, testing or client feedback', '#8b5cf6', 3),
    ('Done', 'Completed and verified', '#10b981', 4)
ON CONFLICT (name) DO UPDATE 
SET color = EXCLUDED.color, position = EXCLUDED.position;

INSERT INTO public."TaskTypes" (name, color)
VALUES
    ('Feature', '#3b82f6'),
    ('Bug', '#ef4444'),
    ('Improvement', '#10b981'),
    ('Design', '#ec4899'),
    ('Documentation', '#8b5cf6')
ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color;

INSERT INTO public."Skills" (name)
VALUES
    ('Frontend (React / Next.js)'),
    ('Backend (Node / Supabase)'),
    ('UI/UX Design'),
    ('Database & SQL'),
    ('DevOps & CI/CD'),
    ('QA & Testing')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public."Projects" (name, description)
SELECT 'TaskMaster Sprint 1', 'Main sprint for building the TaskMaster single-page Kanban application'
WHERE NOT EXISTS (SELECT 1 FROM public."Projects" WHERE name = 'TaskMaster Sprint 1');

INSERT INTO public."Softwares" (name, icon_url)
VALUES
    ('Blender', 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/blender/blender-original.svg'),
    ('Figma', 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/figma/figma-original.svg'),
    ('Photoshop', 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/photoshop/photoshop-plain.svg'),
    ('VS Code', 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vscode/vscode-original.svg'),
    ('Unreal Engine', 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/unrealengine/unrealengine-original.svg'),
    ('Illustrator', 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/illustrator/illustrator-plain.svg')
ON CONFLICT (name) DO NOTHING;


