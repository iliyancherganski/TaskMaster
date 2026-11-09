export type IdeaNoteType = "text" | "image" | "video" | "link" | "file" | "task";

export type IdeaPinColor =
  | "red"
  | "gold"
  | "silver"
  | "blue"
  | "green"
  | "yellow"
  | "pink";

export type IdeaPaperColor =
  | "yellow"
  | "white"
  | "kraft"
  | "mint"
  | "sky"
  | "lavender"
  | "rose"
  | "dark";

export type IdeaStringColor =
  | "red"
  | "twine"
  | "black"
  | "blue"
  | "green"
  | "yellow"
  | "pink";

export type IdeaStringTension = "loose" | "normal" | "tight";

export type BoardTheme = "cork" | "dark-cork" | "blueprint" | "chalkboard";

export interface IdeaNote {
  id: string;
  project_id: string | null;
  type: IdeaNoteType;
  title: string;
  content: string; // Markdown formatted description/notes
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  task_id?: string | null; // If linking to a project task
  color: IdeaPaperColor;
  pin_color: IdeaPinColor;
  x: number;
  y: number;
  width: number;
  rotation: number; // -4 to +4 degrees for organic physical look
  z_index: number;
  created_at: string;
  updated_at: string;
}

export interface IdeaStringConnection {
  id: string;
  project_id: string | null;
  from_note_id: string;
  to_note_id: string;
  color: IdeaStringColor;
  label?: string;
  tension: IdeaStringTension;
  created_at: string;
}

export interface IdeaBoardData {
  notes: IdeaNote[];
  connections: IdeaStringConnection[];
  theme: BoardTheme;
}
