"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Navbar } from "@/components/navbar/Navbar";
import { KanbanFilterBar } from "@/components/filters/KanbanFilterBar";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { FolderExplorerView } from "@/components/explorer/FolderExplorerView";
import { TaskModal } from "@/components/tasks/TaskModal";
import { ColumnModal } from "@/components/kanban/ColumnModal";
import { ProjectModal } from "@/components/projects/ProjectModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Status,
  Project,
  TaskType,
  User,
  TaskWithDetails,
  Software,
} from "@/types/database.types";
import {
  fetchBoardData,
  deleteTask,
  createStatus,
  updateStatus,
  deleteStatus,
  createTaskType,
  deleteTaskType,
  createProject,
  updateProject,
  deleteProject,
  createSoftware,
  deleteSoftware,
} from "@/lib/supabase/actions";
import { Loader2, Pencil, Trash2, FolderKanban } from "lucide-react";

export default function TaskMasterPage() {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [softwares, setSoftwares] = useState<Software[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [allTasks, setAllTasks] = useState<TaskWithDetails[]>([]);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // View Mode: Kanban vs Folder Structure
  const [viewMode, setViewMode] = useState<"kanban" | "folder">("kanban");

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("all");
  const [selectedTypeId, setSelectedTypeId] = useState("all");

  // Task Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithDetails | null>(null);
  const [defaultStatusId, setDefaultStatusId] = useState<string | undefined>(undefined);
  const [defaultParentTaskId, setDefaultParentTaskId] = useState<string | undefined>(undefined);

  // Column / Status Modal state
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<Status | null>(null);

  // Project Modal & 2-Step Deletion states
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleteProjectStep, setDeleteProjectStep] = useState<1 | 2 | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  const STORAGE_KEY_PROJECT = "taskmaster_selected_project";

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_PROJECT, projectId);
      } catch (e) {}
    }
  };

  // Initial load
  const loadData = async () => {
    try {
      const data = await fetchBoardData();
      setStatuses(data.statuses);
      setProjects(data.projects);
      setTaskTypes(data.taskTypes);
      setSoftwares(data.softwares);
      setUsers(data.users);
      setTasks(data.tasks);
      setAllTasks(data.allTasks);
      setIsConfigured(data.isConfigured);

      // Restore saved project selection from localStorage if valid
      if (typeof window !== "undefined") {
        try {
          const savedProjectId = localStorage.getItem(STORAGE_KEY_PROJECT);
          if (savedProjectId) {
            if (savedProjectId === "all" || data.projects.some((p) => p.id === savedProjectId)) {
              setSelectedProjectId(savedProjectId);
            } else {
              localStorage.setItem(STORAGE_KEY_PROJECT, "all");
              setSelectedProjectId("all");
            }
          }
        } catch (e) {}
      }
    } catch (err) {
      console.error("Failed to load TaskMaster data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter tasks based on search and selected filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search query (matches name or description)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = task.name.toLowerCase().includes(query);
        const matchesDesc = task.description?.toLowerCase().includes(query) ?? false;
        if (!matchesName && !matchesDesc) return false;
      }

      // Project filter
      if (selectedProjectId !== "all" && task.Project_id !== selectedProjectId) {
        return false;
      }

      // Assignee filter
      if (selectedAssigneeId !== "all") {
        const hasAssignee = task.assignees?.some((u) => u.id === selectedAssigneeId);
        if (!hasAssignee) return false;
      }

      // Task type filter
      if (selectedTypeId !== "all") {
        const hasType = task.task_types?.some((t) => t.id === selectedTypeId);
        if (!hasType) return false;
      }

      return true;
    });
  }, [tasks, searchQuery, selectedProjectId, selectedAssigneeId, selectedTypeId]);

  // Statistics
  const doneStatus = statuses.find((s) => s.name.toLowerCase().includes("done")) || statuses[statuses.length - 1];
  const completedCount = tasks.filter((t) => t.status_id === doneStatus?.id).length;

  // Helper to update the browser URL query parameter for task without page reload
  const updateTaskUrl = (taskId: string | null) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (taskId) {
      if (url.searchParams.get("task") === taskId) return;
      url.searchParams.set("task", taskId);
      window.history.pushState({ taskId }, "", url.pathname + url.search);
    } else {
      if (!url.searchParams.has("task")) return;
      url.searchParams.delete("task");
      window.history.pushState({}, "", url.pathname + (url.search ? url.search : ""));
    }
  };

  const findTaskById = (targetTaskId: string): TaskWithDetails | undefined => {
    const findRecursive = (list: TaskWithDetails[]): TaskWithDetails | undefined => {
      for (const t of list) {
        if (t.id === targetTaskId) return t;
        if (t.subtasks && t.subtasks.length > 0) {
          const found = findRecursive(t.subtasks);
          if (found) return found;
        }
      }
      return undefined;
    };
    return allTasks.find((t) => t.id === targetTaskId) || findRecursive(tasks);
  };

  // Handle browser Back / Forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const taskIdFromUrl = params.get("task");

      if (taskIdFromUrl) {
        const target = findTaskById(taskIdFromUrl);
        if (target) {
          setEditingTask(target);
          setIsModalOpen(true);
        }
      } else {
        setIsModalOpen(false);
        setEditingTask(null);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [allTasks, tasks]);

  // Handle direct links or page refresh with ?task=<id>
  useEffect(() => {
    if (isLoading || allTasks.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const taskIdFromUrl = params.get("task");
    if (taskIdFromUrl) {
      const target = findTaskById(taskIdFromUrl);
      if (target) {
        setEditingTask(target);
        setIsModalOpen(true);
      }
    }
  }, [isLoading, allTasks]);

  // Handlers for Task Creation & Edit
  const handleOpenCreateModal = (statusId?: string, parentTaskId?: string) => {
    setEditingTask(null);
    setDefaultParentTaskId(parentTaskId);
    setDefaultStatusId(statusId || statuses[0]?.id);
    setIsModalOpen(true);
    updateTaskUrl(null);
  };

  const handleOpenEditModal = (task: TaskWithDetails) => {
    setEditingTask(task);
    setDefaultParentTaskId(undefined);
    setDefaultStatusId(task.status_id || undefined);
    setIsModalOpen(true);
    updateTaskUrl(task.id);
  };

  // Directory drilldown: navigate to a specific task by ID (for breadcrumb clicks or subtask clicks)
  const handleNavigateToTask = (targetTaskId: string) => {
    const target = findTaskById(targetTaskId);
    if (target) {
      setEditingTask(target);
      setIsModalOpen(true);
      updateTaskUrl(target.id);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
    setDefaultParentTaskId(undefined);
    updateTaskUrl(null);
  };

  const handleTaskDeletedFromModal = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setAllTasks((prev) => prev.filter((t) => t.id !== taskId));
    setIsModalOpen(false);
    setEditingTask(null);
    updateTaskUrl(null);

    try {
      await deleteTask(taskId);
      await loadData();
    } catch (err) {
      console.error("Failed to delete task:", err);
      await loadData();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task and its subtasks?")) return;

    // Optimistic removal
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setAllTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      await deleteTask(taskId);
      await loadData();
    } catch (err) {
      console.error("Failed to delete task:", err);
      await loadData();
    }
  };

  const handleTaskSaved = async (savedTask: TaskWithDetails) => {
    // 1. Immediately update active editing task so the modal displays changes in real-time
    setEditingTask(savedTask);

    // 2. Optimistically update task lists for instant UI reflection on board
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === savedTask.id);
      if (exists) {
        return prev.map((t) => (t.id === savedTask.id ? { ...t, ...savedTask } : t));
      }
      // New top-level task — prepend it
      if (!savedTask.Task_Parent_Id) {
        return [savedTask, ...prev];
      }
      return prev;
    });
    setAllTasks((prev) => {
      const exists = prev.some((t) => t.id === savedTask.id);
      if (exists) {
        return prev.map((t) => (t.id === savedTask.id ? { ...t, ...savedTask } : t));
      }
      return [...prev, savedTask];
    });

    // 3. Re-fetch board data to sync all relations and child subtasks
    try {
      const data = await fetchBoardData();
      setStatuses(data.statuses);
      setProjects(data.projects);
      setTaskTypes(data.taskTypes);
      setSoftwares(data.softwares);
      setUsers(data.users);
      setTasks(data.tasks);
      setAllTasks(data.allTasks);
      setIsConfigured(data.isConfigured);

      const fresh = data.allTasks.find((t) => t.id === savedTask.id);
      if (fresh) {
        setEditingTask(fresh);
      }
    } catch (err) {
      console.error("Failed to refresh board data:", err);
    }
  };

  // Handlers for Column (Status) Customization
  const handleOpenAddColumn = () => {
    setEditingStatus(null);
    setIsColumnModalOpen(true);
  };

  const handleOpenEditColumn = (status: Status) => {
    setEditingStatus(status);
    setIsColumnModalOpen(true);
  };

  const handleSaveColumn = async (statusData: {
    name: string;
    color: string;
    description?: string;
  }) => {
    if (editingStatus) {
      // Update existing column
      const updated = await updateStatus(editingStatus.id, statusData);
      setStatuses((prev) =>
        prev.map((s) => (s.id === editingStatus.id ? { ...s, ...updated } : s))
      );
    } else {
      // Create new custom column
      const created = await createStatus({
        ...statusData,
        position: statuses.length,
      });
      setStatuses((prev) => [...prev, created]);
    }
    await loadData();
  };

  const handleDeleteColumn = async (statusId: string) => {
    const statusToDelete = statuses.find((s) => s.id === statusId);
    const count = tasks.filter((t) => t.status_id === statusId).length;

    if (
      !confirm(
        `Are you sure you want to delete the "${statusToDelete?.name || "Column"}" column?${
          count > 0 ? ` (${count} tasks will be unassigned from this status)` : ""
        }`
      )
    ) {
      return;
    }

    setStatuses((prev) => prev.filter((s) => s.id !== statusId));

    try {
      await deleteStatus(statusId);
      await loadData();
    } catch (err) {
      console.error("Failed to delete column:", err);
      await loadData();
    }
  };

  const handleCreateTaskType = async (data: { name: string; color: string }) => {
    try {
      const newType = await createTaskType(data);
      setTaskTypes((prev) => [...prev, newType]);
      return newType;
    } catch (err) {
      console.error("Failed to create task type:", err);
      throw err;
    }
  };

  const handleDeleteTaskType = async (typeId: string) => {
    try {
      await deleteTaskType(typeId);
      setTaskTypes((prev) => prev.filter((t) => t.id !== typeId));
      setTasks((prev) =>
        prev.map((t) => ({
          ...t,
          task_types: t.task_types.filter((tt) => tt.id !== typeId),
        }))
      );
      setAllTasks((prev) =>
        prev.map((t) => ({
          ...t,
          task_types: t.task_types.filter((tt) => tt.id !== typeId),
        }))
      );
    } catch (err) {
      console.error("Failed to delete task type:", err);
      throw err;
    }
  };

  const handleCreateSoftware = async (data: { name: string; icon_url: string }) => {
    try {
      const created = await createSoftware(data);
      setSoftwares((prev) => [...prev, created]);
      return created;
    } catch (err) {
      console.error("Failed to create software:", err);
      throw err;
    }
  };

  const handleDeleteSoftware = async (softwareId: string) => {
    try {
      await deleteSoftware(softwareId);
      setSoftwares((prev) => prev.filter((s) => s.id !== softwareId));
      await loadData();
    } catch (err) {
      console.error("Failed to delete software:", err);
      throw err;
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedProjectId("all");
    setSelectedAssigneeId("all");
    setSelectedTypeId("all");
  };

  // Project Handlers
  const handleOpenCreateProject = () => {
    setEditingProject(null);
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = (proj: Project) => {
    setEditingProject(proj);
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = async (data: { name: string; description?: string }) => {
    if (editingProject) {
      await updateProject(editingProject.id, data);
    } else {
      const created = await createProject(data.name, data.description);
      handleSelectProject(created.id);
    }
    await loadData();
  };

  const handleStartDeleteProject = (proj: Project) => {
    setProjectToDelete(proj);
    setDeleteProjectStep(1);
  };

  const handleFinalDeleteProject = async () => {
    if (!projectToDelete) return;
    setIsDeletingProject(true);
    try {
      await deleteProject(projectToDelete.id);
      handleSelectProject("all");
      await loadData();
      setProjectToDelete(null);
      setDeleteProjectStep(null);
    } catch (err) {
      console.error("Failed to delete project:", err);
    } finally {
      setIsDeletingProject(false);
    }
  };

  const currentProject =
    selectedProjectId !== "all" ? projects.find((p) => p.id === selectedProjectId) : null;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl overflow-hidden shadow-xl shadow-primary/20 bg-background border border-border/50 animate-pulse">
            <Image
              src="/logo.png"
              alt="TaskMaster Logo"
              width={56}
              height={56}
              className="h-full w-full object-contain p-1"
              priority
            />
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Loading TaskMaster Board &amp; Hierarchy...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/20">
      {/* Top Navbar */}
      <Navbar
        isConfigured={isConfigured}
        users={users}
        onNewTask={() => handleOpenCreateModal()}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onProjectChange={handleSelectProject}
        onNewProject={handleOpenCreateProject}
      />

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col px-4 sm:px-8 py-4 max-w-[1700px] w-full mx-auto">
        {/* Project Header Banner when a specific project is selected */}
        {currentProject && (
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border/70 bg-card/60 backdrop-blur-sm px-4 py-2 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FolderKanban className="h-4 w-4" />
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground leading-snug">
                  {currentProject.name}
                </h1>
                {currentProject.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-xl leading-tight">
                    {currentProject.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 gap-1.5 text-xs rounded-lg cursor-pointer"
                onClick={() => handleOpenEditProject(currentProject)}
              >
                <Pencil className="h-3 w-3 text-muted-foreground" />
                Edit project name
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 gap-1.5 text-xs rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 cursor-pointer"
                onClick={() => handleStartDeleteProject(currentProject)}
              >
                <Trash2 className="h-3 w-3" />
                Delete project
              </Button>
            </div>
          </div>
        )}

        {/* Filters and View Switcher Bar */}
        <KanbanFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedProjectId={selectedProjectId}
          onProjectChange={handleSelectProject}
          selectedAssigneeId={selectedAssigneeId}
          onAssigneeChange={setSelectedAssigneeId}
          selectedTypeId={selectedTypeId}
          onTypeChange={setSelectedTypeId}
          projects={projects}
          taskTypes={taskTypes}
          users={users}
          totalTasks={tasks.length}
          completedTasks={completedCount}
          onResetFilters={handleResetFilters}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* View Content: Kanban vs Folder Structure */}
        <div className="flex-1 mt-4">
          {viewMode === "kanban" ? (
            <KanbanBoard
              statuses={statuses}
              tasks={filteredTasks}
              onTasksChange={setTasks}
              onAddTask={(statusId) => handleOpenCreateModal(statusId)}
              onEditTask={handleOpenEditModal}
              onDeleteTask={handleDeleteTask}
              onEditColumn={handleOpenEditColumn}
              onDeleteColumn={handleDeleteColumn}
              onAddColumn={handleOpenAddColumn}
              onOpenSubtask={(st) => handleNavigateToTask(st.id)}
            />
          ) : (
            <FolderExplorerView
              tasks={filteredTasks}
              projects={projects}
              statuses={statuses}
              taskTypes={taskTypes}
              users={users}
              onOpenTask={handleOpenEditModal}
              onAddTask={(statusId, parentTaskId) =>
                handleOpenCreateModal(statusId, parentTaskId)
              }
              onDeleteTask={handleDeleteTask}
            />
          )}
        </div>
      </main>

      {/* Task Creation & Editing Dialog */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        task={editingTask}
        defaultStatusId={defaultStatusId}
        defaultParentTaskId={defaultParentTaskId}
        defaultProjectId={selectedProjectId !== "all" ? selectedProjectId : undefined}
        allTasks={allTasks}
        statuses={statuses}
        projects={projects}
        taskTypes={taskTypes}
        softwares={softwares}
        users={users}
        onTaskSaved={handleTaskSaved}
        onNavigateToTask={handleNavigateToTask}
        onCreateTaskType={handleCreateTaskType}
        onDeleteTaskType={handleDeleteTaskType}
        onCreateSoftware={handleCreateSoftware}
        onDeleteSoftware={handleDeleteSoftware}
        onDeleteTask={handleTaskDeletedFromModal}
      />

      {/* Column (Status) Customization Dialog */}
      <ColumnModal
        isOpen={isColumnModalOpen}
        onClose={() => {
          setIsColumnModalOpen(false);
          setEditingStatus(null);
        }}
        status={editingStatus}
        onSave={handleSaveColumn}
      />

      {/* Project Creation & Editing Dialog */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          setEditingProject(null);
        }}
        project={editingProject}
        onSave={handleSaveProject}
      />

      {/* Project Deletion Step 1: "Are you sure?" confirmation */}
      <ConfirmDialog
        isOpen={deleteProjectStep === 1}
        onClose={() => {
          setDeleteProjectStep(null);
          setProjectToDelete(null);
        }}
        onConfirm={() => {
          // Move directly to step 2 confirmation
          setDeleteProjectStep(2);
        }}
        title="Delete Project?"
        description={
          <span>
            Are you sure you want to delete project{" "}
            <strong className="text-foreground">
              &quot;{projectToDelete?.name}&quot;
            </strong>
            ? This will remove the project association from all of its tasks.
          </span>
        }
        confirmText="Continue to Delete"
        variant="destructive"
      />

      {/* Project Deletion Step 2: Name Input Confirmation */}
      <ConfirmDialog
        isOpen={deleteProjectStep === 2}
        onClose={() => {
          setDeleteProjectStep(null);
          setProjectToDelete(null);
        }}
        onConfirm={handleFinalDeleteProject}
        title="Permanently Delete Project"
        description={
          <span>
            This action cannot be undone. To permanently delete the project{" "}
            <strong className="text-foreground">
              &quot;{projectToDelete?.name}&quot;
            </strong>
            , please type its name below to confirm.
          </span>
        }
        confirmText="Permanently Delete Project"
        variant="destructive"
        isLoading={isDeletingProject}
        requiredMatchText={projectToDelete?.name}
        matchPlaceholder={`Type "${projectToDelete?.name}" to confirm`}
      />
    </div>
  );
}
