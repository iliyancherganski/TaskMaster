"use client";

import React from "react";
import {
  Folder,
  FileText,
  ChevronRight,
  ChevronDown,
  Home,
  CornerDownRight,
} from "lucide-react";
import { TaskBreadcrumb, Project, TaskWithDetails } from "@/types/database.types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TaskBreadcrumbsProps {
  breadcrumbs?: TaskBreadcrumb[];
  project?: Project | null;
  allTasks?: TaskWithDetails[];
  currentTask?: TaskWithDetails | null;
  onNavigateToTask?: (taskId: string) => void;
  className?: string;
}

export function TaskBreadcrumbs({
  breadcrumbs = [],
  project,
  allTasks = [],
  currentTask,
  onNavigateToTask,
  className = "",
}: TaskBreadcrumbsProps) {
  const isSubtask = breadcrumbs.length > 1;
  const level = breadcrumbs.length - 1;

  // Helper to find subtasks for any task in the breadcrumb path
  const getSubtasksOf = (taskId: string): TaskWithDetails[] => {
    if (currentTask && currentTask.id === taskId && currentTask.subtasks && currentTask.subtasks.length > 0) {
      return currentTask.subtasks;
    }
    return allTasks.filter((t) => t.Task_Parent_Id === taskId);
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-xl bg-card/90 dark:bg-muted/40 border border-border/80 dark:border-border/80 text-xs text-muted-foreground font-mono select-none ${className}`}
    >
      {/* Root Project Indicator */}
      <div className="flex items-center gap-1 text-foreground dark:text-slate-300 font-sans">
        <Home className="h-3.5 w-3.5" />
        <span className="font-medium truncate max-w-[120px]">
          {project?.name || "Workspace"}
        </span>
      </div>

      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />

      {/* Directory Path */}
      {breadcrumbs.map((crumb, idx) => {
        const isCurrent = idx === breadcrumbs.length - 1;
        const subtasks = getSubtasksOf(crumb.id);
        const hasSubtasks = subtasks.length > 0;

        return (
          <React.Fragment key={crumb.id}>
            <div className="flex items-center gap-0.5">
              {/* Task Link Button */}
              <button
                type="button"
                onClick={() => {
                  if (!isCurrent && onNavigateToTask) {
                    onNavigateToTask(crumb.id);
                  }
                }}
                disabled={isCurrent || !onNavigateToTask}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-colors ${
                  isCurrent
                    ? "bg-primary/10 text-primary font-semibold border border-primary/25 cursor-default shadow-2xs"
                    : "hover:bg-muted/80 hover:text-foreground text-muted-foreground cursor-pointer"
                }`}
                title={isCurrent ? "Current active task" : `Jump to ${crumb.name}`}
              >
                <span className="truncate max-w-[150px] font-sans text-xs">
                  {crumb.name}
                </span>
              </button>

              {/* Arrow Button with Subtasks Dropdown Menu */}
              {hasSubtasks && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-slate-200/80 dark:hover:bg-muted transition-colors shrink-0"
                      title={`View ${subtasks.length} subtask(s) in ${crumb.name}`}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[220px] max-w-sm text-xs">
                    <DropdownMenuLabel className="flex items-center justify-between text-[10px] uppercase font-semibold text-muted-foreground">
                      <span>Subtasks in {crumb.name}</span>
                      <span className="rounded bg-muted px-1.5 py-0.2">{subtasks.length}</span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {subtasks.map((st) => (
                      <DropdownMenuItem
                        key={st.id}
                        onClick={() => onNavigateToTask?.(st.id)}
                        className="cursor-pointer gap-2 py-1.5"
                      >
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: st.status?.color || "#3b82f6" }}
                        />
                        <span className="truncate font-sans font-medium flex-1">
                          {st.name}
                        </span>
                        {st.subtasks && st.subtasks.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {st.subtasks.length}
                          </span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {!isCurrent && (
              <span className="text-muted-foreground/40 font-bold shrink-0">/</span>
            )}
          </React.Fragment>
        );
      })}

      {/* Depth Indicator Pill */}
      <span
        className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-sans font-medium uppercase tracking-wider shrink-0 ${
          isSubtask
            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
            : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
        }`}
      >
        {isSubtask ? `Subtask (Depth ${level})` : "Root Task"}
      </span>
    </div>
  );
}
