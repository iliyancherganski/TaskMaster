"use client";

import React, { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Status, Project, TaskType, User, TaskWithDetails } from "@/types/database.types";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { updateTaskStatus } from "@/lib/supabase/actions";
import { Button } from "@/components/ui/button";

interface KanbanBoardProps {
  statuses: Status[];
  tasks: TaskWithDetails[];
  onTasksChange: (tasks: TaskWithDetails[]) => void;
  onAddTask: (statusId: string) => void;
  onEditTask: (task: TaskWithDetails) => void;
  onDeleteTask: (taskId: string) => void;
  onEditColumn?: (status: Status) => void;
  onDeleteColumn?: (statusId: string) => void;
  onAddColumn?: () => void;
  onOpenSubtask?: (subtask: TaskWithDetails) => void;
}

export function KanbanBoard({
  statuses,
  tasks,
  onTasksChange,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onEditColumn,
  onDeleteColumn,
  onAddColumn,
  onOpenSubtask,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<TaskWithDetails | null>(null);

  // Set up sensors: pointer constraint prevents conflict with button clicks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === "Task";
    const isOverTask = over.data.current?.type === "Task";
    const isOverColumn = over.data.current?.type === "Column";

    if (!isActiveTask) return;

    // 1. Dragging a task over another task in a different column
    if (isOverTask) {
      const activeIndex = tasks.findIndex((t) => t.id === activeId);
      const overIndex = tasks.findIndex((t) => t.id === overId);

      if (activeIndex !== -1 && overIndex !== -1) {
        if (tasks[activeIndex].status_id !== tasks[overIndex].status_id) {
          const updated = [...tasks];
          updated[activeIndex] = {
            ...updated[activeIndex],
            status_id: tasks[overIndex].status_id,
          };
          onTasksChange(arrayMove(updated, activeIndex, overIndex));
        }
      }
    }

    // 2. Dragging a task over an empty column
    if (isOverColumn) {
      const activeIndex = tasks.findIndex((t) => t.id === activeId);
      if (activeIndex !== -1) {
        const targetStatusId = overId;
        if (tasks[activeIndex].status_id !== targetStatusId) {
          const updated = [...tasks];
          updated[activeIndex] = {
            ...updated[activeIndex],
            status_id: targetStatusId,
          };
          onTasksChange(updated);
        }
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeIndex = tasks.findIndex((t) => t.id === activeId);
    if (activeIndex === -1) return;

    const currentTask = tasks[activeIndex];

    // Determine target status
    let targetStatusId = currentTask.status_id;
    if (over.data.current?.type === "Column") {
      targetStatusId = overId;
    } else if (over.data.current?.type === "Task") {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask && overTask.status_id) {
        targetStatusId = overTask.status_id;
      }
    }

    // If reordering within the same column
    if (activeId !== overId && over.data.current?.type === "Task") {
      const overIndex = tasks.findIndex((t) => t.id === overId);
      if (overIndex !== -1) {
        const reordered = arrayMove(tasks, activeIndex, overIndex);
        onTasksChange(reordered);
      }
    }

    // Optimistic persistence to Supabase
    if (targetStatusId) {
      try {
        await updateTaskStatus(activeId, targetStatusId, activeIndex);
      } catch (err) {
        console.error("Failed to persist task status update to Supabase:", err);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-5 overflow-x-auto pb-6 pt-2 items-start scrollbar-thin">
        {statuses.map((status) => {
          const columnTasks = tasks.filter((t) => t.status_id === status.id);
          return (
            <KanbanColumn
              key={status.id}
              status={status}
              tasks={columnTasks}
              onAddTask={onAddTask}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onEditColumn={onEditColumn}
              onDeleteColumn={onDeleteColumn}
              onOpenSubtask={onOpenSubtask}
            />
          );
        })}

        {/* Add Column Card */}
        {onAddColumn && (
          <div className="flex flex-col w-72 shrink-0 rounded-2xl border-2 border-dashed border-border/80 bg-muted/20 p-4 transition-colors hover:border-primary/50 hover:bg-muted/40">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs shadow-xs"
                onClick={onAddColumn}
              >
                <Plus className="h-4 w-4 text-primary" />
                <span>Add Custom Column</span>
              </Button>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Create new workflow stages (e.g. Testing, Blocked)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Drag Overlay for smooth card movement */}
      <DragOverlay>
        {activeTask ? (
          <KanbanCard
            task={activeTask}
            status={statuses.find((s) => s.id === activeTask.status_id)}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
