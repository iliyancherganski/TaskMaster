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
  EducationalMaterial,
  EducationalMaterialWithDetails,
  StudyGroup,
  MaterialType,
} from "@/types/database.types";
import {
  Search,
  BookOpen,
  Check,
  Plus,
  ExternalLink,
  Clock,
  X,
  Library,
  Link as LinkIcon,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { MATERIAL_TYPES, getMaterialTypeMeta } from "./MaterialModal";
import { createEducationalMaterial } from "@/lib/supabase/actions";

interface AttachMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachedMaterialIds: string[];
  allMaterials: EducationalMaterialWithDetails[];
  allGroups: StudyGroup[];
  onSaveAttachments: (selectedIds: string[]) => Promise<void> | void;
  onMaterialCreated?: (newMaterial: EducationalMaterial) => Promise<void> | void;
  initialTab?: "library" | "add_new";
}

export function AttachMaterialModal({
  isOpen,
  onClose,
  attachedMaterialIds,
  allMaterials,
  allGroups,
  onSaveAttachments,
  onMaterialCreated,
  initialTab = "library",
}: AttachMaterialModalProps) {
  const [activeTab, setActiveTab] = useState<"library" | "add_new">(initialTab);

  // Library tab state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add New tab state
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState<MaterialType>("website");
  const [newGroupId, setNewGroupId] = useState<string>("unassigned");
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);
  const [newError, setNewError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedIds(attachedMaterialIds);
      setSearchQuery("");
      setSelectedGroupId("all");
      setActiveTab(initialTab);
      resetNewForm();
    }
  }, [isOpen, attachedMaterialIds, initialTab]);

  const resetNewForm = () => {
    setNewUrl("");
    setNewTitle("");
    setNewDescription("");
    setNewType("website");
    setNewGroupId("unassigned");
    setNewError(null);
  };

  // Toggle selection in library
  const toggleMaterial = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Auto-detect type & suggest title from URL in Add New tab
  const handleUrlChange = (urlVal: string) => {
    setNewUrl(urlVal);
    const low = urlVal.toLowerCase();
    if (low.includes("youtube.com") || low.includes("youtu.be") || low.includes("vimeo.com")) {
      setNewType("video");
    } else if (low.includes("docs.") || low.includes("documentation") || low.includes("github.com")) {
      setNewType("doc");
    } else if (low.includes("forum") || low.includes("reddit.com") || low.includes("community")) {
      setNewType("forum");
    } else if (low.includes("course") || low.includes("udemy.com") || low.includes("coursera.org")) {
      setNewType("course");
    }

    if (!newTitle) {
      try {
        const parsed = new URL(urlVal.startsWith("http") ? urlVal : `https://${urlVal}`);
        const pathname = parsed.pathname.replace(/^\/|\/$/g, "");
        if (pathname) {
          const lastSegment = pathname.split("/").pop();
          if (lastSegment && lastSegment.length > 2) {
            const clean = decodeURIComponent(lastSegment)
              .replace(/[-_]/g, " ")
              .replace(/\.[^/.]+$/, "");
            setNewTitle(clean.charAt(0).toUpperCase() + clean.slice(1));
          }
        } else if (parsed.hostname) {
          setNewTitle(parsed.hostname.replace(/^www\./, ""));
        }
      } catch {
        // Ignore partial URL parse errors
      }
    }
  };

  // Save selected attachments from Library
  const handleSaveLibraryAttachments = async () => {
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

  // Submit and immediately attach newly created material
  const handleCreateAndAttach = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim() && !newUrl.trim()) {
      setNewError("Please provide a title or link URL for this study material");
      return;
    }

    setIsSubmittingNew(true);
    setNewError(null);

    try {
      let finalUrl = newUrl.trim() || null;
      if (
        finalUrl &&
        !finalUrl.startsWith("http://") &&
        !finalUrl.startsWith("https://") &&
        !finalUrl.startsWith("mailto:")
      ) {
        finalUrl = `https://${finalUrl}`;
      }

      const created = await createEducationalMaterial({
        title: newTitle.trim() || finalUrl || "Untitled Material",
        url: finalUrl,
        description: newDescription.trim() || null,
        type: newType,
        group_id: newGroupId && newGroupId !== "unassigned" ? newGroupId : null,
      });

      // 1. Notify parent / add to global and local state
      if (onMaterialCreated) {
        await onMaterialCreated(created);
      }

      // 2. Add to selected attachments list and save
      const updatedIds = Array.from(new Set([...selectedIds, created.id]));
      setSelectedIds(updatedIds);
      await onSaveAttachments(updatedIds);

      // 3. Reset form and close
      resetNewForm();
      onClose();
    } catch (err: any) {
      console.error("Failed to create and attach material:", err);
      setNewError(err?.message || "Failed to create study material");
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Filtered materials for Library tab
  const filteredMaterials = useMemo(() => {
    return allMaterials.filter((m) => {
      if (selectedGroupId !== "all") {
        if (selectedGroupId === "unassigned") {
          if (m.group_id) return false;
        } else if (m.group_id !== selectedGroupId) {
          // Check if descendant of selectedGroupId
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md sm:max-w-2xl max-h-[90vh] flex flex-col p-5">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <BookOpen className="h-4 w-4" />
            </span>
            <span>Add Study Material to Task</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Link resources from your study library or add a new link, video tutorial, or documentation guide.
          </DialogDescription>
        </DialogHeader>

        {/* 2 Tabs: Library and Add New */}
        <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border/60 gap-1 my-1">
          <button
            type="button"
            onClick={() => setActiveTab("library")}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "library"
                ? "bg-background text-foreground shadow-xs border border-border/50"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Library className="h-3.5 w-3.5 text-primary" />
            <span>Library ({allMaterials.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("add_new")}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "add_new"
                ? "bg-background text-foreground shadow-xs border border-border/50"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Plus className="h-3.5 w-3.5 text-primary" />
            <span>Add New</span>
          </button>
        </div>

        {/* TAB 1: Library */}
        {activeTab === "library" && (
          <div className="flex-1 flex flex-col min-h-0 space-y-3 pt-1">
            {/* Filters bar */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
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
                    <SelectItem value="unassigned" className="text-xs font-medium text-muted-foreground">
                      Unassigned Materials
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
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[360px] min-h-[160px]">
              {filteredMaterials.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <BookOpen className="h-8 w-8 opacity-40 mb-2" />
                  <p className="text-xs font-medium">No educational materials found.</p>
                  <p className="text-[11px] mt-0.5">
                    {searchQuery
                      ? "Try adjusting your search terms."
                      : "Switch to 'Add New' tab to create a new material."}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 text-xs gap-1 border-dashed"
                    onClick={() => setActiveTab("add_new")}
                  >
                    <Plus className="h-3.5 w-3.5 text-primary" />
                    <span>Create New Material</span>
                  </Button>
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

                          {m.group ? (
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
                          ) : (
                            <span className="text-[10px] text-muted-foreground/70 font-medium bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                              Unassigned
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
                onClick={handleSaveLibraryAttachments}
                disabled={isSubmitting}
                className="text-xs h-8 gap-1.5"
              >
                {isSubmitting ? "Linking..." : `Attach Selected (${selectedIds.length})`}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* TAB 2: Add New */}
        {activeTab === "add_new" && (
          <form onSubmit={handleCreateAndAttach} className="flex-1 flex flex-col min-h-0 space-y-3 pt-1">
            {newError && (
              <div className="rounded-xl bg-destructive/10 p-2.5 text-xs text-destructive">
                {newError}
              </div>
            )}

            <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1">
              {/* URL Input */}
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <LinkIcon className="h-3.5 w-3.5 text-primary" />
                    <span>Resource Link URL</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    YouTube, Vimeo, website, doc...
                  </span>
                </Label>
                <Input
                  value={newUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://..."
                  className="text-xs h-8"
                  autoFocus
                />
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Master Hard-Surface Modeling in Blender"
                  className="text-xs h-8"
                />
              </div>

              {/* Description Input */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Description (Optional)</Label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Summary, useful timestamps, or key notes for this task..."
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Type Select */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Material Type</Label>
                  <Select value={newType} onValueChange={(val) => setNewType(val as MaterialType)}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MATERIAL_TYPES.map((t) => {
                        const Icon = t.icon;
                        return (
                          <SelectItem key={t.type} value={t.type} className="text-xs">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{ backgroundColor: t.color }}
                              />
                              <Icon className="h-3.5 w-3.5" />
                              <span>{t.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Study Field / Group Select (Defaulting to Unassigned) */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Study Field / Group</span>
                  </Label>
                  <Select value={newGroupId} onValueChange={setNewGroupId}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      <SelectItem value="unassigned" className="text-xs font-semibold text-muted-foreground">
                        Unassigned (No Study Field)
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
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t">
              <Button type="button" variant="outline" onClick={onClose} className="text-xs h-8">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingNew || (!newTitle.trim() && !newUrl.trim())}
                className="text-xs h-8 gap-1.5"
              >
                {isSubmittingNew ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving & Linking...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create &amp; Attach to Task</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
