"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, MoreHorizontal, Pencil, Trash2, Palette } from "lucide-react";
import { Status, TaskWithDetails } from "@/types/database.types";
import { KanbanCard } from "./KanbanCard";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface KanbanColumnProps {
  status: Status;
  tasks: TaskWithDetails[];
  onAddTask: (statusId: string) => void;
  onEditTask: (task: TaskWithDetails) => void;
  onDeleteTask: (taskId: string) => void;
  onEditColumn?: (status: Status) => void;
  onDeleteColumn?: (statusId: string) => void;
  onOpenSubtask?: (subtask: TaskWithDetails) => void;
}

export function KanbanColumn({
  status,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onEditColumn,
  onDeleteColumn,
  onOpenSubtask,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
    data: {
      type: "Column",
      status,
    },
  });

  const taskIds = tasks.map((t) => t.id);

  return (
    <div
      ref={setNodeRef}
      style={{
        backgroundColor: isOver ? `${status.color}25` : `${status.color}14`,
        borderColor: isOver ? `${status.color}70` : `${status.color}35`,
      }}
      className={`flex flex-col w-80 shrink-0 rounded-2xl border transition-all duration-200 ${
        isOver ? "ring-2 shadow-md" : "shadow-xs"
      }`}
    >
      {/* Column Header */}
      <div
        className="flex items-center justify-between p-3.5 border-b"
        style={{ borderBottomColor: `${status.color}25` }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Status Color Dot */}
          <span
            className="h-3 w-3 rounded-full shadow-sm shrink-0"
            style={{ backgroundColor: status.color }}
          />
          <h3 className="font-semibold text-sm tracking-tight text-foreground truncate">
            {status.name}
          </h3>
          <span
            className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold shrink-0 border"
            style={{
              backgroundColor: `${status.color}18`,
              borderColor: `${status.color}40`,
              color: status.color,
            }}
          >
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => onAddTask(status.id)}
            title={`Add task to ${status.name}`}
          >
            <Plus className="h-4 w-4" />
          </Button>

          {/* Column Options Menu */}
          {(onEditColumn || onDeleteColumn) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  title="Column options"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 text-xs">
                {onEditColumn && (
                  <DropdownMenuItem
                    onClick={() => onEditColumn(status)}
                    className="cursor-pointer gap-2"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit Label & Color</span>
                  </DropdownMenuItem>
                )}
                {onDeleteColumn && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDeleteColumn(status.id)}
                      className="cursor-pointer text-destructive focus:text-destructive gap-2"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete Column</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Description / Subtext if available */}
      {status.description && (
        <div className="px-3.5 pt-2 text-[11px] text-muted-foreground truncate">
          {status.description}
        </div>
      )}

      {/* Tasks List */}
      <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto min-h-[450px]">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              status={status}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onOpenSubtask={onOpenSubtask}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-4 text-center">
            <p className="text-xs text-muted-foreground">No tasks in this column</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-xs text-primary hover:text-primary/80"
              onClick={() => onAddTask(status.id)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add a task
            </Button>
          </div>
        )}
      </div>

      {/* Bottom Quick Add Button */}
      <div className="p-2 border-t border-slate-400/40 dark:border-border/40">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs font-medium text-slate-700 dark:text-muted-foreground hover:text-foreground hover:bg-slate-400/25 dark:hover:bg-background/80"
          onClick={() => onAddTask(status.id)}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New task
        </Button>
      </div>
    </div>
  );
}
