"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Folder,
  FolderOpen,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Layers,
  Users as UsersIcon,
  Loader2,
  CornerDownRight,
  GripVertical,
  ListTree,
  List,
  LayoutGrid,
  CheckSquare,
  Calendar,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  TaskWithDetails,
  Status,
  Project,
  TaskType,
  User,
  Software,
  TaskFormData,
} from "@/types/database.types";
import { createTask, deleteTask, toggleSubtaskStatus } from "@/lib/supabase/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { formatDeadlineDate, getDeadlineTimeRemaining } from "@/lib/date-utils";

export type SubtaskViewMode = "rows" | "cards";

interface FolderTreeListProps {
  parentTask: TaskWithDetails;
  statuses: Status[];
  projects: Project[];
  taskTypes: TaskType[];
  softwares?: Software[];
  users: User[];
  onSubtasksUpdated?: (updatedSubtasks: TaskWithDetails[]) => void;
  onOpenSubtask?: (subtask: TaskWithDetails) => void;
}

interface SortableSubtaskItemProps {
  st: TaskWithDetails;
  doneStatus?: Status;
  statuses: Status[];
  onToggle: (st: TaskWithDetails) => void;
  onOpenSubtask?: (st: TaskWithDetails) => void;
  onDelete: (st: TaskWithDetails) => void;
}

function SortableSubtaskItem({
  st,
  doneStatus,
  statuses,
  onToggle,
  onOpenSubtask,
  onDelete,
}: SortableSubtaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: st.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isDone = st.status_id === doneStatus?.id;
  const currentStatus = statuses.find((s) => s.id === st.status_id);
  const hasChildren = st.subtasks && st.subtasks.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center justify-between rounded-lg border border-border/70 bg-background/80 px-2.5 py-2 text-xs transition-all hover:bg-muted/40 hover:border-primary/40 hover:shadow-xs ${
        isDragging ? "opacity-50 ring-2 ring-primary border-primary z-50 bg-background shadow-md" : ""
      }`}
    >
      {/* Tree connector indicator & Drag Handle */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Drag handle button */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 rounded text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 shrink-0"
          title="Drag to reorder subtask"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        {/* Status Toggle */}
        <button
          type="button"
          onClick={() => onToggle(st)}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          title={isDone ? "Mark Incomplete" : "Mark Done"}
        >
          {isDone ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground/60 hover:text-foreground" />
          )}
        </button>

        {/* Title and metadata */}
        <div
          className="min-w-0 cursor-pointer flex-1"
          onClick={() => onOpenSubtask?.(st)}
          title="Click to drill into this task"
        >
          <div className="flex items-center gap-2">
            <span
              className={`font-medium truncate ${
                isDone
                  ? "line-through text-muted-foreground"
                  : "text-foreground group-hover:text-primary transition-colors"
              }`}
            >
              {st.name}
            </span>
            {hasChildren && (
              <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground">
                {st.subtasks.length} subtask{st.subtasks.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Metadata & Action Buttons */}
      <div className="flex items-center gap-2 shrink-0 ml-3">
        {/* Status color badge */}
        {currentStatus && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border"
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

        {/* Assignees Avatars */}
        {st.assignees && st.assignees.length > 0 && (
          <div className="flex items-center -space-x-1.5">
            {st.assignees.slice(0, 2).map((user) => (
              <Avatar key={user.id} className="h-5 w-5 ring-1 ring-background">
                {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                <AvatarFallback className="text-[8px]">
                  {getInitials(user.Name)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        )}

        {/* Drill-in Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] gap-1 text-primary hover:text-primary hover:bg-primary/10"
          onClick={() => onOpenSubtask?.(st)}
          title="Drill into task (opens full task object)"
        >
          <span>Open</span>
          <ExternalLink className="h-3 w-3" />
        </Button>

        {/* Delete button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground/60 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-transparent"
          onClick={() => onDelete(st)}
          title="Delete subtask"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

interface SortableSubtaskCardProps {
  st: TaskWithDetails;
  doneStatus?: Status;
  statuses: Status[];
  onToggle: (st: TaskWithDetails) => void;
  onOpenSubtask?: (st: TaskWithDetails) => void;
  onDelete: (st: TaskWithDetails) => void;
}

function SortableSubtaskCard({
  st,
  doneStatus,
  statuses,
  onToggle,
  onOpenSubtask,
  onDelete,
}: SortableSubtaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: st.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isDone = st.status_id === doneStatus?.id || st.status?.name?.toLowerCase().includes("done");
  const currentStatus = statuses.find((s) => s.id === st.status_id) || st.status;

  // First image from subtask resources
  const firstImageResource = st.resources?.find((r) => {
    const url = r.files?.[0]?.Url || "";
    const isImage = /\.(jpeg|jpg|gif|png|webp|svg|bmp|avif)/i;
    return isImage.test(r.name) || isImage.test(url);
  });
  const coverImageUrl = firstImageResource?.files?.[0]?.Url;

  // Nested subtasks info
  const completedSubtasks =
    st.subtasks?.filter(
      (sub) => sub.status_id === doneStatus?.id || sub.status?.name?.toLowerCase().includes("done")
    ).length || 0;
  const totalSubtasks = st.subtasks?.length || 0;

  // Deadline info
  const isOverdue = React.useMemo(() => {
    if (!st.due_date) return false;
    const due = new Date(st.due_date);
    const dueTime = st.due_date.includes("T")
      ? due.getTime()
      : new Date(due.getFullYear(), due.getMonth(), due.getDate(), 23, 59, 59, 999).getTime();
    return dueTime < Date.now();
  }, [st.due_date]);

  const deadlineRemaining = React.useMemo(() => {
    return getDeadlineTimeRemaining(st.due_date);
  }, [st.due_date]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-xl border bg-card text-card-foreground border-border/80 shadow-xs transition-all duration-200 select-none overflow-hidden flex flex-col justify-between ${
        isDragging
          ? "opacity-50 ring-2 ring-primary border-primary z-50 bg-background shadow-xl"
          : "hover:shadow-md hover:border-slate-400/80 dark:hover:border-border"
      }`}
    >
      <div>
        {/* Status top accent color line */}
        {currentStatus && (
          <div
            className="h-1 w-full"
            style={{ backgroundColor: currentStatus.color }}
          />
        )}

        {/* Cover Image (first image from subtask) */}
        {coverImageUrl && (
          <div
            onClick={() => onOpenSubtask?.(st)}
            className="relative h-28 w-full bg-slate-900/5 dark:bg-slate-900/40 overflow-hidden border-b border-border/50 cursor-pointer"
          >
            <img
              src={coverImageUrl}
              alt={firstImageResource?.name || st.name}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}

        <div className="p-3 space-y-2.5">
          {/* Header Row: Task Types Pills & Actions/Drag handle */}
          <div className="flex items-start justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1 min-w-0 flex-1">
              {st.task_types && st.task_types.length > 0 ? (
                st.task_types.map((type) => (
                  <span
                    key={type.id}
                    className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-semibold tracking-wide border shadow-2xs"
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
                  Subtask
                </span>
              )}
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              {/* Drag handle button */}
              <button
                type="button"
                {...attributes}
                {...listeners}
                className="p-1 rounded text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                title="Drag to reorder subtask"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </button>

              {/* Open Drill-in Button */}
              <button
                type="button"
                onClick={() => onOpenSubtask?.(st)}
                className="p-1 rounded text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors"
                title="Open subtask details"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>

              {/* Delete button */}
              <button
                type="button"
                onClick={() => onDelete(st)}
                className="p-1 rounded text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                title="Delete subtask"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Subtask Title & Status Checkbox */}
          <div className="space-y-1">
            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => onToggle(st)}
                className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                title={isDone ? "Mark Incomplete" : "Mark Done"}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/60 hover:text-foreground" />
                )}
              </button>

              <h5
                onClick={() => onOpenSubtask?.(st)}
                className={`text-xs font-semibold leading-snug cursor-pointer line-clamp-2 transition-colors ${
                  isDone
                    ? "line-through text-muted-foreground"
                    : "text-foreground hover:text-primary"
                }`}
                title={st.name}
              >
                {st.name}
              </h5>
            </div>

            {st.description && (
              <p className="text-[11px] text-muted-foreground line-clamp-2 pl-6 leading-relaxed">
                {st.description}
              </p>
            )}
          </div>

          {/* Status & Technologies Row */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
            {/* Status badge */}
            {currentStatus && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border"
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

            {/* Technologies used (softwares) */}
            {st.softwares && st.softwares.length > 0 && (
              <div
                className="flex items-center gap-1 flex-wrap"
                title={`Used softwares: ${st.softwares.map((s) => s.name).join(", ")}`}
              >
                {st.softwares.map((software) => (
                  <div
                    key={software.id}
                    className="h-5 w-5 rounded-md bg-background border border-border/70 p-0.5 flex items-center justify-center shadow-2xs hover:scale-115 transition-transform"
                    title={software.name}
                  >
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

          {/* Nested Subtasks Badge (if any) */}
          {totalSubtasks > 0 && (
            <div
              className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground"
              title={`${completedSubtasks} of ${totalSubtasks} nested subtasks completed`}
            >
              <CheckSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-medium text-[11px]">
                {completedSubtasks}/{totalSubtasks} subtasks
              </span>
              <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden border border-border/40">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{
                    width: `${Math.round((completedSubtasks / totalSubtasks) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: Assignees & Deadline */}
      <div className="flex items-center justify-between gap-1.5 px-3 py-2 border-t border-border/50 bg-muted/20 text-[10px]">
        {/* Assignees */}
        <div className="flex items-center -space-x-1.5 min-w-0">
          {st.assignees && st.assignees.length > 0 ? (
            st.assignees.map((user) => (
              <Avatar key={user.id} className="h-5 w-5 ring-1 ring-background">
                {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                <AvatarFallback className="text-[8px]">
                  {getInitials(user.Name)}
                </AvatarFallback>
              </Avatar>
            ))
          ) : (
            <span className="text-[10px] text-muted-foreground/60 italic">Unassigned</span>
          )}
        </div>

        {/* Deadline (if there is any) */}
        {st.due_date ? (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border shrink-0 transition-colors ${
              isOverdue
                ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 font-bold"
                : "bg-background/80 text-muted-foreground border-border/60"
            }`}
            title={
              isOverdue
                ? `Overdue deadline: ${formatDeadlineDate(st.due_date)}`
                : `Deadline: ${formatDeadlineDate(st.due_date)}`
            }
          >
            <Calendar className={`h-3 w-3 ${isOverdue ? "text-red-500 stroke-[2.5]" : ""}`} />
            <span className="truncate max-w-[110px]">{formatDeadlineDate(st.due_date)}</span>
            {deadlineRemaining && (
              <span className={`text-[9px] px-1 py-0.2 rounded border font-semibold ${deadlineRemaining.badgeStyle}`}>
                {deadlineRemaining.shortLabel}
              </span>
            )}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/50">No deadline</span>
        )}
      </div>
    </div>
  );
}

const getSavedViewMode = (taskId: string): SubtaskViewMode => {
  if (typeof window === "undefined") return "rows";
  try {
    const taskPref = localStorage.getItem(`taskmaster_subtask_view_${taskId}`);
    if (taskPref === "rows" || taskPref === "cards") {
      return taskPref;
    }
    const defaultPref = localStorage.getItem("taskmaster_subtask_view_default");
    if (defaultPref === "rows" || defaultPref === "cards") {
      return defaultPref;
    }
  } catch (e) {
    console.warn("Failed to read subtask view preference:", e);
  }
  return "rows";
};

export function FolderTreeList({
  parentTask,
  statuses,
  projects,
  taskTypes,
  softwares = [],
  users,
  onSubtasksUpdated,
  onOpenSubtask,
}: FolderTreeListProps) {
  const [subtasks, setSubtasks] = useState<TaskWithDetails[]>(parentTask.subtasks || []);
  const [viewMode, setViewMode] = useState<SubtaskViewMode>(() => getSavedViewMode(parentTask.id));

  // Sync preference whenever the active parent task changes
  useEffect(() => {
    setViewMode(getSavedViewMode(parentTask.id));
  }, [parentTask.id]);

  const handleViewModeChange = (mode: SubtaskViewMode) => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`taskmaster_subtask_view_${parentTask.id}`, mode);
        localStorage.setItem("taskmaster_subtask_view_default", mode);
      } catch (e) {
        console.warn("Failed to save subtask view preference:", e);
      }
    }
  };

  const [showFullCreate, setShowFullCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStatusId, setNewStatusId] = useState(statuses[0]?.id || "");
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subtaskToDelete, setSubtaskToDelete] = useState<TaskWithDetails | null>(null);
  const [isDeletingSubtask, setIsDeletingSubtask] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = subtasks.findIndex((s) => s.id === active.id);
    const newIndex = subtasks.findIndex((s) => s.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(subtasks, oldIndex, newIndex);
      setSubtasks(reordered);
      onSubtasksUpdated?.(reordered);
    }
  };

  // Sync subtasks if parentTask changes
  React.useEffect(() => {
    setSubtasks(parentTask.subtasks || []);
  }, [parentTask.subtasks]);

  const doneStatus = statuses.find((s) => s.name.toLowerCase().includes("done")) || statuses[statuses.length - 1];
  const todoStatus = statuses.find((s) => s.name.toLowerCase().includes("to do") || s.name.toLowerCase().includes("todo")) || statuses[0];

  const completedCount = subtasks.filter((st) => st.status_id === doneStatus?.id).length;
  const progress = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;

  const handleCreateSubtask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const formData: TaskFormData = {
        name: newTitle.trim(),
        description: newDescription.trim() || undefined,
        status_id: newStatusId || todoStatus?.id,
        Project_id: parentTask.Project_id || undefined,
        Task_Parent_Id: parentTask.id, // Linked as child subtask!
        task_type_ids: selectedTypeIds,
        assignee_ids: selectedUserIds,
      };

      const created = await createTask(formData);
      const updated = [...subtasks, created];
      setSubtasks(updated);
      onSubtasksUpdated?.(updated);

      // Reset form
      setNewTitle("");
      setNewDescription("");
      setSelectedTypeIds([]);
      setSelectedUserIds([]);
      setShowFullCreate(false);
    } catch (err) {
      console.error("Failed to create subtask:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (st: TaskWithDetails) => {
    if (!doneStatus || !todoStatus) return;
    const isDone = st.status_id === doneStatus.id;
    const nextStatusId = isDone ? todoStatus.id : doneStatus.id;

    const updated = subtasks.map((item) =>
      item.id === st.id ? { ...item, status_id: nextStatusId } : item
    );
    setSubtasks(updated);
    onSubtasksUpdated?.(updated);

    try {
      await toggleSubtaskStatus(
        st.id,
        parentTask.id,
        !isDone,
        doneStatus.id,
        todoStatus.id
      );
    } catch (err) {
      console.error("Failed to toggle subtask:", err);
    }
  };

  const handleDelete = async (subtaskId: string) => {
    const updated = subtasks.filter((st) => st.id !== subtaskId);
    setSubtasks(updated);
    onSubtasksUpdated?.(updated);

    try {
      await deleteTask(subtaskId);
    } catch (err) {
      console.error("Failed to delete subtask:", err);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Subtasks Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary">
            <ListTree className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              Subtasks Directory ({subtasks.length})
            </h4>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Two Tabs View Switcher (Rows / Cards) */}
          <div className="flex items-center rounded-lg bg-muted/80 p-0.5 border border-border/70 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => handleViewModeChange("rows")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                viewMode === "rows"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Rows / List View"
            >
              <List className="h-3.5 w-3.5" />
              <span>Rows</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange("cards")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                viewMode === "cards"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Cards View (Kanban style)"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Cards</span>
            </button>
          </div>

          {subtasks.length > 0 && (
            <div className="flex items-center gap-3 bg-muted/40 px-3 py-1 rounded-xl border border-border/70">
              <div className="text-right flex items-baseline gap-1.5">
                <span className="text-xs font-bold text-foreground">
                  {progress}%
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  ({completedCount}/{subtasks.length} done)
                </span>
              </div>
              {/* Prominent progress bar */}
              <div className="h-2.5 w-24 sm:w-36 bg-muted rounded-full overflow-hidden p-0.5 border border-border/80 shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    progress === 100
                      ? "bg-emerald-500"
                      : progress > 50
                      ? "bg-emerald-500"
                      : "bg-primary"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Visual Directory: TAB 1 (Rows View) vs TAB 2 (Cards View) */}
      {viewMode === "rows" ? (
        /* TAB 1: Rows View */
        <div className="rounded-xl border bg-card/60 divide-y divide-border/60 overflow-hidden shadow-2xs">
          {/* Parent Header Bar */}
          <div className="flex items-center gap-2 px-3.5 py-2 bg-muted/40 text-xs font-mono text-muted-foreground border-b">
            <span className="font-semibold text-foreground truncate max-w-[240px]">
              {parentTask.name}
            </span>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-[11px] text-muted-foreground italic">
              {subtasks.length} nested task object{subtasks.length === 1 ? "" : "s"}
            </span>
          </div>

          {/* Tree Items with Drag and Drop Reordering */}
          <div className="p-2 space-y-1.5 max-h-72 overflow-y-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={subtasks.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {subtasks.map((st) => (
                  <SortableSubtaskItem
                    key={st.id}
                    st={st}
                    doneStatus={doneStatus}
                    statuses={statuses}
                    onToggle={handleToggle}
                    onOpenSubtask={onOpenSubtask}
                    onDelete={(target) => setSubtaskToDelete(target)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {subtasks.length === 0 && (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <ListTree className="h-8 w-8 mx-auto mb-1.5 text-muted-foreground/30" />
                <p>No subtasks yet. Create subtasks below to build a hierarchy.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TAB 2: Cards View (Kanban style) */
        <div className="rounded-xl border bg-card/40 p-3 overflow-hidden shadow-2xs">
          {/* Parent Header Bar */}
          <div className="flex items-center gap-2 px-1 pb-2.5 mb-2.5 text-xs font-mono text-muted-foreground border-b border-border/60">
            <span className="font-semibold text-foreground truncate max-w-[240px]">
              {parentTask.name}
            </span>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-[11px] text-muted-foreground italic">
              {subtasks.length} nested task card{subtasks.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="max-h-[520px] overflow-y-auto pr-1">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={subtasks.map((s) => s.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {subtasks.map((st) => (
                    <SortableSubtaskCard
                      key={st.id}
                      st={st}
                      doneStatus={doneStatus}
                      statuses={statuses}
                      onToggle={handleToggle}
                      onOpenSubtask={onOpenSubtask}
                      onDelete={(target) => setSubtaskToDelete(target)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {subtasks.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <LayoutGrid className="h-8 w-8 mx-auto mb-1.5 text-muted-foreground/30" />
                <p>No subtasks yet. Create subtasks below to build a hierarchy.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtask Creation Section */}
      <div className="rounded-xl border border-dashed border-border/80 p-3 bg-muted/20">
        {!showFullCreate ? (
          /* Quick Creation Bar */
          <div className="flex items-center gap-2">
            <Input
              placeholder={`Add subtask to ${parentTask.name}...`}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateSubtask();
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
              onClick={() => handleCreateSubtask()}
              disabled={isSubmitting || !newTitle.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Quick Add
                </>
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 px-2 text-xs shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setShowFullCreate(true)}
              title="Add subtask with full properties"
            >
              Full Form
            </Button>
          </div>
        ) : (
          /* Full Task Object Subtask Creation Form */
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5 text-primary" /> Create Full Subtask Object
              </span>
              <button
                type="button"
                onClick={() => setShowFullCreate(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>

            <Input
              placeholder="Subtask name *"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="h-8 text-xs font-medium"
              autoFocus
            />

            <Textarea
              placeholder="Subtask description..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
              className="text-xs"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Status Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                  Status
                </label>
                <Select value={newStatusId} onValueChange={setNewStatusId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((st) => (
                      <SelectItem key={st.id} value={st.id} className="text-xs">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: st.color }}
                          />
                          <span>{st.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Task Types Pills */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                  Task Types
                </label>
                <div className="flex flex-wrap gap-1">
                  {taskTypes.map((type) => {
                    const isSelected = selectedTypeIds.includes(type.id);
                    return (
                      <button
                        type="button"
                        key={type.id}
                        onClick={() =>
                          setSelectedTypeIds((prev) =>
                            prev.includes(type.id)
                              ? prev.filter((id) => id !== type.id)
                              : [...prev, type.id]
                          )
                        }
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                        }`}
                      >
                        {type.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Assignees */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                Assign Members
              </label>
              <div className="flex flex-wrap gap-1.5">
                {users.map((user) => {
                  const isAssigned = selectedUserIds.includes(user.id);
                  return (
                    <button
                      type="button"
                      key={user.id}
                      onClick={() =>
                        setSelectedUserIds((prev) =>
                          prev.includes(user.id)
                            ? prev.filter((id) => id !== user.id)
                            : [...prev, user.id]
                        )
                      }
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border transition-colors ${
                        isAssigned
                          ? "bg-primary/10 border-primary text-foreground font-medium"
                          : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Avatar className="h-4 w-4">
                        {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                        <AvatarFallback className="text-[7px]">
                          {getInitials(user.Name)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{user.Name.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setShowFullCreate(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs"
                onClick={() => handleCreateSubtask()}
                disabled={isSubmitting || !newTitle.trim()}
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Create Subtask Object"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Subtask Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(subtaskToDelete)}
        onClose={() => setSubtaskToDelete(null)}
        title="Delete Subtask"
        description={`Are you sure you want to delete subtask "${subtaskToDelete?.name || "this subtask"}"? Any nested subtasks will also be deleted.`}
        confirmText="Delete Subtask"
        variant="destructive"
        isLoading={isDeletingSubtask}
        onConfirm={async () => {
          if (!subtaskToDelete) return;
          setIsDeletingSubtask(true);
          try {
            await handleDelete(subtaskToDelete.id);
            setSubtaskToDelete(null);
          } finally {
            setIsDeletingSubtask(false);
          }
        }}
      />
    </div>
  );
}

