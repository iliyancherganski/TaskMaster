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
  viewMode?: "kanban" | "folder";
  onViewModeChange?: (mode: "kanban" | "folder") => void;
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
  viewMode = "kanban",
  onViewModeChange,
}: KanbanFilterBarProps) {
  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedProjectId !== "all" ||
    selectedAssigneeId !== "all" ||
    selectedTypeId !== "all";

  return (
    <div className="flex flex-col gap-2 py-2 border-b bg-background/50">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search & Selectors */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* View Mode Toggle */}
          {onViewModeChange && (
            <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => onViewModeChange("kanban")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  viewMode === "kanban"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange("folder")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  viewMode === "folder"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FolderTree className="h-3.5 w-3.5 text-amber-500" />
                <span>Folder Structure</span>
              </button>
            </div>
          )}

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
        </div>

        {/* Sprint Summary Metrics */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
      </div>
    </div>
  );
}
