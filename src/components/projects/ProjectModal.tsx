"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FolderKanban, Loader2 } from "lucide-react";
import { Project } from "@/types/database.types";

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
  onSave: (data: { name: string; description?: string }) => Promise<void>;
}

export function ProjectModal({
  isOpen,
  onClose,
  project,
  onSave,
}: ProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || "");
    } else {
      setName("");
      setDescription("");
    }
    setError(null);
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      console.error("Failed to save project:", err);
      setError(err.message || "Failed to save project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FolderKanban className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg font-bold">
                {project ? "Edit Project Name" : "Create New Project"}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="project-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Project Name *
              </Label>
              <Input
                id="project-name"
                placeholder="e.g. Website Redesign, Sprint 4..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="text-sm font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project-desc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Description (Optional)
              </Label>
              <Textarea
                id="project-desc"
                placeholder="Brief summary or objective for this project..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting || !name.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {project ? "Save Changes" : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

