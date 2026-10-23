export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      Users: {
        Row: {
          id: string;
          Name: string;
          email: string;
          password: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          Name: string;
          email: string;
          password?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          Name?: string;
          email?: string;
          password?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      Skills: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      UsersSkills: {
        Row: {
          User_Id: string;
          Skill_Id: string;
          created_at: string;
        };
        Insert: {
          User_Id: string;
          Skill_Id: string;
          created_at?: string;
        };
        Update: {
          User_Id?: string;
          Skill_Id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "UsersSkills_Skill_Id_fkey";
            columns: ["Skill_Id"];
            isOneToOne: false;
            referencedRelation: "Skills";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "UsersSkills_User_Id_fkey";
            columns: ["User_Id"];
            isOneToOne: false;
            referencedRelation: "Users";
            referencedColumns: ["id"];
          }
        ];
      };
      Projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      Status: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          color: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          color?: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          color?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      TaskTypes: {
        Row: {
          id: string;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          color?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      Tasks: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          status_id: string | null;
          Task_Parent_Id: string | null;
          Project_id: string | null;
          position: number;
          due_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          status_id?: string | null;
          Task_Parent_Id?: string | null;
          Project_id?: string | null;
          position?: number;
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          status_id?: string | null;
          Task_Parent_Id?: string | null;
          Project_id?: string | null;
          position?: number;
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "Tasks_Project_id_fkey";
            columns: ["Project_id"];
            isOneToOne: false;
            referencedRelation: "Projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "Tasks_status_id_fkey";
            columns: ["status_id"];
            isOneToOne: false;
            referencedRelation: "Status";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "Tasks_Task_Parent_Id_fkey";
            columns: ["Task_Parent_Id"];
            isOneToOne: false;
            referencedRelation: "Tasks";
            referencedColumns: ["id"];
          }
        ];
      };
      TasksUsers: {
        Row: {
          id: string;
          Task_Id: string;
          User_Id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          Task_Id: string;
          User_Id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          Task_Id?: string;
          User_Id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "TasksUsers_Task_Id_fkey";
            columns: ["Task_Id"];
            isOneToOne: false;
            referencedRelation: "Tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "TasksUsers_User_Id_fkey";
            columns: ["User_Id"];
            isOneToOne: false;
            referencedRelation: "Users";
            referencedColumns: ["id"];
          }
        ];
      };
      TaskTypes_Tasks: {
        Row: {
          id: string;
          Task_Id: string;
          TaskType_Id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          Task_Id: string;
          TaskType_Id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          Task_Id?: string;
          TaskType_Id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "TaskTypes_Tasks_Task_Id_fkey";
            columns: ["Task_Id"];
            isOneToOne: false;
            referencedRelation: "Tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "TaskTypes_Tasks_TaskType_Id_fkey";
            columns: ["TaskType_Id"];
            isOneToOne: false;
            referencedRelation: "TaskTypes";
            referencedColumns: ["id"];
          }
        ];
      };
      Resources: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          Task_Id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          Task_Id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          Task_Id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "Resources_Task_Id_fkey";
            columns: ["Task_Id"];
            isOneToOne: false;
            referencedRelation: "Tasks";
            referencedColumns: ["id"];
          }
        ];
      };
      Files: {
        Row: {
          id: string;
          Url: string;
          Resource_Id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          Url: string;
          Resource_Id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          Url?: string;
          Resource_Id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "Files_Resource_Id_fkey";
            columns: ["Resource_Id"];
            isOneToOne: false;
            referencedRelation: "Resources";
            referencedColumns: ["id"];
          }
        ];
      };
      Softwares: {
        Row: {
          id: string;
          name: string;
          icon_url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          icon_url: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          icon_url?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      Tasks_Softwares: {
        Row: {
          Task_Id: string;
          Software_Id: string;
        };
        Insert: {
          Task_Id: string;
          Software_Id: string;
        };
        Update: {
          Task_Id?: string;
          Software_Id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "Tasks_Softwares_Task_Id_fkey";
            columns: ["Task_Id"];
            isOneToOne: false;
            referencedRelation: "Tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "Tasks_Softwares_Software_Id_fkey";
            columns: ["Software_Id"];
            isOneToOne: false;
            referencedRelation: "Softwares";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Aliases for convenient usage
export type User = Database["public"]["Tables"]["Users"]["Row"];
export type Skill = Database["public"]["Tables"]["Skills"]["Row"];
export type UserSkill = Database["public"]["Tables"]["UsersSkills"]["Row"];
export type Project = Database["public"]["Tables"]["Projects"]["Row"];
export type Status = Database["public"]["Tables"]["Status"]["Row"];
export type TaskType = Database["public"]["Tables"]["TaskTypes"]["Row"];
export type Task = Database["public"]["Tables"]["Tasks"]["Row"];
export type TaskUser = Database["public"]["Tables"]["TasksUsers"]["Row"];
export type TaskTypeTask = Database["public"]["Tables"]["TaskTypes_Tasks"]["Row"];
export type Resource = Database["public"]["Tables"]["Resources"]["Row"];
export type FileRecord = Database["public"]["Tables"]["Files"]["Row"];

export interface ResourceWithFiles extends Resource {
  files: FileRecord[];
}

export interface Software {
  id: string;
  name: string;
  icon_url: string;
  created_at?: string;
}

export interface TaskBreadcrumb {
  id: string;
  name: string;
}

export interface TaskWithDetails extends Task {
  status?: Status | null;
  project?: Project | null;
  task_types: TaskType[];
  assignees: User[];
  subtasks: TaskWithDetails[];
  resources: ResourceWithFiles[];
  softwares?: Software[];
  parent_task?: Task | null;
  breadcrumbs?: TaskBreadcrumb[];
}

export interface TaskFormData {
  name: string;
  description?: string;
  status_id?: string;
  Project_id?: string;
  Task_Parent_Id?: string | null;
  assignee_ids?: string[];
  task_type_ids?: string[];
  software_ids?: string[];
  due_date?: string | null;
}

