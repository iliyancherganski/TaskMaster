"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  IdeaNote,
  IdeaPaperColor,
  IdeaPinColor,
} from "@/types/idea-board.types";
import { PushPin } from "./PushPin";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import {
  ExternalLink,
  Play,
  FileText,
  Pencil,
  Trash2,
  Copy,
  Link2,
  ZoomIn,
  Video,
  Globe,
  MoreVertical,
  CheckSquare,
} from "lucide-react";
import {
  extractYouTubeId,
  extractVimeoId,
  isDirectVideoUrl,
  validateMediaUrl,
} from "@/lib/media-utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface IdeaNoteCardProps {
  note: IdeaNote;
  isDragging?: boolean;
  isConnectingSource?: boolean;
  isConnectTarget?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onStartDrag?: (noteId: string, clientX: number, clientY: number) => void;
  onPinMouseDown?: (noteId: string, e: React.MouseEvent) => void;
  onPinMouseUp?: (noteId: string, e: React.MouseEvent) => void;
  onPinMouseEnter?: (noteId: string) => void;
  onPinMouseLeave?: (noteId: string) => void;
  onPinClick?: (noteId: string, e: React.MouseEvent) => void;
  onStartConnect?: (noteId: string, e: React.MouseEvent) => void;
  onEdit?: (note: IdeaNote) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (note: IdeaNote) => void;
  onOpenTask?: (taskId: string) => void;
}

const PAPER_STYLES: Record<
  IdeaPaperColor,
  {
    bg: string;
    border: string;
    text: string;
    mutedText: string;
    tape?: string;
  }
> = {
  yellow: {
    bg: "bg-[#fef9c3] dark:bg-[#713f12]",
    border: "border-[#fde047]/80 dark:border-[#a16207]",
    text: "text-zinc-900 dark:text-zinc-100",
    mutedText: "text-zinc-700 dark:text-zinc-300",
  },
  white: {
    bg: "bg-white dark:bg-zinc-900",
    border: "border-zinc-300 dark:border-zinc-700",
    text: "text-zinc-900 dark:text-zinc-100",
    mutedText: "text-zinc-600 dark:text-zinc-400",
  },
  kraft: {
    bg: "bg-[#fed7aa] dark:bg-[#7c2d12]",
    border: "border-[#fdba74] dark:border-[#9a3412]",
    text: "text-zinc-900 dark:text-zinc-100",
    mutedText: "text-zinc-700 dark:text-zinc-300",
  },
  mint: {
    bg: "bg-[#dcfce7] dark:bg-[#064e3b]",
    border: "border-[#86efac] dark:border-[#047857]",
    text: "text-zinc-900 dark:text-zinc-100",
    mutedText: "text-zinc-700 dark:text-zinc-300",
  },
  sky: {
    bg: "bg-[#e0f2fe] dark:bg-[#0c4a6e]",
    border: "border-[#7dd3fc] dark:border-[#0369a1]",
    text: "text-zinc-900 dark:text-zinc-100",
    mutedText: "text-zinc-700 dark:text-zinc-300",
  },
  lavender: {
    bg: "bg-[#f3e8ff] dark:bg-[#581c87]",
    border: "border-[#d8b4fe] dark:border-[#7e22ce]",
    text: "text-zinc-900 dark:text-zinc-100",
    mutedText: "text-zinc-700 dark:text-zinc-300",
  },
  rose: {
    bg: "bg-[#fce7f3] dark:bg-[#831843]",
    border: "border-[#f9a8d4] dark:border-[#be185d]",
    text: "text-zinc-900 dark:text-zinc-100",
    mutedText: "text-zinc-700 dark:text-zinc-300",
  },
  dark: {
    bg: "bg-zinc-800 dark:bg-zinc-950",
    border: "border-zinc-700 dark:border-zinc-800",
    text: "text-zinc-100 dark:text-zinc-100",
    mutedText: "text-zinc-400 dark:text-zinc-400",
  },
};

export function IdeaNoteCard({
  note,
  isDragging = false,
  isConnectingSource = false,
  isConnectTarget = false,
  isSelected = false,
  onSelect,
  onStartDrag,
  onPinMouseDown,
  onPinMouseUp,
  onPinMouseEnter,
  onPinMouseLeave,
  onPinClick,
  onStartConnect,
  onEdit,
  onDelete,
  onDuplicate,
  onOpenTask,
}: IdeaNoteCardProps) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const style = PAPER_STYLES[note.color] || PAPER_STYLES.yellow;

  // Media detection
  const fileUrl = note.file_url || "";
  const ytId = extractYouTubeId(fileUrl);
  const vimeoId = extractVimeoId(fileUrl);
  const isDirectVideo =
    isDirectVideoUrl(fileUrl) ||
    /\.(mp4|webm|ogg|mov|m4v)/i.test(note.file_name || "");
  const mediaInfo = validateMediaUrl(fileUrl);
  const embedUrl =
    mediaInfo.embedUrl ||
    (ytId ? `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0` : null);
  const thumbUrl =
    mediaInfo.thumbnailUrl ||
    (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null);

  // Mouse Dragging implementation (delegated to board container)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag on left click and when not holding Ctrl/Meta (Ctrl+click is reserved for panning)
    if (e.button !== 0 || e.ctrlKey || e.metaKey) return;
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest(".no-drag") ||
      target.closest(".pushpin-anchor")
    ) {
      return;
    }

    onSelect?.();
    onStartDrag?.(note.id, e.clientX, e.clientY);
    e.stopPropagation();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(note);
  };

  return (
    <div
      ref={cardRef}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      className={`group absolute select-none transition-shadow duration-150 ${
        isDragging ? "cursor-grabbing z-50 shadow-2xl scale-[1.02]" : "cursor-grab"
      } ${
        isSelected
          ? "ring-4 ring-amber-600 ring-offset-2 ring-offset-[#eedbb8] shadow-2xl scale-[1.01]"
          : ""
      }`}
      style={{
        left: `${note.x}px`,
        top: `${note.y}px`,
        width: `${note.width}px`,
        zIndex: isDragging ? 9999 : note.z_index,
        transform: `rotate(${isDragging ? 0 : note.rotation}deg)`,
      }}
    >
      {/* Selected Indicator Pill */}
      {isSelected && (
        <div className="absolute -top-2.5 right-2 z-40 bg-amber-600 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full shadow-md flex items-center gap-1 pointer-events-none">
          <span>✓</span>
        </div>
      )}
      {/* Pushpin Anchor Point (Centered at top edge) */}
      <div
        className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 pushpin-anchor"
        onClick={(e) => {
          e.stopPropagation();
          onPinClick?.(note.id, e);
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onPinMouseDown?.(note.id, e);
        }}
        onMouseUp={(e) => {
          e.stopPropagation();
          onPinMouseUp?.(note.id, e);
        }}
        onMouseEnter={() => onPinMouseEnter?.(note.id)}
        onMouseLeave={() => onPinMouseLeave?.(note.id)}
      >
        <PushPin
          color={note.pin_color}
          size="md"
          isConnecting={isConnectingSource}
          isTarget={isConnectTarget}
          title="Pushpin: Click or hold and drag to connect a string"
        />
      </div>

      {/* Main Physical Note Body */}
      <div
        className={`relative rounded-xl border ${style.border} ${style.bg} ${style.text} overflow-hidden shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3),0_4px_10px_rgba(0,0,0,0.15)] transition-all`}
      >
        {/* Subtle Paper Grain / Fiber Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Note Header / Drag Grip */}
        <div className="pt-5 px-3.5 pb-2 flex items-center justify-between gap-2 border-b border-black/5 dark:border-white/5">
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-xs sm:text-sm tracking-tight truncate leading-tight">
              {note.title || "Untitled Note"}
            </h4>
          </div>

          {/* Quick Floating Toolbar for Note */}
          <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
            {/* Connect String Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStartConnect?.(note.id, e);
              }}
              className={`p-1 rounded-md text-xs font-semibold transition-all ${
                isConnectingSource
                  ? "bg-red-600 text-white shadow-xs"
                  : "hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground"
              }`}
              title="Connect string to another note"
            >
              <Link2 className="h-3.5 w-3.5" />
            </button>

            {/* Edit Note */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(note);
              }}
              className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
              title="Edit note"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>

            {/* Delete Note */}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(note.id);
                }}
                className="p-1 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-destructive transition-colors"
                title="Delete note"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Note Body Content according to Type */}
        <div className="p-3.5 space-y-2.5 text-xs">
          {/* 1. Image Note (Polaroid Frame) */}
          {note.type === "image" && fileUrl && (
            <div className="relative rounded-lg overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 group/img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl}
                alt={note.title}
                className="w-full h-auto max-h-[220px] object-cover pointer-events-none select-none block"
              />
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/75 text-white opacity-0 group-hover/img:opacity-100 transition-opacity shadow-md"
                title="View full image"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* 2. Video Note (Click-to-Play or In-place Player) */}
          {note.type === "video" && fileUrl && (
            <div className="relative rounded-lg overflow-hidden border border-black/10 dark:border-white/10 bg-black/90 aspect-video flex items-center justify-center">
              {!isVideoPlaying ? (
                <div
                  onClick={() => setIsVideoPlaying(true)}
                  className="relative w-full h-full cursor-pointer flex items-center justify-center group/vid"
                >
                  {thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbUrl}
                      alt={note.title}
                      className="w-full h-full object-cover opacity-90 group-hover/vid:opacity-100 transition-opacity"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-400">
                      <Video className="h-8 w-8 text-red-500 mb-1" />
                      <span className="text-[10px]">Click to play video</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="h-10 w-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover/vid:scale-110 transition-transform">
                      <Play className="h-4 w-4 fill-current translate-x-0.5" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full">
                  {embedUrl ? (
                    <iframe
                      src={embedUrl}
                      title={note.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : isDirectVideo ? (
                    <video src={fileUrl} controls autoPlay className="w-full h-full object-contain" />
                  ) : (
                    <div className="p-3 text-center text-[10px] text-white">
                      <span>Preview not supported directly.</span>
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-sky-400 block mt-1"
                      >
                        Open Video
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. Link / Document / File Note */}
          {(note.type === "link" || note.type === "file") && fileUrl && (
            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {note.type === "link" ? <Globe className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-xs block truncate">
                  {note.file_name || note.title}
                </span>
                <span className="text-[10px] text-muted-foreground block truncate">{fileUrl}</span>
              </div>
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground shrink-0"
                title="Open external link"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {/* 4. Task Link Note */}
          {note.type === "task" && note.task_id && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              <div className="flex items-center gap-2 min-w-0">
                <CheckSquare className="h-4 w-4 shrink-0" />
                <span className="text-xs font-semibold truncate">Linked Project Task</span>
              </div>
              {onOpenTask && (
                <button
                  type="button"
                  onClick={() => onOpenTask(note.task_id!)}
                  className="text-[10px] underline font-bold shrink-0 ml-2"
                >
                  Open Task
                </button>
              )}
            </div>
          )}

          {/* Formatted Markdown Content */}
          {note.content && note.content.trim() && (
            <div className="leading-relaxed font-sans text-xs max-h-[280px] overflow-y-auto pr-1">
              <MarkdownRenderer content={note.content} renderUntaggedAttachments={false} />
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal for Image Notes */}
      {note.type === "image" && fileUrl && (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-3 flex flex-col items-center justify-center bg-black/95 border-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fileUrl} alt={note.title} className="max-w-full max-h-[80vh] object-contain rounded-md" />
            <div className="mt-2 text-center text-xs text-white">
              <p className="font-semibold">{note.title}</p>
              {note.content && <p className="text-[11px] text-zinc-400 mt-0.5">{note.content}</p>}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
