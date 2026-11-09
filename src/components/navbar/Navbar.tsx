"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Plus,
  Database as DatabaseIcon,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  FolderKanban,
  GraduationCap,
  Pencil,
  Trash2,
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
  onEditProject?: (project: Project) => void;
  onDeleteProject?: (project: Project) => void;
  currentSection?: "board" | "education";
  onSectionChange?: (section: "board" | "education") => void;
  educationalMaterialsCount?: number;
}

export function Navbar({
  isConfigured,
  users,
  onNewTask,
  projects = [],
  selectedProjectId = "all",
  onProjectChange,
  onNewProject,
  onEditProject,
  onDeleteProject,
  currentSection = "board",
  onSectionChange,
  educationalMaterialsCount,
}: NavbarProps) {
  const currentProject =
    selectedProjectId !== "all" ? projects.find((p) => p.id === selectedProjectId) : null;
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
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden shadow-md shadow-primary/20 bg-background border border-border/60">
                <Image
                  src="/logo.png"
                  alt="TaskMaster Logo"
                  width={36}
                  height={36}
                  className="h-full w-full object-contain p-0.5"
                  priority
                />
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

            {/* Project Selector Filter, Details & Actions in Top Menu Bar */}
            {onProjectChange && (
              <div className="flex items-center gap-2 pl-3 border-l border-border/70 min-w-0">
                {/* Project Selector Dropdown */}
                <div className="w-36 sm:w-44 md:w-48 shrink-0">
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

                {/* Selected Project Details (Title & Description) & Edit/Delete Buttons */}
                {currentProject && (
                  <div className="flex items-center gap-2 min-w-0 pl-2 border-l border-border/60">
                    <div className="flex flex-col justify-center min-w-0 max-w-[130px] sm:max-w-[180px] lg:max-w-[280px]">
                      <span className="font-bold text-xs text-foreground truncate leading-tight">
                        {currentProject.name}
                      </span>
                      {currentProject.description && (
                        <span
                          className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5 cursor-help"
                          title={currentProject.description}
                        >
                          {currentProject.description}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {onEditProject && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs"
                          onClick={() => onEditProject(currentProject)}
                          title="Edit project name & description"
                        >
                          <Pencil className="h-3 w-3" />
                          <span className="hidden xl:inline text-[11px]">Edit</span>
                        </Button>
                      )}
                      {onDeleteProject && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 cursor-pointer shadow-2xs"
                          onClick={() => onDeleteProject(currentProject)}
                          title="Delete project"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span className="hidden xl:inline text-[11px]">Delete</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Create New Project Button */}
                {onNewProject && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-2.5 text-xs gap-1 rounded-xl border-dashed hover:border-primary/50 text-muted-foreground hover:text-foreground shrink-0 hidden md:inline-flex"
                    onClick={onNewProject}
                    title="Create New Project"
                  >
                    <Plus className="h-3.5 w-3.5 text-primary" />
                    <span className="hidden xl:inline">New Project</span>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Center Navigation Switcher: Tasks & Board vs Educational Materials */}
          {onSectionChange && (
            <div className="flex items-center p-1 rounded-xl bg-muted/50 border border-border/70 shrink-0 shadow-2xs">
              <button
                type="button"
                onClick={() => onSectionChange("board")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentSection === "board"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FolderKanban className="h-3.5 w-3.5 text-primary" />
                <span>Tasks &amp; Board</span>
              </button>
              <button
                type="button"
                onClick={() => onSectionChange("education")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentSection === "education"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <GraduationCap className="h-3.5 w-3.5 text-primary" />
                <span>Learning Hub</span>
                {educationalMaterialsCount !== undefined && educationalMaterialsCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-mono">
                    {educationalMaterialsCount}
                  </span>
                )}
              </button>
            </div>
          )}

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

