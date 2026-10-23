"use client";

import React, { useState } from "react";
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Plus,
  ExternalLink,
  Layers,
  Paperclip,
  CheckCircle2,
  Circle,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  TaskWithDetails,
  Status,
  Project,
  TaskType,
  User,
} from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

interface FolderExplorerViewProps {
  tasks: TaskWithDetails[];
  projects: Project[];
  statuses: Status[];
  taskTypes: TaskType[];
  users: User[];
  onOpenTask: (task: TaskWithDetails) => void;
  onAddTask: (statusId?: string, parentTaskId?: string) => void;
  onDeleteTask: (taskId: string) => void;
}

interface TreeNodeProps {
  task: TaskWithDetails;
  depth?: number;
  statuses: Status[];
  onOpenTask: (task: TaskWithDetails) => void;
  onAddSubtask: (parentTaskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

function TreeNode({
  task,
  depth = 0,
  statuses,
  onOpenTask,
  onAddSubtask,
  onDeleteTask,
}: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(true);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const currentStatus = statuses.find((s) => s.id === task.status_id);

  // Compute directory path string
  const pathString = task.breadcrumbs
    ? task.breadcrumbs.map((b) => b.name).join("/")
    : task.name;

  const isOverdue = React.useMemo(() => {
    if (!task.due_date) return false;
    const due = new Date(task.due_date);
    const dueTime = task.due_date.includes("T")
      ? due.getTime()
      : new Date(due.getFullYear(), due.getMonth(), due.getDate(), 23, 59, 59, 999).getTime();
    return dueTime < Date.now();
  }, [task.due_date]);

  return (
    <div className="select-none">
      {/* Node Row */}
      <div
        className={`group flex items-center justify-between py-2.5 px-3 rounded-xl transition-all bg-card hover:bg-slate-100 dark:bg-card/70 dark:hover:bg-muted/60 border border-border/80 dark:border-border/60 hover:border-slate-300 dark:hover:border-border ${
          depth > 0 ? "ml-6" : ""
        }`}
        style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Disclosure Arrow */}
          {hasSubtasks ? (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground shrink-0"
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="w-5 shrink-0" />
          )}

          {/* Title & Path */}
          <div
            className="min-w-0 cursor-pointer flex-1"
            onClick={() => onOpenTask(task)}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground hover:text-primary transition-colors truncate">
                {task.name}
              </span>

              {/* Subtask count badge */}
              {hasSubtasks && (
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                  {task.subtasks.length} items
                </span>
              )}
            </div>

            {/* Directory Path Subtitle */}
            <div className="text-[11px] text-muted-foreground/70 font-mono truncate max-w-md">
              {pathString}
            </div>
          </div>
        </div>

        {/* Right Attributes */}
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {/* Status Badge */}
          {currentStatus && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border"
              style={{
                backgroundColor: `${currentStatus.color}15`,
                borderColor: `${currentStatus.color}40`,
                color: currentStatus.color,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: currentStatus.color }}
              />
              {currentStatus.name}
            </span>
          )}

          {/* Task Types Pills */}
          {task.task_types && task.task_types.length > 0 && (
            <div className="hidden sm:flex items-center gap-1">
              {task.task_types.map((type) => (
                <span
                  key={type.id}
                  className="px-2 py-0.5 rounded text-[10px] font-medium border"
                  style={{
                    backgroundColor: `${type.color}10`,
                    borderColor: `${type.color}30`,
                    color: type.color,
                  }}
                >
                  {type.name}
                </span>
              ))}
            </div>
          )}

          {/* Software Icons */}
          {task.softwares && task.softwares.length > 0 && (
            <div className="hidden md:flex items-center gap-1" title="Used softwares">
              {task.softwares.map((s) => (
                <div
                  key={s.id}
                  className="h-5 w-5 rounded bg-background border border-border/60 p-0.5 flex items-center justify-center"
                  title={s.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.icon_url} alt={s.name} className="h-full w-full object-contain" />
                </div>
              ))}
            </div>
          )}

          {/* Deadline */}
          {task.due_date && (
            <span
              className={`hidden sm:inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${
                isOverdue
                  ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 font-bold"
                  : "bg-muted text-muted-foreground border-border/50"
              }`}
            >
              <span>{isOverdue ? "Overdue: " : "Due: "}</span>
              {new Date(task.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          )}

          {/* Assignees Avatars */}
          {task.assignees && task.assignees.length > 0 && (
            <div className="flex items-center -space-x-1.5 overflow-hidden">
              {task.assignees.map((user) => (
                <Avatar key={user.id} className="h-6 w-6 ring-1 ring-background">
                  {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                  <AvatarFallback className="text-[8px]">
                    {getInitials(user.Name)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 gap-1 text-primary hover:text-primary hover:bg-primary/10"
              onClick={() => onOpenTask(task)}
              title="Open full task modal"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Open</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100"
              onClick={() => onAddSubtask(task.id)}
              title="Create nested subtask inside this folder"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
              onClick={() => onDeleteTask(task.id)}
              title="Delete task"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Children Nodes */}
      {hasSubtasks && isOpen && (
        <div className="relative border-l border-border/50 ml-4 pl-1 space-y-1 mt-1">
          {task.subtasks.map((child) => (
            <TreeNode
              key={child.id}
              task={child}
              depth={depth + 1}
              statuses={statuses}
              onOpenTask={onOpenTask}
              onAddSubtask={onAddSubtask}
              onDeleteTask={onDeleteTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderExplorerView({
  tasks,
  projects,
  statuses,
  taskTypes,
  users,
  onOpenTask,
  onAddTask,
  onDeleteTask,
}: FolderExplorerViewProps) {
  return (
    <div className="space-y-4">
      {/* Directory Root Banner */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-border/80 dark:border-border bg-card/90 dark:bg-card/60 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 shadow-xs">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              Folder & Task Directory Tree
            </h3>
            <p className="text-xs text-muted-foreground">
              Hierarchical explorer view with nested subtasks and directory paths.
            </p>
          </div>
        </div>

        <Button
          onClick={() => onAddTask()}
          size="sm"
          className="gap-1.5 h-8 text-xs shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Root Task</span>
        </Button>
      </div>

      {/* Folder Tree Container */}
      <div className="rounded-2xl border border-border/80 dark:border-border bg-muted/30 dark:bg-card p-4 space-y-2 shadow-xs min-h-[480px]">
        {tasks.map((task) => (
          <TreeNode
            key={task.id}
            task={task}
            depth={0}
            statuses={statuses}
            onOpenTask={onOpenTask}
            onAddSubtask={(parentId) => onAddTask(undefined, parentId)}
            onDeleteTask={onDeleteTask}
          />
        ))}

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Folder className="h-10 w-10 text-muted-foreground/30 mb-2" />
            <p className="text-sm font-medium">No tasks found</p>
            <p className="text-xs text-muted-foreground/70">
              Create a root task to start your directory tree.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs"
              onClick={() => onAddTask()}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Create Task
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

