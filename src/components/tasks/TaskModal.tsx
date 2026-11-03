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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Status,
  Project,
  TaskType,
  User,
  TaskWithDetails,
  TaskFormData,
  Software,
  EducationalMaterial,
  EducationalMaterialWithDetails,
  StudyGroup,
} from "@/types/database.types";
import { createTask, updateTask, deleteTask } from "@/lib/supabase/actions";
import { getInitials } from "@/lib/utils";
import { AttachMaterialModal } from "@/components/education/AttachMaterialModal";
import { getMaterialTypeMeta } from "@/components/education/MaterialModal";
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
  BookOpen,
  GraduationCap,
  ExternalLink,
  MoreHorizontal,
  ChevronDown,
  Play,
  Video,
  ImageIcon,
} from "lucide-react";
import { formatDeadlineDate, getDeadlineTimeRemaining } from "@/lib/date-utils";
import {
  extractYouTubeId,
  extractVimeoId,
  isDirectVideoUrl,
} from "@/lib/media-utils";

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
  allEducationalMaterials?: EducationalMaterialWithDetails[];
  allStudyGroups?: StudyGroup[];
  onTaskSaved: (savedTask: TaskWithDetails) => void;
  onNavigateToTask?: (taskId: string) => void;
  onNavigateToEducation?: () => void;
  onCreateTaskType?: (data: { name: string; color: string }) => Promise<TaskType>;
  onDeleteTaskType?: (typeId: string) => Promise<void>;
  onCreateSoftware?: (data: { name: string; icon_url: string }) => Promise<Software>;
  onDeleteSoftware?: (softwareId: string) => Promise<void>;
  onDeleteTask?: (taskId: string) => Promise<void> | void;
  onCreateEducationalMaterial?: (data: EducationalMaterial) => void;
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
  allEducationalMaterials = [],
  allStudyGroups = [],
  onTaskSaved,
  onNavigateToTask,
  onNavigateToEducation,
  onCreateTaskType,
  onDeleteTaskType,
  onCreateSoftware,
  onDeleteSoftware,
  onDeleteTask,
  onCreateEducationalMaterial,
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
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [localMaterials, setLocalMaterials] = useState<EducationalMaterialWithDetails[]>(allEducationalMaterials);
  const [isAttachMaterialOpen, setIsAttachMaterialOpen] = useState(false);
  const [playingMaterialIds, setPlayingMaterialIds] = useState<Record<string, boolean>>({});
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
      setSelectedMaterialIds(task.educational_materials?.map((m) => m.id) || []);

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
      setSelectedMaterialIds([]);
      setDueDate("");
      if (isDifferentTask) {
        setIsFullEditMode(true);
        setEditingField(null);
      }
    }
    setError(null);
  }, [task, defaultStatusId, defaultParentTaskId, defaultProjectId, isOpen, statuses, projects]);

  useEffect(() => {
    setLocalMaterials(allEducationalMaterials);
  }, [allEducationalMaterials]);

  const handleMaterialCreated = async (newMat: EducationalMaterial) => {
    const detailedMat: EducationalMaterialWithDetails = {
      ...newMat,
      group: newMat.group_id ? allStudyGroups.find((g) => g.id === newMat.group_id) || null : null,
      linked_tasks: task ? [{ id: task.id, name: task.name }] : [],
    };
    setLocalMaterials((prev) => [detailedMat, ...prev]);
    const nextIds = [...selectedMaterialIds, newMat.id];
    setSelectedMaterialIds(nextIds);

    if (isExisting && task) {
      try {
        await updateTask(task.id, { educational_material_ids: nextIds });
        const updatedTaskWithDetails: TaskWithDetails = {
          ...task,
          educational_materials: [...(task.educational_materials || []), newMat],
        };
        Object.assign(task, updatedTaskWithDetails);
        onTaskSaved(updatedTaskWithDetails);
      } catch (err) {
        console.error("Failed to auto-link new material to task:", err);
      }
    }

    if (onCreateEducationalMaterial) {
      onCreateEducationalMaterial(newMat);
    }
  };

  const isOverdue = React.useMemo(() => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const dueTime = new Date(due.getFullYear(), due.getMonth(), due.getDate(), 23, 59, 59, 999).getTime();
    return dueTime < Date.now();
  }, [dueDate]);

  const deadlineRemaining = React.useMemo(() => {
    return getDeadlineTimeRemaining(dueDate);
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

  const handleRemoveMaterialInViewMode = async (matId: string) => {
    const nextIds = selectedMaterialIds.filter((id) => id !== matId);
    setSelectedMaterialIds(nextIds);
    if (task) {
      try {
        await updateTask(task.id, { educational_material_ids: nextIds });
        const updatedTaskWithDetails: TaskWithDetails = {
          ...task,
          educational_materials: (task.educational_materials || []).filter((m) => m.id !== matId),
        };
        Object.assign(task, updatedTaskWithDetails);
        onTaskSaved(updatedTaskWithDetails);
      } catch (err) {
        console.error("Failed to remove material from task:", err);
      }
    }
  };

  const handleSaveAttachedMaterials = async (newIds: string[]) => {
    setSelectedMaterialIds(newIds);
    if (task) {
      try {
        await updateTask(task.id, { educational_material_ids: newIds });
        const updatedMaterials = (localMaterials || []).filter((m) =>
          newIds.includes(m.id)
        );
        const updatedTaskWithDetails: TaskWithDetails = {
          ...task,
          educational_materials: updatedMaterials,
        };
        Object.assign(task, updatedTaskWithDetails);
        onTaskSaved(updatedTaskWithDetails);
      } catch (err) {
        console.error("Failed to update attached materials:", err);
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
    if (isSubmitting) return;
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
        educational_material_ids: selectedMaterialIds,
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
          educational_materials: (localMaterials || []).filter((m) =>
            selectedMaterialIds.includes(m.id)
          ),
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
          educational_materials: (localMaterials || []).filter((m) =>
            selectedMaterialIds.includes(m.id)
          ),
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
        <form
          onSubmit={handleSave}
          onKeyDown={(e) => {
            if (
              (e.ctrlKey || e.metaKey) &&
              (e.key?.toLowerCase() === "enter" ||
                e.code === "Enter" ||
                e.code === "NumpadEnter" ||
                e.keyCode === 13 ||
                e.which === 13)
            ) {
              e.preventDefault();
              handleSave();
            }
          }}
        >
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

          {/* Modal Header Bar with Wrapping Title, Compact Status/Project Selectors, and More Dropdown */}
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4 pb-4 border-b">
            {/* Left: Task Title Header (Wrapping on multiple lines, fully visible) */}
            <div className="min-w-0 flex-1 flex items-start gap-2.5">
              {!isEditingSection("name") ? (
                <div className="flex items-start gap-2.5 group min-w-0 flex-1">
                  <h2
                    className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground break-words leading-tight"
                    title={name || "Untitled Task"}
                  >
                    {name || "Untitled Task"}
                  </h2>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5 cursor-pointer"
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
                        className="h-9 px-3 gap-1 cursor-pointer"
                        onClick={() => handleSave()}
                        disabled={isSubmitting}
                      >
                        <Check className="h-4 w-4" /> Save
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 px-2 cursor-pointer"
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

            {/* Right: Status & Project things next to the title (compact) + "More" Dropdown */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap pt-0.5">
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

              {/* "More" Dropdown Menu containing Edit Fields, Copy Link, and Delete Task */}
              {isExisting && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5 rounded-full px-3 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                      title="More task options"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                      <span>More</span>
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 shadow-lg">
                    <DropdownMenuItem
                      onClick={() => {
                        setIsFullEditMode(!isFullEditMode);
                        setEditingField(null);
                      }}
                      className="text-xs gap-2 cursor-pointer"
                    >
                      {isFullEditMode ? (
                        <>
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Switch to View Mode</span>
                        </>
                      ) : (
                        <>
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Edit Fields</span>
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleCopyLink}
                      className="text-xs gap-2 cursor-pointer"
                    >
                      {isLinkCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Copy Direct Link</span>
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="text-xs gap-2 text-destructive focus:text-destructive cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete Task</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          {/* Subtle Dates Line: Posted and Edited */}
          {isExisting && (
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-3 px-1">
              {task?.created_at && (
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

              {isEdited && task?.updated_at && (
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
          )}

          {/* Single-Line Metadata Bar: Deadline, Task Types, Assignees, Used Software */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 items-start">
            {/* Col 1: Deadline */}
            <div className="p-3 rounded-xl bg-muted/20 border border-border/70 space-y-2 flex flex-col justify-between min-h-[92px]">
              <div className="flex items-center justify-between gap-1">
                <Label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className={`h-3.5 w-3.5 ${isOverdue ? "text-red-500 stroke-[2.5]" : ""}`} />
                  <span className={isOverdue ? "text-red-600 dark:text-red-400 font-bold" : ""}>Deadline</span>
                </Label>
                {!isEditingSection("deadline") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => setEditingField("deadline")}
                    title="Edit deadline"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>

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
                    className={`h-7 text-xs w-full px-2 ${
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
                      className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-destructive"
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
                      className="h-7 text-xs px-2 shrink-0"
                      onClick={() => setEditingField(null)}
                    >
                      Done
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 py-0.5">
                  {dueDate ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                          isOverdue
                            ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/40 font-bold"
                            : "bg-background text-foreground border-border/70"
                        }`}
                      >
                        {formatDeadlineDate(dueDate)}
                      </span>
                      {deadlineRemaining && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shadow-2xs ${deadlineRemaining.badgeStyle}`}
                        >
                          <Clock className="h-2.5 w-2.5" />
                          <span>{deadlineRemaining.label}</span>
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/60 italic">No deadline set</span>
                  )}
                </div>
              )}
            </div>

            {/* Col 2: Task Types */}
            <div className="p-3 rounded-xl bg-muted/20 border border-border/70 space-y-2 flex flex-col justify-between min-h-[92px]">
              <div className="flex items-center justify-between gap-1">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" /> Task Types
                </Label>
                {!isEditingSection("types") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => setEditingField("types")}
                    title="Edit task types"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {!isEditingSection("types") ? (
                <div className="flex flex-wrap items-center gap-1.5 py-0.5">
                  {assignedTypes.length > 0 ? (
                    assignedTypes.map((type) => (
                      <span
                        key={type.id}
                        className="inline-flex items-center gap-1 rounded-full pl-2 pr-1 py-0.5 text-[11px] font-medium border shadow-2xs group/badge"
                        style={{
                          backgroundColor: `${type.color}15`,
                          borderColor: `${type.color}40`,
                          color: type.color,
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: type.color }}
                        />
                        <span className="truncate max-w-[90px]">{type.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTypeInViewMode(type.id)}
                          className="h-3.5 w-3.5 rounded-full inline-flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-all ml-0.5 cursor-pointer"
                          title={`Remove ${type.name} from this task`}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground/60 italic">No types</span>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-5 px-1.5 text-[10px] rounded-full gap-0.5 border-dashed text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => setEditingField("types")}
                  >
                    <Plus className="h-2.5 w-2.5" /> Add
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5 pt-1">
                  <div className="flex flex-wrap gap-1.5 items-center max-h-40 overflow-y-auto">
                    {taskTypes.map((type) => {
                      const isSelected = selectedTaskTypeIds.includes(type.id);
                      return (
                        <div
                          key={type.id}
                          className={`group/type inline-flex items-center rounded-full border text-[11px] font-medium transition-all ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-xs"
                              : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleTaskType(type.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 cursor-pointer"
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: type.color }}
                            />
                            <span>{type.name}</span>
                            {isSelected && <Check className="h-3 w-3 ml-0.5" />}
                          </button>

                          {onDeleteTaskType && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteExistingType(type.id, type.name, e)}
                              className="pr-1.5 pl-0.5 opacity-0 group-hover/type:opacity-80 hover:!opacity-100 transition-opacity text-current hover:text-destructive cursor-pointer"
                              title={`Delete "${type.name}" permanently`}
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {!isCreatingType && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[11px] rounded-full gap-1 border-dashed cursor-pointer"
                        onClick={() => setIsCreatingType(true)}
                      >
                        <Plus className="h-2.5 w-2.5" /> New
                      </Button>
                    )}
                  </div>

                  {isCreatingType && (
                    <div className="p-2.5 rounded-lg border bg-muted/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                          <Plus className="h-3 w-3 text-primary" /> New Type
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                          onClick={() => {
                            setIsCreatingType(false);
                            setNewTypeName("");
                          }}
                        >
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      </div>

                      <div className="space-y-1.5">
                        <Input
                          placeholder="Type name..."
                          value={newTypeName}
                          onChange={(e) => setNewTypeName(e.target.value)}
                          className="h-7 text-xs w-full"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleCreateNewType();
                            }
                          }}
                        />
                        <div className="flex items-center justify-between gap-1 pt-1">
                          <div className="flex items-center gap-1 flex-wrap">
                            {TYPE_COLORS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setNewTypeColor(c)}
                                className={`h-4 w-4 rounded-full border transition-all cursor-pointer ${
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
                            className="h-6 px-2 text-[11px] shrink-0 cursor-pointer"
                            onClick={() => handleCreateNewType()}
                            disabled={isSubmittingType || !newTypeName.trim()}
                          >
                            {isSubmittingType ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {editingField === "types" && (
                    <div className="flex justify-end gap-1.5 pt-1.5 border-t">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] px-2"
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
                        className="h-6 text-[11px] px-2"
                        onClick={() => handleSave()}
                        disabled={isSubmitting}
                      >
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Col 3: Assignees */}
            <div className="p-3 rounded-xl bg-muted/20 border border-border/70 space-y-2 flex flex-col justify-between min-h-[92px]">
              <div className="flex items-center justify-between gap-1">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <UsersIcon className="h-3.5 w-3.5" /> Assignees
                </Label>
                {!isEditingSection("assignees") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => setEditingField("assignees")}
                    title="Edit assignees"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {!isEditingSection("assignees") ? (
                <div className="flex flex-wrap items-center gap-1.5 py-0.5">
                  {assignedUsers.length > 0 ? (
                    assignedUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-background border shadow-2xs text-[11px]"
                        title={user.Name}
                      >
                        <Avatar className="h-4 w-4">
                          {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                          <AvatarFallback className="text-[7px]">
                            {getInitials(user.Name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground truncate max-w-[80px]">
                          {user.Name}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground/60 italic">Unassigned</span>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-5 px-1.5 text-[10px] rounded-full gap-0.5 border-dashed text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => setEditingField("assignees")}
                  >
                    <Plus className="h-2.5 w-2.5" /> Assign
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-1 gap-1 max-h-36 overflow-y-auto">
                    {users.map((user) => {
                      const isAssigned = selectedUserIds.includes(user.id);
                      return (
                        <div
                          key={user.id}
                          onClick={() => toggleUser(user.id)}
                          className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer border transition-colors select-none text-xs ${
                            isAssigned
                              ? "bg-primary/10 border-primary/40 text-foreground"
                              : "border-transparent hover:bg-muted/50 text-muted-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Avatar className="h-5 w-5">
                              {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                              <AvatarFallback className="text-[7px]">
                                {getInitials(user.Name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground truncate max-w-[110px]">
                              {user.Name}
                            </span>
                          </div>
                          {isAssigned && <Check className="h-3 w-3 text-primary shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                  {editingField === "assignees" && (
                    <div className="flex justify-end gap-1.5 pt-1.5 border-t">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] px-2"
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
                        className="h-6 text-[11px] px-2"
                        onClick={() => handleSave()}
                        disabled={isSubmitting}
                      >
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Col 4: Used Software */}
            <div className="p-3 rounded-xl bg-muted/20 border border-border/70 space-y-2 flex flex-col justify-between min-h-[92px]">
              <div className="flex items-center justify-between gap-1">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Laptop className="h-3.5 w-3.5" /> Used Software
                </Label>
                {!isEditingSection("softwares") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => setEditingField("softwares")}
                    title="Edit used software"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {!isEditingSection("softwares") ? (
                <div className="flex flex-wrap items-center gap-1.5 py-0.5">
                  {assignedSoftwares.length > 0 ? (
                    assignedSoftwares.map((soft) => (
                      <span
                        key={soft.id}
                        className="inline-flex items-center gap-1.5 rounded-full pl-1.5 pr-1 py-0.5 text-[11px] font-medium border bg-background dark:bg-card border-border/80 shadow-2xs group/badge"
                      >
                        <div className="h-3.5 w-3.5 rounded overflow-hidden flex items-center justify-center shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={soft.icon_url}
                            alt={soft.name}
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <span className="font-medium text-foreground truncate max-w-[80px]">{soft.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSoftwareInViewMode(soft.id)}
                          className="h-3.5 w-3.5 rounded-full inline-flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-all ml-0.5 cursor-pointer"
                          title={`Remove ${soft.name}`}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground/60 italic">No software</span>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-5 px-1.5 text-[10px] rounded-full gap-0.5 border-dashed text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => setEditingField("softwares")}
                  >
                    <Plus className="h-2.5 w-2.5" /> Software
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="flex flex-wrap gap-1.5 items-center max-h-40 overflow-y-auto">
                    {(softwares || []).map((soft) => {
                      const isSelected = selectedSoftwareIds.includes(soft.id);
                      return (
                        <div
                          key={soft.id}
                          className={`group/soft inline-flex items-center rounded-full border text-[11px] font-medium transition-all ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-xs"
                              : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSoftware(soft.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 cursor-pointer"
                          >
                            <div className="h-3.5 w-3.5 rounded overflow-hidden flex items-center justify-center shrink-0 bg-background/50 p-0.5">
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

                          {onDeleteSoftware && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSoftwareToDelete({ id: soft.id, name: soft.name });
                              }}
                              className="pr-1.5 pl-0.5 opacity-0 group-hover/soft:opacity-80 hover:!opacity-100 transition-opacity text-current hover:text-destructive cursor-pointer"
                              title={`Delete "${soft.name}" permanently`}
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {!isCreatingSoftware && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[11px] rounded-full gap-1 border-dashed cursor-pointer"
                        onClick={() => setIsCreatingSoftware(true)}
                      >
                        <Plus className="h-2.5 w-2.5" /> New
                      </Button>
                    )}
                  </div>

                  {isCreatingSoftware && (
                    <div className="p-2.5 rounded-lg border bg-muted/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                          <Plus className="h-3 w-3 text-primary" /> New Software
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                          onClick={() => {
                            setIsCreatingSoftware(false);
                            setNewSoftwareName("");
                            setNewSoftwareIconUrl("");
                          }}
                        >
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      </div>

                      <div className="space-y-1.5">
                        <Input
                          placeholder="Software name (e.g. Blender)..."
                          value={newSoftwareName}
                          onChange={(e) => setNewSoftwareName(e.target.value)}
                          className="h-7 text-xs"
                        />
                        <div className="flex items-center gap-1.5">
                          <label className="cursor-pointer inline-flex items-center gap-1 px-2 py-1 rounded border bg-background hover:bg-muted text-[10px] font-medium transition-colors shrink-0">
                            <Upload className="h-3 w-3" />
                            <span>Choose file...</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                              className="hidden"
                              onChange={handleSoftwareFileUpload}
                            />
                          </label>
                          <Input
                            placeholder="Or icon URL..."
                            value={newSoftwareIconUrl}
                            onChange={(e) => setNewSoftwareIconUrl(e.target.value)}
                            className="h-6 text-[10px] flex-1"
                          />
                        </div>

                        {newSoftwareIconUrl && (
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <div className="h-5 w-5 rounded border p-0.5 shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={newSoftwareIconUrl} alt="Preview" className="h-full w-full object-contain" />
                            </div>
                            <span className="text-[10px] text-muted-foreground truncate">
                              {newSoftwareName || "Preview"}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-end gap-1.5 pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[11px] px-2"
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
                            className="h-6 text-[11px] px-2"
                            onClick={() => handleCreateNewSoftware()}
                            disabled={isSubmittingSoftware || !newSoftwareName.trim() || !newSoftwareIconUrl.trim()}
                          >
                            {isSubmittingSoftware ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {editingField === "softwares" && (
                    <div className="flex justify-end gap-1.5 pt-1.5 border-t">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] px-2"
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
                        className="h-6 text-[11px] px-2"
                        onClick={() => handleSave()}
                        disabled={isSubmitting}
                      >
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
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
                        className="h-8 text-xs font-medium"
                        onClick={() => handleSave()}
                        disabled={isSubmitting}
                        title="Save Description (Ctrl+Enter)"
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
                  softwares={softwares}
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

            {/* Educational Materials & Learning Resources Section */}
            <div className="border-t pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                      <span>Educational Materials &amp; Study Guides</span>
                      {selectedMaterialIds.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-mono">
                          {selectedMaterialIds.length}
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Linked courses, YouTube videos, and documentation for this task
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs gap-1.5 rounded-xl border-dashed hover:border-primary/50 text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => setIsAttachMaterialOpen(true)}
                  title="Add educational material (from library or create new)"
                >
                  <Plus className="h-3.5 w-3.5 text-primary" />
                  <span>Add Material</span>
                </Button>
              </div>

              {/* Attached materials list */}
              {selectedMaterialIds.length === 0 ? (
                <div
                  onClick={() => setIsAttachMaterialOpen(true)}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-dashed border-border/80 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer text-xs text-muted-foreground"
                >
                  <BookOpen className="h-4 w-4 text-primary/70 shrink-0" />
                  <span>No study materials linked yet. Click &quot;Add Material&quot; or here to attach from library or add a new link.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedMaterialIds.map((matId) => {
                    const mat =
                      allEducationalMaterials.find((m) => m.id === matId) ||
                      localMaterials.find((m) => m.id === matId) ||
                      task?.educational_materials?.find((m) => m.id === matId);
                    if (!mat) return null;
                    const typeMeta = getMaterialTypeMeta(mat.type);
                    const TypeIcon = typeMeta.icon;
                    const groupObj = mat.group_id
                      ? allStudyGroups.find((g) => g.id === mat.group_id)
                      : null;

                    const ytId = extractYouTubeId(mat.url);
                    const vimeoId = extractVimeoId(mat.url);
                    const isDirectVideo = isDirectVideoUrl(mat.url);
                    const isVideo = Boolean(ytId || vimeoId || isDirectVideo || mat.type === "video");
                    const isPlaying = Boolean(playingMaterialIds[mat.id]);
                    const ytThumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;
                    const embedUrl = ytId
                      ? `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0`
                      : vimeoId
                      ? `https://player.vimeo.com/video/${vimeoId}?autoplay=1`
                      : null;

                    if (isVideo && mat.url) {
                      return (
                        <div
                          key={mat.id}
                          className="col-span-1 sm:col-span-2 flex flex-col rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs hover:shadow-md transition-all text-xs group/mat"
                        >
                          {/* Card Header */}
                          <div className="flex items-center justify-between p-2.5 sm:px-3.5 border-b bg-muted/20 gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold text-white"
                                style={{ backgroundColor: typeMeta.color }}
                              >
                                <TypeIcon className="h-3 w-3" />
                                <span>{typeMeta.label}</span>
                              </span>
                              {groupObj ? (
                                <span className="text-[10px] text-muted-foreground font-medium">
                                  {groupObj.name}
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground/70 font-medium bg-muted/60 px-1.5 py-0.2 rounded border border-border/40">
                                  Unassigned
                                </span>
                              )}
                              {mat.estimated_duration && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-2.5 w-2.5" />
                                  {mat.estimated_duration}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setPlayingMaterialIds((prev) => ({
                                    ...prev,
                                    [mat.id]: !prev[mat.id],
                                  }))
                                }
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                                  isPlaying
                                    ? "bg-muted text-foreground hover:bg-muted/80"
                                    : "bg-red-600 hover:bg-red-700 text-white shadow-xs"
                                }`}
                                title={isPlaying ? "Show video thumbnail" : "Load & play video on this page"}
                              >
                                {isPlaying ? (
                                  <>
                                    <ImageIcon className="h-3 w-3" />
                                    <span>Thumbnail</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-3 w-3 fill-current" />
                                    <span>Play on page</span>
                                  </>
                                )}
                              </button>

                              {mat.url && (
                                <a
                                  href={mat.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                  title="Open video link in new tab"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                                title="Remove attachment"
                                onClick={() => handleRemoveMaterialInViewMode(mat.id)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          {/* In-Place Video Player vs Clickable Thumbnail */}
                          <div className="relative w-full aspect-video bg-black overflow-hidden select-none">
                            {!isPlaying ? (
                              /* Thumbnail state with play button overlay */
                              <div
                                onClick={() =>
                                  setPlayingMaterialIds((prev) => ({
                                    ...prev,
                                    [mat.id]: true,
                                  }))
                                }
                                className="group/thumb relative h-full w-full cursor-pointer overflow-hidden flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black"
                              >
                                {ytThumb ? (
                                  <img
                                    src={ytThumb}
                                    alt={mat.title}
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover/thumb:scale-105"
                                  />
                                ) : (
                                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                    <Video className="h-12 w-12 text-primary/70 stroke-[1.5]" />
                                    <span className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">
                                      Video Preview
                                    </span>
                                  </div>
                                )}

                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/25 transition-colors group-hover/thumb:from-black/90 group-hover/thumb:via-black/35" />

                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                                  <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-red-600/95 text-white shadow-2xl transition-all duration-300 transform group-hover/thumb:scale-110 group-hover/thumb:bg-red-600 ring-4 ring-white/20">
                                    <Play className="ml-1 h-6 w-6 sm:h-8 sm:w-8 fill-current" />
                                  </div>
                                  <span className="px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-semibold text-white/90 border border-white/10 shadow-lg tracking-wide">
                                    Click to play video on page
                                  </span>
                                </div>
                              </div>
                            ) : (
                              /* In-Place Player state */
                              <div className="h-full w-full bg-black flex flex-col justify-center">
                                {embedUrl ? (
                                  <iframe
                                    src={embedUrl}
                                    title={mat.title}
                                    className="h-full w-full border-0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    referrerPolicy="strict-origin-when-cross-origin"
                                    allowFullScreen
                                  />
                                ) : isDirectVideo ? (
                                  <video
                                    controls
                                    autoPlay
                                    playsInline
                                    preload="metadata"
                                    className="h-full w-full bg-black object-contain"
                                  >
                                    <source src={mat.url} />
                                    Your browser does not support the video tag.
                                  </video>
                                ) : (
                                  <div className="flex flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground">
                                    <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
                                    <p>Unable to load video player directly.</p>
                                    <a
                                      href={mat.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-2 inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                                    >
                                      <span>Open Video in New Tab</span>
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Title & Description under player */}
                          <div className="p-3 bg-card space-y-1">
                            <div className="font-semibold text-foreground text-xs leading-snug flex items-center gap-1">
                              <span>{mat.title}</span>
                            </div>
                            {mat.description && (
                              <p className="text-[11px] text-muted-foreground leading-relaxed">
                                {mat.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={mat.id}
                        className="flex items-start justify-between gap-2 p-2.5 rounded-xl border border-border/80 bg-card hover:bg-muted/30 transition-colors text-xs group/mat"
                      >
                        <div className="min-w-0 space-y-1 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold text-white"
                              style={{ backgroundColor: typeMeta.color }}
                            >
                              <TypeIcon className="h-3 w-3" />
                              <span>{typeMeta.label}</span>
                            </span>
                            {groupObj ? (
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {groupObj.name}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/70 font-medium bg-muted/60 px-1.5 py-0.2 rounded border border-border/40">
                                Unassigned
                              </span>
                            )}
                          </div>

                          {mat.url ? (
                            <a
                              href={mat.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-1 flex items-center gap-1"
                            >
                              <span>{mat.title}</span>
                              <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                            </a>
                          ) : (
                            <div className="font-semibold text-foreground line-clamp-1">
                              {mat.title}
                            </div>
                          )}

                          {mat.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2">
                              {mat.description}
                            </p>
                          )}

                          {mat.estimated_duration && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              {mat.estimated_duration}
                            </span>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                          title="Remove attachment"
                          onClick={() => handleRemoveMaterialInViewMode(mat.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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

      {/* Add Educational Material Modal (with Library and Add New tabs) */}
      <AttachMaterialModal
        isOpen={isAttachMaterialOpen}
        onClose={() => setIsAttachMaterialOpen(false)}
        attachedMaterialIds={selectedMaterialIds}
        allMaterials={localMaterials}
        allGroups={allStudyGroups}
        onSaveAttachments={handleSaveAttachedMaterials}
        onMaterialCreated={handleMaterialCreated}
      />
    </Dialog>
  );
}
