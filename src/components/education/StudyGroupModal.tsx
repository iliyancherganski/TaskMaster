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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudyGroup, StudyGroupWithDetails } from "@/types/database.types";
import {
  Folder,
  Palette,
  Box,
  Layers,
  Brush,
  Cpu,
  Sparkles,
  Droplet,
  Camera,
  Film,
  Sliders,
  Code,
  BookOpen,
  Globe,
  Tag,
  X,
  Plus,
} from "lucide-react";

const GROUP_COLORS = [
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#f59e0b", // Amber
  "#06b6d4", // Cyan
  "#f43f5e", // Rose
  "#64748b", // Slate
];

const GROUP_ICONS = [
  { name: "folder", label: "Folder", Icon: Folder },
  { name: "palette", label: "Palette", Icon: Palette },
  { name: "box", label: "3D Box", Icon: Box },
  { name: "layers", label: "Layers", Icon: Layers },
  { name: "brush", label: "Brush", Icon: Brush },
  { name: "cpu", label: "Engine / CPU", Icon: Cpu },
  { name: "sparkles", label: "Sparkles", Icon: Sparkles },
  { name: "droplet", label: "Material / Droplet", Icon: Droplet },
  { name: "camera", label: "Camera", Icon: Camera },
  { name: "film", label: "Film / Comp", Icon: Film },
  { name: "sliders", label: "Sliders", Icon: Sliders },
  { name: "code", label: "Code", Icon: Code },
  { name: "book", label: "Book", Icon: BookOpen },
  { name: "globe", label: "Web", Icon: Globe },
];

export function getGroupIconComponent(iconName?: string | null) {
  const match = GROUP_ICONS.find((i) => i.name === iconName);
  return match ? match.Icon : Folder;
}

interface StudyGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group?: StudyGroup | null;
  defaultParentId?: string | null;
  allGroups: StudyGroup[];
  onSave: (data: {
    name: string;
    description?: string;
    color: string;
    icon: string;
    parent_id: string | null;
    tags: string[];
  }) => Promise<void>;
}

export function StudyGroupModal({
  isOpen,
  onClose,
  group,
  defaultParentId = null,
  allGroups,
  onSave,
}: StudyGroupModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#10b981");
  const [icon, setIcon] = useState("folder");
  const [parentId, setParentId] = useState<string | "none">("none");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (group) {
        setName(group.name);
        setDescription(group.description || "");
        setColor(group.color || "#10b981");
        setIcon(group.icon || "folder");
        setParentId(group.parent_id || "none");
        setTags(group.tags || []);
      } else {
        setName("");
        setDescription("");
        setColor(
          defaultParentId
            ? allGroups.find((g) => g.id === defaultParentId)?.color || "#10b981"
            : "#10b981"
        );
        setIcon("folder");
        setParentId(defaultParentId || "none");
        setTags([]);
      }
      setTagInput("");
      setError(null);
    }
  }, [isOpen, group, defaultParentId, allGroups]);

  // Compute eligible parent groups (prevent selecting self or descendants to avoid cycles)
  const eligibleParents = React.useMemo(() => {
    if (!group) return allGroups;

    const findDescendants = (groupId: string): Set<string> => {
      const set = new Set<string>([groupId]);
      let added = true;
      while (added) {
        added = false;
        for (const g of allGroups) {
          if (g.parent_id && set.has(g.parent_id) && !set.has(g.id)) {
            set.add(g.id);
            added = true;
          }
        }
      }
      return set;
    };

    const forbidden = findDescendants(group.id);
    return allGroups.filter((g) => !forbidden.has(g.id));
  }, [allGroups, group]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a name for the group.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        icon,
        parent_id: parentId === "none" ? null : parentId,
        tags,
      });
      onClose();
    } catch (err: any) {
      console.error("Failed to save study group:", err);
      setError(err?.message || "Failed to save study group. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const SelectedIconComp = getGroupIconComponent(icon);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-xs"
                style={{ backgroundColor: color }}
              >
                <SelectedIconComp className="h-4 w-4" />
              </span>
              <span>
                {group
                  ? "Edit Study Group"
                  : parentId !== "none"
                  ? "Create Nested Subgroup"
                  : "Create Main Study Field"}
              </span>
            </DialogTitle>
            <DialogDescription>
              Organize educational resources into high-level study fields (e.g. Environment Art)
              or nested subgroups (e.g. Texturing, Blender Modelling).
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-2.5 text-xs font-medium text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-3.5 text-xs">
            {/* Group Name */}
            <div className="space-y-1.5">
              <Label htmlFor="group-name" className="text-xs font-semibold">
                Group Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Environment Art, Texturing & UVs, Unreal Engine..."
                className="text-xs h-9"
                autoFocus
              />
            </div>

            {/* Parent Group Selector (Nesting) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Parent Group (Nesting)</Label>
              <Select
                value={parentId}
                onValueChange={(val) => setParentId(val as string)}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Select parent or leave as top-level" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="none" className="text-xs font-medium">
                    📂 Top-Level Study Field (No Parent)
                  </SelectItem>
                  {eligibleParents.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: p.color }}
                        />
                        <span>{p.name}</span>
                        {p.parent_id && (
                          <span className="text-[10px] text-muted-foreground">
                            (Subgroup)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color Accent Picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Color Accent</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {GROUP_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-6 w-6 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                      color === c ? "scale-125 ring-2 ring-primary ring-offset-2" : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Icon Picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Icon</Label>
              <div className="grid grid-cols-7 gap-1.5 p-2 rounded-lg border bg-muted/20">
                {GROUP_ICONS.map(({ name: iconKey, label, Icon: IconComponent }) => (
                  <button
                    key={iconKey}
                    type="button"
                    onClick={() => setIcon(iconKey)}
                    title={label}
                    className={`flex flex-col items-center justify-center h-8 w-8 rounded-md transition-colors cursor-pointer ${
                      icon === iconKey
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="group-desc" className="text-xs font-semibold">
                Description &amp; Learning Objectives
              </Label>
              <Textarea
                id="group-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is covered in this study field? Key topics, pipeline overview, study focus..."
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tags</Label>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Tag className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Type tag and press enter (e.g. Blender, PBR, Stylized)"
                    className="pl-8 text-xs h-8"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs gap-1"
                  onClick={handleAddTag}
                >
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-primary/10 text-primary font-medium"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="text-xs h-8 gap-1.5">
              {isSubmitting ? "Saving..." : group ? "Update Group" : "Create Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

