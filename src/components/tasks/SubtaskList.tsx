"use client";

import React, { useState } from "react";
import { Plus, Trash2, CheckCircle2, Circle, CornerDownRight, Loader2 } from "lucide-react";
import { Task, Status, TaskWithDetails } from "@/types/database.types";
import { createSubtask, deleteSubtask, toggleSubtaskStatus } from "@/lib/supabase/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SubtaskListProps {
  parentTaskId: string;
  initialSubtasks: TaskWithDetails[];
  statuses: Status[];
  onSubtasksUpdated?: (subtasks: TaskWithDetails[]) => void;
}

export function SubtaskList({
  parentTaskId,
  initialSubtasks = [],
  statuses = [],
  onSubtasksUpdated,
}: SubtaskListProps) {
  const [subtasks, setSubtasks] = useState<TaskWithDetails[]>(initialSubtasks);
  const [newSubtaskName, setNewSubtaskName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine which status corresponds to 'Done' and which to 'To Do'
  const doneStatus = statuses.find((s) => s.name.toLowerCase().includes("done")) || statuses[statuses.length - 1];
  const todoStatus = statuses.find((s) => s.name.toLowerCase().includes("to do") || s.name.toLowerCase().includes("todo")) || statuses[0];

  const completedCount = subtasks.filter((st) => st.status_id === doneStatus?.id).length;
  const progressPercent = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;

  const handleAddSubtask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newSubtaskName.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await createSubtask(parentTaskId, newSubtaskName.trim(), {
        status_id: todoStatus?.id,
      });
      const updated = [...subtasks, created];
      setSubtasks(updated);
      setNewSubtaskName("");
      onSubtasksUpdated?.(updated);
    } catch (err) {
      console.error("Failed to create subtask:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (subtask: Task) => {
    if (!doneStatus || !todoStatus) return;
    const isCurrentlyDone = subtask.status_id === doneStatus.id;
    const nextStatusId = isCurrentlyDone ? todoStatus.id : doneStatus.id;

    // Optimistic UI update
    const updated = subtasks.map((st) =>
      st.id === subtask.id ? { ...st, status_id: nextStatusId } : st
    );
    setSubtasks(updated);
    onSubtasksUpdated?.(updated);

    try {
      await toggleSubtaskStatus(
        subtask.id,
        parentTaskId,
        !isCurrentlyDone,
        doneStatus.id,
        todoStatus.id
      );
    } catch (err) {
      console.error("Failed to toggle subtask status:", err);
      // rollback
      setSubtasks(subtasks);
      onSubtasksUpdated?.(subtasks);
    }
  };

  const handleDelete = async (subtaskId: string) => {
    const updated = subtasks.filter((st) => st.id !== subtaskId);
    setSubtasks(updated);
    onSubtasksUpdated?.(updated);

    try {
      await deleteSubtask(subtaskId, parentTaskId);
    } catch (err) {
      console.error("Failed to delete subtask:", err);
      setSubtasks(subtasks);
      onSubtasksUpdated?.(subtasks);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CornerDownRight className="h-4 w-4 text-muted-foreground" />
          <label className="text-sm font-medium text-foreground">
            Subtasks ({subtasks.length})
          </label>
        </div>
        {subtasks.length > 0 && (
          <span className="text-xs text-muted-foreground font-medium">
            {completedCount} of {subtasks.length} done ({progressPercent}%)
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {subtasks.length > 0 && (
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Subtasks List */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {subtasks.map((st) => {
          const isDone = st.status_id === doneStatus?.id;
          return (
            <div
              key={st.id}
              className="group flex items-center justify-between rounded-md border border-border/70 bg-card/60 px-3 py-2 text-xs transition-colors hover:bg-muted/40"
            >
              <div
                className="flex items-center gap-2.5 flex-1 cursor-pointer select-none"
                onClick={() => handleToggle(st)}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/60 shrink-0 hover:text-foreground" />
                )}
                <span
                  className={`truncate ${
                    isDone ? "text-muted-foreground line-through" : "text-foreground font-medium"
                  }`}
                >
                  {st.name}
                </span>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground/50 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-transparent transition-opacity"
                onClick={() => handleDelete(st.id)}
                title="Delete subtask"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Add New Subtask Input */}
      <div className="flex items-center gap-2 pt-1">
        <Input
          placeholder="Add a new subtask..."
          value={newSubtaskName}
          onChange={(e) => setNewSubtaskName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddSubtask();
            }
          }}
          className="h-8 text-xs"
          disabled={isSubmitting}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8 px-3 text-xs shrink-0"
          onClick={() => handleAddSubtask()}
          disabled={isSubmitting || !newSubtaskName.trim()}
        >
          {isSubmitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

