import {
  IdeaBoardData,
  IdeaNote,
  IdeaStringConnection,
  BoardTheme,
} from "@/types/idea-board.types";

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

function getStorageKey(projectId?: string | null): string {
  if (!projectId || projectId === "all") {
    return DEFAULT_BOARD_KEY;
  }
  return `${STORAGE_KEY_PREFIX}${projectId}`;
}

export function generateInitialProjectBoard(projectId?: string | null): IdeaBoardData {
  const pId = projectId && projectId !== "all" ? projectId : null;

  if (!pId) {
    return {
      notes: INITIAL_DEMO_NOTES.map((n) => ({ ...n })),
      connections: INITIAL_DEMO_CONNECTIONS.map((c) => ({ ...c })),
      theme: "cork",
    };
  }

  // Generate a distinct board specifically for this project
  const note1Id = `note-${pId}-1`;
  const note2Id = `note-${pId}-2`;
  const note3Id = `note-${pId}-3`;

  const projectNotes: IdeaNote[] = [
    {
      id: note1Id,
      project_id: pId,
      type: "text",
      title: "Project Goals & Hypotheses",
      content:
        "### Core Objectives\n- [x] Scope definition and milestone targets.\n- [ ] Visual look and feel references.\n- [ ] Mechanics prototype.\n\n> *\"Pin new findings, connect related ideas with strings, or stretch strings to spawn notes.\"*",
      color: "yellow",
      pin_color: "red",
      x: 140,
      y: 120,
      width: 320,
      rotation: -1.2,
      z_index: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: note2Id,
      project_id: pId,
      type: "image",
      title: "Design & Style Inspiration",
      content: "Atmosphere and mood board reference.",
      file_url:
        "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1000&auto=format&fit=crop",
      file_name: "inspiration.jpg",
      color: "white",
      pin_color: "gold",
      x: 540,
      y: 100,
      width: 300,
      rotation: 1.8,
      z_index: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: note3Id,
      project_id: pId,
      type: "text",
      title: "Technical Discovery Note",
      content:
        "**Investigation:** Verify performance budget and streaming assets pipeline.\n\n```ts\nconst budget = { maxDrawCalls: 2000, targetFPS: 60 };\n```",
      color: "mint",
      pin_color: "green",
      x: 320,
      y: 450,
      width: 310,
      rotation: -1.5,
      z_index: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const projectConnections: IdeaStringConnection[] = [
    {
      id: `string-${pId}-1`,
      project_id: pId,
      from_note_id: note1Id,
      to_note_id: note2Id,
      color: "red",
      label: "Art Direction",
      tension: "normal",
      created_at: new Date().toISOString(),
    },
    {
      id: `string-${pId}-2`,
      project_id: pId,
      from_note_id: note1Id,
      to_note_id: note3Id,
      color: "twine",
      label: "Tech Constraint",
      tension: "loose",
      created_at: new Date().toISOString(),
    },
  ];

  return {
    notes: projectNotes,
    connections: projectConnections,
    theme: "cork",
  };
}

export function loadIdeaBoard(projectId?: string | null): IdeaBoardData {
  if (typeof window === "undefined") {
    return generateInitialProjectBoard(projectId);
  }

  const key = getStorageKey(projectId);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.notes) && Array.isArray(parsed?.connections)) {
        // If stored notes array is empty, regenerate initial project starter notes
        if (parsed.notes.length === 0) {
          const fresh = generateInitialProjectBoard(projectId);
          saveIdeaBoard(projectId, fresh);
          return fresh;
        }

        // Sanitize coordinates in case of NaN or out-of-bounds
        const sanitizedNotes = parsed.notes.map((n: IdeaNote, idx: number) => {
          let x = typeof n.x === "number" && !isNaN(n.x) ? n.x : 100 + (idx % 3) * 320;
          let y = typeof n.y === "number" && !isNaN(n.y) ? n.y : 100 + Math.floor(idx / 3) * 280;
          if (x < -200 || x > 3500) x = 120 + (idx % 3) * 340;
          if (y < -200 || y > 2500) y = 100 + Math.floor(idx / 3) * 300;
          const width = typeof n.width === "number" && !isNaN(n.width) && n.width >= 150 ? n.width : 300;
          return {
            ...n,
            x,
            y,
            width,
          };
        });

        return {
          notes: sanitizedNotes,
          connections: parsed.connections,
          theme: parsed.theme || "cork",
        };
      }
    }
  } catch (err) {
    console.error("Failed to load idea board from localStorage:", err);
  }

  // Initialize and persist separate board for this project
  const initialData = generateInitialProjectBoard(projectId);
  saveIdeaBoard(projectId, initialData);
  return initialData;
}

export function saveIdeaBoard(
  projectId: string | null | undefined,
  data: IdeaBoardData
): void {
  if (typeof window === "undefined") return;
  const key = getStorageKey(projectId);
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to save idea board to localStorage:", err);
  }
}

export function resetIdeaBoard(projectId?: string | null): IdeaBoardData {
  const initialData = generateInitialProjectBoard(projectId);
  saveIdeaBoard(projectId, initialData);
  return initialData;
}
