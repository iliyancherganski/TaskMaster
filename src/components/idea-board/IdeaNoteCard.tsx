"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  IdeaNote,
  IdeaPaperColor,
  IdeaPinColor,
} from "@/types/idea-board.types";
import {
  PushPin,
  PIN_COLOR_PRESETS,
  resolvePinHexColor,
  PAPER_COLOR_PRESETS,
  resolvePaperHexColor,
  getPaperColorVariations,
} from "./PushPin";
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
  Folder,
  Layers,
  Layout,
  Palette,
  Sparkles,
  Lightbulb,
  Coffee,
  Box,
  Target,
  Compass,
  Bookmark,
  Flame,
  ArrowRight,
  Strikethrough,
  ChevronDown,
} from "lucide-react";
import {
  extractYouTubeId,
  extractVimeoId,
  isDirectVideoUrl,
  validateMediaUrl,
} from "@/lib/media-utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const SUBBOARD_ICON_MAP: Record<string, any> = {
  folder: Folder,
  layers: Layers,
  layout: Layout,
  palette: Palette,
  sparkles: Sparkles,
  lightbulb: Lightbulb,
  coffee: Coffee,
  box: Box,
  target: Target,
  compass: Compass,
  bookmark: Bookmark,
  flame: Flame,
};

export interface HoveredCardInfo {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface IdeaNoteCardProps {
  note: IdeaNote;
  isDragging?: boolean;
  isConnectingSource?: boolean;
  isConnectTarget?: boolean;
  isSelected?: boolean;
  isTargetHighlight?: boolean;
  onSelect?: () => void;
  onHoverCard?: (info: HoveredCardInfo | null) => void;
  onStartDrag?: (noteId: string, clientX: number, clientY: number) => void;
  onPinMouseDown?: (noteId: string, e: React.MouseEvent) => void;
  onPinMouseUp?: (noteId: string, e: React.MouseEvent) => void;
  onPinMouseEnter?: (noteId: string) => void;
  onPinMouseLeave?: (noteId: string) => void;
  onPinClick?: (noteId: string, e: React.MouseEvent) => void;
  onStartConnect?: (noteId: string, e: React.MouseEvent) => void;
  onEdit?: (note: IdeaNote) => void;
  onEditBoard?: (note: IdeaNote) => void;
  onChangePinColor?: (noteId: string, pinColor: IdeaPinColor) => void;
  onChangePaperColor?: (noteId: string, paperColor: IdeaPaperColor) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (note: IdeaNote) => void;
  onToggleScratch?: (noteId: string) => void;
  onOpenTask?: (taskId: string) => void;
  onOpenSubBoard?: (boardId: string, boardName: string) => void;
  onDeleteBoard?: (boardId: string, boardName: string) => void;
  onStartResize?: (
    noteId: string,
    direction: "horizontal" | "vertical" | "both",
    clientX: number,
    clientY: number,
    initialWidth: number,
    initialHeight: number
  ) => void;
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
  isTargetHighlight = false,
  onSelect,
  onHoverCard,
  onStartDrag,
  onPinMouseDown,
  onPinMouseUp,
  onPinMouseEnter,
  onPinMouseLeave,
  onPinClick,
  onStartConnect,
  onEdit,
  onEditBoard,
  onChangePinColor,
  onChangePaperColor,
  onDelete,
  onDuplicate,
  onToggleScratch,
  onOpenTask,
  onOpenSubBoard,
  onDeleteBoard,
  onStartResize,
}: IdeaNoteCardProps) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDropSwinging, setIsDropSwinging] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const wasDraggingRef = useRef(false);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: note.x, y: note.y });
  
  const isCustomHex = Boolean(note.color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(note.color.trim()));
  const paperTones = getPaperColorVariations(note.color);
  const style = isCustomHex
    ? {
        bg: "",
        border: "",
        text: paperTones.isDark ? "text-zinc-100" : "text-zinc-900",
        mutedText: paperTones.isDark ? "text-zinc-400" : "text-zinc-700",
      }
    : PAPER_STYLES[note.color as IdeaPaperColor] || PAPER_STYLES.yellow;

  // Trigger subtle pendulum swing when note is dropped after being dragged to a new position
  useEffect(() => {
    if (isDragging) {
      wasDraggingRef.current = true;
      setIsDropSwinging(false);
    } else if (wasDraggingRef.current) {
      wasDraggingRef.current = false;
      const moved =
        Math.abs(note.x - dragStartPosRef.current.x) > 3 ||
        Math.abs(note.y - dragStartPosRef.current.y) > 3;
      dragStartPosRef.current = { x: note.x, y: note.y };
      if (moved) {
        setIsDropSwinging(true);
        const timer = setTimeout(() => {
          setIsDropSwinging(false);
        }, 580);
        return () => clearTimeout(timer);
      }
    } else {
      dragStartPosRef.current = { x: note.x, y: note.y };
    }
  }, [isDragging, note.x, note.y]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  // Native non-passive wheel listener:
  // Allows holding Shift + Scroll while hovering anywhere on the note (or scrolling over description)
  // to scroll the note description and lock board zooming!
  useEffect(() => {
    const cardEl = cardRef.current;
    if (!cardEl) return;

    const handleCardWheel = (e: WheelEvent) => {
      const scrollEl = bodyScrollRef.current;
      const isScrollable =
        scrollEl && scrollEl.scrollHeight > scrollEl.clientHeight + 2;

      if (!isScrollable || !scrollEl) return;

      const target = e.target as HTMLElement | null;
      const isOverBody = Boolean(target && scrollEl.contains(target));

      if (e.shiftKey || isOverBody) {
        e.preventDefault();
        e.stopPropagation();
        // When Shift is held, some OS/browsers place wheel delta into deltaX instead of deltaY
        const rawDelta =
          Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        scrollEl.scrollTop += rawDelta;
      }
    };

    cardEl.addEventListener("wheel", handleCardWheel, { passive: false });
    return () => cardEl.removeEventListener("wheel", handleCardWheel);
  }, []);

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

  // Determine whether the note has any body content beyond its title
  const hasDescriptionContent = Boolean(note.content && note.content.trim());
  const hasMediaOrAttachment = Boolean(
    ((note.type === "image" ||
      note.type === "video" ||
      note.type === "link" ||
      note.type === "file") &&
      fileUrl) ||
      (note.type === "task" && note.task_id)
  );
  const hasBodySection = hasDescriptionContent || hasMediaOrAttachment;

  // Mouse Dragging implementation (delegated to board container)
  const handleMouseDown = (e: React.MouseEvent) => {
    // If currently a connect target, clicking on the note card connects string!
    if (isConnectTarget) {
      e.stopPropagation();
      onPinClick?.(note.id, e);
      return;
    }

    // Only drag on left click and when not holding Ctrl/Meta (Ctrl+click is reserved for panning)
    if (e.button !== 0 || e.ctrlKey || e.metaKey) return;
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest("label") ||
      target.closest(".no-drag") ||
      target.closest(".pushpin-anchor")
    ) {
      return;
    }

    dragStartPosRef.current = { x: note.x, y: note.y };
    onSelect?.();
    onStartDrag?.(note.id, e.clientX, e.clientY);
    e.stopPropagation();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (note.type === "board") {
      onOpenSubBoard?.(note.sub_board_id || note.id, note.title);
      return;
    }
    onEdit?.(note);
  };

  const isHovering = isCardHovered && !isDragging;
  const scale = isDragging ? 1.02 : isSelected ? 1.01 : 1;

  return (
    <div
      ref={cardRef}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => {
        setIsCardHovered(true);
        if (!isConnectingSource) {
          onPinMouseEnter?.(note.id);
        }
        const el = cardRef.current;
        const width = el ? el.offsetWidth : note.type === "board" ? 220 : note.width;
        const height = el ? el.offsetHeight : note.type === "board" ? 220 : note.height || 250;
        onHoverCard?.({
          id: note.id,
          x: note.x,
          y: note.y,
          width,
          height,
          rotation: 0,
        });
      }}
      onMouseLeave={() => {
        setIsCardHovered(false);
        onPinMouseLeave?.(note.id);
        onHoverCard?.(null);
      }}
      onClick={(e) => {
        if (isConnectTarget) {
          e.stopPropagation();
          onPinClick?.(note.id, e);
        }
      }}
      className={`group absolute select-none ${
        isDragging ? "cursor-grabbing z-50" : "cursor-grab"
      } ${
        isDropSwinging ? "animate-pin-drop-swing" : ""
      } ${
        isSelected
          ? "ring-4 ring-amber-600 ring-offset-2 ring-offset-[#eedbb8]"
          : ""
      } ${
        note.is_scratched
          ? "opacity-75 grayscale-[0.7] contrast-[0.9] hover:opacity-95 hover:grayscale-[0.3]"
          : ""
      }`}
      style={{
        left: `${note.x}px`,
        top: `${note.y}px`,
        width: `${note.type === "board" ? 220 : note.width}px`,
        height: note.type === "board" ? "220px" : note.height ? `${note.height}px` : undefined,
        zIndex: isDragging ? 9999 : isDropdownOpen ? (note.z_index || 1) + 50 : note.z_index,
        transformOrigin: "50% 4px",
        transform: isDropSwinging ? undefined : `rotate(0deg) scale(${scale})`,
        transition: isDragging ? "none" : "box-shadow 200ms ease",
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
        className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-30 pushpin-anchor"
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
        className={`relative rounded-xl border ${style.border} ${style.bg} ${style.text} ${
          isHovering
            ? "shadow-[0_12px_24px_-4px_rgba(0,0,0,0.32),0_4px_12px_rgba(0,0,0,0.16)]"
            : "shadow-[0_6px_16px_-4px_rgba(0,0,0,0.22),0_2px_6px_rgba(0,0,0,0.1)]"
        } transition-shadow duration-200 ${
          note.type === "board"
            ? "h-full flex flex-col justify-between"
            : note.height
            ? "h-full flex flex-col justify-start"
            : ""
        }`}
        style={{
          ...(isCustomHex
            ? {
                backgroundColor: paperTones.base,
                borderColor: paperTones.border,
                color: paperTones.textColor,
              }
            : {}),
        }}
      >
        {/* Subtle Paper Grain / Fiber Overlay */}
        <div className="absolute inset-0 rounded-xl pointer-events-none opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Scratched Overlay Simulation: Pen Scratch Strokes across the note */}
        {note.is_scratched && (
          <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden z-25 flex items-center justify-center">
            {/* Diagonal Realistic Red/Charcoal Pen Scratch Lines */}
            <svg
              className="absolute inset-0 w-full h-full opacity-45 dark:opacity-55"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              <path
                d="M 4 22 Q 35 15 96 26 M 6 52 Q 50 47 94 54 M 5 82 Q 45 76 95 84"
                stroke="currentColor"
                strokeWidth="2.8"
                strokeLinecap="round"
                className="text-red-700/80 dark:text-red-400/80"
                fill="none"
              />
            </svg>
            <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded border border-red-500/50 bg-red-500/15 text-red-700 dark:text-red-300 text-[9px] font-black uppercase tracking-widest -rotate-6 pointer-events-none select-none shadow-2xs">
              Scratched
            </div>
          </div>
        )}

        {/* Compact Top-Right Dropdown Arrow Menu (Replaces multiple action buttons) */}
        <div
          ref={dropdownRef}
          className="absolute top-2 right-2 z-40 no-drag"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsDropdownOpen((prev) => !prev);
            }}
            className={`p-1 rounded-md transition-all cursor-pointer ${
              isDropdownOpen || isConnectingSource
                ? "bg-black/15 dark:bg-white/20 text-foreground opacity-100"
                : "opacity-65 group-hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/15 text-current"
            }`}
            title="Note options"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-1 w-44 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xl py-1.5 text-xs font-medium z-50 animate-in fade-in zoom-in-95 duration-100">
              {/* Pin Color Selector + Colorwheel inside Dropdown */}
              {onChangePinColor && (
                <div className="px-2.5 pb-1.5 mb-1 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1">
                    Pin Color
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {PIN_COLOR_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onChangePinColor(note.id, p.id);
                        }}
                        className={`h-4 w-4 rounded-full border transition-transform hover:scale-110 cursor-pointer ${
                          note.pin_color === p.id
                            ? "ring-2 ring-amber-500 scale-110 border-black/40"
                            : "border-black/20"
                        }`}
                        style={{ backgroundColor: p.hex }}
                        title={p.label}
                      />
                    ))}
                    <label
                      className="relative h-4 w-4 rounded-full border border-black/25 transition-transform hover:scale-110 flex items-center justify-center cursor-pointer overflow-hidden"
                      style={{
                        background:
                          "conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #10b981, #3b82f6, #8b5cf6, #ec4899, #ef4444)",
                      }}
                      title="Pick custom pin color from colorwheel"
                    >
                      <input
                        type="color"
                        value={resolvePinHexColor(note.pin_color)}
                        onChange={(e) => {
                          e.stopPropagation();
                          onChangePinColor(note.id, e.target.value);
                        }}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Paper / Card Color Selector + Colorwheel inside Dropdown (Requirement 2) */}
              {onChangePaperColor && (
                <div className="px-2.5 pb-1.5 mb-1 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1">
                    {note.type === "board" ? "Card Color" : "Paper Color"}
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {PAPER_COLOR_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onChangePaperColor(note.id, p.id as IdeaPaperColor);
                        }}
                        className={`h-4 w-4 rounded-md border transition-transform hover:scale-110 cursor-pointer ${
                          note.color === p.id
                            ? "ring-2 ring-amber-500 scale-110 border-black/40"
                            : "border-black/20"
                        }`}
                        style={{ backgroundColor: p.hex }}
                        title={p.label}
                      />
                    ))}
                    <label
                      className="relative h-4 w-4 rounded-md border border-black/25 transition-transform hover:scale-110 flex items-center justify-center cursor-pointer overflow-hidden"
                      style={{
                        background:
                          "conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #10b981, #3b82f6, #8b5cf6, #ec4899, #ef4444)",
                      }}
                      title="Pick custom paper color from colorwheel"
                    >
                      <input
                        type="color"
                        value={resolvePaperHexColor(note.color)}
                        onChange={(e) => {
                          e.stopPropagation();
                          onChangePaperColor(note.id, e.target.value);
                        }}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Edit Action */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDropdownOpen(false);
                  if (note.type === "board") {
                    if (onEditBoard) {
                      onEditBoard(note);
                    } else {
                      onEdit?.(note);
                    }
                  } else {
                    onEdit?.(note);
                  }
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{note.type === "board" ? "Edit Board" : "Edit Note"}</span>
              </button>

              {/* Connect String Action */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDropdownOpen(false);
                  onStartConnect?.(note.id, e);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
              >
                <Link2 className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>Connect String</span>
              </button>

              {/* Scratch / Unscratch Action */}
              {onToggleScratch && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDropdownOpen(false);
                    onToggleScratch(note.id);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
                >
                  <Strikethrough className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
                  <span>{note.is_scratched ? "Unscratch" : "Scratch Out"}</span>
                </button>
              )}

              {/* Duplicate Action (for regular notes) */}
              {note.type !== "board" && onDuplicate && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDropdownOpen(false);
                    onDuplicate(note);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Duplicate</span>
                </button>
              )}

              {/* Delete Action */}
              {(onDeleteBoard || onDelete) && (
                <>
                  <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDropdownOpen(false);
                      if (note.type === "board" && onDeleteBoard) {
                        onDeleteBoard(note.sub_board_id || note.id, note.title);
                      } else if (onDelete) {
                        onDelete(note.id);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-red-500/10 text-red-600 dark:text-red-400 text-left transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{note.type === "board" ? "Delete Board" : "Delete Note"}</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Resize Handles (Positioned on outer edge so they never block internal scrollbar) */}
        {note.type !== "board" && (
          <>
            {/* Right Edge: Width / Sideways Stretch */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                const w = cardRef.current?.offsetWidth || note.width || 300;
                const h = cardRef.current?.offsetHeight || note.height || 54;
                onStartResize?.(note.id, "horizontal", e.clientX, e.clientY, w, h);
              }}
              className="absolute top-0 -right-1.5 w-2.5 h-full cursor-ew-resize hover:bg-amber-500/25 active:bg-amber-500/40 rounded-r transition-colors z-30 no-drag"
              title="Drag to resize note width"
            />
            {/* Bottom Edge: Height / Up-Down Stretch */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                const w = cardRef.current?.offsetWidth || note.width || 300;
                const h = cardRef.current?.offsetHeight || note.height || 54;
                onStartResize?.(note.id, "vertical", e.clientX, e.clientY, w, h);
              }}
              className="absolute -bottom-1.5 left-0 w-full h-2.5 cursor-ns-resize hover:bg-amber-500/25 active:bg-amber-500/40 rounded-b transition-colors z-30 no-drag"
              title="Drag to resize note height"
            />
            {/* Bottom-Right Corner: Width and Height Stretch */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                const w = cardRef.current?.offsetWidth || note.width || 300;
                const h = cardRef.current?.offsetHeight || note.height || 54;
                onStartResize?.(note.id, "both", e.clientX, e.clientY, w, h);
              }}
              className="absolute -bottom-1 -right-1 w-4 h-4 cursor-nwse-resize flex items-end justify-end p-0.5 hover:bg-amber-500/30 active:bg-amber-500/50 rounded-br transition-colors z-30 opacity-60 group-hover:opacity-100 no-drag"
              title="Drag to resize note width and height"
            >
              <div className="w-2 h-2 border-r-2 border-b-2 border-current/40" />
            </div>
          </>
        )}

        {/* Square Sub-Idea Board Box (Requirement 4) */}
        {note.type === "board" ? (
          <div className="flex-1 flex flex-col items-center justify-between p-3.5 pt-5 text-center select-none">
            {/* Top Badge */}
            <div className="w-full flex items-center justify-start mb-1 pr-6">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/15 text-current">
                Sub-Board
              </span>
            </div>

            {/* Big Icon in the top-middle of the box */}
            <div className="my-auto flex flex-col items-center justify-center gap-2 py-1 w-full">
              <div className="h-14 w-14 rounded-2xl bg-black/10 dark:bg-white/15 flex items-center justify-center shadow-inner text-current">
                {React.createElement(
                  SUBBOARD_ICON_MAP[note.icon || "folder"] || Layers,
                  { className: "h-8 w-8" }
                )}
              </div>
              {/* Title (the board name) below it - centered and wraps on multiple lines */}
              <h4
                className={`font-extrabold text-sm ${style.text} text-center whitespace-normal break-words px-2 leading-snug transition-all w-full ${
                  note.is_scratched
                    ? "line-through decoration-red-600/90 decoration-[2.5px] opacity-70"
                    : ""
                }`}
              >
                {note.title || "Untitled Board"}
              </h4>
            </div>

            {/* Bottom Open Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSubBoard?.(note.sub_board_id || note.id, note.title);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <span>Open Board</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            {/* Note Header / Centered Wrapping Title (Only if title exists! - Requirement 3) */}
            {Boolean(note.title && note.title.trim()) && (
              <div
                className={`pt-5 px-7 flex items-center justify-center text-center shrink-0 ${
                  hasBodySection
                    ? "pb-2.5 border-b border-black/10 dark:border-white/10"
                    : "pb-4"
                }`}
              >
                <h4
                  className={`font-bold text-xs sm:text-sm tracking-tight text-center whitespace-normal break-words leading-snug w-full transition-all ${
                    note.is_scratched
                      ? "line-through decoration-red-600/90 decoration-[2.5px] text-muted-foreground/80 dark:decoration-red-400"
                      : ""
                  }`}
                >
                  {note.title.trim()}
                </h4>
              </div>
            )}

            {/* Note Body Content (Only rendered if there is description or media/task content!) */}
            {hasBodySection && (
              <div
                ref={bodyScrollRef}
                className={`p-3.5 space-y-2.5 text-xs ${
                  !Boolean(note.title && note.title.trim()) ? "pt-5" : ""
                } ${
                  note.height ? "flex-1 min-h-0 overflow-y-auto" : ""
                }`}
              >
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

                {/* Formatted Markdown Content (Displays whole description by default) */}
                {hasDescriptionContent && (
                  <div
                    className={`leading-relaxed font-sans text-xs break-words transition-all ${
                      note.is_scratched
                        ? "line-through decoration-zinc-500/70 opacity-70 italic"
                        : ""
                    }`}
                  >
                    <MarkdownRenderer content={note.content} renderUntaggedAttachments={false} />
                  </div>
                )}
              </div>
            )}
          </>
        )}
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
