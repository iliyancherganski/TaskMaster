import {
  IdeaBoardData,
  IdeaBoardItem,
  IdeaNote,
  IdeaStringConnection,
  BoardTheme,
  IdeaNoteType,
  IdeaPaperColor,
  IdeaPinColor,
  IdeaStringColor,
  IdeaStringTension,
} from "@/types/idea-board.types";
import { supabase, isSupabaseConfigured } from "./supabase/client";

const STORAGE_KEY_PREFIX = "taskmaster_idea_board_";
const DEFAULT_BOARD_KEY = "taskmaster_idea_board_default";

export const INITIAL_DEMO_NOTES: IdeaNote[] = [
  {
    id: "note-1",
    project_id: null,
    type: "text",
    title: "Core Mechanics Hypothesis",
    content:
      "### Hypothesis on Player Progression\n- **Objective:** Fast-paced fluid movement.\n- [x] Wall-running and grappling hook synergy.\n- [ ] Double-jump momentum preservation.\n\n> *\"If momentum doesn't drop during transitions, engagement multiplies 2.5x.\"*",
    color: "yellow",
    pin_color: "red",
    x: 120,
    y: 110,
    width: 320,
    rotation: -1.5,
    z_index: 2,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "note-2",
    project_id: null,
    type: "image",
    title: "Environment Atmosphere Target",
    content:
      "**Ref:** Cyber-noir dusk aesthetic. Heavy neon contrast with volumetric fog.",
    file_url:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1000&auto=format&fit=crop",
    file_name: "cyberpunk_city_dusk.jpg",
    color: "white",
    pin_color: "gold",
    x: 520,
    y: 80,
    width: 300,
    rotation: 2.0,
    z_index: 3,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "note-3",
    project_id: null,
    type: "video",
    title: "Movement Reference (Unreal Engine)",
    content:
      "Analyze the character inertia and camera shake when landing on slopes.",
    file_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    file_name: "Gameplay Reference Reel",
    color: "kraft",
    pin_color: "blue",
    x: 900,
    y: 130,
    width: 340,
    rotation: -2.0,
    z_index: 1,
    created_at: new Date(Date.now() - 43200000).toISOString(),
    updated_at: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: "note-4",
    project_id: null,
    type: "text",
    title: "Clue #14: Corrupted Data Fragment",
    content:
      "**Location:** Sector 7 Sub-level.\n\nCode snippet retrieved:\n```ts\nfunction decryptKey(token: string) {\n  return token.split('').reverse().join('');\n}\n```\nDoes this point to the central AI server room?",
    color: "rose",
    pin_color: "red",
    x: 260,
    y: 470,
    width: 330,
    rotation: 1.2,
    z_index: 4,
    created_at: new Date(Date.now() - 21600000).toISOString(),
    updated_at: new Date(Date.now() - 21600000).toISOString(),
  },
  {
    id: "note-5",
    project_id: null,
    type: "link",
    title: "Dynamic Tension Synth Reference",
    content:
      "Check interactive audio system documentation for adaptive music triggers.",
    file_url: "https://audiokinetic.com/en/library/edge/?source=SDK&id=index.html",
    file_name: "Wwise Interactive Audio SDK",
    color: "mint",
    pin_color: "green",
    x: 700,
    y: 490,
    width: 310,
    rotation: -1.0,
    z_index: 5,
    created_at: new Date(Date.now() - 10800000).toISOString(),
    updated_at: new Date(Date.now() - 10800000).toISOString(),
  },
];

export const INITIAL_DEMO_CONNECTIONS: IdeaStringConnection[] = [
  {
    id: "string-1",
    project_id: null,
    from_note_id: "note-1",
    to_note_id: "note-2",
    color: "red",
    label: "Atmosphere Driver",
    tension: "normal",
    created_at: new Date().toISOString(),
  },
  {
    id: "string-2",
    project_id: null,
    from_note_id: "note-2",
    to_note_id: "note-3",
    color: "red",
    label: "Pacing Sync",
    tension: "normal",
    created_at: new Date().toISOString(),
  },
  {
    id: "string-3",
    project_id: null,
    from_note_id: "note-1",
    to_note_id: "note-4",
    color: "twine",
    label: "Evidence Link",
    tension: "loose",
    created_at: new Date().toISOString(),
  },
  {
    id: "string-4",
    project_id: null,
    from_note_id: "note-4",
    to_note_id: "note-5",
    color: "red",
    label: "Audio Cue",
    tension: "normal",
    created_at: new Date().toISOString(),
  },
];

export const isValidUuid = (id?: string | null): boolean => {
  if (!id || id === "all") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const normalizeProjectId = (projectId?: string | null): string | null => {
  if (!projectId || projectId === "all") return null;
  return isValidUuid(projectId) ? projectId : null;
};

export function getStorageKey(projectId?: string | null, boardId?: string | null): string {
  const baseKey = !projectId || projectId === "all" ? DEFAULT_BOARD_KEY : `${STORAGE_KEY_PREFIX}${projectId}`;
  if (boardId) {
    return `${baseKey}_sub_${boardId}`;
  }
  return baseKey;
}

export function getSubboardsStorageKey(projectId?: string | null): string {
  return `taskmaster_subboards_${projectId || "all"}`;
}

export function getSubboardsFromCache(projectId?: string | null): IdeaBoardItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getSubboardsStorageKey(projectId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveSubboardsToCache(
  projectId: string | null | undefined,
  subboards: IdeaBoardItem[]
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getSubboardsStorageKey(projectId), JSON.stringify(subboards));
  } catch {}
}

export function generateInitialProjectBoard(projectId?: string | null): IdeaBoardData {
  const pId = normalizeProjectId(projectId);

  if (!pId) {
    return {
      notes: INITIAL_DEMO_NOTES.map((n) => ({ ...n })),
      connections: INITIAL_DEMO_CONNECTIONS.map((c) => ({ ...c })),
      theme: "cork",
    };
  }

  // Projects default to an empty board (Requirement 2)
  return {
    notes: [],
    connections: [],
    theme: "cork",
  };
}

/**
 * Synchronous local load from cache or fallback data.
 * Used for instantaneous initial render without loading flashes.
 */
export function loadIdeaBoard(
  projectId?: string | null,
  boardId?: string | null
): IdeaBoardData {
  const key = getStorageKey(projectId, boardId);
  if (typeof window === "undefined") {
    if (!projectId || projectId === "all") {
      return generateInitialProjectBoard(projectId);
    }
    return { notes: [], connections: [], theme: "cork" };
  }

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.notes) && Array.isArray(parsed?.connections)) {
        // Sanitize coordinates in case of NaN or out-of-bounds
        const sanitizedNotes = parsed.notes.map((n: IdeaNote, idx: number) => {
          let x = typeof n.x === "number" && !isNaN(n.x) ? n.x : 100 + (idx % 3) * 320;
          let y = typeof n.y === "number" && !isNaN(n.y) ? n.y : 100 + Math.floor(idx / 3) * 280;
          if (x < -200 || x > 3500) x = 120 + (idx % 3) * 340;
          if (y < -200 || y > 2500) y = 100 + Math.floor(idx / 3) * 300;
          const defaultWidth = n.type === "board" ? 220 : 300;
          const width = typeof n.width === "number" && !isNaN(n.width) && n.width >= 150 ? n.width : defaultWidth;
          return {
            ...n,
            x,
            y,
            width,
          };
        });

        return {
          id: boardId || undefined,
          notes: sanitizedNotes,
          connections: parsed.connections,
          theme: parsed.theme || "cork",
        };
      }
    }
  } catch (err) {
    console.error("Failed to load idea board from localStorage:", err);
  }

  // Requirement 2: Empty board by default for projects or sub-boards!
  if (!boardId && (!projectId || projectId === "all")) {
    const initialData = generateInitialProjectBoard(projectId);
    saveIdeaBoard(projectId, initialData, boardId);
    return initialData;
  }

  const emptyBoard: IdeaBoardData = {
    id: boardId || undefined,
    notes: [],
    connections: [],
    theme: "cork",
  };
  saveIdeaBoard(projectId, emptyBoard, boardId);
  return emptyBoard;
}

/**
 * Asynchronous fetch from Supabase Database.
 * Merges with local cache.
 */
export async function fetchIdeaBoardFromDb(
  projectId?: string | null,
  boardId?: string | null
): Promise<IdeaBoardData> {
  const localCached = loadIdeaBoard(projectId, boardId);

  if (!isSupabaseConfigured) {
    return localCached;
  }

  const pId = normalizeProjectId(projectId);

  try {
    // 1. Fetch Notes from Supabase
    let notesQuery = supabase.from("IdeaNotes").select("*");
    if (pId) {
      notesQuery = notesQuery.eq("project_id", pId);
    } else {
      notesQuery = notesQuery.is("project_id", null);
    }

    if (boardId) {
      if (!isValidUuid(boardId)) {
        return localCached;
      }
      notesQuery = notesQuery.eq("board_id", boardId);
    } else {
      notesQuery = notesQuery.is("board_id", null);
    }

    const { data: notesData, error: notesErr } = await notesQuery.order("z_index", { ascending: true });

    if (notesErr) {
      console.warn("Supabase IdeaNotes query notice:", notesErr.message);
      return localCached;
    }

    // 2. Fetch Strings from Supabase
    let stringsQuery = supabase.from("IdeaStrings").select("*");
    if (pId) {
      stringsQuery = stringsQuery.eq("project_id", pId);
    } else {
      stringsQuery = stringsQuery.is("project_id", null);
    }

    if (boardId) {
      if (!isValidUuid(boardId)) {
        return localCached;
      }
      stringsQuery = stringsQuery.eq("board_id", boardId);
    } else {
      stringsQuery = stringsQuery.is("board_id", null);
    }

    const { data: stringsData } = await stringsQuery;

    // 3. Fetch Board Row
    let boardQuery = supabase.from("IdeaBoards").select("id, name, parent_board_id, theme");
    if (boardId) {
      if (!isValidUuid(boardId)) {
        return localCached;
      }
      boardQuery = boardQuery.eq("id", boardId);
    } else if (pId) {
      boardQuery = boardQuery.eq("project_id", pId).is("parent_board_id", null);
    } else {
      boardQuery = boardQuery.is("project_id", null).is("parent_board_id", null);
    }
    const { data: boardDataRow } = await boardQuery.maybeSingle();

    // Map notes
    const mappedNotes: IdeaNote[] = (notesData || []).map((n, idx) => {
      let x = typeof n.x === "number" && !isNaN(n.x) ? n.x : 100 + (idx % 3) * 320;
      let y = typeof n.y === "number" && !isNaN(n.y) ? n.y : 100 + Math.floor(idx / 3) * 280;
      if (x < -200 || x > 3500) x = 120 + (idx % 3) * 340;
      if (y < -200 || y > 2500) y = 100 + Math.floor(idx / 3) * 300;
      const defaultWidth = n.type === "board" ? 220 : 300;
      const width = typeof n.width === "number" && !isNaN(n.width) && n.width >= 150 ? n.width : defaultWidth;

      return {
        id: n.id,
        project_id: n.project_id,
        board_id: n.board_id,
        sub_board_id: n.sub_board_id,
        type: (n.type as IdeaNoteType) || "text",
        title: n.title || "New Idea",
        content: n.content || "",
        file_url: n.file_url,
        file_name: n.file_name,
        file_size: n.file_size ? Number(n.file_size) : null,
        task_id: n.task_id,
        icon: n.icon || undefined,
        color: (n.color as IdeaPaperColor) || "yellow",
        pin_color: (n.pin_color as IdeaPinColor) || "red",
        x,
        y,
        width,
        rotation: typeof n.rotation === "number" && !isNaN(n.rotation) ? n.rotation : 0,
        z_index: typeof n.z_index === "number" ? n.z_index : 1,
        created_at: n.created_at,
        updated_at: n.updated_at,
      };
    });

    const mappedStrings: IdeaStringConnection[] = (stringsData || []).map((s) => ({
      id: s.id,
      project_id: s.project_id,
      board_id: s.board_id,
      from_note_id: s.from_note_id,
      to_note_id: s.to_note_id,
      color: (s.color as IdeaStringColor) || "red",
      label: s.label || undefined,
      tension: (s.tension as IdeaStringTension) || "normal",
      created_at: s.created_at,
    }));

    const theme = (boardDataRow?.theme as BoardTheme) || "cork";

    const dbBoardData: IdeaBoardData = {
      id: boardDataRow?.id || boardId || undefined,
      name: boardDataRow?.name || undefined,
      parent_board_id: boardDataRow?.parent_board_id || null,
      notes: mappedNotes,
      connections: mappedStrings,
      theme,
    };

    // Sync local storage cache
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(getStorageKey(projectId, boardId), JSON.stringify(dbBoardData));
      } catch (_) {}
    }

    return dbBoardData;
  } catch (err) {
    console.warn("fetchIdeaBoardFromDb fallback:", err);
    return localCached;
  }
}

/**
 * Persists Idea Board directly to Supabase PostgreSQL database.
 */
export async function saveIdeaBoardToDb(
  projectId: string | null | undefined,
  data: IdeaBoardData,
  boardId?: string | null
): Promise<void> {
  if (!isSupabaseConfigured) return;
  const pId = normalizeProjectId(projectId);

  try {
    if (boardId) {
      // Sub-board persistence: Only write to Supabase if valid UUID
      if (!isValidUuid(boardId)) {
        return;
      }

      await supabase
        .from("IdeaBoards")
        .update({
          theme: data.theme || "cork",
          updated_at: new Date().toISOString(),
        })
        .eq("id", boardId);

      // Upsert Notes strictly for this sub-board
      if (data.notes && data.notes.length > 0) {
        const noteInserts = data.notes.map((n) => ({
          id: n.id,
          project_id: pId,
          board_id: boardId,
          type: n.type || "text",
          title: n.title || "New Idea",
          content: n.content || "",
          file_url: n.file_url || null,
          file_name: n.file_name || null,
          file_size: n.file_size ? Number(n.file_size) : null,
          task_id: isValidUuid(n.task_id) ? n.task_id : null,
          sub_board_id: isValidUuid(n.sub_board_id) ? n.sub_board_id : null,
          icon: n.icon || null,
          color: n.color || "yellow",
          pin_color: n.pin_color || "red",
          x: typeof n.x === "number" && !isNaN(n.x) ? n.x : 100,
          y: typeof n.y === "number" && !isNaN(n.y) ? n.y : 100,
          width: typeof n.width === "number" && !isNaN(n.width) ? n.width : (n.type === "board" ? 220 : 300),
          rotation: typeof n.rotation === "number" && !isNaN(n.rotation) ? n.rotation : 0,
          z_index: typeof n.z_index === "number" ? n.z_index : 1,
          updated_at: new Date().toISOString(),
        }));

        await supabase.from("IdeaNotes").upsert(noteInserts, { onConflict: "id" });

        const currentNoteIds = data.notes.map((n) => n.id);
        await supabase
          .from("IdeaNotes")
          .delete()
          .eq("board_id", boardId)
          .not("id", "in", `(${currentNoteIds.map((id) => `"${id}"`).join(",")})`);
      } else {
        await supabase.from("IdeaNotes").delete().eq("board_id", boardId);
      }

      // Upsert Strings strictly for this sub-board
      if (data.connections && data.connections.length > 0) {
        const stringInserts = data.connections.map((c) => ({
          id: c.id,
          project_id: pId,
          board_id: boardId,
          from_note_id: c.from_note_id,
          to_note_id: c.to_note_id,
          color: c.color || "red",
          label: c.label || null,
          tension: c.tension || "normal",
        }));

        await supabase.from("IdeaStrings").upsert(stringInserts, { onConflict: "id" });

        const currentStringIds = data.connections.map((c) => c.id);
        await supabase
          .from("IdeaStrings")
          .delete()
          .eq("board_id", boardId)
          .not("id", "in", `(${currentStringIds.map((id) => `"${id}"`).join(",")})`);
      } else {
        await supabase.from("IdeaStrings").delete().eq("board_id", boardId);
      }
    } else {
      // Root Board persistence (board_id IS NULL)
      if (pId) {
        await supabase.from("IdeaBoards").upsert(
          {
            project_id: pId,
            name: "Main Board",
            parent_board_id: null,
            theme: data.theme || "cork",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "project_id" }
        );
      } else {
        const { data: existingBoard } = await supabase
          .from("IdeaBoards")
          .select("id")
          .is("project_id", null)
          .is("parent_board_id", null)
          .maybeSingle();

        if (existingBoard) {
          await supabase
            .from("IdeaBoards")
            .update({
              theme: data.theme || "cork",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingBoard.id);
        } else {
          await supabase.from("IdeaBoards").insert({
            project_id: null,
            name: "Main Board",
            parent_board_id: null,
            theme: data.theme || "cork",
          });
        }
      }

      // Upsert Notes for root board
      if (data.notes && data.notes.length > 0) {
        const noteInserts = data.notes.map((n) => ({
          id: n.id,
          project_id: pId,
          board_id: null,
          type: n.type || "text",
          title: n.title || "New Idea",
          content: n.content || "",
          file_url: n.file_url || null,
          file_name: n.file_name || null,
          file_size: n.file_size ? Number(n.file_size) : null,
          task_id: isValidUuid(n.task_id) ? n.task_id : null,
          sub_board_id: isValidUuid(n.sub_board_id) ? n.sub_board_id : null,
          icon: n.icon || null,
          color: n.color || "yellow",
          pin_color: n.pin_color || "red",
          x: typeof n.x === "number" && !isNaN(n.x) ? n.x : 100,
          y: typeof n.y === "number" && !isNaN(n.y) ? n.y : 100,
          width: typeof n.width === "number" && !isNaN(n.width) ? n.width : (n.type === "board" ? 220 : 300),
          rotation: typeof n.rotation === "number" && !isNaN(n.rotation) ? n.rotation : 0,
          z_index: typeof n.z_index === "number" ? n.z_index : 1,
          updated_at: new Date().toISOString(),
        }));

        await supabase.from("IdeaNotes").upsert(noteInserts, { onConflict: "id" });

        const currentNoteIds = data.notes.map((n) => n.id);
        let delNoteQuery = supabase.from("IdeaNotes").delete().is("board_id", null);
        if (pId) {
          delNoteQuery = delNoteQuery.eq("project_id", pId);
        } else {
          delNoteQuery = delNoteQuery.is("project_id", null);
        }
        if (currentNoteIds.length > 0) {
          await delNoteQuery.not("id", "in", `(${currentNoteIds.map((id) => `"${id}"`).join(",")})`);
        }
      } else {
        let delAllNotes = supabase.from("IdeaNotes").delete().is("board_id", null);
        if (pId) {
          delAllNotes = delAllNotes.eq("project_id", pId);
        } else {
          delAllNotes = delAllNotes.is("project_id", null);
        }
        await delAllNotes;
      }

      // Upsert Strings for root board
      if (data.connections && data.connections.length > 0) {
        const stringInserts = data.connections.map((c) => ({
          id: c.id,
          project_id: pId,
          board_id: null,
          from_note_id: c.from_note_id,
          to_note_id: c.to_note_id,
          color: c.color || "red",
          label: c.label || null,
          tension: c.tension || "normal",
        }));

        await supabase.from("IdeaStrings").upsert(stringInserts, { onConflict: "id" });

        const currentStringIds = data.connections.map((c) => c.id);
        let delStrQuery = supabase.from("IdeaStrings").delete().is("board_id", null);
        if (pId) {
          delStrQuery = delStrQuery.eq("project_id", pId);
        } else {
          delStrQuery = delStrQuery.is("project_id", null);
        }
        if (currentStringIds.length > 0) {
          await delStrQuery.not("id", "in", `(${currentStringIds.map((id) => `"${id}"`).join(",")})`);
        }
      } else {
        let delAllStrings = supabase.from("IdeaStrings").delete().is("board_id", null);
        if (pId) {
          delAllStrings = delAllStrings.eq("project_id", pId);
        } else {
          delAllStrings = delAllStrings.is("project_id", null);
        }
        await delAllStrings;
      }
    }
  } catch (err) {
    console.warn("saveIdeaBoardToDb error:", err);
  }
}

let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Optimistic local save with automatic debounced cloud sync to Supabase.
 */
export function saveIdeaBoard(
  projectId: string | null | undefined,
  data: IdeaBoardData,
  boardId?: string | null
): void {
  if (typeof window === "undefined") return;
  const key = getStorageKey(projectId, boardId);
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to save idea board to localStorage:", err);
  }

  // Debounced cloud sync to Supabase Database
  if (isSupabaseConfigured) {
    if (saveDebounceTimer) {
      clearTimeout(saveDebounceTimer);
    }
    saveDebounceTimer = setTimeout(() => {
      saveIdeaBoardToDb(projectId, data, boardId).catch((err) => {
        console.warn("Background idea board Supabase sync error:", err);
      });
    }, 450);
  }
}

export function resetIdeaBoard(projectId?: string | null, boardId?: string | null): IdeaBoardData {
  const emptyBoard: IdeaBoardData = {
    notes: [],
    connections: [],
    theme: "cork",
  };
  saveIdeaBoard(projectId, emptyBoard, boardId);
  return emptyBoard;
}

// -----------------------------------------------------------------------
// Sub-Boards CRUD
// -----------------------------------------------------------------------

export async function fetchSubboardsFromDb(projectId?: string | null): Promise<IdeaBoardItem[]> {
  const localCached = getSubboardsFromCache(projectId);
  if (!isSupabaseConfigured || !supabase) return localCached;
  const pId = normalizeProjectId(projectId);

  try {
    let query = supabase.from("IdeaBoards").select("*");
    if (pId) {
      query = query.eq("project_id", pId);
    } else {
      query = query.is("project_id", null);
    }
    const { data, error } = await query;
    if (error || !data) return localCached;

    const mapped: IdeaBoardItem[] = data.map((b: any) => ({
      id: b.id,
      project_id: b.project_id,
      name: b.name || "Untitled Board",
      parent_board_id: b.parent_board_id || null,
      icon: b.icon || "folder",
      theme: (b.theme as BoardTheme) || "cork",
      created_at: b.created_at,
      updated_at: b.updated_at,
    }));

    // Merge remote data with local cached items so locally created boards aren't lost
    const mergedMap = new Map<string, IdeaBoardItem>();
    localCached.forEach((item) => mergedMap.set(item.id, item));
    mapped.forEach((item) => mergedMap.set(item.id, item));
    const merged = Array.from(mergedMap.values());
    saveSubboardsToCache(projectId, merged);
    return merged;
  } catch (err) {
    console.warn("fetchSubboardsFromDb fallback:", err);
    return localCached;
  }
}

export async function createSubboard(
  projectId: string | null | undefined,
  name: string,
  parentBoardId: string | null,
  icon = "folder",
  theme: BoardTheme = "cork"
): Promise<IdeaBoardItem> {
  const pId = normalizeProjectId(projectId);
  const newBoardId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `b0000000-${Date.now().toString(16).padStart(8, "0").slice(-8)}-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, "0")}`;

  const newBoard: IdeaBoardItem = {
    id: newBoardId,
    project_id: pId,
    name: name.trim() || "New Board",
    parent_board_id: parentBoardId || null,
    icon: icon || "folder",
    theme: theme || "cork",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const cached = getSubboardsFromCache(projectId);
  const updated = [...cached.filter((b) => b.id !== newBoardId), newBoard];
  saveSubboardsToCache(projectId, updated);

  saveIdeaBoard(projectId, { id: newBoardId, name: newBoard.name, parent_board_id: parentBoardId, notes: [], connections: [], theme: theme || "cork" }, newBoardId);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("IdeaBoards")
        .insert({
          id: newBoardId,
          project_id: pId,
          name: newBoard.name,
          parent_board_id: isValidUuid(parentBoardId) ? parentBoardId : null,
          icon: newBoard.icon,
          theme: theme || "cork",
        })
        .select()
        .single();

      if (!error && data) {
        newBoard.id = data.id;
        const freshUpdated = [...cached.filter((b) => b.id !== newBoardId && b.id !== data.id), newBoard];
        saveSubboardsToCache(projectId, freshUpdated);
        saveIdeaBoard(projectId, { id: data.id, name: newBoard.name, parent_board_id: parentBoardId, notes: [], connections: [], theme: theme || "cork" }, data.id);
      }
    } catch (e) {
      console.warn("createSubboard fallback:", e);
    }
  }

  return newBoard;
}

export async function deleteSubboard(
  boardId: string,
  projectId?: string | null
): Promise<void> {
  const cached = getSubboardsFromCache(projectId);
  // Recursively collect all descendant board IDs
  const collectDescendants = (rootId: string): string[] => {
    const directChildren = cached.filter((b) => b.parent_board_id === rootId);
    let ids = directChildren.map((b) => b.id);
    directChildren.forEach((child) => {
      ids = [...ids, ...collectDescendants(child.id)];
    });
    return ids;
  };

  const allToDelete = [boardId, ...collectDescendants(boardId)];
  const remaining = cached.filter((b) => !allToDelete.includes(b.id));
  saveSubboardsToCache(projectId, remaining);

  if (typeof window !== "undefined") {
    allToDelete.forEach((bId) => {
      try {
        localStorage.removeItem(getStorageKey(projectId, bId));
      } catch {}
    });
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const validUuids = allToDelete.filter(isValidUuid);
      if (validUuids.length > 0) {
        await supabase.from("IdeaBoards").delete().in("id", validUuids);
      }
    } catch (e) {
      console.warn("deleteSubboard fallback:", e);
    }
  }
}

/**
 * Upload an image or attachment file for an Idea Note.
 * Uploads to Supabase Storage ('idea-attachments' or 'task-attachments') with fallback to base64.
 */
export async function uploadIdeaAttachment(file: File): Promise<string> {
  if (isSupabaseConfigured) {
    try {
      const fileExt = file.name.split(".").pop() || "png";
      const filePath = `ideas/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      let bucketName = "idea-attachments";
      let { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (uploadError && uploadError.message?.includes("bucket")) {
        bucketName = "task-attachments";
        const fallbackResult = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, { cacheControl: "3600", upsert: false });
        uploadError = fallbackResult.error;
      }

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);
        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      }
    } catch (err) {
      console.warn("Supabase idea attachment upload failed, falling back to data URL:", err);
    }
  }

  // Fallback: Read as base64 Data URL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve(URL.createObjectURL(file));
    reader.readAsDataURL(file);
  });
}


/**
 * Synchronously extract all task IDs currently linked to the idea board from local cache.
 */
export function getLinkedTaskIdsFromCache(projectId?: string | null): Set<string> {
  const linked = new Set<string>();
  if (typeof window === "undefined") return linked;

  try {
    if (projectId && projectId !== "all") {
      const board = loadIdeaBoard(projectId);
      board.notes.forEach((n) => {
        if (n.task_id) linked.add(n.task_id);
      });
    } else {
      // Scan all localStorage idea board keys
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith(STORAGE_KEY_PREFIX) || k === DEFAULT_BOARD_KEY)) {
          try {
            const raw = localStorage.getItem(k);
            if (raw) {
              const data = JSON.parse(raw);
              if (Array.isArray(data?.notes)) {
                data.notes.forEach((n: IdeaNote) => {
                  if (n.task_id) linked.add(n.task_id);
                });
              }
            }
          } catch {}
        }
      }
    }
  } catch (err) {
    console.warn("Notice: Failed to read linked task IDs from cache:", err);
  }

  return linked;
}

/**
 * Fetch all task IDs linked across Supabase IdeaNotes table.
 */
export async function fetchLinkedTaskIdsFromDb(projectId?: string | null): Promise<string[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    let query = supabase.from("IdeaNotes").select("task_id").not("task_id", "is", null);
    if (projectId && projectId !== "all") {
      query = query.eq("project_id", projectId);
    }
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((row: any) => row.task_id).filter(Boolean);
  } catch (err) {
    console.warn("Notice: fetchLinkedTaskIdsFromDb falling back:", err);
    return [];
  }
}
