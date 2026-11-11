-- ============================================================
-- Idea Board & Physical String Connections Migration
-- Run this script in the Supabase SQL Editor to enable database
-- persistence for TaskMaster Idea Boards.
-- ============================================================

-- 1. Create IdeaBoards table (Stores theme, nested boards, & preferences per project or global)
CREATE TABLE IF NOT EXISTS public."IdeaBoards" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public."Projects"(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Main Board',
    parent_board_id UUID REFERENCES public."IdeaBoards"(id) ON DELETE CASCADE,
    icon TEXT DEFAULT 'folder',
    theme TEXT NOT NULL DEFAULT 'cork',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Upgrade existing IdeaBoards table if columns are missing
ALTER TABLE public."IdeaBoards" ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Main Board';
ALTER TABLE public."IdeaBoards" ADD COLUMN IF NOT EXISTS parent_board_id UUID REFERENCES public."IdeaBoards"(id) ON DELETE CASCADE;
ALTER TABLE public."IdeaBoards" ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'folder';

-- Drop any single-board-per-project unique constraints/indexes to allow multiple nested boards per project
ALTER TABLE public."IdeaBoards" DROP CONSTRAINT IF EXISTS "IdeaBoards_project_id_key";
ALTER TABLE public."IdeaBoards" DROP CONSTRAINT IF EXISTS ideaboards_project_id_key;
DROP INDEX IF EXISTS public.idx_ideaboards_project_id;
CREATE INDEX IF NOT EXISTS idx_ideaboards_project_id ON public."IdeaBoards"(project_id);
CREATE INDEX IF NOT EXISTS idx_ideaboards_parent ON public."IdeaBoards"(parent_board_id);

-- 2. Create IdeaNotes table
CREATE TABLE IF NOT EXISTS public."IdeaNotes" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id UUID REFERENCES public."Projects"(id) ON DELETE CASCADE,
    board_id UUID REFERENCES public."IdeaBoards"(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'text',
    title TEXT NOT NULL DEFAULT 'New Idea',
    content TEXT DEFAULT '',
    file_url TEXT,
    file_name TEXT,
    file_size BIGINT,
    task_id UUID REFERENCES public."Tasks"(id) ON DELETE SET NULL,
    color TEXT NOT NULL DEFAULT 'yellow',
    pin_color TEXT NOT NULL DEFAULT 'red',
    x DOUBLE PRECISION NOT NULL DEFAULT 100,
    y DOUBLE PRECISION NOT NULL DEFAULT 100,
    width DOUBLE PRECISION NOT NULL DEFAULT 300,
    height DOUBLE PRECISION,
    is_scratched BOOLEAN DEFAULT FALSE,
    rotation DOUBLE PRECISION NOT NULL DEFAULT 0,
    z_index INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public."IdeaNotes" ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES public."IdeaBoards"(id) ON DELETE CASCADE;
ALTER TABLE public."IdeaNotes" ADD COLUMN IF NOT EXISTS height DOUBLE PRECISION;
ALTER TABLE public."IdeaNotes" ADD COLUMN IF NOT EXISTS is_scratched BOOLEAN DEFAULT FALSE;
ALTER TABLE public."IdeaNotes" ADD COLUMN IF NOT EXISTS sub_board_id UUID;
ALTER TABLE public."IdeaNotes" ADD COLUMN IF NOT EXISTS icon TEXT;

-- 3. Create IdeaStrings table (Physical string connections between notes)
CREATE TABLE IF NOT EXISTS public."IdeaStrings" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id UUID REFERENCES public."Projects"(id) ON DELETE CASCADE,
    board_id UUID REFERENCES public."IdeaBoards"(id) ON DELETE CASCADE,
    from_note_id TEXT NOT NULL REFERENCES public."IdeaNotes"(id) ON DELETE CASCADE,
    to_note_id TEXT NOT NULL REFERENCES public."IdeaNotes"(id) ON DELETE CASCADE,
    color TEXT NOT NULL DEFAULT 'red',
    label TEXT,
    tension TEXT NOT NULL DEFAULT 'normal',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_idea_string UNIQUE (from_note_id, to_note_id)
);

ALTER TABLE public."IdeaStrings" ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES public."IdeaBoards"(id) ON DELETE CASCADE;

-- 4. Create Indexes for High Performance
CREATE INDEX IF NOT EXISTS idx_ideaboards_project ON public."IdeaBoards"(project_id);
CREATE INDEX IF NOT EXISTS idx_ideanotes_project ON public."IdeaNotes"(project_id);
CREATE INDEX IF NOT EXISTS idx_ideanotes_task ON public."IdeaNotes"(task_id);
CREATE INDEX IF NOT EXISTS idx_ideastrings_project ON public."IdeaStrings"(project_id);
CREATE INDEX IF NOT EXISTS idx_ideastrings_from ON public."IdeaStrings"(from_note_id);
CREATE INDEX IF NOT EXISTS idx_ideastrings_to ON public."IdeaStrings"(to_note_id);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public."IdeaBoards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."IdeaNotes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."IdeaStrings" ENABLE ROW LEVEL SECURITY;

-- 6. Team Access Policies (Full access for team collaboration)
DROP POLICY IF EXISTS "Team access IdeaBoards" ON public."IdeaBoards";
CREATE POLICY "Team access IdeaBoards" ON public."IdeaBoards" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Team access IdeaNotes" ON public."IdeaNotes";
CREATE POLICY "Team access IdeaNotes" ON public."IdeaNotes" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Team access IdeaStrings" ON public."IdeaStrings";
CREATE POLICY "Team access IdeaStrings" ON public."IdeaStrings" FOR ALL USING (true) WITH CHECK (true);

-- 7. Setup Storage Bucket for Idea Board Media / Attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('idea-attachments', 'idea-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public idea attachments access" ON storage.objects;
CREATE POLICY "Public idea attachments access" ON storage.objects
    FOR SELECT USING (bucket_id = 'idea-attachments');

DROP POLICY IF EXISTS "Public idea attachments upload" ON storage.objects;
CREATE POLICY "Public idea attachments upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'idea-attachments');

DROP POLICY IF EXISTS "Public idea attachments update" ON storage.objects;
CREATE POLICY "Public idea attachments update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'idea-attachments');

DROP POLICY IF EXISTS "Public idea attachments delete" ON storage.objects;
CREATE POLICY "Public idea attachments delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'idea-attachments');

-- 8. Seed Initial Demo Notes for the General Idea Board (project_id IS NULL)
INSERT INTO public."IdeaNotes" (id, project_id, type, title, content, file_url, file_name, color, pin_color, x, y, width, rotation, z_index)
VALUES 
  ('note-1', NULL, 'text', 'Core Mechanics Hypothesis', '### Hypothesis on Player Progression
- **Objective:** Fast-paced fluid movement.
- [x] Wall-running and grappling hook synergy.
- [ ] Double-jump momentum preservation.

> *"If momentum doesn''t drop during transitions, engagement multiplies 2.5x."*', NULL, NULL, 'yellow', 'red', 120, 110, 320, -1.5, 2),
  ('note-2', NULL, 'image', 'Environment Atmosphere Target', '**Ref:** Cyber-noir dusk aesthetic. Heavy neon contrast with volumetric fog.', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1000&auto=format&fit=crop', 'cyberpunk_city_dusk.jpg', 'white', 'gold', 520, 80, 300, 2.0, 3),
  ('note-3', NULL, 'video', 'Movement Reference (Unreal Engine)', 'Analyze the character inertia and camera shake when landing on slopes.', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Gameplay Reference Reel', 'kraft', 'blue', 900, 130, 340, -2.0, 1),
  ('note-4', NULL, 'text', 'Clue #14: Corrupted Data Fragment', '**Location:** Sector 7 Sub-level.

Code snippet retrieved:
```ts
function decryptKey(token: string) {
  return token.split('''').reverse().join('''');
}
```
Does this point to the central AI server room?', NULL, NULL, 'rose', 'red', 260, 470, 330, 1.2, 4),
  ('note-5', NULL, 'link', 'Dynamic Tension Synth Reference', 'Check interactive audio system documentation for adaptive music triggers.', 'https://audiokinetic.com/en/library/edge/?source=SDK&id=index.html', 'Wwise Interactive Audio SDK', 'mint', 'green', 700, 490, 310, -1.0, 5)
ON CONFLICT (id) DO NOTHING;

-- Seed Initial Demo Connections
INSERT INTO public."IdeaStrings" (id, project_id, from_note_id, to_note_id, color, label, tension)
VALUES 
  ('string-1', NULL, 'note-1', 'note-2', 'red', 'Atmosphere Driver', 'normal'),
  ('string-2', NULL, 'note-2', 'note-3', 'red', 'Pacing Sync', 'normal'),
  ('string-3', NULL, 'note-1', 'note-4', 'twine', 'Evidence Link', 'loose'),
  ('string-4', NULL, 'note-4', 'note-5', 'red', 'Audio Cue', 'normal')
ON CONFLICT (from_note_id, to_note_id) DO NOTHING;
