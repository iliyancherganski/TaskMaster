"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EducationalMaterial,
  EducationalMaterialWithDetails,
  StudyGroup,
} from "@/types/database.types";
import {
  Search,
  BookOpen,
  Check,
  Plus,
  ExternalLink,
  Tag,
  Clock,
  Layers,
  X,
} from "lucide-react";
import { getMaterialTypeMeta } from "./MaterialModal";

interface AttachMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachedMaterialIds: string[];
  allMaterials: EducationalMaterialWithDetails[];
  allGroups: StudyGroup[];
  onSaveAttachments: (selectedIds: string[]) => Promise<void> | void;
  onCreateNewMaterial?: () => void;
}

export function AttachMaterialModal({
  isOpen,
  onClose,
  attachedMaterialIds,
  allMaterials,
  allGroups,
  onSaveAttachments,
  onCreateNewMaterial,
}: AttachMaterialModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedIds(attachedMaterialIds);
      setSearchQuery("");
      setSelectedGroupId("all");
    }
  }, [isOpen, attachedMaterialIds]);

  const toggleMaterial = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredMaterials = useMemo(() => {
    return allMaterials.filter((m) => {
      if (selectedGroupId !== "all") {
        if (m.group_id !== selectedGroupId) {
          // Check if the material belongs to a descendant of selectedGroupId
          const descendantIds = new Set<string>([selectedGroupId]);
          let added = true;
          while (added) {
            added = false;
            for (const g of allGroups) {
              if (g.parent_id && descendantIds.has(g.parent_id) && !descendantIds.has(g.id)) {
                descendantIds.add(g.id);
                added = true;
              }
            }
          }
          if (!m.group_id || !descendantIds.has(m.group_id)) return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = m.title.toLowerCase().includes(q);
        const matchesDesc = m.description?.toLowerCase().includes(q) ?? false;
        const matchesTags = m.tags?.some((t) => t.toLowerCase().includes(q)) ?? false;
        if (!matchesTitle && !matchesDesc && !matchesTags) return false;
      }

      return true;
    });
  }, [allMaterials, selectedGroupId, searchQuery, allGroups]);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await onSaveAttachments(selectedIds);
      onClose();
    } catch (err) {
      console.error("Failed to save attachments:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md sm:max-w-2xl max-h-[88vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <BookOpen className="h-4 w-4" />
              </span>
              <span>Attach Educational Materials to Task</span>
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Select courses, video tutorials, or study guides from your knowledge library to link with this task.
          </DialogDescription>
        </DialogHeader>

        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, topic, tags..."
              className="pl-8 text-xs h-8"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="w-full sm:w-48">
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="All Groups" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                <SelectItem value="all" className="text-xs font-semibold">
                  All Study Fields
                </SelectItem>
                {allGroups.map((g) => (
                  <SelectItem key={g.id} value={g.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: g.color }}
                      />
                      <span>{g.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {onCreateNewMaterial && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onCreateNewMaterial();
              }}
              className="text-xs h-8 gap-1 border-dashed shrink-0"
            >
              <Plus className="h-3 w-3 text-primary" />
              <span>New Material</span>
            </Button>
          )}
        </div>

        {/* Selected counter banner */}
        <div className="flex items-center justify-between text-xs px-1 text-muted-foreground">
          <span>{selectedIds.length} materials selected</span>
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-primary hover:underline font-medium"
            >
              Clear selection
            </button>
          )}
        </div>

        {/* Materials List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[380px] min-h-[160px]">
          {filteredMaterials.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <BookOpen className="h-8 w-8 opacity-40 mb-2" />
              <p className="text-xs font-medium">No educational materials found.</p>
              <p className="text-[11px] mt-0.5">
                {searchQuery
                  ? "Try adjusting your search terms."
                  : "Add materials in the Learning Hub first or click 'New Material' above."}
              </p>
            </div>
          ) : (
            filteredMaterials.map((m) => {
              const isSelected = selectedIds.includes(m.id);
              const typeMeta = getMaterialTypeMeta(m.type);
              const TypeIcon = typeMeta.icon;

              return (
                <div
                  key={m.id}
                  onClick={() => toggleMaterial(m.id)}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer text-xs select-none ${
                    isSelected
                      ? "bg-primary/5 border-primary/60 shadow-xs"
                      : "bg-card hover:bg-muted/40 border-border/70"
                  }`}
                >
                  {/* Custom Checkbox */}
                  <div
                    className={`h-5 w-5 rounded-md border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border bg-background"
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>

                  {/* Material Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                        style={{ backgroundColor: typeMeta.color }}
                      >
                        <TypeIcon className="h-3 w-3" />
                        <span>{typeMeta.label}</span>
                      </span>

                      {m.group && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground font-medium">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: m.group.color }}
                          />
                          <span>
                            {m.group_path && m.group_path.length > 1
                              ? m.group_path.join(" / ")
                              : m.group.name}
                          </span>
                        </span>
                      )}

                      {m.estimated_duration && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {m.estimated_duration}
                        </span>
                      )}
                    </div>

                    <div className="font-semibold text-foreground text-xs leading-snug">
                      {m.title}
                    </div>

                    {m.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {m.description}
                      </p>
                    )}

                    {m.tags && m.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {m.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="text-[9px] px-1 rounded bg-muted/70 text-muted-foreground"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick external link */}
                  {m.url && (
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
                      title="Open external link"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t">
          <Button type="button" variant="outline" onClick={onClose} className="text-xs h-8">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="text-xs h-8 gap-1.5"
          >
            {isSubmitting ? "Linking..." : `Attach Selected (${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

