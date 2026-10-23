"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  FileIcon,
  Trash2,
  ExternalLink,
  Loader2,
  ImageIcon,
  Eye,
  GripVertical,
  Minimize2,
  Maximize2,
  Link as LinkIcon,
  Plus,
  FileText,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  closestCorners,
  pointerWithin,
  CollisionDetection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ResourceWithFiles } from "@/types/database.types";
import {
  uploadTaskAttachment,
  deleteAttachment,
  updateResourceDescription,
  reorderTaskResources,
} from "@/lib/supabase/actions";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichMarkdownEditor } from "@/components/ui/rich-markdown-editor";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface FileUploaderProps {
  taskId: string;
  initialResources?: ResourceWithFiles[];
  onResourcesUpdated?: (resources: ResourceWithFiles[]) => void;
}

interface SortableImageCardProps {
  resource: ResourceWithFiles;
  isShrunk: boolean;
  onToggleShrink: (id: string) => void;
  onPreview: (url: string, name: string) => void;
  onDelete: (resource: ResourceWithFiles) => void;
  onUpdateDescription: (id: string, description: string | null) => Promise<void>;
}

function SortableImageCard({
  resource,
  isShrunk,
  onToggleShrink,
  onPreview,
  onDelete,
  onUpdateDescription,
}: SortableImageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: resource.id });

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descText, setDescText] = useState(resource.description || "");
  const [isSavingDesc, setIsSavingDesc] = useState(false);

  // Zoom magnifier states (active when holding left click)
  const [isZooming, setIsZooming] = useState(false);
  const [zoomScale, setZoomScale] = useState(6.0); // 6x magnification default
  const [zoomPos, setZoomPos] = useState({
    boxX: 0,
    boxY: 0,
    cursorInBoxX: 0,
    cursorInBoxY: 0,
    percentX: 50,
    percentY: 50,
    currentWidth: 800,
    currentHeight: 480,
  });
  const imgContainerRef = useRef<HTMLDivElement>(null);

  const LOUPE_WIDTH = 800;
  const LOUPE_HEIGHT = 480;

  const handleZoomUpdate = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgContainerRef.current) return;
    const rect = imgContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const percentX = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const percentY = Math.max(0, Math.min(100, (y / rect.height) * 100));

    // Dynamic width & height if container is smaller than default loupe
    const currentWidth = Math.min(LOUPE_WIDTH, Math.max(120, rect.width - 16));
    const currentHeight = Math.min(LOUPE_HEIGHT, Math.max(120, rect.height - 16));
    const halfW = currentWidth / 2;
    const halfH = currentHeight / 2;

    // Clamp the loupe's center so the box NEVER clips against edges of the container
    const minX = halfW + 8;
    const maxX = Math.max(minX, rect.width - halfW - 8);
    const clampedBoxX = Math.max(minX, Math.min(maxX, x));

    const minY = halfH + 8;
    const maxY = Math.max(minY, rect.height - halfH - 8);
    const clampedBoxY = Math.max(minY, Math.min(maxY, y));

    // Relative cursor position inside the clamped box for crosshair targeting
    const cursorInBoxX = x - (clampedBoxX - halfW);
    const cursorInBoxY = y - (clampedBoxY - halfH);

    setZoomPos({
      boxX: clampedBoxX,
      boxY: clampedBoxY,
      cursorInBoxX,
      cursorInBoxY,
      percentX,
      percentY,
      currentWidth,
      currentHeight,
    });
  };

  useEffect(() => {
    setDescText(resource.description || "");
  }, [resource.description]);

  // Lock page and modal scrolling when magnifying so mouse wheel strictly zooms in/out
  useEffect(() => {
    if (!isZooming) return;
    const handleWheelLock = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setZoomScale((prev) => {
        const delta = e.deltaY < 0 ? 0.5 : -0.5;
        return Math.max(2, Math.min(16, +(prev + delta).toFixed(1)));
      });
    };
    window.addEventListener("wheel", handleWheelLock, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleWheelLock);
    };
  }, [isZooming]);

  const handleSaveDescription = async () => {
    setIsSavingDesc(true);
    try {
      await onUpdateDescription(resource.id, descText.trim() || null);
      setIsEditingDescription(false);
    } catch (err) {
      console.error("Failed to save image description:", err);
    } finally {
      setIsSavingDesc(false);
    }
  };

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const fileUrl = resource.files?.[0]?.Url || "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative w-full rounded-2xl border bg-muted/20 dark:bg-muted/10 overflow-hidden shadow-xs hover:shadow-md transition-all my-3 ${
        isDragging ? "opacity-50 ring-2 ring-primary border-primary z-50 bg-background shadow-xl" : "border-border/80"
      }`}
    >
      {/* Floating Top-Right Hover Toolbar (Visible on hover or when dragging) */}
      <div
        className={`absolute top-3 right-3 z-30 flex items-center gap-1.5 p-1 rounded-xl bg-background/95 backdrop-blur-md border border-border/80 shadow-md transition-opacity duration-200 ${
          isDragging ? "opacity-100 pointer-events-auto" : "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
        }`}
      >
        {/* Add/Edit Image Description Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditingDescription(!isEditingDescription);
          }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
            isEditingDescription || resource.description
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          title="Add/Edit Image Description"
        >
          <FileText className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold">Add/Edit Image Description</span>
        </button>

        {/* Drag Handle Button */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-grab active:cursor-grabbing transition-colors"
          title="Drag to reorder image"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Portrait Shrink / Expand Button */}
        <button
          type="button"
          onClick={() => onToggleShrink(resource.id)}
          className={`p-1.5 rounded-lg transition-colors ${
            isShrunk
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          title={isShrunk ? "Expand to full width" : "Shrink portrait size (prevent wide stretch)"}
        >
          {isShrunk ? (
            <Maximize2 className="h-4 w-4" />
          ) : (
            <Minimize2 className="h-4 w-4" />
          )}
        </button>

        {/* View in Lightbox Button */}
        <button
          type="button"
          onClick={() => onPreview(fileUrl, resource.name)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="View image preview"
        >
          <Eye className="h-4 w-4" />
        </button>

        {/* Open Original Link */}
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Open original in new tab"
        >
          <ExternalLink className="h-4 w-4" />
        </a>

        {/* Delete Image Button */}
        <button
          type="button"
          onClick={() => onDelete(resource)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Delete image"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Inline Description Editor Form (Rich Markdown Editor with Word-like Toolbar) */}
      {isEditingDescription && (
        <div
          className="p-3 bg-card/95 backdrop-blur-md border-b border-border/80 space-y-2.5 z-30 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <RichMarkdownEditor
            value={descText}
            onChange={setDescText}
            placeholder="Type custom image description (supports bold, colors, tables, lists, alignments)..."
            rows={3}
            minHeight="110px"
            onSave={handleSaveDescription}
          />
          <div className="flex items-center justify-end gap-1.5 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setDescText(resource.description || "");
                setIsEditingDescription(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={handleSaveDescription}
              disabled={isSavingDesc}
            >
              {isSavingDesc ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Save Description
            </Button>
          </div>
        </div>
      )}

      {/* Image Display Container (Full width vs Portrait Shrunk) with Hold-to-Zoom */}
      <div
        ref={imgContainerRef}
        className={`relative w-full bg-slate-900/5 dark:bg-slate-950/40 flex items-center justify-center p-2 transition-all select-none ${
          isZooming ? "cursor-crosshair" : "cursor-zoom-in"
        } ${isShrunk ? "max-h-[460px] py-4" : "min-h-[220px] max-h-[640px]"}`}
        title="Hold left-click to zoom into details (scroll wheel to adjust zoom level)"
        onMouseDown={(e) => {
          if (e.button === 0) {
            e.preventDefault();
            setIsZooming(true);
            handleZoomUpdate(e);
          }
        }}
        onMouseMove={(e) => {
          if (isZooming) {
            handleZoomUpdate(e);
          }
        }}
        onWheel={(e) => {
          if (isZooming) {
            e.preventDefault();
            setZoomScale((prev) => {
              const delta = e.deltaY < 0 ? 0.5 : -0.5;
              return Math.max(2, Math.min(16, +(prev + delta).toFixed(1)));
            });
          }
        }}
        onMouseUp={() => setIsZooming(false)}
        onMouseLeave={() => setIsZooming(false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileUrl}
          alt={resource.description || resource.name}
          draggable={false}
          className={`rounded-xl object-contain transition-all duration-300 pointer-events-none select-none ${
            isShrunk
              ? "max-w-md max-h-[440px] mx-auto shadow-md border"
              : "w-full max-h-[600px]"
          }`}
        />

        {/* Interactive Magnifier Zoom Loupe Box (Clamped to prevent clipping at edges) */}
        {isZooming && (
          <div
            className="absolute z-50 pointer-events-none rounded-2xl border-2 border-primary shadow-2xl bg-card overflow-hidden ring-4 ring-black/30 backdrop-blur-xs"
            style={{
              width: `${zoomPos.currentWidth}px`,
              height: `${zoomPos.currentHeight}px`,
              left: `${zoomPos.boxX}px`,
              top: `${zoomPos.boxY}px`,
              transform: "translate(-50%, -50%)",
              backgroundImage: `url(${fileUrl})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: `${zoomScale * 100}%`,
              backgroundPosition: `${zoomPos.percentX}% ${zoomPos.percentY}%`,
            }}
          >
            {/* Precision Crosshair targeting exact cursor position inside loupe */}
            <div
              className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${Math.max(10, Math.min(zoomPos.currentWidth - 10, zoomPos.cursorInBoxX))}px`,
                top: `${Math.max(10, Math.min(zoomPos.currentHeight - 10, zoomPos.cursorInBoxY))}px`,
              }}
            >
              <div className="h-6 w-6 rounded-full border-2 border-primary bg-primary/20 shadow-md ring-1 ring-white/70 dark:ring-black/70 flex items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              </div>
            </div>

            {/* Magnification Level Badge with dynamic scale and scroll tip */}
            <div className="absolute bottom-2.5 right-2.5 bg-black/85 backdrop-blur-md text-white text-[11px] font-mono font-semibold px-2 py-1 rounded-lg shadow-lg flex items-center gap-1.5 border border-white/10">
              <span className="text-primary font-bold">{zoomScale.toFixed(1)}x</span>
              <span>Zoom</span>
              <span className="text-[9px] text-white/50 pl-0.5">• Scroll to adjust</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Custom Description Bar: ONLY shown if description exists */}
      {Boolean(resource.description && resource.description.trim()) && (
        <div className="flex items-center justify-between px-8 py-3.5 sm:px-12 bg-card/90 border-t">
          <div className="text-sm sm:text-base font-medium text-foreground leading-relaxed flex-1">
            <MarkdownRenderer content={resource.description || ""} />
          </div>
          {isShrunk && (
            <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium shrink-0 ml-4">
              Portrait Mode
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function FileUploader({
  taskId,
  initialResources = [],
  onResourcesUpdated,
}: FileUploaderProps) {
  const [resources, setResources] = useState<ResourceWithFiles[]>(initialResources);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [resourceToDelete, setResourceToDelete] = useState<ResourceWithFiles | null>(null);
  const [isDeletingResource, setIsDeletingResource] = useState(false);

  // Sync resources whenever taskId changes or when resources are added/removed externally
  const prevTaskIdRef = useRef(taskId);
  useEffect(() => {
    if (prevTaskIdRef.current !== taskId) {
      prevTaskIdRef.current = taskId;
      setResources(initialResources);
      setError(null);
      return;
    }

    // Only update from parent if the set of resource IDs changed (e.g. upload/delete)
    const currentIds = new Set(resources.map((r) => r.id));
    const nextIds = new Set(initialResources.map((r) => r.id));
    const hasAddedOrRemoved =
      currentIds.size !== nextIds.size ||
      initialResources.some((r) => !currentIds.has(r.id));

    if (hasAddedOrRemoved) {
      setResources(initialResources);
    }
  }, [taskId, initialResources]);

  // Portrait shrink state mapped per resource ID
  const [shrinkMap, setShrinkMap] = useState<Record<string, boolean>>({});

  // URL Image input state
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [isAddingUrl, setIsAddingUrl] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Responsive collision strategy prioritizing pointer over droppables
  const collisionDetectionStrategy: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    return closestCorners(args);
  };

  const handleUpdateDescription = async (resourceId: string, newDesc: string | null) => {
    try {
      await updateResourceDescription(resourceId, newDesc);
      const updated = resources.map((r) =>
        r.id === resourceId ? { ...r, description: newDesc } : r
      );
      setResources(updated);
      onResourcesUpdated?.(updated);
    } catch (err: any) {
      console.error("Failed to update description:", err);
      setError(err.message || "Failed to update description");
    }
  };

  const isImageFile = (name: string, url?: string) => {
    const pattern = /\.(jpeg|jpg|gif|png|webp|svg|bmp|avif)/i;
    return pattern.test(name) || (url ? pattern.test(url) : false);
  };

  const imageResources = resources.filter((res) => {
    const fileUrl = res.files?.[0]?.Url;
    return isImageFile(res.name, fileUrl);
  });

  const otherResources = resources.filter((res) => {
    const fileUrl = res.files?.[0]?.Url;
    return !isImageFile(res.name, fileUrl);
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(Array.from(e.target.files));
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const processFiles = async (files: File[]) => {
    setIsUploading(true);
    setError(null);

    const updated = [...resources];
    try {
      for (const file of files) {
        const newResource = await uploadTaskAttachment(taskId, file);
        updated.push(newResource);
      }
      setResources(updated);
      onResourcesUpdated?.(updated);
    } catch (err: any) {
      console.error("File upload failed:", err);
      setError(err.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (resourceId: string) => {
    try {
      await deleteAttachment(resourceId, taskId);
      const updated = resources.filter((r) => r.id !== resourceId);
      setResources(updated);
      onResourcesUpdated?.(updated);
      if (previewImage) setPreviewImage(null);
    } catch (err: any) {
      console.error("Failed to delete attachment:", err);
    }
  };

  const toggleShrink = (resourceId: string) => {
    setShrinkMap((prev) => ({
      ...prev,
      [resourceId]: !prev[resourceId],
    }));
  };

  // Reordering images with Drag-and-Drop
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = imageResources.findIndex((r) => r.id === active.id);
    const newIndex = imageResources.findIndex((r) => r.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const reorderedImages = arrayMove(imageResources, oldIndex, newIndex);
      const newAllResources = [...reorderedImages, ...otherResources];
      setResources(newAllResources);

      // Persist the new resource order in storage/backend
      const orderedIds = newAllResources.map((r) => r.id);
      await reorderTaskResources(taskId, orderedIds);

      onResourcesUpdated?.(newAllResources);
    }
  };

  // Add Image via direct URL
  const handleAddImageUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = imageUrlInput.trim();
    if (!url) return;

    setIsAddingUrl(true);
    setError(null);

    try {
      let newResource: ResourceWithFiles;

      if (!isSupabaseConfigured) {
        newResource = {
          id: "res-url-" + Date.now(),
          name: url.split("/").pop()?.split("?")[0] || "Web Image",
          description: null,
          Task_Id: taskId,
          created_at: new Date().toISOString(),
          files: [
            {
              id: "file-url-" + Date.now(),
              Url: url,
              Resource_Id: "res-url-" + Date.now(),
              created_at: new Date().toISOString(),
            },
          ],
        };
      } else {
        const { data: resData, error: resErr } = await supabase
          .from("Resources")
          .insert({
            name: url.split("/").pop()?.split("?")[0] || "Web Image",
            description: null,
            Task_Id: taskId,
          })
          .select()
          .single();

        if (resErr) throw resErr;

        const { data: fileData, error: fileErr } = await supabase
          .from("Files")
          .insert({
            Url: url,
            Resource_Id: resData.id,
          })
          .select()
          .single();

        if (fileErr) throw fileErr;

        newResource = {
          ...resData,
          files: [fileData],
        };
      }

      const updated = [...resources, newResource];
      setResources(updated);
      onResourcesUpdated?.(updated);
      setImageUrlInput("");
    } catch (err: any) {
      console.error("Failed to add image URL:", err);
      setError(err.message || "Failed to add image from URL");
    } finally {
      setIsAddingUrl(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <ImageIcon className="h-4 w-4" /> Images & Attachments ({resources.length})
        </label>
        {isUploading && (
          <span className="flex items-center gap-1.5 text-xs text-primary font-medium">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading to Supabase...
          </span>
        )}
      </div>

      {/* Full-Width Images Section (Shown First, Drag-and-Drop Reorderable) */}
      {imageResources.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span>Attached Images ({imageResources.length})</span>
              <span className="text-[10px] text-muted-foreground/70 lowercase font-normal">
                (drag to reorder)
              </span>
            </span>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetectionStrategy}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={imageResources.map((r) => r.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {imageResources.map((resource) => (
                  <SortableImageCard
                    key={resource.id}
                    resource={resource}
                    isShrunk={Boolean(shrinkMap[resource.id])}
                    onToggleShrink={toggleShrink}
                    onPreview={(url, name) => setPreviewImage({ url, name })}
                    onDelete={(res) => setResourceToDelete(res)}
                    onUpdateDescription={handleUpdateDescription}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Non-Image Documents Section */}
      {otherResources.length > 0 && (
        <div className="space-y-1.5 pt-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Documents & Other Files ({otherResources.length})
          </span>

          <div className="divide-y divide-border rounded-xl border bg-card/60 text-xs overflow-hidden">
            {otherResources.map((resource) => {
              const fileUrl = resource.files?.[0]?.Url;

              return (
                <div
                  key={resource.id}
                  className="flex items-center justify-between p-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                      <FileIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate max-w-sm">
                        {resource.name}
                      </p>
                      {resource.description && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {resource.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    {fileUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        asChild
                      >
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer" title="Open file">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setResourceToDelete(resource)}
                      title="Delete attachment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload & Add Attachments (Placed at the bottom after images) */}
      <div className="pt-2 border-t space-y-3">
        {/* Drag & Drop File Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-primary bg-primary/10 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
            <UploadCloud className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-foreground">
            <span className="text-primary hover:underline">Click to upload files</span> or drag and drop images here
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Full resolution photos, diagrams, and documents
          </p>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {/* Add Image via Direct URL Input */}
        <form onSubmit={handleAddImageUrl} className="pt-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
            <LinkIcon className="h-3.5 w-3.5" /> Add Image from URL Link
          </label>
          <div className="flex items-center gap-2">
            <Input
              placeholder="https://example.com/diagram.png..."
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              className="h-9 text-xs"
              disabled={isAddingUrl}
            />
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              className="h-9 px-3 text-xs shrink-0 gap-1.5"
              disabled={isAddingUrl || !imageUrlInput.trim()}
            >
              {isAddingUrl ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" /> Add URL
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Delete Attachment Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(resourceToDelete)}
        onClose={() => setResourceToDelete(null)}
        title="Delete Attachment"
        description={`Are you sure you want to permanently delete "${resourceToDelete?.name || "this file"}"? This action cannot be undone.`}
        confirmText="Delete Attachment"
        variant="destructive"
        isLoading={isDeletingResource}
        onConfirm={async () => {
          if (!resourceToDelete) return;
          setIsDeletingResource(true);
          try {
            await handleDelete(resourceToDelete.id);
            setResourceToDelete(null);
          } finally {
            setIsDeletingResource(false);
          }
        }}
      />

      {/* Image Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[85vh] bg-background rounded-2xl overflow-hidden shadow-2xl p-2 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b">
              <span className="text-sm font-semibold truncate max-w-md">{previewImage.name}</span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild className="h-8 text-xs">
                  <a href={previewImage.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open Original
                  </a>
                </Button>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="rounded-lg p-1 text-muted-foreground hover:text-foreground text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-3 flex items-center justify-center max-h-[75vh] overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-h-[70vh] w-auto object-contain rounded-xl shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
