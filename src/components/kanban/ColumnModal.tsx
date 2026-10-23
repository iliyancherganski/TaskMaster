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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Status } from "@/types/database.types";
import { Loader2, Palette, Check } from "lucide-react";

interface ColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  status?: Status | null;
  onSave: (statusData: { name: string; color: string; description?: string }) => Promise<void>;
}

const PRESET_COLORS = [
  { name: "Slate", hex: "#64748b" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Purple", hex: "#8b5cf6" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Rose", hex: "#f43f5e" },
  { name: "Cyan", hex: "#06b6d4" },
  { name: "Indigo", hex: "#6366f1" },
  { name: "Orange", hex: "#ea580c" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Teal", hex: "#14b8a6" },
  { name: "Lime", hex: "#84cc16" },
  { name: "Sky", hex: "#0284c7" },
  { name: "Violet", hex: "#7c3aed" },
  { name: "Red", hex: "#dc2626" },
  { name: "Zinc", hex: "#71717a" },
];

export function ColumnModal({
  isOpen,
  onClose,
  status,
  onSave,
}: ColumnModalProps) {
  const isEditing = Boolean(status?.id);

  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status) {
      setName(status.name);
      setColor(status.color || "#3b82f6");
      setDescription(status.description || "");
    } else {
      setName("");
      setColor("#3b82f6");
      setDescription("");
    }
    setError(null);
  }, [status, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Column name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        name: name.trim(),
        color,
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      console.error("Failed to save column:", err);
      setError(err.message || "Failed to save column");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <span
                className="h-3.5 w-3.5 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: color }}
              />
              <span>{isEditing ? `Edit Column: ${status?.name}` : "Add Custom Column"}</span>
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Customize the label, color indicator, and description for this column."
                : "Create a new status column for your Kanban workflow."}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Column Label */}
            <div className="space-y-1.5">
              <Label htmlFor="col-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Column Label *
              </Label>
              <Input
                id="col-name"
                placeholder="e.g. Testing, Ready for Review, Blocked..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-sm font-medium"
                autoFocus
              />
            </div>

            {/* Color Palette Picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5" /> Column Color
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-muted-foreground uppercase">{color}</span>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-6 w-6 cursor-pointer rounded border border-border bg-transparent p-0"
                    title="Choose custom color"
                  />
                </div>
              </div>

              {/* Swatches Grid */}
              <div className="grid grid-cols-8 gap-2 p-2 rounded-lg border bg-muted/30">
                {PRESET_COLORS.map((preset) => {
                  const isSelected = color.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      type="button"
                      key={preset.hex}
                      onClick={() => setColor(preset.hex)}
                      className="group relative flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      style={{ backgroundColor: preset.hex }}
                      title={preset.name}
                    >
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-white drop-shadow-md" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="col-desc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Description (Optional)
              </Label>
              <Textarea
                id="col-desc"
                placeholder="e.g. Items undergoing quality assurance before release"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>

            {/* Live Preview Card */}
            <div className="p-3 rounded-lg border bg-card/60 space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Live Preview
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full shadow-xs"
                  style={{ backgroundColor: color }}
                />
                <span className="font-semibold text-sm text-foreground">
                  {name.trim() || "Untitled Column"}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  0
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-5 pt-3 border-t">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {isEditing ? "Save Column" : "Add Column"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

