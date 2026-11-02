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
import {
  StudyGroup,
  EducationalMaterial,
  MaterialType,
} from "@/types/database.types";
import { validateMediaUrl } from "@/lib/media-utils";
import {
  Video,
  GraduationCap,
  BookOpen,
  Globe,
  MessagesSquare,
  FileText,
  Book,
  MoreHorizontal,
  Star,
  Tag,
  Clock,
  BarChart2,
  X,
  Plus,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react";

export const MATERIAL_TYPES: {
  type: MaterialType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  { type: "video", label: "Video / YouTube", icon: Video, color: "#ef4444" },
  { type: "course", label: "Course", icon: GraduationCap, color: "#8b5cf6" },
  { type: "guide", label: "Study Guide", icon: BookOpen, color: "#10b981" },
  { type: "website", label: "Website / Article", icon: Globe, color: "#3b82f6" },
  { type: "forum", label: "Community / Forum", icon: MessagesSquare, color: "#f59e0b" },
  { type: "doc", label: "Documentation", icon: FileText, color: "#06b6d4" },
  { type: "book", label: "Book", icon: Book, color: "#ec4899" },
  { type: "other", label: "Other Resource", icon: MoreHorizontal, color: "#64748b" },
];

export function getMaterialTypeMeta(type?: string | null) {
  const match = MATERIAL_TYPES.find((m) => m.type === type);
  return match || MATERIAL_TYPES[3]; // default website
}

interface MaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  material?: EducationalMaterial | null;
  defaultGroupId?: string | null;
  allGroups: StudyGroup[];
  onSave: (data: {
    title: string;
    url?: string | null;
    type: string;
    description?: string | null;
    group_id?: string | null;
    tags: string[];
    difficulty?: string | null;
    is_favorite?: boolean;
    estimated_duration?: string | null;
  }) => Promise<void>;
}

export function MaterialModal({
  isOpen,
  onClose,
  material,
  defaultGroupId = null,
  allGroups,
  onSave,
}: MaterialModalProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<MaterialType>("website");
  const [groupId, setGroupId] = useState<string | "none">("none");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (material) {
        setTitle(material.title);
        setUrl(material.url || "");
        setType((material.type as MaterialType) || "website");
        setGroupId(material.group_id || "none");
        setDescription(material.description || "");
        setDifficulty(material.difficulty || "Intermediate");
        setEstimatedDuration(material.estimated_duration || "");
        setIsFavorite(material.is_favorite || false);
        setTags(material.tags || []);
      } else {
        setTitle("");
        setUrl("");
        setType("website");
        setGroupId(defaultGroupId || (allGroups[0]?.id ?? "none"));
        setDescription("");
        setDifficulty("Intermediate");
        setEstimatedDuration("");
        setIsFavorite(false);
        setTags([]);
      }
      setTagInput("");
      setError(null);
    }
  }, [isOpen, material, defaultGroupId, allGroups]);

  // Auto-detect type from URL
  const handleUrlChange = (value: string) => {
    setUrl(value);
    const low = value.toLowerCase();
    if (low.includes("youtube.com") || low.includes("youtu.be") || low.includes("vimeo.com")) {
      setType("video");
    } else if (low.includes("udemy.com") || low.includes("coursera.org") || low.includes("skillshare.com") || low.includes("epicgames.com/community/learning")) {
      setType("course");
    } else if (low.includes("reddit.com") || low.includes("forum") || low.includes("polycount.com") || low.includes("blenderartists.org")) {
      setType("forum");
    } else if (low.includes("docs.") || low.includes("/docs") || low.includes("documentation") || low.includes("wiki")) {
      setType("doc");
    }
  };

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
    if (!title.trim()) {
      setError("Please enter a title for the educational material.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let finalUrl = url.trim() || null;
      if (finalUrl) {
        if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://") && !finalUrl.startsWith("mailto:")) {
          finalUrl = `https://${finalUrl}`;
        }
        const low = finalUrl.toLowerCase();
        if (low.includes("youtube.com") || low.includes("youtu.be")) {
          const validated = validateMediaUrl(finalUrl);
          if (!validated.isValid) {
            setError(validated.warning || "Invalid YouTube video link. Please verify the link points to a video.");
            setIsSubmitting(false);
            return;
          }
          finalUrl = validated.url;
        }
      }

      await onSave({
        title: title.trim(),
        url: finalUrl,
        type,
        group_id: groupId === "none" ? null : groupId,
        description: description.trim() || null,
        tags,
        difficulty,
        is_favorite: isFavorite,
        estimated_duration: estimatedDuration.trim() || null,
      });
      onClose();
    } catch (err: any) {
      console.error("Failed to save educational material:", err);
      setError(err?.message || "Failed to save material. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentTypeMeta = getMaterialTypeMeta(type);
  const TypeIcon = currentTypeMeta.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white shrink-0 shadow-xs"
                  style={{ backgroundColor: currentTypeMeta.color }}
                >
                  <TypeIcon className="h-4 w-4" />
                </span>
                <span>{material ? "Edit Educational Material" : "Add Educational Material"}</span>
              </DialogTitle>

              {/* Favorite Star */}
              <button
                type="button"
                onClick={() => setIsFavorite(!isFavorite)}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isFavorite
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                    : "text-muted-foreground hover:text-foreground border-border/60"
                }`}
                title={isFavorite ? "Favorited resource" : "Mark as favorite"}
              >
                <Star className={`h-4 w-4 ${isFavorite ? "fill-amber-500" : ""}`} />
              </button>
            </div>
            <DialogDescription className="text-xs">
              Store courses, YouTube videos, study guides, articles, forums, or notes for your team&apos;s learning hub.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-2.5 text-xs font-medium text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-3.5 text-xs">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="mat-title" className="text-xs font-semibold">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="mat-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Complete Blender Texturing Masterclass, PBR Guide..."
                className="text-xs h-9"
                autoFocus
              />
            </div>

            {/* URL */}
            <div className="space-y-1.5">
              <Label htmlFor="mat-url" className="text-xs font-semibold">
                Link / URL (Optional)
              </Label>
              <div className="relative">
                <LinkIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="mat-url"
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..., https://artstation.com/learning..."
                  className="pl-8 text-xs h-9"
                />
              </div>
            </div>

            {/* Type & Study Group (Side by side on sm) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Material Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Material Type</Label>
                <Select value={type} onValueChange={(val) => setType(val as MaterialType)}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_TYPES.map((m) => {
                      const Icon = m.icon;
                      return (
                        <SelectItem key={m.type} value={m.type} className="text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: m.color }}
                            />
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{m.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Study Field / Subgroup */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Study Field / Subgroup</Label>
                <Select value={groupId} onValueChange={setGroupId}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Select study group..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="none" className="text-xs font-medium">
                      Uncategorized
                    </SelectItem>
                    {allGroups.map((g) => {
                      const parent = allGroups.find((p) => p.id === g.parent_id);
                      return (
                        <SelectItem key={g.id} value={g.id} className="text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: g.color }}
                            />
                            <span>{g.name}</span>
                            {parent && (
                              <span className="text-[10px] text-muted-foreground">
                                ({parent.name})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Difficulty & Estimated Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Difficulty Level</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner" className="text-xs">
                      🟢 Beginner
                    </SelectItem>
                    <SelectItem value="Intermediate" className="text-xs">
                      🟡 Intermediate
                    </SelectItem>
                    <SelectItem value="Advanced" className="text-xs">
                      🔴 Advanced
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mat-dur" className="text-xs font-semibold">
                  Estimated Duration / Length
                </Label>
                <div className="relative">
                  <Clock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="mat-dur"
                    value={estimatedDuration}
                    onChange={(e) => setEstimatedDuration(e.target.value)}
                    placeholder="e.g. 45m, 2 hours, 6 modules, Reference..."
                    className="pl-8 text-xs h-9"
                  />
                </div>
              </div>
            </div>

            {/* Description & Study Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="mat-desc" className="text-xs font-semibold">
                Study Notes, Summary &amp; Key Takeaways
              </Label>
              <Textarea
                id="mat-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Key takeaways, specific timestamp tips, pipeline recommendations, prerequisites..."
                rows={4}
                className="text-xs resize-none leading-relaxed"
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
                    placeholder="Type tag and press enter (e.g. Blender, PBR, UE5, Shading)"
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
              {isSubmitting ? "Saving..." : material ? "Update Material" : "Save Material"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

