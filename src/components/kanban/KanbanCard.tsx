"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  MoreVertical,
  CheckSquare,
  Paperclip,
  Calendar,
  Pencil,
  Trash2,
  GripVertical,
  ImageIcon,
  ExternalLink,
  FolderKanban,
} from "lucide-react";
import { TaskWithDetails, Status } from "@/types/database.types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";

interface KanbanCardProps {
  task: TaskWithDetails;
  status?: Status;
  isOverlay?: boolean;
  onEdit?: (task: TaskWithDetails) => void;
  onDelete?: (taskId: string) => void;
  onOpenSubtask?: (subtask: TaskWithDetails) => void;
}

export function KanbanCard({
  task,
  status,
  isOverlay = false,
  onEdit,
  onDelete,
  onOpenSubtask,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
    },
    disabled: isOverlay,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const completedSubtasks =
    task.subtasks?.filter(
      (st) => st.status_id === "status-5" || (st as any).completed
    ).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  const totalAttachments =
    task.resources?.reduce((acc, res) => acc + (res.files?.length || 0), 0) || 0;

  // Check for cover image
  const firstImageResource = task.resources?.find((r) => {
    const url = r.files?.[0]?.Url || "";
    const isImage = /\.(jpeg|jpg|gif|png|webp|svg|bmp|avif)/i;
    return isImage.test(r.name) || isImage.test(url);
  });
  const coverImageUrl = firstImageResource?.files?.[0]?.Url;

  const isOverdue = React.useMemo(() => {
    if (!task.due_date) return false;
    const due = new Date(task.due_date);
    const dueTime = task.due_date.includes("T")
      ? due.getTime()
      : new Date(due.getFullYear(), due.getMonth(), due.getDate(), 23, 59, 59, 999).getTime();
    return dueTime < Date.now();
  }, [task.due_date]);

  const isEdited = React.useMemo(() => {
    if (!task.updated_at || !task.created_at) return false;
    return new Date(task.updated_at).getTime() - new Date(task.created_at).getTime() > 1000;
  }, [task.created_at, task.updated_at]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onEdit?.(task)}
      className={`group relative rounded-xl border bg-card text-card-foreground border-border/80 shadow-xs transition-all duration-200 select-none overflow-hidden cursor-pointer ${
        isDragging ? "opacity-30 border-dashed border-primary" : "hover:shadow-md hover:border-slate-400/80 dark:hover:border-border"
      } ${isOverlay ? "rotate-2 shadow-2xl ring-2 ring-primary scale-105 cursor-grabbing" : ""}`}
    >
      {/* Status top accent color line */}
      {status && (
        <div
          className="h-1 w-full"
          style={{ backgroundColor: status.color }}
        />
      )}

      {/* Real Cover Image Display */}
      {coverImageUrl && (
        <div
          className="relative h-28 w-full bg-slate-900/5 dark:bg-slate-900/40 overflow-hidden border-b border-border/50"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImageUrl}
            alt={firstImageResource?.name || "Task image"}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      <div className="p-3.5 space-y-3">
        {/* Header: TaskTypes pills & Quick Dropdown */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {task.task_types && task.task_types.length > 0 ? (
              task.task_types.map((type) => (
                <span
                  key={type.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border shadow-2xs"
                  style={{
                    backgroundColor: `${type.color}15`,
                    borderColor: `${type.color}40`,
                    color: type.color,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: type.color }}
                  />
                  {type.name}
                </span>
              ))
            ) : (
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Task
              </span>
            )}
          </div>

          <div
            className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <button
              type="button"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing hover:bg-muted"
              title="Drag task"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>

            {/* Menu Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem
                  onClick={() => onEdit?.(task)}
                  className="cursor-pointer gap-2"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete?.(task.id)}
                  className="cursor-pointer text-destructive focus:text-destructive gap-2"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content: Left side (Task Name, Description, Project, Subtasks) + Right side (Softwares) */}
        <div className="flex items-start gap-2.5">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Task Name & Description */}
            <div className="space-y-1">
              <h4 className="text-sm font-semibold leading-snug text-foreground hover:text-primary transition-colors line-clamp-2">
                {task.name}
              </h4>
              {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {task.description}
                </p>
              )}
            </div>

            {/* Project Tag */}
            {task.project && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                <FolderKanban className="h-3 w-3 text-primary/80 shrink-0" />
                <span className="truncate max-w-[180px] text-slate-500 dark:text-slate-400">
                  {task.project.name}
                </span>
              </div>
            )}

            {/* First 3 Subtasks Preview with Direct Links */}
            {task.subtasks && task.subtasks.length > 0 && (
              <div className="space-y-1.5 pt-1.5 border-t border-border/50">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Subtasks ({task.subtasks.length})</span>
                  {task.subtasks.length > 3 && (
                    <span className="text-[9px] text-muted-foreground/70 lowercase font-normal">
                      +{task.subtasks.length - 3} more
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {task.subtasks.slice(0, 3).map((st) => {
                    const isStDone =
                      st.status_id === "status-5" ||
                      st.status?.name?.toLowerCase().includes("done") ||
                      (st as any).completed;

                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenSubtask) {
                            onOpenSubtask(st);
                          } else {
                            onEdit?.(st);
                          }
                        }}
                        className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/40 hover:bg-muted/80 text-left text-xs transition-colors group/st border border-border/40"
                        title={`Open subtask: ${st.name}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                            isStDone ? "bg-emerald-500" : "bg-primary/70"
                          }`}
                        />
                        <span
                          className={`truncate flex-1 text-[11px] font-medium ${
                            isStDone
                              ? "line-through text-muted-foreground"
                              : "text-foreground group-hover/st:text-primary"
                          }`}
                        >
                          {st.name}
                        </span>
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover/st:opacity-80 shrink-0 text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right side Software icons column(s) */}
          {task.softwares && task.softwares.length > 0 && (
            <div
              className={`shrink-0 ${
                task.softwares.length >= 6
                  ? "grid grid-cols-3 gap-1"
                  : task.softwares.length >= 4
                  ? "grid grid-cols-2 gap-1"
                  : "flex flex-col gap-1.5"
              } p-1 bg-muted/30 dark:bg-muted/20 rounded-lg border border-border/40 self-start`}
              title={`Used softwares: ${task.softwares.map((s) => s.name).join(", ")}`}
            >
              {task.softwares.map((software) => (
                <div
                  key={software.id}
                  className="h-6 w-6 rounded-md bg-background/95 dark:bg-card/90 border border-border/70 p-0.5 flex items-center justify-center shadow-2xs hover:scale-115 transition-transform"
                  title={software.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={software.icon_url}
                    alt={software.name}
                    className="h-full w-full object-contain"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dates Row: Date posted, Date & time edited (if edited), and Deadline */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50 text-[10px] text-muted-foreground/80">
          <div className="flex items-center gap-1.5 truncate">
            <span
              className="truncate"
              title={`Date posted: ${new Date(task.created_at).toLocaleString()}`}
            >
              Posted {new Date(task.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
            {isEdited && (
              <span
                className="text-muted-foreground/60 italic truncate"
                title={`Date & time edited: ${new Date(task.updated_at).toLocaleString()}`}
              >
                • edited {new Date(task.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}{" "}
                {new Date(task.updated_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>

          {task.due_date && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border shrink-0 transition-colors ${
                isOverdue
                  ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 font-bold"
                  : "bg-muted/60 text-muted-foreground border-border/50"
              }`}
              title={
                isOverdue
                  ? `Overdue deadline: ${new Date(task.due_date).toLocaleString()}`
                  : `Deadline: ${new Date(task.due_date).toLocaleString()}`
              }
            >
              <Calendar className={`h-3 w-3 ${isOverdue ? "text-red-500 stroke-[2.5]" : ""}`} />
              <span>
                {isOverdue ? "Overdue: " : "Due: "}
                {new Date(task.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </span>
          )}
        </div>

        {/* Card Footer: Metadata & Assignees */}
        <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            {/* Subtasks Count & Progress Bar */}
            {totalSubtasks > 0 && (
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                  completedSubtasks === totalSubtasks
                    ? "text-emerald-500 font-semibold"
                    : "text-muted-foreground"
                }`}
                title={`${completedSubtasks} of ${totalSubtasks} subtasks completed (${Math.round(
                  (completedSubtasks / totalSubtasks) * 100
                )}%)`}
              >
                <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {completedSubtasks}/{totalSubtasks}
                </span>
                <span className="inline-block h-1.5 w-10 bg-muted/80 rounded-full overflow-hidden shrink-0 border border-border/40">
                  <span
                    className="block h-full bg-emerald-500 rounded-full transition-all"
                    style={{
                      width: `${Math.round((completedSubtasks / totalSubtasks) * 100)}%`,
                    }}
                  />
                </span>
              </span>
            )}

            {/* Attachments Count */}
            {totalAttachments > 0 && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-medium hover:text-foreground"
                title={`${totalAttachments} attachment(s)`}
              >
                <Paperclip className="h-3.5 w-3.5" />
                <span>{totalAttachments}</span>
              </span>
            )}
          </div>

          {/* Assignees Avatars */}
          <div className="flex items-center -space-x-1.5 overflow-hidden">
            {task.assignees && task.assignees.length > 0 ? (
              task.assignees.map((user) => (
                <Avatar
                  key={user.id}
                  className="h-6 w-6 ring-2 ring-background transition-transform hover:scale-110 hover:z-10"
                  title={user.Name}
                >
                  {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.Name} />}
                  <AvatarFallback className="text-[9px] bg-slate-200 dark:bg-slate-700">
                    {getInitials(user.Name)}
                  </AvatarFallback>
                </Avatar>
              ))
            ) : (
              <span className="text-[10px] text-muted-foreground/60 italic">Unassigned</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
