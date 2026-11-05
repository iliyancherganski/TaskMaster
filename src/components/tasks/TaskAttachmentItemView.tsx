"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  FileText,
  Download,
  ExternalLink,
  ZoomIn,
  Pencil,
  Trash2,
  Check,
  X,
  Play,
  Video,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Loader2,
  AlertTriangle,
  Globe,
} from "lucide-react";
import { ResourceWithFiles } from "@/types/database.types";
import { updateResourceDescription } from "@/lib/supabase/actions";
import {
  validateMediaUrl,
  extractYouTubeId,
  extractVimeoId,
  isDirectVideoUrl,
  isDirectImageUrl,
} from "@/lib/media-utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface TaskAttachmentItemViewProps {
  resource: ResourceWithFiles;
  size?: number;
  onUpdateDescription?: (id: string, description: string | null) => Promise<void>;
  onDelete?: (resource: ResourceWithFiles) => void;
  onUpdateSize?: (newSize: number) => void;
  className?: string;
}

export function TaskAttachmentItemView({
  resource,
  size = 100,
  onUpdateDescription,
  onDelete,
  onUpdateSize,
  className = "",
}: TaskAttachmentItemViewProps) {
  const fileUrl = resource.files?.[0]?.Url || "";

  const isImage =
    isDirectImageUrl(fileUrl) ||
    /\.(jpeg|jpg|gif|png|webp|svg|bmp|avif|ico)/i.test(resource.name);

  const isVideo =
    extractYouTubeId(fileUrl) !== null ||
    extractVimeoId(fileUrl) !== null ||
    isDirectVideoUrl(fileUrl) ||
    /\.(mp4|webm|ogg|mov|m4v|avi|mkv|wmv|flv|m3u8|mpg|mpeg)/i.test(resource.name);

  if (isImage) {
    return (
      <ImageAttachmentItem
        resource={resource}
        fileUrl={fileUrl}
        size={size}
        onUpdateDescription={onUpdateDescription}
        onDelete={onDelete}
        onUpdateSize={onUpdateSize}
        className={className}
      />
    );
  }

  if (isVideo) {
    return (
      <VideoAttachmentItem
        resource={resource}
        fileUrl={fileUrl}
        size={size}
        onUpdateDescription={onUpdateDescription}
        onDelete={onDelete}
        onUpdateSize={onUpdateSize}
        className={className}
      />
    );
  }

  return (
    <DocumentAttachmentItem
      resource={resource}
      fileUrl={fileUrl}
      size={size}
      onUpdateDescription={onUpdateDescription}
      onDelete={onDelete}
      onUpdateSize={onUpdateSize}
      className={className}
    />
  );
}

// ============================================================
// Formattable Caption Editor with Write/Preview & Format Tools
// ============================================================
interface CaptionInlineEditorProps {
  title: string;
  value: string;
  onChange: (val: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

function CaptionInlineEditor({
  title,
  value,
  onChange,
  onSave,
  onCancel,
  isSaving,
}: CaptionInlineEditorProps) {
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wrapText = (before: string, after: string, defaultText: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const sel = value.substring(start, end) || defaultText;
    const nextVal = value.substring(0, start) + before + sel + after + value.substring(end);
    onChange(nextVal);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + sel.length);
    });
  };

  const prependText = (prefix: string, defaultText: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const sel = value.substring(start, end) || defaultText;
    const nextVal = value.substring(0, start) + prefix + sel + value.substring(end);
    onChange(nextVal);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + sel.length);
    });
  };

  return (
    <div className="p-3 bg-card/95 border-b border-border/70 space-y-2.5 shadow-sm">
      <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 truncate max-w-sm">
          <Pencil className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate">{title}</span>
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center bg-muted/70 p-0.5 rounded-lg border border-border/40 text-[10px]">
            <button
              type="button"
              onClick={() => setActiveTab("write")}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                activeTab === "write"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Write
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                activeTab === "preview"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Preview
            </button>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded text-muted-foreground hover:text-foreground ml-1"
            title="Close editor"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {activeTab === "write" ? (
        <div className="space-y-1.5">
          {/* Formatting action buttons */}
          <div className="flex items-center gap-1 flex-wrap bg-muted/40 p-1 rounded-md border border-border/40 text-xs">
            <button
              type="button"
              onClick={() => wrapText("**", "**", "bold text")}
              className="px-1.5 py-0.5 rounded hover:bg-muted font-bold text-foreground text-[11px]"
              title="Bold (**text**)"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => wrapText("*", "*", "italic text")}
              className="px-1.5 py-0.5 rounded hover:bg-muted italic text-foreground text-[11px]"
              title="Italic (*text*)"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => wrapText("<u>", "</u>", "underlined text")}
              className="px-1.5 py-0.5 rounded hover:bg-muted underline text-foreground text-[11px]"
              title="Underline (<u>text</u>)"
            >
              U
            </button>
            <span className="text-border mx-0.5">|</span>
            <button
              type="button"
              onClick={() => wrapText("`", "`", "code")}
              className="px-1.5 py-0.5 rounded hover:bg-muted font-mono text-[10px] text-foreground"
              title="Inline Code (`code`)"
            >
              &lt;/&gt;
            </button>
            <button
              type="button"
              onClick={() => prependText("- ", "List item")}
              className="px-1.5 py-0.5 rounded hover:bg-muted text-[11px] text-foreground"
              title="Bullet list (- item)"
            >
              • List
            </button>
            <button
              type="button"
              onClick={() => wrapText("[", "](https://example.com)", "link title")}
              className="px-1.5 py-0.5 rounded hover:bg-muted text-[11px] text-foreground"
              title="Link ([title](url))"
            >
              Link
            </button>
            <button
              type="button"
              onClick={() => wrapText("<mark>", "</mark>", "highlight")}
              className="px-1.5 py-0.5 rounded hover:bg-muted text-[11px] text-foreground"
              title="Highlight (<mark>text</mark>)"
            >
              Highlight
            </button>
          </div>

          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Write formatted caption (supports Markdown: **bold**, *italic*, `code`, lists, links)..."
            rows={3}
            className="text-xs font-mono resize-y"
          />
        </div>
      ) : (
        <div className="p-2.5 rounded-lg border border-border/50 bg-background/50 min-h-[75px] max-h-[160px] overflow-y-auto text-xs">
          {value.trim() ? (
            <MarkdownRenderer content={value} />
          ) : (
            <span className="text-muted-foreground/60 italic text-xs">Caption preview is empty</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] text-muted-foreground">Markdown formatting supported</span>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-7 text-xs px-2.5"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="h-7 text-xs gap-1.5 px-3"
          >
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Save Caption
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Validated Size Control (10% - 100% Number Input + Quick Chips)
// ============================================================
interface AttachmentSizeControlProps {
  size: number;
  onUpdateSize?: (newSize: number) => void;
}

function AttachmentSizeControl({
  size,
  onUpdateSize,
}: AttachmentSizeControlProps) {
  const clampedSize = Math.max(10, Math.min(100, typeof size === "number" && !isNaN(size) ? Math.round(size) : 100));
  const [localVal, setLocalVal] = useState<string>(String(clampedSize));

  useEffect(() => {
    setLocalVal(String(clampedSize));
  }, [clampedSize]);

  const commitValue = () => {
    let num = parseInt(localVal, 10);
    if (isNaN(num)) {
      num = clampedSize;
    } else {
      num = Math.max(10, Math.min(100, num));
    }
    setLocalVal(String(num));
    if (onUpdateSize && num !== clampedSize) {
      onUpdateSize(num);
    }
  };

  return (
    <div
      className="flex items-center gap-1 bg-muted/80 backdrop-blur-xs p-0.5 rounded-lg border border-border/60 text-[10px]"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-0.5 pl-1">
        <input
          type="number"
          min={10}
          max={100}
          value={localVal}
          disabled={!onUpdateSize}
          onChange={(e) => setLocalVal(e.target.value)}
          onBlur={commitValue}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          className="w-9 h-5 text-center text-[11px] font-bold bg-background text-foreground border border-border/70 rounded px-0.5 focus:outline-hidden focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          title="Type width percentage (10% to 100%) and press Enter"
        />
        <span className="text-[10px] font-bold text-muted-foreground pr-0.5 select-none">%</span>
      </div>

      {onUpdateSize && (
        <div className="flex items-center gap-0.5 border-l border-border/50 pl-0.5">
          {([50, 75, 100] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setLocalVal(String(s));
                onUpdateSize(s);
              }}
              className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
                clampedSize === s
                  ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title={`Set width to ${s}%`}
            >
              {s}%
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 1. Image Attachment with Loupe Zoom, Shrink, Lightbox & Captions
// ============================================================
interface ImageAttachmentProps {
  resource: ResourceWithFiles;
  fileUrl: string;
  size?: number;
  onUpdateDescription?: (id: string, description: string | null) => Promise<void>;
  onDelete?: (resource: ResourceWithFiles) => void;
  onUpdateSize?: (newSize: number) => void;
  className?: string;
}

function ImageAttachmentItem({
  resource,
  fileUrl,
  size = 100,
  onUpdateDescription,
  onDelete,
  onUpdateSize,
  className = "",
}: ImageAttachmentProps) {
  const [isShrunk, setIsShrunk] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descText, setDescText] = useState(resource.description || "");
  const [isSavingDesc, setIsSavingDesc] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const clampedSize = Math.max(10, Math.min(100, typeof size === "number" && !isNaN(size) ? Math.round(size) : 100));

  // Zoom Loupe State (Active on Left Click Hold)
  const [isZooming, setIsZooming] = useState(false);
  const [zoomScale, setZoomScale] = useState(6.0); // Default 6x
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

    const currentWidth = Math.min(LOUPE_WIDTH, Math.max(120, rect.width - 16));
    const currentHeight = Math.min(LOUPE_HEIGHT, Math.max(120, rect.height - 16));
    const halfW = currentWidth / 2;
    const halfH = currentHeight / 2;

    const minX = halfW + 8;
    const maxX = Math.max(minX, rect.width - halfW - 8);
    const clampedBoxX = Math.max(minX, Math.min(maxX, x));

    const minY = halfH + 8;
    const maxY = Math.max(minY, rect.height - halfH - 8);
    const clampedBoxY = Math.max(minY, Math.min(maxY, y));

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

  // Lock page scrolling while magnifying so wheel adjusts zoom scale
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
      if (onUpdateDescription) {
        await onUpdateDescription(resource.id, descText.trim() || null);
      } else {
        await updateResourceDescription(resource.id, descText.trim() || null);
        resource.description = descText.trim() || null;
      }
      setIsEditingDescription(false);
    } catch (err) {
      console.error("Failed to save image description:", err);
    } finally {
      setIsSavingDesc(false);
    }
  };

  return (
    <div
      style={{ width: `${clampedSize}%`, maxWidth: "100%" }}
      className={`group relative rounded-xl border border-border/40 hover:border-border/70 bg-transparent overflow-hidden transition-all my-3 mx-auto ${className}`}
    >
      {/* Floating Top-Right Hover Toolbar */}
      <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1.5 p-1 rounded-xl bg-background/95 backdrop-blur-md border border-border/80 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 max-w-[calc(100%-16px)] flex-wrap sm:flex-nowrap">
        {/* Validated Size input + quick presets */}
        <AttachmentSizeControl size={clampedSize} onUpdateSize={onUpdateSize} />

        {/* Edit Description Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditingDescription(!isEditingDescription);
          }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
            isEditingDescription
              ? "bg-primary text-primary-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          title="Edit image caption / description"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span>{resource.description ? "Edit Caption" : "Add Caption"}</span>
        </button>

        {/* Portrait Mode Toggle */}
        <button
          type="button"
          onClick={() => setIsShrunk(!isShrunk)}
          className={`p-1.5 rounded-lg text-xs transition-colors ${
            isShrunk
              ? "bg-primary text-primary-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          title={isShrunk ? "Expand full width" : "Shrink portrait size"}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>

        {/* Lightbox Preview */}
        <button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          className="p-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Open full size preview"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>

        {/* Delete Attachment Button (if allowed) */}
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(resource)}
            className="p-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Delete attachment"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Inline Formattable Description Editor Popup */}
      {isEditingDescription && (
        <CaptionInlineEditor
          title={`Image Caption & Notes for "${resource.name}"`}
          value={descText}
          onChange={setDescText}
          onSave={handleSaveDescription}
          onCancel={() => setIsEditingDescription(false)}
          isSaving={isSavingDesc}
        />
      )}

      {/* Image Display with Hold-to-Zoom Magnifier */}
      <div
        ref={imgContainerRef}
        className={`relative w-full overflow-hidden select-none flex items-center justify-center bg-transparent ${
          isZooming ? "cursor-crosshair" : "cursor-zoom-in"
        } ${isShrunk ? "max-w-sm mx-auto py-2" : "py-1.5"}`}
        title="Hold left-click to zoom into details (scroll wheel to adjust zoom level)"
        onMouseDown={(e) => {
          if (e.button === 0) {
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
          alt={resource.name}
          className={`${
            isShrunk
              ? "w-auto max-w-full max-h-[360px]"
              : "w-full h-auto"
          } object-contain transition-transform duration-200 pointer-events-none rounded-lg mx-auto block`}
          draggable={false}
        />

        {/* Magnifier Loupe Box */}
        {isZooming && (
          <div
            className="absolute pointer-events-none border-2 border-primary rounded-xl shadow-2xl overflow-hidden z-20 backdrop-blur-xs bg-black/30 ring-4 ring-black/40"
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
            {/* Crosshair indicator */}
            <div
              className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${Math.max(10, Math.min(zoomPos.currentWidth - 10, zoomPos.cursorInBoxX))}px`,
                top: `${Math.max(10, Math.min(zoomPos.currentHeight - 10, zoomPos.cursorInBoxY))}px`,
              }}
            >
              <div className="h-6 w-6 rounded-full border-2 border-primary bg-primary/20 shadow-md ring-1 ring-white/70 dark:ring-black/70 flex items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              </div>
            </div>

            {/* Magnification level badge */}
            <div className="absolute bottom-2.5 right-2.5 bg-black/85 backdrop-blur-md text-white text-[11px] font-mono font-semibold px-2 py-1 rounded-lg shadow-lg flex items-center gap-1.5 border border-white/10">
              <span className="text-primary font-bold">{zoomScale.toFixed(1)}x</span>
              <span>Zoom</span>
              <span className="text-[9px] text-white/50 pl-0.5">• Scroll to adjust</span>
            </div>
          </div>
        )}
      </div>

      {/* Caption Bar (renders markdown) */}
      {Boolean(resource.description && resource.description.trim()) && (
        <div className="flex items-center justify-between px-4 py-2 bg-transparent border-t border-border/40">
          <div className="text-xs sm:text-sm font-medium text-foreground leading-relaxed flex-1">
            <MarkdownRenderer content={resource.description || ""} />
          </div>
          {isShrunk && (
            <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium shrink-0 ml-4">
              Portrait Mode
            </span>
          )}
        </div>
      )}

      {/* Full Size Preview Lightbox Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-3 flex flex-col items-center justify-center bg-black/95 border-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fileUrl}
            alt={resource.name}
            className="max-w-full max-h-[85vh] object-contain rounded-md"
          />
          <div className="mt-2 text-center text-xs text-white/80">
            <span>{resource.name}</span>
            {resource.description && <p className="text-[11px] text-white/60 mt-0.5">{resource.description}</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// 2. Video Attachment with Click-to-Play, Frame Step & Embeds
// ============================================================
interface VideoAttachmentProps {
  resource: ResourceWithFiles;
  fileUrl: string;
  size?: number;
  onUpdateDescription?: (id: string, description: string | null) => Promise<void>;
  onDelete?: (resource: ResourceWithFiles) => void;
  onUpdateSize?: (newSize: number) => void;
  className?: string;
}

function VideoAttachmentItem({
  resource,
  fileUrl,
  size = 100,
  onUpdateDescription,
  onDelete,
  onUpdateSize,
  className = "",
}: VideoAttachmentProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descText, setDescText] = useState(resource.description || "");
  const [isSavingDesc, setIsSavingDesc] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const clampedSize = Math.max(10, Math.min(100, typeof size === "number" && !isNaN(size) ? Math.round(size) : 100));

  useEffect(() => {
    setDescText(resource.description || "");
  }, [resource.description]);

  const mediaInfo = validateMediaUrl(fileUrl);
  const ytId = extractYouTubeId(fileUrl);
  const vimeoId = extractVimeoId(fileUrl);
  const isDirect =
    isDirectVideoUrl(fileUrl) ||
    /\.(mp4|webm|ogg|mov|m4v|avi|mkv|wmv|flv|m3u8|mpg|mpeg)/i.test(resource.name);

  const thumbUrl =
    mediaInfo.thumbnailUrl || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null);
  const embedUrl =
    mediaInfo.embedUrl || (ytId ? `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0` : null);

  const stepVideoFrame = (direction: -1 | 1) => {
    const video = videoRef.current;
    if (!video) return;
    const stepSeconds = 0.1;
    const nextTime = Math.min(
      Math.max(0, video.currentTime + direction * stepSeconds),
      video.duration || video.currentTime
    );
    video.currentTime = nextTime;
  };

  const handleSaveDescription = async () => {
    setIsSavingDesc(true);
    try {
      if (onUpdateDescription) {
        await onUpdateDescription(resource.id, descText.trim() || null);
      } else {
        await updateResourceDescription(resource.id, descText.trim() || null);
        resource.description = descText.trim() || null;
      }
      setIsEditingDescription(false);
    } catch (err) {
      console.error("Failed to save video description:", err);
    } finally {
      setIsSavingDesc(false);
    }
  };

  return (
    <div
      style={{ width: `${clampedSize}%`, maxWidth: "100%" }}
      className={`group relative rounded-xl border border-border/40 hover:border-border/70 bg-transparent overflow-hidden transition-all my-3 mx-auto ${className}`}
    >
      {/* Top Header & Actions Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-border/40 bg-transparent gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600/10 text-red-600 dark:text-red-400 shrink-0">
            <Video className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-xs text-foreground truncate max-w-sm">
                {resource.name}
              </span>
              {ytId && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-red-600 text-white">
                  YouTube
                </span>
              )}
              {vimeoId && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-sky-500 text-white">
                  Vimeo
                </span>
              )}
              {isDirect && !ytId && !vimeoId && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-muted text-muted-foreground border">
                  Direct Video
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {/* Validated Size input + quick presets */}
          <AttachmentSizeControl size={clampedSize} onUpdateSize={onUpdateSize} />

          {/* Edit Description Button */}
          <button
            type="button"
            onClick={() => setIsEditingDescription(!isEditingDescription)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              isEditingDescription
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            title="Edit video description / notes"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>{resource.description ? "Edit Caption" : "Add Caption"}</span>
          </button>

          {/* Open Link in New Tab */}
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors inline-flex items-center"
            title="Open in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          {/* Delete Button */}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(resource)}
              className="p-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Delete video attachment"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Inline Formattable Description Editor */}
      {isEditingDescription && (
        <CaptionInlineEditor
          title={`Video Description & Notes for "${resource.name}"`}
          value={descText}
          onChange={setDescText}
          onSave={handleSaveDescription}
          onCancel={() => setIsEditingDescription(false)}
          isSaving={isSavingDesc}
        />
      )}

      {/* Video Content: Clickable Thumbnail VS Loaded In-Place Player */}
      <div className="relative w-full bg-black/90 aspect-video max-h-[340px] overflow-hidden flex items-center justify-center mx-auto">
        {!isPlaying ? (
          /* Clickable Video Thumbnail */
          <div
            onClick={() => setIsPlaying(true)}
            className="group/thumb relative w-full h-full cursor-pointer overflow-hidden flex items-center justify-center bg-slate-950"
            title="Click to play video on page"
          >
            {thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbUrl}
                alt={resource.name}
                className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300 opacity-90 group-hover/thumb:opacity-100"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-black text-slate-400 p-6">
                <Video className="h-12 w-12 text-primary/60 mb-2" />
                <span className="text-xs font-semibold text-slate-200">{resource.name}</span>
                <span className="text-[10px] text-slate-400 mt-1">Click to play video on page</span>
              </div>
            )}

            {/* Dark overlay & play button */}
            <div className="absolute inset-0 bg-black/35 group-hover/thumb:bg-black/20 transition-colors flex items-center justify-center">
              <div className="h-14 w-14 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl group-hover/thumb:scale-110 group-hover/thumb:bg-red-500 transition-all duration-200">
                <Play className="h-6 w-6 fill-current translate-x-0.5" />
              </div>
            </div>
          </div>
        ) : (
          /* Live In-Place Video Player */
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title={resource.name}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : isDirect ? (
              <video
                ref={videoRef}
                src={fileUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="p-6 text-center text-xs text-white/80 space-y-2">
                <p>Unable to load video player for this URL directly.</p>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Video in New Tab</span>
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Frame Stepping Controls (when direct video is loaded and playing) */}
      {isPlaying && isDirect && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-black/80 border-t border-zinc-800 text-xs text-zinc-300">
          <span className="text-[10px] text-zinc-400 font-mono">Frame Step (100ms)</span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => stepVideoFrame(-1)}
              className="h-6 px-2 text-[10px] text-zinc-300 hover:text-white hover:bg-zinc-800 gap-1"
              title="Step back 1 frame (0.1s)"
            >
              <ChevronLeft className="h-3 w-3" />
              -1 Frame
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => stepVideoFrame(1)}
              className="h-6 px-2 text-[10px] text-zinc-300 hover:text-white hover:bg-zinc-800 gap-1"
              title="Step forward 1 frame (0.1s)"
            >
              +1 Frame
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Caption Bar */}
      {Boolean(resource.description && resource.description.trim()) && (
        <div className="flex items-center justify-between px-4 py-2 bg-transparent border-t border-border/40">
          <div className="text-xs sm:text-sm font-medium text-foreground leading-relaxed flex-1">
            <MarkdownRenderer content={resource.description || ""} />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 3. Document / File Attachment with Download & Caption
// ============================================================
interface DocumentAttachmentProps {
  resource: ResourceWithFiles;
  fileUrl: string;
  size?: number;
  onUpdateDescription?: (id: string, description: string | null) => Promise<void>;
  onDelete?: (resource: ResourceWithFiles) => void;
  onUpdateSize?: (newSize: number) => void;
  className?: string;
}

function DocumentAttachmentItem({
  resource,
  fileUrl,
  size = 100,
  onUpdateDescription,
  onDelete,
  onUpdateSize,
  className = "",
}: DocumentAttachmentProps) {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descText, setDescText] = useState(resource.description || "");
  const [isSavingDesc, setIsSavingDesc] = useState(false);

  const clampedSize = Math.max(10, Math.min(100, typeof size === "number" && !isNaN(size) ? Math.round(size) : 100));

  useEffect(() => {
    setDescText(resource.description || "");
  }, [resource.description]);

  const handleSaveDescription = async () => {
    setIsSavingDesc(true);
    try {
      if (onUpdateDescription) {
        await onUpdateDescription(resource.id, descText.trim() || null);
      } else {
        await updateResourceDescription(resource.id, descText.trim() || null);
        resource.description = descText.trim() || null;
      }
      setIsEditingDescription(false);
    } catch (err) {
      console.error("Failed to save file description:", err);
    } finally {
      setIsSavingDesc(false);
    }
  };

  const isLink = fileUrl.startsWith("http://") || fileUrl.startsWith("https://");

  return (
    <div
      style={{ width: `${clampedSize}%`, maxWidth: "100%" }}
      className={`group relative rounded-xl border border-border/40 hover:border-border/70 bg-transparent overflow-hidden transition-all my-3 mx-auto ${className}`}
    >
      <div className="flex items-center justify-between p-3 bg-transparent gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            {isLink ? <Globe className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-xs text-foreground block truncate max-w-md">
              {resource.name}
            </span>
            <span className="text-[10px] text-muted-foreground/70 truncate block">
              {isLink ? fileUrl : "Attached file document"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {/* Validated Size input + quick presets */}
          <AttachmentSizeControl size={clampedSize} onUpdateSize={onUpdateSize} />

          <button
            type="button"
            onClick={() => setIsEditingDescription(!isEditingDescription)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
              isEditingDescription
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            title="Edit description"
          >
            <Pencil className="h-3 w-3" />
            <span>{resource.description ? "Edit Caption" : "Add Caption"}</span>
          </button>

          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="p-1.5 rounded-lg text-xs text-primary hover:bg-primary/10 transition-colors inline-flex items-center gap-1"
              title="Download or open file"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(resource)}
              className="p-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Delete attachment"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Inline Formattable Description Editor */}
      {isEditingDescription && (
        <CaptionInlineEditor
          title={`Description & Notes for "${resource.name}"`}
          value={descText}
          onChange={setDescText}
          onSave={handleSaveDescription}
          onCancel={() => setIsEditingDescription(false)}
          isSaving={isSavingDesc}
        />
      )}

      {/* Caption Bar */}
      {Boolean(resource.description && resource.description.trim()) && (
        <div className="flex items-center justify-between px-4 py-2 bg-transparent border-t border-border/40">
          <div className="text-xs sm:text-sm font-medium text-foreground leading-relaxed flex-1">
            <MarkdownRenderer content={resource.description || ""} />
          </div>
        </div>
      )}
    </div>
  );
}

