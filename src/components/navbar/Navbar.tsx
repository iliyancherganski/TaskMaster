"use client";

import React, { useState } from "react";
import {
  CheckSquare2,
  Plus,
  Database as DatabaseIcon,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  FolderKanban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Project } from "@/types/database.types";
import { getInitials } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

interface NavbarProps {
  isConfigured: boolean;
  users: User[];
  onNewTask: () => void;
  projects?: Project[];
  selectedProjectId?: string;
  onProjectChange?: (projectId: string) => void;
  onNewProject?: () => void;
}

export function Navbar({
  isConfigured,
  users,
  onNewTask,
  projects = [],
  selectedProjectId = "all",
  onProjectChange,
  onNewProject,
}: NavbarProps) {
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const envSampleText = `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\nNEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...`;

  const copyEnv = () => {
    navigator.clipboard.writeText(envSampleText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4 sm:px-8">
          {/* Logo & Brand + Top Menu Bar Project Selector */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
                <CheckSquare2 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base tracking-tight text-foreground">
                    TaskMaster
                  </span>
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    Pro
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground hidden lg:block">
                  Team Kanban & Sprint Hub
                </p>
              </div>
            </div>

            {/* Project Selector Filter & New Project Button in Top Menu Bar */}
            {onProjectChange && (
              <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-border/70">
                <div className="w-44 md:w-56">
                  <Select value={selectedProjectId} onValueChange={onProjectChange}>
                    <SelectTrigger className="h-9 text-xs rounded-xl bg-muted/40 hover:bg-muted/70 border-border/80 font-medium">
                      <div className="flex items-center gap-2 truncate">
                        <FolderKanban className="h-3.5 w-3.5 text-primary shrink-0" />
                        <SelectValue placeholder="All Projects" />
                      </div>
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectItem value="all" className="text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <FolderKanban className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>All Projects</span>
                        </div>
                      </SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          <div className="flex items-center gap-2">
                            <FolderKanban className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                            <span>{p.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {onNewProject && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-2.5 text-xs gap-1 rounded-xl border-dashed hover:border-primary/50 text-muted-foreground hover:text-foreground shrink-0"
                    onClick={onNewProject}
                    title="Create New Project"
                  >
                    <Plus className="h-3.5 w-3.5 text-primary" />
                    <span className="hidden md:inline">New Project</span>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Action Center */}
          <div className="flex items-center gap-3">
            {/* Supabase Status Pill */}
            <button
              onClick={() => setIsDbModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                isConfigured
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
              }`}
              title="Click to view Supabase connection status & schema"
            >
              <DatabaseIcon className="h-3.5 w-3.5" />
              <span className="hidden md:inline">
                {isConfigured ? "Supabase Connected" : "Local Demo Database"}
              </span>
              <span className="md:hidden">
                {isConfigured ? "Connected" : "Demo"}
              </span>
              <span
                className={`h-2 w-2 rounded-full ${
                  isConfigured ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
            </button>

            {/* Theme Toggle Button */}
            <ThemeToggle />

            {/* Team Avatars */}
            <div className="hidden lg:flex items-center -space-x-1.5 overflow-hidden pl-2 border-l">
              {users.slice(0, 4).map((user) => (
                <Avatar
                  key={user.id}
                  className="h-8 w-8 ring-2 ring-background transition-transform hover:scale-110 hover:z-10"
                  title={user.Name}
                >
                  {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                  <AvatarFallback className="text-[10px] bg-slate-200 dark:bg-slate-700">
                    {getInitials(user.Name)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>

            {/* New Task Button */}
            <Button onClick={onNewTask} className="shadow-sm gap-1.5 h-9">
              <Plus className="h-4 w-4" />
              <span>New Task</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Supabase Schema & Setup Modal */}
      <Dialog open={isDbModalOpen} onOpenChange={setIsDbModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DatabaseIcon className="h-5 w-5 text-primary" />
              Supabase Configuration & Schema
            </DialogTitle>
            <DialogDescription>
              TaskMaster connects natively to Supabase PostgreSQL, Auth, and Storage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <div className="rounded-lg border bg-muted/30 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  Connection Status:
                </span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                    isConfigured
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {isConfigured ? "Live Supabase Database Connected" : "Local In-Memory Mode"}
                </span>
              </div>
              <p className="text-muted-foreground text-[11px]">
                {isConfigured
                  ? "All task updates, file attachments, and subtasks are synchronizing directly to your Supabase PostgreSQL database and Storage."
                  : "All CRUD operations are currently running smoothly in local demo state. To persist live to your own Supabase project, execute the SQL migration script and add your credentials in .env.local."}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  Quick Supabase Setup:
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] gap-1"
                  onClick={copyEnv}
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy Env Template"}
                </Button>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px]">
                <li>
                  Go to <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-primary underline">supabase.com</a> and create a new project.
                </li>
                <li>
                  Open the <b>SQL Editor</b> in your Supabase dashboard and run the script at: <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px]">supabase/schema.sql</code>
                </li>
                <li>
                  Create or edit your <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px]">.env.local</code> file with your Project URL & Anon Key.
                </li>
                <li>
                  Restart the dev server to start syncing directly to PostgreSQL and Storage!
                </li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

