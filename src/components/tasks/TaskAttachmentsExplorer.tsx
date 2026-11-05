"use client";

import React, { useState, useMemo } from "react";
import {
  Paperclip,
  Search,
  Plus,
  GripVertical,
  ImageIcon,
  Video,
  Link as LinkIcon,
  FileText,
  Copy,
  Check,
  Trash2,
  Pencil,
  X,
  ExternalLink,
  Play,
  Globe,
  MoreVertical,
} from "lucide-react";
import { ResourceWithFiles } from "@/types/database.types";
import { deleteAttachment, updateResourceDescription } from "@/lib/supabase/actions";
import {
  isDirectImageUrl,
  isDirectVideoUrl,
  extractYouTubeId,
  extractVimeoId,
} from "@/lib/media-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export type AttachmentFilterType = "all" | "image" | "video" | "link" | "file";

interface TaskAttachmentsExplorerProps {
  taskId: string;
  resources: ResourceWithFiles[];
  descriptionText: string;
  onInsertTag: (tag: string) => void;
  onResourcesUpdated: (updated: ResourceWithFiles[]) => void;
  onOpenAddModal: () => void;
  className?: string;
}

export function TaskAttachmentsExplorer({
  taskId,
  resources,
  descriptionText,
  onInsertTag,
  onResourcesUpdated,
  onOpenAddModal,
  className = "",
}: TaskAttachmentsExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<AttachmentFilterType>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [insertSize, setInsertSize] = useState<number>(100);
  const [insertSizeInput, setInsertSizeInput] = useState<string>("100");

  const commitInsertSize = () => {
    let num = parseInt(insertSizeInput, 10);
    if (isNaN(num)) {
      num = insertSize;
    } else {
      num = Math.max(10, Math.min(100, num));
    }
    setInsertSize(num);
    setInsertSizeInput(String(num));
  };

  const getAttachmentTag = (id: string) => {
    return insertSize === 100 ? `{{attachment:${id}}}` : `{{attachment:${id} size=${insertSize}%}}`;
  };

  // Delete state
  const [resourceToDelete, setResourceToDelete] = useState<ResourceWithFiles | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit description modal state
  const [editingResource, setEditingResource] = useState<ResourceWithFiles | null>(null);
  const [editDescText, setEditDescText] = useState("");
  const [isSavingDesc, setIsSavingDesc] = useState(false);

  // Helper to categorize resources
  const categorize = (res: ResourceWithFiles): "image" | "video" | "link" | "file" => {
    const url = res.files?.[0]?.Url || "";
    if (isDirectImageUrl(url) || /\.(jpeg|jpg|gif|png|webp|svg|bmp|avif|ico)/i.test(res.name)) {
      return "image";
    }
    if (
      extractYouTubeId(url) !== null ||
      extractVimeoId(url) !== null ||
      isDirectVideoUrl(url) ||
      /\.(mp4|webm|ogg|mov|m4v|avi|mkv|wmv|flv|m3u8|mpg|mpeg)/i.test(res.name)
    ) {
      return "video";
    }
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return "link";
    }
    return "file";
  };

  // Filtered & Searched resources
  const filteredResources = useMemo(() => {
    return resources.filter((res) => {
      const cat = categorize(res);
      if (activeFilter !== "all" && cat !== activeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = res.name.toLowerCase().includes(query);
        const matchesDesc = (res.description || "").toLowerCase().includes(query);
        const matchesUrl = (res.files?.[0]?.Url || "").toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesUrl) {
          return false;
        }
      }
      return true;
    });
  }, [resources, activeFilter, searchQuery]);

  // Counts per category
  const counts = useMemo(() => {
    const res = { all: resources.length, image: 0, video: 0, link: 0, file: 0 };
    resources.forEach((r) => {
      const cat = categorize(r);
      res[cat]++;
    });
    return res;
  }, [resources]);

  const handleCopyTag = (resId: string) => {
    const tag = getAttachmentTag(resId);
    navigator.clipboard.writeText(tag);
    setCopiedId(resId);
    setTimeout(() => {
      setCopiedId((curr) => (curr === resId ? null : curr));
    }, 1500);
  };

  const handleDeleteConfirm = async () => {
    if (!resourceToDelete) return;
    setIsDeleting(true);
    try {
      await deleteAttachment(resourceToDelete.id, taskId);
      const updated = resources.filter((r) => r.id !== resourceToDelete.id);
      onResourcesUpdated(updated);
      setResourceToDelete(null);
    } catch (err) {
      console.error("Failed to delete attachment:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveDescription = async () => {
    if (!editingResource) return;
    setIsSavingDesc(true);
    try {
      await updateResourceDescription(editingResource.id, editDescText.trim() || null);
      const updated = resources.map((r) =>
        r.id === editingResource.id ? { ...r, description: editDescText.trim() || null } : r
      );
      onResourcesUpdated(updated);
      setEditingResource(null);
    } catch (err) {
      console.error("Failed to update attachment description:", err);
    } finally {
      setIsSavingDesc(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border border-border/80 bg-muted/20 dark:bg-muted/10 p-3.5 flex flex-col space-y-3 shadow-xs ${className}`}
    >
      {/* Header: Title, Total Count & Add Attachment Button */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Paperclip className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 leading-none">
              <span>Task Attachments</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-primary/15 text-primary border border-primary/20">
                {resources.length}
              </span>
            </h4>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={onOpenAddModal}
          className="h-7 px-2.5 text-xs gap-1 font-semibold shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add</span>
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or description..."
          className="h-7 text-xs pl-8 pr-7 bg-background/80"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filter Tabs / Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
        {(
          [
            { id: "all", label: "All", count: counts.all },
            { id: "image", label: "Images", count: counts.image },
            { id: "video", label: "Videos", count: counts.video },
            { id: "link", label: "Links", count: counts.link },
            { id: "file", label: "Files", count: counts.file },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id)}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all border shrink-0 ${
              activeFilter === tab.id
                ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                : "bg-background/80 text-muted-foreground border-border/70 hover:text-foreground hover:bg-muted"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Insertion Size Selector (10-100% input + quick chips) */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-muted/40 rounded-lg border border-border/50 text-[10px]">
        <span className="text-muted-foreground font-medium">Tag Size:</span>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            <input
              type="number"
              min={10}
              max={100}
              value={insertSizeInput}
              onChange={(e) => setInsertSizeInput(e.target.value)}
              onBlur={commitInsertSize}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
              className="w-9 h-5 text-center text-[11px] font-bold bg-background text-foreground border border-border/70 rounded px-0.5 focus:outline-hidden focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              title="Type width percentage (10% to 100%) and press Enter"
            />
            <span className="text-[10px] font-bold text-muted-foreground select-none">%</span>
          </div>

          <div className="flex items-center gap-0.5 border-l border-border/50 pl-1">
            {([50, 75, 100] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setInsertSize(s);
                  setInsertSizeInput(String(s));
                }}
                className={`px-1.5 py-0.5 rounded font-semibold transition-all ${
                  insertSize === s
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                title={`Set size to ${s}%`}
              >
                {s}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Drag & Drop Hint */}
      <div className="p-2 rounded-lg bg-primary/5 border border-primary/15 text-[10px] text-muted-foreground leading-snug flex items-center gap-1.5">
        <span className="shrink-0 text-base">💡</span>
        <span>
          <strong>Drag &amp; drop</strong> any card into the description text on the left, or click <strong>+ Insert</strong> to place its tag.
        </span>
      </div>

      {/* Scrollable Cards List */}
      <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
        {filteredResources.map((res) => {
          const category = categorize(res);
          const isPlaced = descriptionText.includes(res.id);
          const fileUrl = res.files?.[0]?.Url || "";
          const ytId = extractYouTubeId(fileUrl);
          const thumbUrl = ytId
            ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
            : category === "image"
            ? fileUrl
            : null;

          return (
            <div
              key={res.id}
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", getAttachmentTag(res.id));
                e.dataTransfer.effectAllowed = "copy";
              }}
              className="group relative rounded-xl border border-border/70 bg-card p-2.5 transition-all hover:border-primary/50 hover:shadow-sm cursor-grab active:cursor-grabbing select-none"
              title="Drag and drop into the description text editor"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                {/* Drag Handle Icon */}
                <div className="pt-1 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0">
                  <GripVertical className="h-4 w-4" />
                </div>

                {/* Visual Thumbnail */}
                <div className="relative h-11 w-11 rounded-lg overflow-hidden bg-muted/60 border border-border/60 shrink-0 flex items-center justify-center">
                  {thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbUrl}
                      alt={res.name}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  ) : category === "video" ? (
                    <Video className="h-5 w-5 text-red-500" />
                  ) : category === "link" ? (
                    <Globe className="h-5 w-5 text-sky-500" />
                  ) : (
                    <FileText className="h-5 w-5 text-amber-500" />
                  )}
                  {category === "video" && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Play className="h-3 w-3 text-white fill-current" />
                    </div>
                  )}
                </div>

                {/* Info & Tag Status */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-foreground truncate block" title={res.name}>
                      {res.name}
                    </span>

                    {/* Status Badge */}
                    {isPlaced ? (
                      <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.2 rounded shrink-0 flex items-center gap-0.5">
                        <Check className="h-2.5 w-2.5" />
                        In text
                      </span>
                    ) : (
                      <span className="text-[9px] text-muted-foreground bg-muted/70 px-1 py-0.2 rounded shrink-0">
                        Not placed
                      </span>
                    )}
                  </div>

                  {res.description ? (
                    <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5" title={res.description}>
                      {res.description}
                    </p>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/50 italic block mt-0.5 capitalize">
                      {category} attachment
                    </span>
                  )}

                  {/* Actions Row */}
                  <div className="flex items-center justify-between pt-2 mt-1 border-t border-border/40 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      {/* Insert Tag Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onInsertTag(getAttachmentTag(res.id));
                        }}
                        className="px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                        title="Insert tag at current cursor position"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Insert</span>
                      </button>

                      {/* Copy Tag Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyTag(res.id);
                        }}
                        className="px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1 cursor-pointer"
                        title="Copy tag snippet {{attachment:...}}"
                      >
                        {copiedId === res.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-500" />
                            <span className="text-emerald-500 font-semibold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy Tag</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Actions Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 text-xs">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingResource(res);
                            setEditDescText(res.description || "");
                          }}
                          className="gap-2 cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Edit Caption</span>
                        </DropdownMenuItem>
                        {fileUrl && (
                          <DropdownMenuItem
                            onClick={() => window.open(fileUrl, "_blank")}
                            className="gap-2 cursor-pointer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Open URL</span>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setResourceToDelete(res)}
                          className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredResources.length === 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
            <p>
              {resources.length === 0
                ? "No attachments yet for this task."
                : "No attachments match your search/filter."}
            </p>
            {resources.length === 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenAddModal}
                className="h-7 text-xs gap-1 text-primary border-primary/40 hover:bg-primary/10"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Upload or Add First Attachment</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(resourceToDelete)}
        onClose={() => setResourceToDelete(null)}
        title="Delete Task Attachment?"
        description={`Are you sure you want to delete "${resourceToDelete?.name}"? Any {{attachment:...}} tags in the description will no longer render this media.`}
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />

      {/* Edit Description Dialog */}
      <Dialog open={Boolean(editingResource)} onOpenChange={(open) => !open && setEditingResource(null)}>
        <DialogContent className="max-w-md p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              <span>Edit Caption for &quot;{editingResource?.name}&quot;</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {/* Quick Formatting Toolbar */}
            <div className="flex items-center gap-1 flex-wrap bg-muted/40 p-1 rounded-md border border-border/40 text-xs">
              <button
                type="button"
                onClick={() => setEditDescText((prev) => (prev ? `${prev} **bold text**` : "**bold text**"))}
                className="px-1.5 py-0.5 rounded hover:bg-muted font-bold text-foreground text-[11px]"
                title="Bold (**text**)"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => setEditDescText((prev) => (prev ? `${prev} *italic text*` : "*italic text*"))}
                className="px-1.5 py-0.5 rounded hover:bg-muted italic text-foreground text-[11px]"
                title="Italic (*text*)"
              >
                I
              </button>
              <button
                type="button"
                onClick={() => setEditDescText((prev) => (prev ? `${prev} <u>underlined</u>` : "<u>underlined</u>"))}
                className="px-1.5 py-0.5 rounded hover:bg-muted underline text-foreground text-[11px]"
                title="Underline (<u>text</u>)"
              >
                U
              </button>
              <button
                type="button"
                onClick={() => setEditDescText((prev) => (prev ? `${prev} \`code\`` : "`code`"))}
                className="px-1.5 py-0.5 rounded hover:bg-muted font-mono text-[10px] text-foreground"
                title="Code (`code`)"
              >
                &lt;/&gt;
              </button>
              <button
                type="button"
                onClick={() => setEditDescText((prev) => (prev ? `${prev}\n- List item` : "- List item"))}
                className="px-1.5 py-0.5 rounded hover:bg-muted text-[11px] text-foreground"
                title="List item"
              >
                • List
              </button>
              <button
                type="button"
                onClick={() => setEditDescText((prev) => (prev ? `${prev} [title](https://example.com)` : "[title](https://example.com)"))}
                className="px-1.5 py-0.5 rounded hover:bg-muted text-[11px] text-foreground"
                title="Link ([title](url))"
              >
                Link
              </button>
            </div>
            <Textarea
              value={editDescText}
              onChange={(e) => setEditDescText(e.target.value)}
              placeholder="Write description or notes for this attachment (Markdown supported)..."
              rows={4}
              className="text-xs font-mono"
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditingResource(null)}
                className="h-7 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveDescription}
                disabled={isSavingDesc}
                className="h-7 text-xs font-semibold"
              >
                {isSavingDesc ? "Saving..." : "Save Caption"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

