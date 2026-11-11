"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TaskWithDetails } from "@/types/database.types";
import {
  Search,
  CheckSquare,
  Plus,
  Lightbulb,
  Calendar,
  Layers,
  ArrowRight,
  Filter,
} from "lucide-react";
import { PushPin } from "./PushPin";
import { formatDeadlineDate } from "@/lib/date-utils";

interface LinkTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableTasks: TaskWithDetails[];
  linkedTaskIds: Set<string>;
  onSelectTask: (task: TaskWithDetails) => void;
  onJumpToNote?: (taskId: string) => void;
  currentProjectId?: string | null;
}

export function LinkTaskModal({
  isOpen,
  onClose,
  availableTasks,
  linkedTaskIds,
  onSelectTask,
  onJumpToNote,
  currentProjectId,
}: LinkTaskModalProps) {
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "unlinked" | "linked">("all");

  // Filter tasks based on current project, search query and link status
  const filteredTasks = useMemo(() => {
    return availableTasks.filter((task) => {
      // 1. Project scope (if on a specific project board)
      if (
        currentProjectId &&
        currentProjectId !== "all" &&
        task.Project_id &&
        task.Project_id !== currentProjectId
      ) {
        return false;
      }

      // 2. Link filter mode
      const isLinked = linkedTaskIds.has(task.id);
      if (filterMode === "unlinked" && isLinked) return false;
      if (filterMode === "linked" && !isLinked) return false;

      // 3. Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = task.name.toLowerCase().includes(q);
        const matchesDesc = task.description?.toLowerCase().includes(q) ?? false;
        const matchesStatus = task.status?.name.toLowerCase().includes(q) ?? false;
        const matchesType = task.task_types?.some((t) => t.name.toLowerCase().includes(q)) ?? false;
        if (!matchesName && !matchesDesc && !matchesStatus && !matchesType) {
          return false;
        }
      }

      return true;
    });
  }, [availableTasks, currentProjectId, linkedTaskIds, filterMode, search]);

  const totalLinked = useMemo(() => {
    return availableTasks.filter((t) => linkedTaskIds.has(t.id)).length;
  }, [availableTasks, linkedTaskIds]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background border shadow-2xl">
        {/* Header */}
        <div className="p-5 pb-3 border-b bg-muted/20">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <PushPin color="red" size="sm" />
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>Link Task to Idea Board</span>
                <span className="text-xs font-normal text-muted-foreground px-2 py-0.5 rounded-full bg-muted border">
                  {totalLinked} of {availableTasks.length} linked
                </span>
              </DialogTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Choose an existing project task to pin onto your corkboard as an interactive clue note.
            </p>
          </DialogHeader>

          {/* Search & Quick Filters */}
          <div className="mt-4 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks by title, description or status..."
                className="pl-9 h-8 text-xs bg-background"
                autoFocus
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border text-[11px] shrink-0">
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                  filterMode === "all"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({availableTasks.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("unlinked")}
                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                  filterMode === "unlinked"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Available ({availableTasks.length - totalLinked})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("linked")}
                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                  filterMode === "linked"
                    ? "bg-background text-foreground shadow-2xs font-semibold text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Linked ({totalLinked})
              </button>
            </div>
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[260px] max-h-[460px]">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <CheckSquare className="h-8 w-8 mb-2 opacity-30 text-amber-600" />
              <p className="text-xs font-semibold text-foreground">No tasks found</p>
              <p className="text-[11px] mt-0.5">
                {search.trim()
                  ? "Try adjusting your search terms or filter."
                  : "All project tasks are already linked or no tasks exist."}
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isLinked = linkedTaskIds.has(task.id);
              const subtaskCount = task.subtasks?.length || 0;

              return (
                <div
                  key={task.id}
                  className={`group flex items-start justify-between gap-3 p-3 rounded-xl border transition-all ${
                    isLinked
                      ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300/60 dark:border-amber-900/40"
                      : "bg-card hover:bg-muted/40 border-border/80 hover:border-amber-400/60 shadow-2xs"
                  }`}
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Top Row: Status badge, Task Types & Linked Indicator */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {task.status && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border shadow-2xs"
                          style={{
                            backgroundColor: `${task.status.color}15`,
                            borderColor: `${task.status.color}40`,
                            color: task.status.color,
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: task.status.color }}
                          />
                          {task.status.name}
                        </span>
                      )}

                      {task.task_types?.map((type) => (
                        <span
                          key={type.id}
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium border bg-muted/40 text-muted-foreground"
                        >
                          {type.name}
                        </span>
                      ))}

                      {isLinked && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/40">
                          <Lightbulb className="h-3 w-3 fill-amber-500 text-amber-500" />
                          <span>Pinned on Board</span>
                        </span>
                      )}
                    </div>

                    {/* Task Title */}
                    <h4 className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
                      {task.name}
                    </h4>

                    {/* Task Description snippet */}
                    {task.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {task.description}
                      </p>
                    )}

                    {/* Meta details: due date & subtasks */}
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-0.5">
                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDeadlineDate(task.due_date)}</span>
                        </span>
                      )}
                      {subtaskCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          <span>{subtaskCount} subtasks</span>
                        </span>
                      )}
                      {task.project && (
                        <span className="truncate max-w-[140px] text-zinc-500">
                          📁 {task.project.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-1.5 pt-1">
                    {isLinked ? (
                      <div className="flex items-center gap-1">
                        {onJumpToNote && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              onJumpToNote(task.id);
                              onClose();
                            }}
                            className="h-7 px-2.5 text-xs gap-1 border-amber-400/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                            title="Jump to existing note on board"
                          >
                            <span>View</span>
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            onSelectTask(task);
                            onClose();
                          }}
                          className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                          title="Pin another copy of this task note"
                        >
                          + Pin Again
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          onSelectTask(task);
                          onClose();
                        }}
                        className="h-7 px-3 text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Link to Board</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Click <strong>Link to Board</strong> to place a connected clue note on your board.
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 px-3 text-xs"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
