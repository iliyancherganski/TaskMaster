"use client";

import React from "react";
import {
  Search,
  X,
  Filter,
  FolderKanban,
  User as UserIcon,
  Tag,
  LayoutGrid,
  FolderTree,
  Lightbulb,
  Plus,
  Share2,
  CheckSquare,
  Layers,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Project, TaskType, User } from "@/types/database.types";

interface KanbanFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedProjectId?: string;
  onProjectChange?: (id: string) => void;
  selectedAssigneeId: string;
  onAssigneeChange: (id: string) => void;
  selectedTypeId: string;
  onTypeChange: (id: string) => void;
  projects?: Project[];
  taskTypes: TaskType[];
  users: User[];
  totalTasks: number;
  completedTasks: number;
  onResetFilters: () => void;
  onNewTask?: () => void;
  viewMode?: "kanban" | "folder" | "idea-board";
  onViewModeChange?: (mode: "kanban" | "folder" | "idea-board") => void;
  onPinNote?: () => void;
  onLinkTask?: () => void;
  onNewBoard?: () => void;
  onCopyBoardLink?: () => void;
}

export function KanbanFilterBar({
  searchQuery,
  onSearchChange,
  selectedProjectId,
  onProjectChange,
  selectedAssigneeId,
  onAssigneeChange,
  selectedTypeId,
  onTypeChange,
  projects,
  taskTypes,
  users,
  totalTasks,
  completedTasks,
  onResetFilters,
  onNewTask,
  viewMode = "kanban",
  onViewModeChange,
  onPinNote,
  onLinkTask,
  onNewBoard,
  onCopyBoardLink,
}: KanbanFilterBarProps) {
  const isIdeaBoard = viewMode === "idea-board";
  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedAssigneeId !== "all" ||
    selectedTypeId !== "all";

  return (
    <div
      className={`shrink-0 flex flex-col gap-2 py-2 border-b transition-colors ${
        isIdeaBoard
          ? "border-amber-900/20 bg-[#eedbb8]/80 backdrop-blur-xs px-4 sm:px-8"
          : "border-border bg-background/50"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search & Selectors (or Idea Board Actions) */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* View Mode Toggle: Kanban / Folder toggle on one button, Idea Board on the other */}
          {onViewModeChange && (
            <div
              className={`flex items-center rounded-lg border p-0.5 ${
                isIdeaBoard
                  ? "bg-amber-900/10 border-amber-800/30 text-amber-950"
                  : "bg-muted/40 border-border"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  if (viewMode === "kanban") {
                    onViewModeChange("folder");
                  } else {
                    onViewModeChange("kanban");
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "kanban" || viewMode === "folder"
                    ? "bg-background text-foreground shadow-xs"
                    : isIdeaBoard
                    ? "text-amber-900/70 hover:text-amber-950"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={
                  viewMode === "folder"
                    ? "Switch to Kanban View"
                    : "Switch to Folder Structure View"
                }
              >
                {viewMode === "folder" ? (
                  <>
                    <FolderTree className="h-3.5 w-3.5 text-amber-500" />
                    <span>Folder Structure</span>
                  </>
                ) : (
                  <>
                    <LayoutGrid className="h-3.5 w-3.5 text-primary" />
                    <span>Kanban</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange("idea-board")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "idea-board"
                    ? "bg-amber-100 text-amber-950 shadow-xs font-bold border border-amber-300"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                <span>Idea Board</span>
              </button>
            </div>
          )}

          {/* When in Idea Board view: show + Pin Note, + Link Task and Copy Link */}
          {isIdeaBoard ? (
            <div className="flex items-center gap-2">
              {onPinNote && (
                <button
                  type="button"
                  onClick={onPinNote}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                  title="Create a new custom idea note or attachment"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ Pin Note</span>
                </button>
              )}
              {onLinkTask && (
                <button
                  type="button"
                  onClick={onLinkTask}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 active:scale-95 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                  title="Choose an existing task to link to the idea board"
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span>+ Link Task</span>
                </button>
              )}
              {onNewBoard && (
                <button
                  type="button"
                  onClick={onNewBoard}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 active:scale-95 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                  title="Create a new nested sub-idea board"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>+ New Board</span>
                </button>
              )}
              {onCopyBoardLink && (
                <button
                  type="button"
                  onClick={onCopyBoardLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100/80 hover:bg-amber-200/90 text-amber-950 border border-amber-800/30 text-xs font-semibold cursor-pointer shadow-xs transition-all active:scale-95"
                  title="Copy direct link to this Idea Board"
                >
                  <Share2 className="h-3.5 w-3.5 text-amber-800" />
                  <span>Copy Link</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Search Input */}
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange("")}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Assignee Filter */}
              <div className="w-40">
                <Select value={selectedAssigneeId} onValueChange={onAssigneeChange}>
                  <SelectTrigger className="h-9 text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <UserIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="Assignee" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.Name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Task Type Filter */}
              <div className="w-36">
                <Select value={selectedTypeId} onValueChange={onTypeChange}>
                  <SelectTrigger className="h-9 text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="Type" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {taskTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: t.color }}
                          />
                          <span>{t.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reset Filters Button */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onResetFilters}
                  className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5 mr-1" /> Clear
                </Button>
              )}
            </>
          )}
        </div>

        {/* Right Side: Metrics & New Task Button */}
        <div className="flex items-center gap-3">
          {!isIdeaBoard && (
            <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-foreground">{totalTasks}</span> root tasks
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {completedTasks}
                </span>{" "}
                completed
              </div>
            </div>
          )}

          {onNewTask && (
            <Button
              onClick={onNewTask}
              size="sm"
              className="shadow-sm gap-1.5 h-8 px-3 text-xs font-semibold cursor-pointer shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Task</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
