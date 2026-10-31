-- ============================================================
-- Educational Materials & Knowledge Hub Migration
-- Run this script in the Supabase SQL Editor
-- ============================================================

-- 1. Create StudyGroups table (Supports nested subgroups via parent_id)
CREATE TABLE IF NOT EXISTS public."StudyGroups" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    icon TEXT DEFAULT 'folder',
    parent_id UUID REFERENCES public."StudyGroups"(id) ON DELETE CASCADE,
    tags TEXT[] DEFAULT '{}'::TEXT[],
    position INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create StudyGroupConnections table (Cross-group relationships)
CREATE TABLE IF NOT EXISTS public."StudyGroupConnections" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_group_id UUID NOT NULL REFERENCES public."StudyGroups"(id) ON DELETE CASCADE,
    target_group_id UUID NOT NULL REFERENCES public."StudyGroups"(id) ON DELETE CASCADE,
    label TEXT, -- e.g., 'Related technique', 'Prerequisite', 'Shared workflow'
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_group_connection UNIQUE (source_group_id, target_group_id),
    CONSTRAINT no_self_connection CHECK (source_group_id <> target_group_id)
);

-- 3. Create EducationalMaterials table
CREATE TABLE IF NOT EXISTS public."EducationalMaterials" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    url TEXT,
    type TEXT NOT NULL DEFAULT 'website', -- 'video', 'course', 'guide', 'website', 'forum', 'doc', 'book', 'other'
    description TEXT,
    group_id UUID REFERENCES public."StudyGroups"(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}'::TEXT[],
    difficulty TEXT DEFAULT 'Intermediate', -- 'Beginner', 'Intermediate', 'Advanced'
    is_favorite BOOLEAN DEFAULT false,
    estimated_duration TEXT, -- e.g. '45m', '2.5 hrs', '4 weeks'
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Tasks_EducationalMaterials junction table (Link tasks with materials)
CREATE TABLE IF NOT EXISTS public."Tasks_EducationalMaterials" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public."Tasks"(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public."EducationalMaterials"(id) ON DELETE CASCADE,
    notes TEXT, -- Specific notes on why this resource is linked to the task
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_task_material UNIQUE (task_id, material_id)
);

-- 5. Create Indexes for High Performance
CREATE INDEX IF NOT EXISTS idx_studygroups_parent_id ON public."StudyGroups"(parent_id);
CREATE INDEX IF NOT EXISTS idx_materials_group_id ON public."EducationalMaterials"(group_id);
CREATE INDEX IF NOT EXISTS idx_tasks_edumaterials_task ON public."Tasks_EducationalMaterials"(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_edumaterials_mat ON public."Tasks_EducationalMaterials"(material_id);
CREATE INDEX IF NOT EXISTS idx_groupconn_source ON public."StudyGroupConnections"(source_group_id);
CREATE INDEX IF NOT EXISTS idx_groupconn_target ON public."StudyGroupConnections"(target_group_id);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public."StudyGroups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StudyGroupConnections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EducationalMaterials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Tasks_EducationalMaterials" ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS Policies (Full team collaborative access matching TaskMaster)
DROP POLICY IF EXISTS "Team access StudyGroups" ON public."StudyGroups";
CREATE POLICY "Team access StudyGroups" ON public."StudyGroups" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Team access StudyGroupConnections" ON public."StudyGroupConnections";
CREATE POLICY "Team access StudyGroupConnections" ON public."StudyGroupConnections" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Team access EducationalMaterials" ON public."EducationalMaterials";
CREATE POLICY "Team access EducationalMaterials" ON public."EducationalMaterials" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Team access Tasks_EducationalMaterials" ON public."Tasks_EducationalMaterials";
CREATE POLICY "Team access Tasks_EducationalMaterials" ON public."Tasks_EducationalMaterials" FOR ALL USING (true) WITH CHECK (true);

-- 8. Seed Initial Data (Study Groups, Subgroups, Cross-Connections, and Educational Materials)
DO $$
DECLARE
    -- Group IDs
    env_art_id UUID := gen_random_uuid();
    modelling_id UUID := gen_random_uuid();
    texturing_id UUID := gen_random_uuid();
    texture_painting_id UUID := gen_random_uuid();
    unreal_id UUID := gen_random_uuid();

    photo_vis_id UUID := gen_random_uuid();
    photo_shading_id UUID := gen_random_uuid();
    camera_comp_id UUID := gen_random_uuid();

    compositing_id UUID := gen_random_uuid();
    color_aces_id UUID := gen_random_uuid();

    -- Material IDs
    mat_1 UUID := gen_random_uuid();
    mat_2 UUID := gen_random_uuid();
    mat_3 UUID := gen_random_uuid();
    mat_4 UUID := gen_random_uuid();
    mat_5 UUID := gen_random_uuid();
    mat_6 UUID := gen_random_uuid();

    sample_task_id UUID;
BEGIN
    -- Only seed if StudyGroups is currently empty
    IF NOT EXISTS (SELECT 1 FROM public."StudyGroups" LIMIT 1) THEN

        -- Main Group 1: Environment Art
        INSERT INTO public."StudyGroups" (id, name, description, color, icon, parent_id, tags, position)
        VALUES (env_art_id, 'Environment Art', '3D level building, asset pipelines, modular kits, and world art', '#10b981', 'palette', NULL, ARRAY['3D', 'Environments', 'Game Art'], 0);

        -- Subgroups for Environment Art
        INSERT INTO public."StudyGroups" (id, name, description, color, icon, parent_id, tags, position)
        VALUES 
            (modelling_id, 'Modelling tips for Blender', 'Subdivision surface, hard surface booleans, bevel modifiers and topology tips', '#10b981', 'box', env_art_id, ARRAY['Blender', 'Modelling', 'Hard Surface'], 0),
            (texturing_id, 'Texturing & UVs', 'PBR workflows, UV unwrapping, texel density, packing, and mask generators', '#059669', 'layers', env_art_id, ARRAY['Texturing', 'Substance', 'UVs', 'PBR'], 1),
            (texture_painting_id, 'Texture Painting', 'Hand-painted techniques, stylized stylization, and projection painting', '#047857', 'brush', env_art_id, ARRAY['Handpainted', 'Blender', 'Stylized'], 2),
            (unreal_id, 'Unreal Engine Integration', 'Importing Nanite meshes, Lumen lighting setup, master materials, and foliage', '#0f766e', 'cpu', env_art_id, ARRAY['Unreal Engine', 'UE5', 'Lumen', 'Nanite'], 3);

        -- Main Group 2: Photoreal Visualisation
        INSERT INTO public."StudyGroups" (id, name, description, color, icon, parent_id, tags, position)
        VALUES (photo_vis_id, 'Photoreal Visualisation', 'High-end look development, realistic lighting, and photoreal rendering', '#3b82f6', 'sparkles', NULL, ARRAY['Photoreal', 'LookDev', 'VFX'], 1);

        -- Subgroups for Photoreal Visualisation
        INSERT INTO public."StudyGroups" (id, name, description, color, icon, parent_id, tags, position)
        VALUES 
            (photo_shading_id, 'Photoreal Shading & Materials', 'IOR values, subsurface scattering, microfacet roughness, and complex layered glass/metal shaders', '#2563eb', 'droplet', photo_vis_id, ARRAY['Shading', 'IOR', 'SSS', 'Micro-surface'], 0),
            (camera_comp_id, 'Camera & Lighting Studio', 'Physical camera sensor, aperture depth of field, exposure, HDRI balance', '#1d4ed8', 'camera', photo_vis_id, ARRAY['Lighting', 'Cinematography', 'HDRI'], 1);

        -- Main Group 3: Compositing
        INSERT INTO public."StudyGroups" (id, name, description, color, icon, parent_id, tags, position)
        VALUES (compositing_id, 'Compositing & Post-Production', 'Node-based compositing, multi-pass EXR reconstruction, and ACES color grading', '#8b5cf6', 'film', NULL, ARRAY['Nuke', 'DaVinci', 'Comp'], 2);

        INSERT INTO public."StudyGroups" (id, name, description, color, icon, parent_id, tags, position)
        VALUES 
            (color_aces_id, 'Color Management & ACES', 'Setting up ACEScg pipeline in 3D packages and tone mapping in grading suite', '#7c3aed', 'sliders', compositing_id, ARRAY['ACES', 'Color Science', 'OCIO'], 0);

        -- Cross-Group Connection: Environment Art / Texturing <-> Photoreal Visualisation / Photoreal Shading
        INSERT INTO public."StudyGroupConnections" (source_group_id, target_group_id, label)
        VALUES (texturing_id, photo_shading_id, 'PBR roughness maps & dielectric micro-surface consistency');

        -- Seed Sample Educational Materials
        INSERT INTO public."EducationalMaterials" (id, title, url, type, description, group_id, tags, difficulty, is_favorite, estimated_duration)
        VALUES 
            (mat_1, 'Blender 4.x Complete Texturing & Masking Masterclass', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'video', 'Comprehensive walkthrough of procedural masking, curvature maps, and edge wear nodes in Blender without external software.', texturing_id, ARRAY['Blender', 'Procedural', 'Masking'], 'Intermediate', true, '1h 45m'),
            (mat_2, 'Unreal Engine 5 Photorealistic Environment Pipeline', 'https://dev.epicgames.com/community/learning', 'course', 'Official Epic Games course covering modular assets, Nanite geometry, master materials with vertex painting, and Lumen optimization.', unreal_id, ARRAY['UE5', 'Nanite', 'Lumen', 'Architecture'], 'Advanced', true, '4 hours'),
            (mat_3, 'The Comprehensive PBR Guide by Allegorithmic / Adobe', 'https://substance3d.adobe.com/tutorials/courses/the-pbr-guide-part-1', 'guide', 'The holy bible of physically based rendering. Detailed breakdown of metallic vs specular workflows, energy conservation, and Fresnel reflection.', photo_shading_id, ARRAY['PBR', 'Theory', 'Shading', 'Optics'], 'Beginner', true, '45m read'),
            (mat_4, 'Polycount Environment Art & Texturing Forum', 'https://polycount.com/categories/environment-art', 'forum', 'Industry standard discussion forum with portfolio critiques, technical breakdown threads, and texturing discussions.', texturing_id, ARRAY['Community', 'Feedback', 'Industry'], 'Intermediate', false, 'Ongoing'),
            (mat_5, 'Blender Artists Community - Topology & Hard Surface Tips', 'https://blenderartists.org/', 'website', 'Active community sharing hard-surface modifier stacks, subdivision tricks, and clean boolean remeshing techniques.', modelling_id, ARRAY['Blender', 'Topology', 'Tips'], 'Beginner', false, 'Reference'),
            (mat_6, 'ACES Color Management Simplified for 3D Artists', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'video', 'Clear visual explanation of scene-referred color spaces, dynamic range, and why sRGB clipping ruins highlights.', color_aces_id, ARRAY['ACES', 'Color', 'Grading'], 'Intermediate', false, '35m');

        -- Attach sample material to an existing task if present
        SELECT id INTO sample_task_id FROM public."Tasks" LIMIT 1;
        IF sample_task_id IS NOT NULL THEN
            INSERT INTO public."Tasks_EducationalMaterials" (task_id, material_id, notes)
            VALUES (sample_task_id, mat_1, 'Watch section on edge wear masks before starting the model textures')
            ON CONFLICT DO NOTHING;
        END IF;

    END IF;
END $$;

