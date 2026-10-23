"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RichMarkdownEditor } from "@/components/ui/rich-markdown-editor";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FileUploader } from "./FileUploader";
import { FolderTreeList } from "./FolderTreeList";
import { TaskBreadcrumbs } from "./TaskBreadcrumbs";
import {
  Status,
  Project,
  TaskType,
  User,
  TaskWithDetails,
  TaskFormData,
  Software,
} from "@/types/database.types";
import { createTask, updateTask, deleteTask } from "@/lib/supabase/actions";
import { getInitials } from "@/lib/utils";
import {
  Loader2,
  Plus,
  X,
  Layers,
  Users as UsersIcon,
  Check,
  Folder,
  Pencil,
  Eye,
  FileText,
  Trash2,
  FolderKanban,
  Link as LinkIcon,
  Calendar,
  Clock,
  Laptop,
  Upload,
  AlertTriangle,
} from "lucide-react";

const TYPE_COLORS = [
  "#3b82f6", // Blue
  "#ef4444", // Red
  "#10b981", // Emerald
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#f59e0b", // Amber
  "#06b6d4", // Cyan
  "#64748b", // Slate
];

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: TaskWithDetails | null;
  defaultStatusId?: string;
  defaultParentTaskId?: string;
  defaultProjectId?: string;
  allTasks?: TaskWithDetails[];
  statuses: Status[];
  projects: Project[];
  taskTypes: TaskType[];
  softwares?: Software[];
  users: User[];
  onTaskSaved: (savedTask: TaskWithDetails) => void;
  onNavigateToTask?: (taskId: string) => void;
  onCreateTaskType?: (data: { name: string; color: string }) => Promise<TaskType>;
  onDeleteTaskType?: (typeId: string) => Promise<void>;
  onCreateSoftware?: (data: { name: string; icon_url: string }) => Promise<Software>;
  onDeleteSoftware?: (softwareId: string) => Promise<void>;
  onDeleteTask?: (taskId: string) => Promise<void> | void;
}

export function TaskModal({
  isOpen,
  onClose,
  task,
  defaultStatusId,
  defaultParentTaskId,
  defaultProjectId,
  allTasks = [],
  statuses,
  projects,
  taskTypes,
  softwares = [],
  users,
  onTaskSaved,
  onNavigateToTask,
  onCreateTaskType,
  onDeleteTaskType,
  onCreateSoftware,
  onDeleteSoftware,
  onDeleteTask,
}: TaskModalProps) {
  const isExisting = Boolean(task?.id);

  // By default: view mode when opening an existing task; full edit/create mode when creating a new task
  const [isFullEditMode, setIsFullEditMode] = useState(!isExisting);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  const handleCopyLink = async () => {
    if (!task?.id || typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("task", task.id);
      await navigator.clipboard.writeText(url.toString());
      setIsLinkCopied(true);
      setTimeout(() => setIsLinkCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [statusId, setStatusId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [parentTaskId, setParentTaskId] = useState<string | null>(null);
  const [selectedTaskTypeIds, setSelectedTaskTypeIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedSoftwareIds, setSelectedSoftwareIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom task type creation state
  const [isCreatingType, setIsCreatingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState("#3b82f6");
  const [isSubmittingType, setIsSubmittingType] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingType, setIsDeletingType] = useState(false);

  // Custom software creation state
  const [isCreatingSoftware, setIsCreatingSoftware] = useState(false);
  const [newSoftwareName, setNewSoftwareName] = useState("");
  const [newSoftwareIconUrl, setNewSoftwareIconUrl] = useState("");
  const [isSubmittingSoftware, setIsSubmittingSoftware] = useState(false);
  const [softwareToDelete, setSoftwareToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingSoftware, setIsDeletingSoftware] = useState(false);

  const prevTaskIdRef = React.useRef<string | null | undefined>(undefined);

  // Sync form when modal opens or active task changes
  useEffect(() => {
    if (!isOpen) {
      prevTaskIdRef.current = undefined;
      return;
    }

    const isDifferentTask = task?.id !== prevTaskIdRef.current;
    prevTaskIdRef.current = task?.id;

    if (task) {
      setName(task.name);
      setDescription(task.description || "");
      setStatusId(task.status_id || statuses[0]?.id || "");
      setProjectId(task.Project_id || projects[0]?.id || "");
      setParentTaskId(task.Task_Parent_Id || null);
      setSelectedTaskTypeIds(task.task_types?.map((t) => t.id) || []);
      setSelectedUserIds(task.assignees?.map((u) => u.id) || []);
      setSelectedSoftwareIds(task.softwares?.map((s) => s.id) || []);

      if (task.due_date) {
        const d = new Date(task.due_date);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        setDueDate(`${y}-${m}-${day}`);
      } else {
        setDueDate("");
      }

      if (isDifferentTask) {
        setIsFullEditMode(false);
        setEditingField(null);
      }
    } else {
      setName("");
      setDescription("");
      setStatusId(defaultStatusId || statuses[0]?.id || "");
      setProjectId(defaultProjectId || projects[0]?.id || "");
      setParentTaskId(defaultParentTaskId || null);
      setSelectedTaskTypeIds([]);
      setSelectedUserIds([]);
      setSelectedSoftwareIds([]);
      setDueDate("");
      if (isDifferentTask) {
        setIsFullEditMode(true);
        setEditingField(null);
      }
    }
    setError(null);
  }, [task, defaultStatusId, defaultParentTaskId, defaultProjectId, isOpen, statuses, projects]);

  const isOverdue = React.useMemo(() => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const dueTime = new Date(due.getFullYear(), due.getMonth(), due.getDate(), 23, 59, 59, 999).getTime();
    return dueTime < Date.now();
  }, [dueDate]);

  const isEdited = React.useMemo(() => {
    if (!task?.updated_at || !task?.created_at) return false;
    return new Date(task.updated_at).getTime() - new Date(task.created_at).getTime() > 1000;
  }, [task?.created_at, task?.updated_at]);

  const toggleTaskType = (typeId: string) => {
    setSelectedTaskTypeIds((prev) =>
      prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]
    );
  };

  const handleRemoveTypeInViewMode = async (typeId: string) => {
    const nextIds = selectedTaskTypeIds.filter((id) => id !== typeId);
    setSelectedTaskTypeIds(nextIds);
    if (task) {
      try {
        await updateTask(task.id, { task_type_ids: nextIds });
        const updatedTaskWithDetails: TaskWithDetails = {
          ...task,
          task_types: taskTypes.filter((t) => nextIds.includes(t.id)),
        };
        Object.assign(task, updatedTaskWithDetails);
        onTaskSaved(updatedTaskWithDetails);
      } catch (err) {
        console.error("Failed to remove task type:", err);
      }
    }
  };

  const handleCreateNewType = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTypeName.trim() || !onCreateTaskType) return;

    setIsSubmittingType(true);
    try {
      const created = await onCreateTaskType({
        name: newTypeName.trim(),
        color: newTypeColor,
      });
      setSelectedTaskTypeIds((prev) => [...prev, created.id]);
      setNewTypeName("");
      setIsCreatingType(false);
    } catch (err) {
      console.error("Failed to create task type:", err);
    } finally {
      setIsSubmittingType(false);
    }
  };

  const handleDeleteExistingType = (typeId: string, typeName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDeleteTaskType) return;
    setTypeToDelete({ id: typeId, name: typeName });
  };

  const toggleSoftware = (softId: string) => {
    setSelectedSoftwareIds((prev) =>
      prev.includes(softId) ? prev.filter((id) => id !== softId) : [...prev, softId]
    );
  };

  const handleRemoveSoftwareInViewMode = async (softId: string) => {
    const nextIds = selectedSoftwareIds.filter((id) => id !== softId);
    setSelectedSoftwareIds(nextIds);
    if (task) {
      try {
        await updateTask(task.id, { software_ids: nextIds });
        const updatedTaskWithDetails: TaskWithDetails = {
          ...task,
          softwares: (softwares || []).filter((s) => nextIds.includes(s.id)),
        };
        Object.assign(task, updatedTaskWithDetails);
        onTaskSaved(updatedTaskWithDetails);
      } catch (err) {
        console.error("Failed to remove software:", err);
      }
    }
  };

  const handleCreateNewSoftware = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newSoftwareName.trim() || !newSoftwareIconUrl.trim() || !onCreateSoftware) return;

    setIsSubmittingSoftware(true);
    try {
      const created = await onCreateSoftware({
        name: newSoftwareName.trim(),
        icon_url: newSoftwareIconUrl.trim(),
      });
      setSelectedSoftwareIds((prev) => [...prev, created.id]);
      setNewSoftwareName("");
      setNewSoftwareIconUrl("");
      setIsCreatingSoftware(false);
    } catch (err) {
      console.error("Failed to create software:", err);
    } finally {
      setIsSubmittingSoftware(false);
    }
  };

  const handleSoftwareFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      setError("Please select a valid image file (PNG with transparency, JPG, or SVG)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setNewSoftwareIconUrl(reader.result);
        if (!newSoftwareName.trim()) {
          const baseName = file.name.replace(/\.[^/.]+$/, "");
          setNewSoftwareName(baseName);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleStatusChange = async (newStatusId: string) => {
    setStatusId(newStatusId);
    if (isExisting && task) {
      try {
        await updateTask(task.id, { status_id: newStatusId });
        const updatedTaskWithDetails: TaskWithDetails = {
          ...task,
          status_id: newStatusId,
          status: statuses.find((s) => s.id === newStatusId) || null,
        };
        Object.assign(task, updatedTaskWithDetails);
        onTaskSaved(updatedTaskWithDetails);
      } catch (err) {
        console.error("Failed to update status:", err);
      }
    }
  };

  const handleProjectChange = async (newProjectId: string) => {
    setProjectId(newProjectId);
    if (isExisting && task) {
      try {
        await updateTask(task.id, { Project_id: newProjectId });
        const updatedTaskWithDetails: TaskWithDetails = {
          ...task,
          Project_id: newProjectId,
          project: projects.find((p) => p.id === newProjectId) || null,
        };
        Object.assign(task, updatedTaskWithDetails);
        onTaskSaved(updatedTaskWithDetails);
      } catch (err) {
        console.error("Failed to update project:", err);
      }
    }
  };

  const handleDeadlineQuickChange = async (newDueDate: string) => {
    setDueDate(newDueDate);
    if (isExisting && task) {
      try {
        const dueIso = newDueDate ? new Date(`${newDueDate}T23:59:59.999Z`).toISOString() : null;
        await updateTask(task.id, { due_date: dueIso });
        const updatedTaskWithDetails: TaskWithDetails = {
          ...task,
          due_date: dueIso,
          updated_at: new Date().toISOString(),
        };
        Object.assign(task, updatedTaskWithDetails);
        onTaskSaved(updatedTaskWithDetails);
      } catch (err) {
        console.error("Failed to update deadline:", err);
      }
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setError("Task title is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const dueIso = dueDate ? new Date(`${dueDate}T23:59:59.999Z`).toISOString() : null;
      const formData: TaskFormData = {
        name: name.trim(),
        description: description.trim() || undefined,
        status_id: statusId || undefined,
        Project_id: projectId || undefined,
        Task_Parent_Id: parentTaskId,
        task_type_ids: selectedTaskTypeIds,
        assignee_ids: selectedUserIds,
        software_ids: selectedSoftwareIds,
        due_date: dueIso,
      };

      if (isExisting && task) {
        await updateTask(task.id, formData);
        const updatedTaskWithDetails: TaskWithDetails = {
          ...task,
          name: formData.name,
          description: formData.description || null,
          status_id: formData.status_id || null,
          Project_id: formData.Project_id || null,
          due_date: dueIso,
          status: statuses.find((s) => s.id === formData.status_id) || null,
          project: projects.find((p) => p.id === formData.Project_id) || null,
          task_types: taskTypes.filter((t) => selectedTaskTypeIds.includes(t.id)),
          assignees: users.filter((u) => selectedUserIds.includes(u.id)),
          softwares: (softwares || []).filter((s) => selectedSoftwareIds.includes(s.id)),
          updated_at: new Date().toISOString(),
        };
        Object.assign(task, updatedTaskWithDetails);
        onTaskSaved(updatedTaskWithDetails);
        setIsFullEditMode(false);
        setEditingField(null);
      } else {
        const created = await createTask(formData);
        const fullCreated: TaskWithDetails = {
          ...created,
          status: statuses.find((s) => s.id === formData.status_id) || null,
          project: projects.find((p) => p.id === formData.Project_id) || null,
          task_types: taskTypes.filter((t) => selectedTaskTypeIds.includes(t.id)),
          assignees: users.filter((u) => selectedUserIds.includes(u.id)),
          softwares: (softwares || []).filter((s) => selectedSoftwareIds.includes(s.id)),
          subtasks: [],
          resources: [],
        };
        onTaskSaved(fullCreated);
        onClose();
      }
    } catch (err: any) {
      console.error("Failed to save task:", err);
      setError(err.message || "Failed to save task");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Find active project & status for view mode
  const currentProject = projects.find((p) => p.id === projectId) || null;
  const currentStatus = statuses.find((s) => s.id === statusId) || null;
  const assignedUsers = users.filter((u) => selectedUserIds.includes(u.id));
  const assignedTypes = taskTypes.filter((t) => selectedTaskTypeIds.includes(t.id));
  const assignedSoftwares = (softwares || []).filter((s) => selectedSoftwareIds.includes(s.id));

  // Breadcrumbs: if task has breadcrumbs, use them; if creating subtask, show parent path + 'New Subtask'
  let displayBreadcrumbs = task?.breadcrumbs || [];
  if (!isExisting && defaultParentTaskId) {
    const parentObj = allTasks.find((t) => t.id === defaultParentTaskId);
    if (parentObj) {
      displayBreadcrumbs = [
        ...(parentObj.breadcrumbs || [{ id: parentObj.id, name: parentObj.name }]),
        { id: "new", name: name.trim() || "New Subtask" },
      ];
    }
  }

  const isEditingSection = (section: string) => isFullEditMode || editingField === section;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Responsive Dialog Content with Generous Side Margins */}
      <DialogContent className="w-[95vw] sm:w-[85vw] md:w-[75vw] max-w-[75vw] max-h-[92vh] overflow-y-auto px-8 sm:px-14 md:px-20 py-6 sm:py-8">
        <form onSubmit={handleSave}>
          {/* Top Directory Breadcrumbs with Arrow Subtasks Dropdown */}
          {displayBreadcrumbs.length > 0 && (
            <div className="mb-4">
              <TaskBreadcrumbs
                breadcrumbs={displayBreadcrumbs}
                project={currentProject}
                allTasks={allTasks}
                currentTask={task}
                onNavigateToTask={onNavigateToTask}
              />
            </div>
          )}

          {/* Modal Header Bar with Bigger Title, Compact Status/Project Selectors, and Mode Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b">
            {/* Left: Task Title Header (Bigger) */}
            <div className="min-w-0 flex-1 flex items-center gap-2.5">
              {!isEditingSection("name") ? (
                <div className="flex items-center gap-2.5 group min-w-0">
                  <h2
                    className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate"
                    title={name || "Untitled Task"}
                  >
                    {name || "Untitled Task"}
                  </h2>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => setEditingField("name")}
                    title="Edit task name"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <Input
                    placeholder="Task name *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-xl sm:text-2xl font-extrabold h-11 flex-1"
                    autoFocus
                  />
                  {editingField === "name" && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        className="h-9 px-3 gap-1"
                        onClick={() => handleSave()}
                        disabled={isSubmitting}
                      >
                        <Check className="h-4 w-4" /> Save
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 px-2"
                        onClick={() => {
                          setName(task?.name || "");
                          setEditingField(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Status & Project things next to the title (compact) + View/Edit toggle */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* Compact Status Dropdown */}
              <Select value={statusId} onValueChange={handleStatusChange}>
                <SelectTrigger
                  className="h-8 text-xs font-semibold rounded-full px-3 py-0 border shadow-2xs gap-1.5 w-auto bg-background hover:bg-muted/30 transition-colors"
                  style={
                    currentStatus
                      ? {
                          backgroundColor: `${currentStatus.color}15`,
                          borderColor: `${currentStatus.color}40`,
                          color: currentStatus.color,
                        }
                      : undefined
                  }
                  title="Change Status"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {currentStatus && (
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: currentStatus.color }}
                      />
                    )}
                    <span className="truncate">{currentStatus?.name || "Status"}</span>
                  </div>
                </SelectTrigger>
                <SelectContent align="end">
                  {statuses.map((st) => (
                    <SelectItem key={st.id} value={st.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: st.color }}
                        />
                        <span className="font-medium">{st.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Compact Project Dropdown */}
              <Select value={projectId} onValueChange={handleProjectChange}>
                <SelectTrigger
                  className="h-8 text-xs font-medium rounded-full px-3 py-0 border shadow-2xs gap-1.5 w-auto bg-background hover:bg-muted/30 transition-colors"
                  title="Change Project"
                >
                  <div className="flex items-center gap-1.5 truncate text-foreground">
                    <FolderKanban className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate max-w-[120px]">{currentProject?.name || "General"}</span>
                  </div>
                </SelectTrigger>
                <SelectContent align="end">
                  {projects.map((proj) => (
                    <SelectItem key={proj.id} value={proj.id} className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <FolderKanban className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                        <span>{proj.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View / Edit Mode Toggle Button */}
              {isExisting && (
                <Button
                  type="button"
                  variant={isFullEditMode ? "secondary" : "outline"}
                  size="sm"
                  className="h-8 text-xs gap-1.5 rounded-full cursor-pointer"
                  onClick={() => {
                    setIsFullEditMode(!isFullEditMode);
                    setEditingField(null);
                  }}
                >
                  {isFullEditMode ? (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">View Mode</span>
                    </>
                  ) : (
                    <>
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Edit Fields</span>
                    </>
                  )}
                </Button>
              )}

              {/* Copy Direct Link Button */}
              {isExisting && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`h-8 text-xs gap-1.5 rounded-full cursor-pointer transition-colors ${
                    isLinkCopied
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                  onClick={handleCopyLink}
                  title="Copy direct link to this task"
                >
                  {isLinkCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="hidden sm:inline font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Copy Link</span>
                    </>
                  )}
                </Button>
              )}

              {/* Delete Task Button */}
              {isExisting && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 cursor-pointer"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  title="Delete task"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Delete Task</span>
                </Button>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          {/* Dates Bar: Date Posted, Date & Time Edited, and Deadline */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-muted/30 border border-border/60 text-xs mb-5">
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              {/* Date Posted */}
              {isExisting && task?.created_at && (
                <div className="flex items-center gap-1.5" title="Date posted">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
                  <span>
                    Posted:{" "}
                    <strong className="text-foreground font-medium">
                      {new Date(task.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </strong>{" "}
                    <span className="text-muted-foreground/70">
                      at{" "}
                      {new Date(task.created_at).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                </div>
              )}

              {/* Date and Time Edited (Nullable) */}
              {isExisting && isEdited && task?.updated_at && (
                <div
                  className="flex items-center gap-1.5 text-muted-foreground"
                  title="Date and time edited"
                >
                  <Clock className="h-3.5 w-3.5 text-amber-500/80 shrink-0" />
                  <span>
                    Edited:{" "}
                    <strong className="text-foreground font-medium">
                      {new Date(task.updated_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </strong>{" "}
                    <span className="text-muted-foreground/70">
                      at{" "}
                      {new Date(task.updated_at).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Deadline / Overdue Label & Picker */}
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                  isOverdue
                    ? "text-red-600 dark:text-red-400 font-bold"
                    : "text-muted-foreground"
                }`}
              >
                <Calendar className={`h-3.5 w-3.5 ${isOverdue ? "text-red-500 stroke-[2.5]" : ""}`} />
                Deadline:
              </span>

              {isFullEditMode || editingField === "deadline" ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => {
                      setDueDate(e.target.value);
                      if (!isFullEditMode && editingField === "deadline") {
                        handleDeadlineQuickChange(e.target.value);
                      }
                    }}
                    className={`h-7 text-xs w-auto px-2 ${
                      isOverdue
                        ? "border-red-500 text-red-600 dark:text-red-400 font-semibold"
                        : ""
                    }`}
                  />
                  {dueDate && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-1.5 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setDueDate("");
                        if (!isFullEditMode && editingField === "deadline") {
                          handleDeadlineQuickChange("");
                        }
                      }}
                      title="Clear deadline"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  {editingField === "deadline" && (
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => setEditingField(null)}
                    >
                      Done
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  {dueDate ? (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                        isOverdue
                          ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/40 font-bold"
                          : "bg-background text-foreground border-border/70"
                      }`}
                    >
                      {isOverdue && <span className="uppercase text-[10px] tracking-wide">Overdue:</span>}
                      {new Date(`${dueDate}T00:00:00`).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/60 italic">No deadline set</span>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setEditingField("deadline")}
                    title="Change deadline"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Task Types & Assignees Grid (Placed before Description) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
              {/* Task Types */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" /> Task Types
                  </Label>
                  {!isEditingSection("types") && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                      onClick={() => setEditingField("types")}
                    >
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                  )}
                </div>

                {!isEditingSection("types") ? (
                  /* View Mode: Task Types with direct removal & quick add */
                  <div className="flex flex-wrap items-center gap-1.5 py-1">
                    {assignedTypes.length > 0 ? (
                      assignedTypes.map((type) => (
                        <span
                          key={type.id}
                          className="inline-flex items-center gap-1.5 rounded-full pl-2.5 pr-1.5 py-1 text-xs font-medium border shadow-2xs group/badge"
                          style={{
                            backgroundColor: `${type.color}15`,
                            borderColor: `${type.color}40`,
                            color: type.color,
                          }}
                        >
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: type.color }}
                          />
                          <span>{type.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTypeInViewMode(type.id)}
                            className="h-4 w-4 rounded-full inline-flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-all ml-0.5 cursor-pointer"
                            title={`Remove ${type.name} from this task`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground/60 italic">No types selected</span>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[11px] rounded-full gap-1 border-dashed text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={() => setEditingField("types")}
                    >
                      <Plus className="h-3 w-3" /> Add / Manage
                    </Button>
                  </div>
                ) : (
                  /* Edit Mode: Task Types selector + Creator */
                  <div className="space-y-3 p-3 rounded-xl border bg-card/60">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {taskTypes.map((type) => {
                        const isSelected = selectedTaskTypeIds.includes(type.id);
                        return (
                          <div
                            key={type.id}
                            className={`group/type inline-flex items-center rounded-full border text-xs font-medium transition-all ${
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleTaskType(type.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 cursor-pointer"
                            >
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{ backgroundColor: type.color }}
                              />
                              <span>{type.name}</span>
                              {isSelected && <Check className="h-3 w-3 ml-0.5" />}
                            </button>

                            {/* Delete Type from System Button */}
                            {onDeleteTaskType && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteExistingType(type.id, type.name, e)}
                                className="pr-2 pl-0.5 opacity-0 group-hover/type:opacity-80 hover:!opacity-100 transition-opacity text-current hover:text-destructive cursor-pointer"
                                title={`Delete "${type.name}" permanently`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {/* Button to toggle inline creation form */}
                      {!isCreatingType && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-xs rounded-full gap-1 border-dashed cursor-pointer"
                          onClick={() => setIsCreatingType(true)}
                        >
                          <Plus className="h-3 w-3" /> New Type
                        </Button>
                      )}
                    </div>

                    {/* Inline New Task Type Creation Form */}
                    {isCreatingType && (
                      <div className="p-3 rounded-lg border bg-muted/40 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Plus className="h-3.5 w-3.5 text-primary" /> Create New Task Type
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={() => {
                              setIsCreatingType(false);
                              setNewTypeName("");
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            placeholder="Type name (e.g. Urgent, QA)..."
                            value={newTypeName}
                            onChange={(e) => setNewTypeName(e.target.value)}
                            className="h-8 text-xs flex-1 min-w-[140px]"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleCreateNewType();
                              }
                            }}
                          />

                          {/* Color Selector */}
                          <div className="flex items-center gap-1 shrink-0">
                            {TYPE_COLORS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setNewTypeColor(c)}
                                className={`h-5 w-5 rounded-full border transition-all cursor-pointer ${
                                  newTypeColor === c ? "scale-125 ring-2 ring-primary ring-offset-1" : "opacity-75 hover:opacity-100"
                                }`}
                                style={{ backgroundColor: c }}
                                title={c}
                              />
                            ))}
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            className="h-8 px-3 text-xs shrink-0 cursor-pointer"
                            onClick={() => handleCreateNewType()}
                            disabled={isSubmittingType || !newTypeName.trim()}
                          >
                            {isSubmittingType ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add Type"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {editingField === "types" && (
                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setSelectedTaskTypeIds(task?.task_types.map((t) => t.id) || []);
                            setEditingField(null);
                            setIsCreatingType(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleSave()}
                          disabled={isSubmitting}
                        >
                          Save Types
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Assignees */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <UsersIcon className="h-3.5 w-3.5" /> Assigned Team Members
                  </Label>
                  {!isEditingSection("assignees") && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                      onClick={() => setEditingField("assignees")}
                    >
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                  )}
                </div>

                {!isEditingSection("assignees") ? (
                  /* View Mode: Assignees */
                  <div className="flex flex-wrap gap-2 min-h-[36px] items-center p-2 rounded-xl bg-muted/20 border">
                    {assignedUsers.length > 0 ? (
                      assignedUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-background border shadow-2xs"
                        >
                          <Avatar className="h-5 w-5">
                            {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                            <AvatarFallback className="text-[8px]">
                              {getInitials(user.Name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium text-foreground">
                            {user.Name}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground/60 italic">Unassigned</span>
                    )}
                  </div>
                ) : (
                  /* Edit Mode: Assignees */
                  <div className="space-y-2 p-2 rounded-xl border bg-card/60">
                    <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto">
                      {users.map((user) => {
                        const isAssigned = selectedUserIds.includes(user.id);
                        return (
                          <div
                            key={user.id}
                            onClick={() => toggleUser(user.id)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-colors select-none ${
                              isAssigned
                                ? "bg-primary/10 border-primary/40 text-foreground"
                                : "border-transparent hover:bg-muted/50 text-muted-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar className="h-6 w-6">
                                {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                                <AvatarFallback className="text-[8px]">
                                  {getInitials(user.Name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium text-foreground truncate">
                                {user.Name}
                              </span>
                            </div>
                            {isAssigned && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                    {editingField === "assignees" && (
                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setSelectedUserIds(task?.assignees.map((u) => u.id) || []);
                            setEditingField(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleSave()}
                          disabled={isSubmitting}
                        >
                          Save Assignees
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Used Softwares Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Laptop className="h-3.5 w-3.5" /> Used Softwares
                </Label>
                {!isEditingSection("softwares") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditingField("softwares")}
                  >
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                )}
              </div>

              {!isEditingSection("softwares") ? (
                /* View Mode: Used Softwares with direct removal & quick add */
                <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-muted/20 border min-h-[42px]">
                  {assignedSoftwares.length > 0 ? (
                    assignedSoftwares.map((soft) => (
                      <span
                        key={soft.id}
                        className="inline-flex items-center gap-2 rounded-full pl-2 pr-1.5 py-1 text-xs font-medium border bg-background dark:bg-card border-border/80 shadow-2xs group/badge"
                      >
                        <div className="h-4 w-4 rounded overflow-hidden flex items-center justify-center shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={soft.icon_url}
                            alt={soft.name}
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <span className="font-medium text-foreground">{soft.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSoftwareInViewMode(soft.id)}
                          className="h-4 w-4 rounded-full inline-flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-all ml-0.5 cursor-pointer"
                          title={`Remove ${soft.name} from this task`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground/60 italic">No softwares assigned</span>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[11px] rounded-full gap-1 border-dashed text-muted-foreground hover:text-foreground cursor-pointer ml-auto"
                    onClick={() => setEditingField("softwares")}
                  >
                    <Plus className="h-3 w-3" /> Add / Manage
                  </Button>
                </div>
              ) : (
                /* Edit Mode: Softwares Selector + Creation Form */
                <div className="space-y-3 p-3 rounded-xl border bg-card/60">
                  <div className="flex flex-wrap gap-2 items-center">
                    {(softwares || []).map((soft) => {
                      const isSelected = selectedSoftwareIds.includes(soft.id);
                      return (
                        <div
                          key={soft.id}
                          className={`group/soft inline-flex items-center rounded-full border text-xs font-medium transition-all ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-xs"
                              : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSoftware(soft.id)}
                            className="inline-flex items-center gap-2 px-3 py-1 cursor-pointer"
                          >
                            <div className="h-4 w-4 rounded overflow-hidden flex items-center justify-center shrink-0 bg-background/50 p-0.5">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={soft.icon_url}
                                alt={soft.name}
                                className="h-full w-full object-contain"
                              />
                            </div>
                            <span>{soft.name}</span>
                            {isSelected && <Check className="h-3 w-3 ml-0.5" />}
                          </button>

                          {/* Delete Software from System Button */}
                          {onDeleteSoftware && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSoftwareToDelete({ id: soft.id, name: soft.name });
                              }}
                              className="pr-2 pl-0.5 opacity-0 group-hover/soft:opacity-80 hover:!opacity-100 transition-opacity text-current hover:text-destructive cursor-pointer"
                              title={`Delete "${soft.name}" permanently`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {/* Button to toggle inline creation form */}
                    {!isCreatingSoftware && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs rounded-full gap-1 border-dashed cursor-pointer"
                        onClick={() => setIsCreatingSoftware(true)}
                      >
                        <Plus className="h-3 w-3" /> New Software
                      </Button>
                    )}
                  </div>

                  {/* Inline New Software Creation Form */}
                  {isCreatingSoftware && (
                    <div className="p-3.5 rounded-lg border bg-muted/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Plus className="h-3.5 w-3.5 text-primary" /> Add New Software
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-muted-foreground hover:text-foreground cursor-pointer"
                          onClick={() => {
                            setIsCreatingSoftware(false);
                            setNewSoftwareName("");
                            setNewSoftwareIconUrl("");
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground">Software Name</Label>
                          <Input
                            placeholder="e.g. Cinema 4D, After Effects, Houdini..."
                            value={newSoftwareName}
                            onChange={(e) => setNewSoftwareName(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground">Software Icon (PNG / JPG)</Label>
                          <div className="flex items-center gap-2">
                            {/* File Upload Button */}
                            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-background hover:bg-muted text-xs font-medium transition-colors shrink-0">
                              <Upload className="h-3.5 w-3.5" />
                              <span>Choose file...</span>
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                                className="hidden"
                                onChange={handleSoftwareFileUpload}
                              />
                            </label>
                            <span className="text-[10px] text-muted-foreground truncate">
                              Supports transparent PNG or JPG
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Or direct URL input option */}
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground/80">Or Image URL</Label>
                        <Input
                          placeholder="https://.../icon.png"
                          value={newSoftwareIconUrl}
                          onChange={(e) => setNewSoftwareIconUrl(e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>

                      {/* Icon Preview */}
                      {newSoftwareIconUrl && (
                        <div className="flex items-center gap-2.5 pt-1">
                          <div
                            className="h-8 w-8 rounded-md border border-border/80 p-1 flex items-center justify-center bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:6px_6px]"
                            title="Icon preview with transparent background"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={newSoftwareIconUrl}
                              alt="Preview"
                              className="h-full w-full object-contain"
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Icon preview ({newSoftwareName || "Unnamed software"})
                          </span>
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-1 border-t">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setIsCreatingSoftware(false);
                            setNewSoftwareName("");
                            setNewSoftwareIconUrl("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleCreateNewSoftware()}
                          disabled={isSubmittingSoftware || !newSoftwareName.trim() || !newSoftwareIconUrl.trim()}
                        >
                          {isSubmittingSoftware ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Software"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {editingField === "softwares" && (
                    <div className="flex justify-end gap-2 pt-2 border-t">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setSelectedSoftwareIds(task?.softwares?.map((s) => s.id) || []);
                          setEditingField(null);
                          setIsCreatingSoftware(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleSave()}
                        disabled={isSubmitting}
                      >
                        Save Softwares
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Description Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </Label>
                {!isEditingSection("description") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditingField("description")}
                  >
                    <Pencil className="h-3 w-3" />
                    <span>Edit</span>
                  </Button>
                )}
              </div>

              {!isEditingSection("description") ? (
                /* View Mode: Rendered GitHub README Markdown */
                <div className="py-1">
                  {description.trim() ? (
                    <MarkdownRenderer content={description} />
                  ) : (
                    <span className="text-muted-foreground/60 italic text-sm">
                      No description provided for this task.
                    </span>
                  )}
                </div>
              ) : (
                /* Edit Mode: Word-like Rich Markdown Editor */
                <div className="space-y-2">
                  <RichMarkdownEditor
                    value={description}
                    onChange={setDescription}
                    placeholder="Provide context, acceptance criteria, tables, lists, or technical details..."
                    rows={6}
                    onSave={() => handleSave()}
                  />
                  {editingField === "description" && (
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          setDescription(task?.description || "");
                          setEditingField(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => handleSave()}
                        disabled={isSubmitting}
                      >
                        Save Description
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Folder Structure & Subtasks Section */}
            {isExisting && task && (
              <div className="border-t pt-5">
                <FolderTreeList
                  parentTask={task}
                  statuses={statuses}
                  projects={projects}
                  taskTypes={taskTypes}
                  users={users}
                  onSubtasksUpdated={(updated) => {
                    task.subtasks = updated;
                  }}
                  onOpenSubtask={(subtask) => {
                    onNavigateToTask?.(subtask.id);
                  }}
                />
              </div>
            )}

            {/* Full-Width Reorderable Images & Attachments Section */}
            {isExisting && task && (
              <div className="border-t pt-5">
                <FileUploader
                  key={task.id}
                  taskId={task.id}
                  initialResources={task.resources || []}
                  onResourcesUpdated={(updated) => {
                    task.resources = updated;
                    onTaskSaved({ ...task, resources: updated });
                  }}
                />
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <DialogFooter className="mt-8 pt-4 border-t flex flex-wrap items-center justify-between gap-3">
            {isExisting && (
              <Button
                type="button"
                variant="outline"
                className="gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 cursor-pointer"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Task
              </Button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              {isFullEditMode || !isExisting ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isExisting ? "Save All Changes" : "Create Task"}
                  </Button>
                </>
              ) : (
                <Button type="button" variant="outline" onClick={onClose}>
                  Close
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Delete Task Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        title="Delete Task?"
        description={
          <span>
            Are you sure you want to permanently delete{" "}
            <strong className="text-foreground">&quot;{task?.name || "this task"}&quot;</strong>
            ? This will remove the task, all its attached resources, and any nested subtasks.
          </span>
        }
        confirmText="Delete Task"
        variant="destructive"
        isLoading={isDeletingTask}
        onConfirm={async () => {
          if (!task?.id) return;
          setIsDeletingTask(true);
          try {
            if (onDeleteTask) {
              await onDeleteTask(task.id);
            } else {
              await deleteTask(task.id);
            }
            setIsDeleteDialogOpen(false);
            onClose();
          } catch (err) {
            console.error("Failed to delete task:", err);
          } finally {
            setIsDeletingTask(false);
          }
        }}
      />

      {/* Delete Task Type Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(typeToDelete)}
        onClose={() => setTypeToDelete(null)}
        title="Delete Task Type"
        description={`Are you sure you want to permanently delete the task type "${typeToDelete?.name}"? It will be removed from all tasks across the board.`}
        confirmText="Delete Type"
        variant="destructive"
        isLoading={isDeletingType}
        onConfirm={async () => {
          if (!typeToDelete || !onDeleteTaskType) return;
          setIsDeletingType(true);
          try {
            await onDeleteTaskType(typeToDelete.id);
            setSelectedTaskTypeIds((prev) => prev.filter((id) => id !== typeToDelete.id));
            setTypeToDelete(null);
          } catch (err) {
            console.error("Failed to delete task type:", err);
          } finally {
            setIsDeletingType(false);
          }
        }}
      />

      {/* Delete Software Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(softwareToDelete)}
        onClose={() => setSoftwareToDelete(null)}
        title="Delete Software"
        description={`Are you sure you want to permanently delete the software "${softwareToDelete?.name}"? It will be removed from all tasks across the board.`}
        confirmText="Delete Software"
        variant="destructive"
        isLoading={isDeletingSoftware}
        onConfirm={async () => {
          if (!softwareToDelete || !onDeleteSoftware) return;
          setIsDeletingSoftware(true);
          try {
            await onDeleteSoftware(softwareToDelete.id);
            setSelectedSoftwareIds((prev) => prev.filter((id) => id !== softwareToDelete.id));
            setSoftwareToDelete(null);
          } catch (err) {
            console.error("Failed to delete software:", err);
          } finally {
            setIsDeletingSoftware(false);
          }
        }}
      />
    </Dialog>
  );
}
