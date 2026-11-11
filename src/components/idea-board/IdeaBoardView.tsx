"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  IdeaBoardData,
  IdeaBoardItem,
  IdeaNote,
  IdeaStringConnection,
  BoardTheme,
  IdeaStringColor,
  IdeaPaperColor,
} from "@/types/idea-board.types";
import {
  loadIdeaBoard,
  fetchIdeaBoardFromDb,
  saveIdeaBoard,
  resetIdeaBoard,
  generateInitialProjectBoard,
  uploadIdeaAttachment,
  fetchSubboardsFromDb,
  getSubboardsFromCache,
  saveSubboardsToCache,
  createSubboard,
  deleteSubboard,
} from "@/lib/idea-board-storage";
import { IdeaNoteCard, HoveredCardInfo } from "./IdeaNoteCard";
import { YarnString, LiveYarnStringPreview, YARN_COLORS } from "./YarnString";
import { IdeaNoteModal } from "./IdeaNoteModal";
import { LinkTaskModal } from "./LinkTaskModal";
import { NewBoardModal, SUBBOARD_ICONS } from "./NewBoardModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TaskWithDetails, Project } from "@/types/database.types";
import {
  Plus,
  Image as ImageIcon,
  Video,
  Globe,
  Sparkles,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  CheckSquare,
  Link2,
  Palette,
  Layers,
  HelpCircle,
  X,
  FileText,
  Focus,
  Undo2,
  Redo2,
  Folder,
  ArrowLeft,
  Copy,
} from "lucide-react";

const SUBBOARD_ICON_MAP: Record<string, any> = {
  folder: Folder,
  layers: Layers,
  layout: Folder,
  palette: Palette,
  sparkles: Sparkles,
  lightbulb: Plus,
  coffee: Plus,
  box: Folder,
  target: Focus,
  compass: Globe,
  bookmark: Plus,
  flame: Sparkles,
};

interface IdeaBoardViewProps {
  projectId?: string | null;
  projects?: Project[];
  availableTasks?: TaskWithDetails[];
  searchQuery?: string;
  onOpenTask?: (taskId: string) => void;
  pinNoteTrigger?: number;
  linkTaskTrigger?: number;
  newBoardTrigger?: number;
  targetTaskId?: string | null;
  onLinkedTasksChange?: (taskIds: Set<string>) => void;
}

const THEME_STYLES: Record<
  BoardTheme,
  {
    name: string;
    bgClass: string;
    frameClass: string;
    corkColor1: string;
    corkColor2: string;
    dotColor: string;
  }
> = {
  cork: {
    name: "Classic Cork",
    // Lighter, natural warm blonde corkboard
    bgClass: "bg-[#fff0d9]", // #fff4e3
    frameClass: "border-[#966138] shadow-inner",
    corkColor1: "#f1f1ef",
    corkColor2: "#f7e3c0",
    dotColor: "#f0c282",
  },
  "dark-cork": {
    name: "Detective Noir",
    bgClass: "bg-[#332219]",
    frameClass: "border-[#1c120c] shadow-inner",
    corkColor1: "#38251b",
    corkColor2: "#291a13",
    dotColor: "#170e0a",
  },
  blueprint: {
    name: "Technical Blueprint",
    bgClass: "bg-[#6e9ac7]", // #6e9ac7
    frameClass: "border-[#081729] shadow-inner", // #113057
    corkColor1: "#0f2744",
    corkColor2: "#0c1f36",
    dotColor: "#2563eb",
  },
  chalkboard: {
    name: "Slate Chalkboard",
    bgClass: "bg-[#1c3329]",
    frameClass: "border-[#0f1f18] shadow-inner",
    corkColor1: "#1d362c",
    corkColor2: "#162a22",
    dotColor: "#34d399",
  },
};

export function IdeaBoardView({
  projectId,
  projects = [],
  availableTasks = [],
  searchQuery = "",
  onOpenTask,
  pinNoteTrigger,
  linkTaskTrigger,
  newBoardTrigger,
  targetTaskId,
  onLinkedTasksChange,
}: IdeaBoardViewProps) {
  // Active Sub-board navigation state (null = root project board)
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
  const [subboards, setSubboards] = useState<IdeaBoardItem[]>(() =>
    getSubboardsFromCache(projectId)
  );

  // New Sub-board Modal & Deletion states
  const [isNewBoardModalOpen, setIsNewBoardModalOpen] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<{ id: string; name: string } | null>(null);

  // Clipboard buffer for Copy (Ctrl+C) / Paste (Ctrl+V)
  const copiedNotesRef = useRef<IdeaNote[]>([]);

  // Separate board per project and per nested sub-board
  const [boardData, setBoardData] = useState<IdeaBoardData>(() =>
    loadIdeaBoard(projectId, currentBoardId)
  );

  // Compute breadcrumb path from root to current board
  const currentProjectName = useMemo(() => {
    if (!projectId || projectId === "all") return "Main Board";
    const p = projects.find((proj) => proj.id === projectId);
    return p?.name || "Main Board";
  }, [projectId, projects]);

  const currentBoardName = useMemo(() => {
    if (!currentBoardId) return currentProjectName;
    const b = subboards.find((sub) => sub.id === currentBoardId);
    return b?.name || boardData.name || "Sub-Board";
  }, [currentBoardId, subboards, currentProjectName, boardData.name]);

  const boardPath = useMemo(() => {
    const path: { id: string | null; name: string; icon?: string }[] = [
      { id: null, name: currentProjectName, icon: "folder" },
    ];

    if (!currentBoardId) return path;

    const trail: { id: string; name: string; icon?: string }[] = [];
    let curr = subboards.find((b) => b.id === currentBoardId);
    let guard = 0;
    while (curr && guard < 20) {
      trail.unshift({ id: curr.id, name: curr.name, icon: curr.icon });
      if (curr.parent_board_id) {
        curr = subboards.find((b) => b.id === curr?.parent_board_id);
      } else {
        break;
      }
      guard++;
    }

    // Safety fallback: if curr was not found in subboards, still display the subboard segment
    if (trail.length === 0) {
      trail.push({
        id: currentBoardId,
        name: boardData.name || currentBoardName || "Sub-Board",
        icon: "layers",
      });
    }

    return [...path, ...trail];
  }, [currentBoardId, subboards, currentProjectName, currentBoardName, boardData.name]);

  // Pan & Zoom State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Refs for instantaneous synchronized pan & zoom calculations
  const panRef = useRef(pan);
  panRef.current = pan;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // Centralized Note Dragging State (multi-select & single-select aware)
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [dragStartBoardPos, setDragStartBoardPos] = useState<{ x: number; y: number } | null>(null);
  const [dragSelectedInitialPositions, setDragSelectedInitialPositions] = useState<
    Record<string, { x: number; y: number }> | null
  >(null);

  // Resizing Note State (Requirement 4: stretch sideways & up/down)
  const [resizingNote, setResizingNote] = useState<{
    noteId: string;
    direction: "horizontal" | "vertical" | "both";
    startX: number;
    startY: number;
    initialWidth: number;
    initialHeight: number;
  } | null>(null);

  // Multi-Selection State (Marquee Box)
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(null);

  // Hold-to-Stretch String & Drop to Create Note State
  const [pinDragSourceId, setPinDragSourceId] = useState<string | null>(null);
  const [pinDragStartPos, setPinDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredTargetPinNoteId, setHoveredTargetPinNoteId] = useState<string | null>(null);
  const [pendingConnectSourceId, setPendingConnectSourceId] = useState<string | null>(null);

  // Click-to-connect fallback state
  const [connectingSourceNoteId, setConnectingSourceNoteId] = useState<string | null>(null);

  // Mouse Live Position on Board
  const [mouseBoardPos, setMouseBoardPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  // String Selection state
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  // Note Modal State
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<IdeaNote | null>(null);
  const [clickCoords, setClickCoords] = useState<{ x: number; y: number }>({
    x: 350,
    y: 200,
  });

  // Task Link Modal & Target Jump Highlight State
  const [isLinkTaskModalOpen, setIsLinkTaskModalOpen] = useState(false);
  const [targetHighlightNoteId, setTargetHighlightNoteId] = useState<string | null>(null);

  // Compute set of all task IDs currently linked on this board
  const linkedTaskIds = useMemo(() => {
    const set = new Set<string>();
    boardData.notes.forEach((n) => {
      if (n.task_id) set.add(n.task_id);
    });
    return set;
  }, [boardData.notes]);

  // Propagate linked task changes to parent so Kanban can render lightbulbs
  useEffect(() => {
    onLinkedTasksChange?.(linkedTaskIds);
  }, [linkedTaskIds, onLinkedTasksChange]);

  // Help info overlay
  const [showHelp, setShowHelp] = useState(false);

  // Hovered card info for string masking (Strings on top of notes, semi-transparent over hovered note)
  const [hoveredCardInfo, setHoveredCardInfo] = useState<HoveredCardInfo | null>(null);
  const [activeMaskCard, setActiveMaskCard] = useState<HoveredCardInfo | null>(null);
  const hoverCardTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCardMouseEnter = useCallback((info: HoveredCardInfo) => {
    if (hoverCardTimeoutRef.current) {
      clearTimeout(hoverCardTimeoutRef.current);
      hoverCardTimeoutRef.current = null;
    }
    setHoveredCardInfo(info);
    setActiveMaskCard(info);
  }, []);

  const handleCardMouseLeave = useCallback((noteId: string) => {
    if (hoverCardTimeoutRef.current) {
      clearTimeout(hoverCardTimeoutRef.current);
    }
    hoverCardTimeoutRef.current = setTimeout(() => {
      setHoveredCardInfo((current) => {
        if (current?.id === noteId) {
          return null;
        }
        return current;
      });
    }, 50);
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);

  // History Stacks for Canvas Undo & Redo
  const [undoStack, setUndoStack] = useState<IdeaBoardData[]>([]);
  const [redoStack, setRedoStack] = useState<IdeaBoardData[]>([]);
  const dragStartBoardSnapshotRef = useRef<IdeaBoardData | null>(null);

  // Reset to root board when switching projects
  useEffect(() => {
    setCurrentBoardId(null);
  }, [projectId]);

  // Re-load board cleanly whenever projectId OR currentBoardId changes (Local Cache + Supabase DB)
  useEffect(() => {
    // 1. Instant local cached render
    const loaded = loadIdeaBoard(projectId, currentBoardId);
    setBoardData(loaded);
    setSelectedNoteIds([]);
    setSelectedConnectionId(null);
    setConnectingSourceNoteId(null);
    setPinDragSourceId(null);
    setPinDragStartPos(null);
    setHoveredTargetPinNoteId(null);
    setDraggingNoteId(null);
    setUndoStack([]);
    setRedoStack([]);

    // 2. Fetch latest data from Supabase DB in the background
    let isMounted = true;
    fetchIdeaBoardFromDb(projectId, currentBoardId)
      .then((dbBoard) => {
        if (isMounted && dbBoard) {
          setBoardData(dbBoard);
        }
      })
      .catch((err) => {
        console.warn("Notice: Using local idea board cache:", err);
      });

    // 3. Fetch subboards catalog for this project
    fetchSubboardsFromDb(projectId)
      .then((subList) => {
        if (isMounted && subList && subList.length > 0) {
          setSubboards((prev) => {
            const map = new Map<string, IdeaBoardItem>();
            prev.forEach((s) => map.set(s.id, s));
            subList.forEach((s) => map.set(s.id, s));
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [projectId, currentBoardId]);

  // Ensure any board notes present on the canvas are also in subboards catalog
  useEffect(() => {
    const boardNotes = boardData.notes.filter((n) => n.type === "board" && n.sub_board_id);
    if (boardNotes.length > 0) {
      setSubboards((prev) => {
        let changed = false;
        const next = [...prev];
        boardNotes.forEach((bn) => {
          const existing = next.find((s) => s.id === bn.sub_board_id);
          if (!existing) {
            next.push({
              id: bn.sub_board_id!,
              project_id: bn.project_id || null,
              name: bn.title,
              parent_board_id: currentBoardId,
              icon: bn.icon || "folder",
              theme: "cork",
              created_at: bn.created_at,
              updated_at: bn.updated_at,
            });
            changed = true;
          } else if (existing.name !== bn.title || existing.icon !== bn.icon) {
            existing.name = bn.title;
            existing.icon = bn.icon || existing.icon;
            changed = true;
          }
        });
        if (changed) {
          saveSubboardsToCache(projectId, next);
          return next;
        }
        return prev;
      });
    }
  }, [boardData.notes, currentBoardId, projectId]);

  // Push board snapshot to Undo Stack
  const pushUndoSnapshot = useCallback((snapshot: IdeaBoardData) => {
    setUndoStack((prev) => {
      const next = [...prev, snapshot];
      if (next.length > 50) return next.slice(next.length - 50);
      return next;
    });
    setRedoStack([]);
  }, []);

  // Board Undo Action
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prevSnapshot = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [...prev, boardData]);
    setBoardData(prevSnapshot);
    saveIdeaBoard(projectId, prevSnapshot, currentBoardId);
  }, [undoStack, boardData, projectId, currentBoardId]);

  // Board Redo Action
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextSnapshot = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setUndoStack((prev) => [...prev, boardData]);
    setBoardData(nextSnapshot);
    saveIdeaBoard(projectId, nextSnapshot, currentBoardId);
  }, [redoStack, boardData, projectId, currentBoardId]);

  // Persist board strictly for current project & board (records undo snapshot by default)
  const updateBoard = useCallback(
    (newBoard: IdeaBoardData, recordUndo = true) => {
      if (recordUndo) {
        pushUndoSnapshot(boardData);
      }
      setBoardData(newBoard);
      saveIdeaBoard(projectId, newBoard, currentBoardId);
    },
    [boardData, projectId, currentBoardId, pushUndoSnapshot]
  );

  // Convert viewport client coordinates to corkboard coordinates using instantaneous refs
  const clientToBoardCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 300, y: 200 };
      const rect = containerRef.current.getBoundingClientRect();
      const currentPan = panRef.current || { x: 0, y: 0 };
      const currentZoom = zoomRef.current || 1;
      const x = (clientX - rect.left - (currentPan.x || 0)) / (currentZoom || 1);
      const y = (clientY - rect.top - (currentPan.y || 0)) / (currentZoom || 1);
      return {
        x: isNaN(x) ? 300 : Math.round(x),
        y: isNaN(y) ? 200 : Math.round(y),
      };
    },
    []
  );

  // Center & Frame View onto Notes / Tasks (Shift + F) - ONLY called on manual trigger!
  const handleFitToContent = useCallback(() => {
    if (!containerRef.current || !boardData.notes || boardData.notes.length === 0) {
      setPan({ x: 0, y: 0 });
      setZoom(1);
      panRef.current = { x: 0, y: 0 };
      zoomRef.current = 1;
      return;
    }

    const container = containerRef.current;
    const viewWidth = container.clientWidth || window.innerWidth;
    const viewHeight = container.clientHeight || (window.innerHeight - 115);

    // If notes are selected, fit to selected notes; otherwise fit all notes
    const targetNotes =
      selectedNoteIds.length > 0
        ? boardData.notes.filter((n) => selectedNoteIds.includes(n.id))
        : boardData.notes;

    const notesToFit = targetNotes.length > 0 ? targetNotes : boardData.notes;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    notesToFit.forEach((note) => {
      const w = note.width || 300;
      const h = note.type === "image" || note.type === "video" ? 300 : 220;
      if (note.x < minX) minX = note.x;
      if (note.x + w > maxX) maxX = note.x + w;
      if (note.y < minY) minY = note.y;
      if (note.y + h > maxY) maxY = note.y + h;
    });

    const contentWidth = Math.max(100, maxX - minX);
    const contentHeight = Math.max(100, maxY - minY);
    const centerX = minX + contentWidth / 2;
    const centerY = minY + contentHeight / 2;

    const padding = 120;
    const paddedWidth = contentWidth + padding * 2;
    const paddedHeight = contentHeight + padding * 2;

    const zoomX = viewWidth / paddedWidth;
    const zoomY = viewHeight / paddedHeight;
    let newZoom = Math.min(zoomX, zoomY, 1.05);
    newZoom = Math.max(0.35, Math.min(newZoom, 1.25));
    newZoom = +newZoom.toFixed(2);

    const newPanX = Math.round(viewWidth / 2 - centerX * newZoom);
    const newPanY = Math.round(viewHeight / 2 - centerY * newZoom);

    if (isNaN(newPanX) || isNaN(newPanY) || isNaN(newZoom)) {
      panRef.current = { x: 0, y: 0 };
      zoomRef.current = 1;
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    panRef.current = { x: newPanX, y: newPanY };
    zoomRef.current = newZoom;
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [boardData.notes, selectedNoteIds]);

  // Delete Connection (Cut string)
  const handleDeleteConnection = useCallback(
    (connectionId: string) => {
      updateBoard({
        ...boardData,
        connections: boardData.connections.filter((c) => c.id !== connectionId),
      });
      setSelectedConnectionId(null);
    },
    [boardData, updateBoard]
  );

  // Delete all currently selected notes & their connected strings
  const handleDeleteSelectedNotes = useCallback(() => {
    if (selectedNoteIds.length === 0) return;
    pushUndoSnapshot(boardData);
    const remainingNotes = boardData.notes.filter(
      (n) => !selectedNoteIds.includes(n.id)
    );
    const remainingConnections = boardData.connections.filter(
      (c) =>
        !selectedNoteIds.includes(c.from_note_id) &&
        !selectedNoteIds.includes(c.to_note_id)
    );
    const updated = {
      ...boardData,
      notes: remainingNotes,
      connections: remainingConnections,
    };
    setBoardData(updated);
    saveIdeaBoard(projectId, updated, currentBoardId);
    setSelectedNoteIds([]);
  }, [selectedNoteIds, boardData, projectId, currentBoardId, pushUndoSnapshot]);

  // Duplicate Selected Notes (Shift + D) (Requirement 5)
  const duplicateSelectedNotes = useCallback(() => {
    if (selectedNoteIds.length === 0) return;
    pushUndoSnapshot(boardData);

    const notesToDuplicate = boardData.notes.filter((n) =>
      selectedNoteIds.includes(n.id)
    );
    if (notesToDuplicate.length === 0) return;

    const curMaxZ = Math.max(1, ...boardData.notes.map((n) => n.z_index));
    const newNoteIds: string[] = [];

    const duplicatedNotes: IdeaNote[] = notesToDuplicate.map((n, idx) => {
      const newId = `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}-${idx}`;
      newNoteIds.push(newId);
      return {
        ...n,
        id: newId,
        title: n.title.endsWith("(Copy)") ? n.title : `${n.title} (Copy)`,
        x: n.x + 35,
        y: n.y + 35,
        rotation: +(Math.random() * 4 - 2).toFixed(1),
        z_index: curMaxZ + idx + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    const updated = {
      ...boardData,
      notes: [...boardData.notes, ...duplicatedNotes],
    };

    setBoardData(updated);
    saveIdeaBoard(projectId, updated, currentBoardId);
    setSelectedNoteIds(newNoteIds);
  }, [selectedNoteIds, boardData, projectId, currentBoardId, pushUndoSnapshot]);

  // Copy Selected Notes (Ctrl + C) (Requirement 5)
  const copySelectedNotes = useCallback(() => {
    if (selectedNoteIds.length === 0) return;
    const notesToCopy = boardData.notes.filter((n) =>
      selectedNoteIds.includes(n.id)
    );
    copiedNotesRef.current = JSON.parse(JSON.stringify(notesToCopy));
  }, [selectedNoteIds, boardData.notes]);

  // Paste Copied Notes (Ctrl + V) (Requirement 5)
  const pasteCopiedNotes = useCallback(() => {
    if (!copiedNotesRef.current || copiedNotesRef.current.length === 0) return;
    pushUndoSnapshot(boardData);

    const curMaxZ = Math.max(1, ...boardData.notes.map((n) => n.z_index));
    const newNoteIds: string[] = [];

    const minX = Math.min(...copiedNotesRef.current.map((n) => n.x));
    const minY = Math.min(...copiedNotesRef.current.map((n) => n.y));
    const targetX = mouseBoardPos.x || Math.round((-pan.x + 400) / zoom);
    const targetY = mouseBoardPos.y || Math.round((-pan.y + 250) / zoom);
    const offsetX = targetX - minX;
    const offsetY = targetY - minY;

    const pastedNotes: IdeaNote[] = copiedNotesRef.current.map((n, idx) => {
      const newId = `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}-${idx}`;
      newNoteIds.push(newId);
      return {
        ...n,
        id: newId,
        project_id: projectId && projectId !== "all" ? projectId : null,
        board_id: currentBoardId,
        x: n.x + offsetX,
        y: n.y + offsetY,
        rotation: +(Math.random() * 4 - 2).toFixed(1),
        z_index: curMaxZ + idx + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    const updated = {
      ...boardData,
      notes: [...boardData.notes, ...pastedNotes],
    };

    setBoardData(updated);
    saveIdeaBoard(projectId, updated, currentBoardId);
    setSelectedNoteIds(newNoteIds);
  }, [boardData, mouseBoardPos, pan, zoom, projectId, currentBoardId, pushUndoSnapshot]);

  // Toggle Scratch / Cross-out for Selected Notes (or a specific note)
  const handleToggleScratchSelectedNotes = useCallback(
    (targetNoteIds?: string[]) => {
      const ids = targetNoteIds || selectedNoteIds;
      if (ids.length === 0) return;

      const targetNotes = boardData.notes.filter((n) => ids.includes(n.id));
      if (targetNotes.length === 0) return;

      // If all selected are scratched, unscratch them; otherwise scratch them
      const allScratched = targetNotes.every((n) => n.is_scratched);
      const nextScratchedState = !allScratched;

      pushUndoSnapshot(boardData);

      const updatedNotes = boardData.notes.map((n) =>
        ids.includes(n.id)
          ? {
              ...n,
              is_scratched: nextScratchedState,
              updated_at: new Date().toISOString(),
            }
          : n
      );

      const nextData = {
        ...boardData,
        notes: updatedNotes,
      };
      setBoardData(nextData);
      saveIdeaBoard(projectId, nextData, currentBoardId);
    },
    [selectedNoteIds, boardData, projectId, currentBoardId, pushUndoSnapshot]
  );

  // Keyboard Shortcuts: Ctrl+Z (Undo), Ctrl+Y (Redo), Shift+F (Frame), Delete (Remove), Escape (Cancel), - (Scratch)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Text field focus guard: if user is typing in any input/textarea, DO NOT touch!
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      // 2. Note modal open guard: if note modal dialog is open, do not trigger board canvas shortcuts
      if (isNoteModalOpen) {
        return;
      }

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const code = e.code;

      // Undo: Ctrl+Z (without shift)
      if (
        isCtrlOrMeta &&
        !e.shiftKey &&
        (key === "z" || code === "KeyZ" || key === "з" || key === "я")
      ) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y OR Ctrl+Shift+Z / Cmd+Shift+Z
      if (
        (isCtrlOrMeta && (key === "y" || code === "KeyY" || key === "ъ" || key === "н")) ||
        (isCtrlOrMeta &&
          e.shiftKey &&
          (key === "z" || code === "KeyZ" || key === "з" || key === "я"))
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Duplicate: Shift + D (Requirement 5)
      if (e.shiftKey && (key === "d" || code === "KeyD") && !isCtrlOrMeta) {
        if (selectedNoteIds.length > 0) {
          e.preventDefault();
          duplicateSelectedNotes();
          return;
        }
      }

      // Copy: Ctrl + C (or Cmd + C) (Requirement 5)
      if (isCtrlOrMeta && !e.shiftKey && (key === "c" || code === "KeyC")) {
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
          return;
        }
        if (selectedNoteIds.length > 0) {
          e.preventDefault();
          copySelectedNotes();
          return;
        }
      }

      // Paste: Ctrl + V (or Cmd + V) for notes buffer (Requirement 5)
      if (isCtrlOrMeta && !e.shiftKey && (key === "v" || code === "KeyV")) {
        if (copiedNotesRef.current && copiedNotesRef.current.length > 0) {
          e.preventDefault();
          pasteCopiedNotes();
          return;
        }
      }

      // Delete or Backspace: Delete selected notes or selected connection
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNoteIds.length > 0) {
          e.preventDefault();
          handleDeleteSelectedNotes();
          return;
        }
        if (selectedConnectionId) {
          e.preventDefault();
          handleDeleteConnection(selectedConnectionId);
          return;
        }
      }

      // Escape key: Cancel active string connecting/dragging
      if (e.key === "Escape") {
        if (connectingSourceNoteId || pinDragSourceId) {
          e.preventDefault();
          setConnectingSourceNoteId(null);
          setPinDragSourceId(null);
          setPinDragStartPos(null);
          setHoveredTargetPinNoteId(null);
          return;
        }
        if (selectedNoteIds.length > 0) {
          setSelectedNoteIds([]);
        }
        if (selectedConnectionId) {
          setSelectedConnectionId(null);
        }
        return;
      }

      // Scratch / Cross-out Selected Notes: "-" or "_" or NumpadSubtract
      if (
        (e.key === "-" || e.key === "_" || code === "Minus" || code === "NumpadSubtract") &&
        !isCtrlOrMeta
      ) {
        if (selectedNoteIds.length > 0) {
          e.preventDefault();
          handleToggleScratchSelectedNotes();
          return;
        }
      }

      // Shift + F: Frame / focus on notes or tasks
      if (e.shiftKey && (key === "f" || code === "KeyF")) {
        e.preventDefault();
        handleFitToContent();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleFitToContent,
    handleUndo,
    handleRedo,
    handleDeleteSelectedNotes,
    handleDeleteConnection,
    duplicateSelectedNotes,
    copySelectedNotes,
    pasteCopiedNotes,
    handleToggleScratchSelectedNotes,
    connectingSourceNoteId,
    pinDragSourceId,
    selectedNoteIds,
    selectedConnectionId,
    isNoteModalOpen,
  ]);

  // Frame view ONCE on initial load or project switch (NEVER on selecting notes!)
  const initialFrameDoneRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const key = projectId || "default";
    if (!initialFrameDoneRef.current[key] && boardData.notes.length > 0) {
      initialFrameDoneRef.current[key] = true;
      const timer = setTimeout(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const viewWidth = container.clientWidth || window.innerWidth;
        const viewHeight = container.clientHeight || (window.innerHeight - 115);

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        boardData.notes.forEach((note) => {
          const w = note.width || 300;
          const h = note.type === "image" || note.type === "video" ? 300 : 220;
          if (note.x < minX) minX = note.x;
          if (note.x + w > maxX) maxX = note.x + w;
          if (note.y < minY) minY = note.y;
          if (note.y + h > maxY) maxY = note.y + h;
        });

        const contentWidth = Math.max(100, maxX - minX);
        const contentHeight = Math.max(100, maxY - minY);
        const centerX = minX + contentWidth / 2;
        const centerY = minY + contentHeight / 2;

        const paddedWidth = contentWidth + 240;
        const paddedHeight = contentHeight + 240;

        let newZoom = Math.min(viewWidth / paddedWidth, viewHeight / paddedHeight, 1.05);
        newZoom = Math.max(0.35, Math.min(newZoom, 1.25));
        newZoom = +newZoom.toFixed(2);

        const newPanX = Math.round(viewWidth / 2 - centerX * newZoom);
        const newPanY = Math.round(viewHeight / 2 - centerY * newZoom);

        if (isNaN(newPanX) || isNaN(newPanY) || isNaN(newZoom)) {
          panRef.current = { x: 0, y: 0 };
          zoomRef.current = 1;
          setZoom(1);
          setPan({ x: 0, y: 0 });
          return;
        }

        panRef.current = { x: newPanX, y: newPanY };
        zoomRef.current = newZoom;
        setZoom(newZoom);
        setPan({ x: newPanX, y: newPanY });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [projectId, boardData.notes]);

  // Open note modal from external "+ Pin Note" trigger in filter bar
  useEffect(() => {
    if (pinNoteTrigger && pinNoteTrigger > 0) {
      const container = containerRef.current;
      const width = container ? container.clientWidth : 800;
      const height = container ? container.clientHeight : 600;
      const centerBoard = clientToBoardCoords(
        (container ? container.getBoundingClientRect().left : 0) + width / 2,
        (container ? container.getBoundingClientRect().top : 0) + height / 2
      );
      setClickCoords({
        x: Math.max(50, Math.round(centerBoard.x - 160)),
        y: Math.max(50, Math.round(centerBoard.y - 100)),
      });
      setEditingNote(null);
      setPendingConnectSourceId(null);
      setIsNoteModalOpen(true);
    }
  }, [pinNoteTrigger, clientToBoardCoords]);

  // Open Task Picker from external "+ Link Task" trigger in filter bar
  useEffect(() => {
    if (linkTaskTrigger && linkTaskTrigger > 0) {
      setIsLinkTaskModalOpen(true);
    }
  }, [linkTaskTrigger]);

  // Open New Board Modal from external "+ New Board" trigger in filter bar
  useEffect(() => {
    if (newBoardTrigger && newBoardTrigger > 0) {
      setIsNewBoardModalOpen(true);
    }
  }, [newBoardTrigger]);

  // Create Sub-Board (Requirement 4)
  const handleCreateSubboard = async (data: {
    name: string;
    icon?: string;
    theme?: BoardTheme;
  }) => {
    const newBoard = await createSubboard(
      projectId,
      data.name,
      currentBoardId,
      data.icon,
      data.theme
    );

    // Refresh subboards list
    setSubboards((prev) => [...prev, newBoard]);

    // Create a visual square board note on the current board canvas
    const container = containerRef.current;
    const width = container ? container.clientWidth : 800;
    const height = container ? container.clientHeight : 600;
    const centerBoard = clientToBoardCoords(
      (container ? container.getBoundingClientRect().left : 0) + width / 2,
      (container ? container.getBoundingClientRect().top : 0) + height / 2
    );

    const curMaxZ = Math.max(...boardData.notes.map((n) => n.z_index), 1);
    const boardNote: IdeaNote = {
      id: `board-note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      project_id: projectId && projectId !== "all" ? projectId : null,
      board_id: currentBoardId,
      sub_board_id: newBoard.id,
      type: "board",
      title: newBoard.name,
      content: "",
      icon: newBoard.icon || "folder",
      color: "yellow",
      pin_color: "gold",
      x: Math.max(50, Math.round(centerBoard.x - 110 + (Math.random() * 40 - 20))),
      y: Math.max(50, Math.round(centerBoard.y - 110 + (Math.random() * 40 - 20))),
      width: 220,
      rotation: +(Math.random() * 3 - 1.5).toFixed(1),
      z_index: curMaxZ + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = {
      ...boardData,
      notes: [...boardData.notes, boardNote],
    };

    updateBoard(updated);
    setIsNewBoardModalOpen(false);
  };

  // Open Sub-Board (Requirement 4)
  const handleOpenSubBoard = (boardId: string) => {
    setCurrentBoardId(boardId);
  };

  // Navigate to Breadcrumb Step (Requirement 4)
  const handleNavigateToBoard = (boardId: string | null) => {
    setCurrentBoardId(boardId);
  };

  // Request Delete Sub-board (Requirement 4: Confirm popup)
  const handleDeleteBoardRequest = (boardId: string, boardName: string) => {
    setBoardToDelete({ id: boardId, name: boardName });
  };

  // Confirm Delete Sub-board
  const handleConfirmDeleteBoard = async () => {
    if (!boardToDelete) return;
    const boardId = boardToDelete.id;

    // Delete subboard records & cache
    await deleteSubboard(boardId, projectId);

    // Remove the subboard and any nested boards from local subboards state
    setSubboards((prev) => prev.filter((b) => b.id !== boardId && b.parent_board_id !== boardId));

    // Remove the board note from canvas
    const remainingNotes = boardData.notes.filter(
      (n) => n.sub_board_id !== boardId && n.id !== boardId
    );
    const remainingConnections = boardData.connections.filter(
      (c) =>
        remainingNotes.some((n) => n.id === c.from_note_id) &&
        remainingNotes.some((n) => n.id === c.to_note_id)
    );

    const updated = {
      ...boardData,
      notes: remainingNotes,
      connections: remainingConnections,
    };
    updateBoard(updated);

    // If currently inside the deleted board, navigate up
    if (currentBoardId === boardId) {
      setCurrentBoardId(null);
    }

    setBoardToDelete(null);
  };

  // Jump to and center on target task note when opened via Kanban lightbulb
  useEffect(() => {
    if (!targetTaskId) return;

    // Find note linked to this task
    const note = boardData.notes.find((n) => n.task_id === targetTaskId);
    if (note && containerRef.current) {
      const container = containerRef.current;
      const viewWidth = container.clientWidth || window.innerWidth;
      const viewHeight = container.clientHeight || (window.innerHeight - 116);
      const centerX = note.x + (note.width || 300) / 2;
      const centerY = note.y + 110;

      const targetZoom = Math.max(0.85, Math.min(zoomRef.current || 1, 1.2));
      const newPanX = Math.round(viewWidth / 2 - centerX * targetZoom);
      const newPanY = Math.round(viewHeight / 2 - centerY * targetZoom);

      setZoom(targetZoom);
      setPan({ x: newPanX, y: newPanY });
      panRef.current = { x: newPanX, y: newPanY };
      zoomRef.current = targetZoom;

      setSelectedNoteIds([note.id]);
      setTargetHighlightNoteId(note.id);
      const timer = setTimeout(() => {
        setTargetHighlightNoteId(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [targetTaskId, boardData.notes]);

  // Direct Pin Task as Note on Board
  const handleDirectLinkTask = useCallback(
    (task: TaskWithDetails) => {
      const container = containerRef.current;
      const width = container ? container.clientWidth : 800;
      const height = container ? container.clientHeight : 600;
      const centerBoard = clientToBoardCoords(
        (container ? container.getBoundingClientRect().left : 0) + width / 2,
        (container ? container.getBoundingClientRect().top : 0) + height / 2
      );

      const curMaxZ = Math.max(...boardData.notes.map((n) => n.z_index), 1);
      const newNoteId = `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      const newNote: IdeaNote = {
        id: newNoteId,
        project_id: projectId && projectId !== "all" ? projectId : (task.Project_id || null),
        type: "task",
        title: task.name,
        content: task.description || "",
        task_id: task.id,
        color: "yellow",
        pin_color: "red",
        x: Math.max(50, Math.round(centerBoard.x - 160 + (Math.random() * 40 - 20))),
        y: Math.max(50, Math.round(centerBoard.y - 80 + (Math.random() * 40 - 20))),
        width: 320,
        rotation: +(Math.random() * 4 - 2).toFixed(1),
        z_index: curMaxZ + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      updateBoard({
        ...boardData,
        notes: [...boardData.notes, newNote],
      });

      setSelectedNoteIds([newNoteId]);
      setTargetHighlightNoteId(newNoteId);
      setTimeout(() => setTargetHighlightNoteId(null), 3500);
    },
    [boardData, clientToBoardCoords, projectId, updateBoard]
  );

  // Jump to existing note
  const handleJumpToTaskNote = useCallback(
    (taskId: string) => {
      const note = boardData.notes.find((n) => n.task_id === taskId);
      if (note && containerRef.current) {
        const container = containerRef.current;
        const viewWidth = container.clientWidth || window.innerWidth;
        const viewHeight = container.clientHeight || (window.innerHeight - 116);
        const centerX = note.x + (note.width || 300) / 2;
        const centerY = note.y + 110;

        const targetZoom = Math.max(0.85, Math.min(zoomRef.current || 1, 1.2));
        const newPanX = Math.round(viewWidth / 2 - centerX * targetZoom);
        const newPanY = Math.round(viewHeight / 2 - centerY * targetZoom);

        setZoom(targetZoom);
        setPan({ x: newPanX, y: newPanY });
        panRef.current = { x: newPanX, y: newPanY };
        zoomRef.current = targetZoom;

        setSelectedNoteIds([note.id]);
        setTargetHighlightNoteId(note.id);
        setTimeout(() => setTargetHighlightNoteId(null), 3500);
      }
    },
    [boardData.notes]
  );

  // Native non-passive Wheel Zoom centered directly on mouse cursor with zero drift
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;

      const zoomDelta = -e.deltaY;
      const factor = zoomDelta > 0 ? 1.1 : 0.9;
      const newZoom = Math.min(2.5, Math.max(0.2, +(currentZoom * factor).toFixed(3)));
      if (newZoom === currentZoom) return;

      // Exact board coordinate under cursor
      const boardX = (mouseX - currentPan.x) / currentZoom;
      const boardY = (mouseY - currentPan.y) / currentZoom;

      // Keep board coordinate directly stationary under mouse cursor
      const newPanX = Math.round(mouseX - boardX * newZoom);
      const newPanY = Math.round(mouseY - boardY * newZoom);

      panRef.current = { x: newPanX, y: newPanY };
      zoomRef.current = newZoom;

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    };

    const handleAuxClick = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
      }
    };

    container.addEventListener("wheel", handleWheelNative, { passive: false });
    container.addEventListener("auxclick", handleAuxClick);
    return () => {
      container.removeEventListener("wheel", handleWheelNative);
      container.removeEventListener("auxclick", handleAuxClick);
    };
  }, []);

  // Global mouseup to cleanly terminate drag or pan even outside container
  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (isPanning) {
        setIsPanning(false);
      }
      if (draggingNoteId) {
        if (dragStartBoardSnapshotRef.current) {
          const initialNotes = dragStartBoardSnapshotRef.current.notes;
          const hasMoved = boardData.notes.some((n) => {
            const initial = initialNotes.find((inNote) => inNote.id === n.id);
            return initial && (initial.x !== n.x || initial.y !== n.y);
          });
          if (hasMoved) {
            pushUndoSnapshot(dragStartBoardSnapshotRef.current);
          }
          dragStartBoardSnapshotRef.current = null;
        }
        setDraggingNoteId(null);
        setDragSelectedInitialPositions(null);
        setDragStartBoardPos(null);
        saveIdeaBoard(projectId, boardData, currentBoardId);
      }
      if (isMarqueeSelecting) {
        setIsMarqueeSelecting(false);
        setMarqueeStart(null);
        setMarqueeEnd(null);
      }
      if (resizingNote) {
        setResizingNote(null);
        saveIdeaBoard(projectId, boardData, currentBoardId);
      }
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, [isPanning, draggingNoteId, resizingNote, isMarqueeSelecting, projectId, boardData, currentBoardId, pushUndoSnapshot]);

  // Direct clipboard paste (Ctrl+V): pastes images or links without any modal dialogs!
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      const pasteCoords = {
        x: mouseBoardPos.x || Math.round((-pan.x + 350) / zoom),
        y: mouseBoardPos.y || Math.round((-pan.y + 250) / zoom),
      };

      // Pasted Image File
      const items = Array.from(clipboardData.items);
      const imageItem = items.find((item) => item.type.startsWith("image/"));
      if (imageItem) {
        e.preventDefault();
        const file = imageItem.getAsFile();
        if (file) {
          const fileUrl = await uploadIdeaAttachment(file);
          const curMaxZ = Math.max(...boardData.notes.map((n) => n.z_index), 1);
          const newNote: IdeaNote = {
            id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            project_id: projectId && projectId !== "all" ? projectId : null,
            type: "image",
            title: "Pasted Image",
            content: "",
            file_url: fileUrl,
            file_name: "pasted-image.png",
            color: "white",
            pin_color: "red",
            x: pasteCoords.x - 140,
            y: pasteCoords.y - 20,
            width: 300,
            rotation: +(Math.random() * 4 - 2).toFixed(1),
            z_index: curMaxZ + 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          const updated = {
            ...boardData,
            notes: [...boardData.notes, newNote],
          };
          updateBoard(updated);
          return;
        }
      }

      // Pasted Text / Web Link
      const text = clipboardData.getData("text")?.trim();
      if (text) {
        e.preventDefault();
        const isUrl = text.startsWith("http://") || text.startsWith("https://");
        const isImg = isUrl && /\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(text);
        const isVid =
          isUrl &&
          (text.includes("youtube.com") || text.includes("youtu.be") || text.includes("vimeo.com"));

        const curMaxZ = Math.max(...boardData.notes.map((n) => n.z_index), 1);
        const newNote: IdeaNote = {
          id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          project_id: projectId && projectId !== "all" ? projectId : null,
          type: isImg ? "image" : isVid ? "video" : isUrl ? "link" : "text",
          title: isUrl
            ? isVid
              ? "Video Link"
              : isImg
              ? "Pasted Image"
              : "Web Link"
            : text.slice(0, 32),
          content: isUrl ? `Resource: ${text}` : text,
          file_url: isUrl ? text : undefined,
          color: isImg ? "white" : isUrl ? "sky" : "yellow",
          pin_color: isUrl ? "blue" : "red",
          x: pasteCoords.x - 140,
          y: pasteCoords.y - 20,
          width: 300,
          rotation: +(Math.random() * 4 - 2).toFixed(1),
          z_index: curMaxZ + 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const updated = {
          ...boardData,
          notes: [...boardData.notes, newNote],
        };
        updateBoard(updated);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [mouseBoardPos, pan, zoom, updateBoard]);

  // Helper: compute pin coordinates for any note
  const getNotePinPosition = useCallback((note: IdeaNote) => {
    return {
      x: note.x + note.width / 2,
      y: note.y + 10,
    };
  }, []);

  // Helper to establish a connection between two notes
  const createStringConnection = useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) return;
      const exists = boardData.connections.some(
        (c) =>
          (c.from_note_id === fromId && c.to_note_id === toId) ||
          (c.from_note_id === toId && c.to_note_id === fromId)
      );
      if (!exists) {
        const fromNote = boardData.notes.find((n) => n.id === fromId);
        const newConn: IdeaStringConnection = {
          id: `string-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          project_id: projectId || null,
          from_note_id: fromId,
          to_note_id: toId,
          color: fromNote?.pin_color === "gold" ? "twine" : "red",
          tension: "normal",
          created_at: new Date().toISOString(),
        };
        updateBoard({
          ...boardData,
          connections: [...boardData.connections, newConn],
        });
      }
    },
    [boardData, projectId, updateBoard]
  );

  // Centralized Note Drag initiation (supports dragging multiple selected notes together!)
  const handleStartDragNote = (noteId: string, clientX: number, clientY: number) => {
    setHoveredCardInfo(null);
    setActiveMaskCard(null);

    // Record snapshot of board before movement for Undo
    dragStartBoardSnapshotRef.current = JSON.parse(JSON.stringify(boardData));

    let currentSelected = selectedNoteIds;
    if (!selectedNoteIds.includes(noteId)) {
      currentSelected = [noteId];
      setSelectedNoteIds([noteId]);
    }

    const initialPositions: Record<string, { x: number; y: number }> = {};
    boardData.notes.forEach((n) => {
      if (currentSelected.includes(n.id)) {
        initialPositions[n.id] = { x: n.x, y: n.y };
      }
    });

    const startBoard = clientToBoardCoords(clientX, clientY);
    setDragStartBoardPos(startBoard);
    setDragSelectedInitialPositions(initialPositions);
    setDraggingNoteId(noteId);

    // Bring selected notes to front
    const maxZ = Math.max(...boardData.notes.map((n) => n.z_index), 1);
    setBoardData((prev) => ({
      ...prev,
      notes: prev.notes.map((n) =>
        currentSelected.includes(n.id) ? { ...n, z_index: maxZ + 1 } : n
      ),
    }));
  };

  // Initiate Note Resize (Requirement 4: stretch sideways & up/down)
  const handleStartResizeNote = (
    noteId: string,
    direction: "horizontal" | "vertical" | "both",
    clientX: number,
    clientY: number,
    initialWidth: number,
    initialHeight: number
  ) => {
    pushUndoSnapshot(boardData);
    setResizingNote({
      noteId,
      direction,
      startX: clientX,
      startY: clientY,
      initialWidth,
      initialHeight,
    });
  };

  // Pushpin Press: Start stretching a string, or tie string if in click-to-connect mode!
  const handlePinMouseDown = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Check if an active string source exists (either from dragging or click-to-connect)
    const activeSource = connectingSourceNoteId || pinDragSourceId;
    if (activeSource) {
      if (activeSource !== noteId) {
        // Complete the connection immediately!
        createStringConnection(activeSource, noteId);
      }
      setConnectingSourceNoteId(null);
      setPinDragSourceId(null);
      setPinDragStartPos(null);
      setHoveredTargetPinNoteId(null);
      return;
    }

    const note = boardData.notes.find((n) => n.id === noteId);
    if (!note) return;
    const pinPos = getNotePinPosition(note);
    const coords = clientToBoardCoords(e.clientX, e.clientY);
    setPinDragSourceId(noteId);
    setPinDragStartPos(pinPos);
    setMouseBoardPos(coords);
  };

  // Pushpin MouseUp: Release to connect or click to activate connecting mode
  const handlePinMouseUp = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const activeSource = connectingSourceNoteId || pinDragSourceId;
    if (activeSource && activeSource !== noteId) {
      createStringConnection(activeSource, noteId);
      setConnectingSourceNoteId(null);
      setPinDragSourceId(null);
      setPinDragStartPos(null);
      setHoveredTargetPinNoteId(null);
      return;
    }

    // Released on the SAME note as the drag start without dragging:
    // This was a click! Transition to click-to-connect mode so user can click a 2nd pin!
    if (pinDragSourceId === noteId) {
      setConnectingSourceNoteId(noteId);
      setPinDragSourceId(null);
      setPinDragStartPos(null);
      setHoveredTargetPinNoteId(null);
    }
  };

  // Pushpin Hover during string stretch
  const handlePinMouseEnter = (noteId: string) => {
    const activeSource = pinDragSourceId || connectingSourceNoteId;
    if (activeSource && activeSource !== noteId) {
      setHoveredTargetPinNoteId(noteId);
    }
  };

  const handlePinMouseLeave = (noteId: string) => {
    if (hoveredTargetPinNoteId === noteId) {
      setHoveredTargetPinNoteId(null);
    }
  };

  // Pushpin Click fallback
  const handlePinClick = (targetNoteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const activeSource = connectingSourceNoteId || pinDragSourceId;
    if (activeSource) {
      if (activeSource !== targetNoteId) {
        createStringConnection(activeSource, targetNoteId);
      }
      setConnectingSourceNoteId(null);
      setPinDragSourceId(null);
      setPinDragStartPos(null);
      setHoveredTargetPinNoteId(null);
    }
  };

  // Canvas Mouse Down: Middle click / Ctrl+Click pan, or background marquee select
  const handleBoardMouseDown = (e: React.MouseEvent) => {
    // 1. Middle Click (1) OR (Ctrl/Meta + Left Click): Panning canvas anywhere!
    if (e.button === 1 || (e.button === 0 && (e.ctrlKey || e.metaKey))) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      });
      return;
    }

    // 2. Left click on empty board
    if (e.button === 0) {
      // If clicking on empty board while in click-to-connect mode, cancel it
      if (connectingSourceNoteId) {
        setConnectingSourceNoteId(null);
        return;
      }

      // Start Marquee Box Multi-Selection
      const boardPos = clientToBoardCoords(e.clientX, e.clientY);
      setIsMarqueeSelecting(true);
      setMarqueeStart(boardPos);
      setMarqueeEnd(boardPos);
      if (!e.shiftKey) {
        setSelectedNoteIds([]);
      }
      setSelectedConnectionId(null);
    }
  };

  // Canvas Mouse Move: Updates dragging notes, string stretching, marquee selection, or canvas panning
  const handleBoardMouseMove = (e: React.MouseEvent) => {
    const boardPos = clientToBoardCoords(e.clientX, e.clientY);
    setMouseBoardPos(boardPos);

    // 0. Resizing Note (Requirement 4: stretch sideways & up/down)
    if (resizingNote) {
      const deltaX = Math.round((e.clientX - resizingNote.startX) / zoom);
      const deltaY = Math.round((e.clientY - resizingNote.startY) / zoom);

      setBoardData((prev) => ({
        ...prev,
        notes: prev.notes.map((n) => {
          if (n.id !== resizingNote.noteId) return n;
          const newWidth =
            resizingNote.direction === "vertical"
              ? n.width
              : Math.max(180, Math.min(800, resizingNote.initialWidth + deltaX));
          const newHeight =
            resizingNote.direction === "horizontal"
              ? (n.height || 220)
              : Math.max(120, Math.min(1000, resizingNote.initialHeight + deltaY));
          return {
            ...n,
            width: newWidth,
            height: newHeight,
          };
        }),
      }));
      return;
    }

    // 1. Panning the Board Canvas
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    // 2. Dragging Selected Notes
    if (draggingNoteId && dragStartBoardPos && dragSelectedInitialPositions) {
      const deltaX = Math.round(boardPos.x - dragStartBoardPos.x);
      const deltaY = Math.round(boardPos.y - dragStartBoardPos.y);
      setBoardData((prev) => ({
        ...prev,
        notes: prev.notes.map((n) => {
          const initial = dragSelectedInitialPositions[n.id];
          if (initial) {
            return {
              ...n,
              x: initial.x + deltaX,
              y: initial.y + deltaY,
            };
          }
          return n;
        }),
      }));
      return;
    }

    // 3. Marquee Box Multi-Selection
    if (isMarqueeSelecting && marqueeStart) {
      setMarqueeEnd(boardPos);
      const minX = Math.min(marqueeStart.x, boardPos.x);
      const maxX = Math.max(marqueeStart.x, boardPos.x);
      const minY = Math.min(marqueeStart.y, boardPos.y);
      const maxY = Math.max(marqueeStart.y, boardPos.y);

      const intersectingIds = boardData.notes
        .filter((note) => {
          const w = note.width || 280;
          const h = note.type === "image" || note.type === "video" ? 280 : 200;
          return (
            note.x < maxX &&
            note.x + w > minX &&
            note.y < maxY &&
            note.y + h > minY
          );
        })
        .map((n) => n.id);

      setSelectedNoteIds(intersectingIds);
      return;
    }
  };

  // Canvas Mouse Up: Completes note drag, marquee selection, or string drop!
  const handleBoardMouseUp = (e: React.MouseEvent) => {
    // 0. Finish Resizing Note
    if (resizingNote) {
      setResizingNote(null);
      saveIdeaBoard(projectId, boardData, currentBoardId);
      return;
    }

    // 1. Finish Panning
    if (isPanning) {
      setIsPanning(false);
    }

    // 2. Finish Note Dragging
    if (draggingNoteId) {
      if (dragStartBoardSnapshotRef.current) {
        const initialNotes = dragStartBoardSnapshotRef.current.notes;
        const hasMoved = boardData.notes.some((n) => {
          const initial = initialNotes.find((inNote) => inNote.id === n.id);
          return initial && (initial.x !== n.x || initial.y !== n.y);
        });
        if (hasMoved) {
          pushUndoSnapshot(dragStartBoardSnapshotRef.current);
        }
        dragStartBoardSnapshotRef.current = null;
      }
      setDraggingNoteId(null);
      setDragSelectedInitialPositions(null);
      setDragStartBoardPos(null);
      saveIdeaBoard(projectId, boardData, currentBoardId);
      return;
    }

    // 3. Finish Marquee Selection
    if (isMarqueeSelecting) {
      setIsMarqueeSelecting(false);
      if (marqueeStart && marqueeEnd) {
        const dist = Math.hypot(marqueeEnd.x - marqueeStart.x, marqueeEnd.y - marqueeStart.y);
        if (dist < 6 && !e.shiftKey) {
          setSelectedNoteIds([]);
        }
      }
      setMarqueeStart(null);
      setMarqueeEnd(null);
    }

    // 4. String Drag & Drop Logic (Hold pin and stretch string)
    if (pinDragSourceId) {
      const sourceNote = boardData.notes.find((n) => n.id === pinDragSourceId);
      const targetNote = hoveredTargetPinNoteId
        ? boardData.notes.find((n) => n.id === hoveredTargetPinNoteId)
        : null;

      // Scenario A: Dropped string directly onto another note's pin
      if (targetNote && sourceNote && sourceNote.id !== targetNote.id) {
        createStringConnection(sourceNote.id, targetNote.id);
        setConnectingSourceNoteId(null);
      }
      // Scenario B: Dropped the string onto the empty board!
      // Trigger creating a new note at that exact board location and automatically connect it!
      else if (pinDragStartPos) {
        const dx = mouseBoardPos.x - pinDragStartPos.x;
        const dy = mouseBoardPos.y - pinDragStartPos.y;
        const dragDist = Math.sqrt(dx * dx + dy * dy);

        if (dragDist > 45) {
          // User pulled string to empty space -> spawn a connected idea note!
          setPendingConnectSourceId(pinDragSourceId);
          setClickCoords({
            x: Math.max(30, mouseBoardPos.x - 160),
            y: Math.max(30, mouseBoardPos.y - 20),
          });
          setEditingNote(null);
          setIsNoteModalOpen(true);
          setConnectingSourceNoteId(null);
        } else {
          // Very short click/release: activate click-to-connect mode
          if (!connectingSourceNoteId) {
            setConnectingSourceNoteId(pinDragSourceId);
          }
        }
      }

      setPinDragSourceId(null);
      setPinDragStartPos(null);
      setHoveredTargetPinNoteId(null);
    }
  };

  // Double click on empty board creates new note at cursor position
  const handleDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(".group") || target.closest("button") || target.closest("form")) {
      return;
    }
    const coords = clientToBoardCoords(e.clientX, e.clientY);
    setClickCoords(coords);
    setEditingNote(null);
    setPendingConnectSourceId(null);
    setIsNoteModalOpen(true);
  };

  // Bring note to front & select
  const handleSelectNote = (id: string) => {
    if (!selectedNoteIds.includes(id)) {
      setSelectedNoteIds([id]);
    }
    setSelectedConnectionId(null);
    const maxZ = Math.max(...boardData.notes.map((n) => n.z_index), 1);
    updateBoard(
      {
        ...boardData,
        notes: boardData.notes.map((n) =>
          n.id === id ? { ...n, z_index: maxZ + 1 } : n
        ),
      },
      false
    );
  };

  // Save or Update Note (handles automatic connection if spawned from a stretched string)
  const handleSaveNote = (noteData: Partial<IdeaNote>) => {
    if (editingNote) {
      updateBoard({
        ...boardData,
        notes: boardData.notes.map((n) =>
          n.id === editingNote.id
            ? ({
                ...n,
                ...noteData,
                updated_at: new Date().toISOString(),
              } as IdeaNote)
            : n
        ),
      });
      setEditingNote(null);
    } else {
      const newNoteId = `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const newNote: IdeaNote = {
        id: newNoteId,
        project_id: projectId && projectId !== "all" ? projectId : null,
        type: noteData.type || "text",
        title: noteData.title || "New Idea",
        content: noteData.content || "",
        file_url: noteData.file_url || null,
        file_name: noteData.file_name || null,
        task_id: noteData.task_id || null,
        color: noteData.color || "yellow",
        pin_color: noteData.pin_color || "red",
        x: noteData.x ?? clickCoords.x,
        y: noteData.y ?? clickCoords.y,
        width: 320,
        rotation: +(Math.random() * 4 - 2).toFixed(1),
        z_index: Math.max(...boardData.notes.map((n) => n.z_index), 1) + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // If this note was spawned by dropping a string on the board, connect it to the source note!
      let nextConnections = [...boardData.connections];
      if (pendingConnectSourceId) {
        const fromNote = boardData.notes.find((n) => n.id === pendingConnectSourceId);
        const autoString: IdeaStringConnection = {
          id: `string-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          project_id: projectId || null,
          from_note_id: pendingConnectSourceId,
          to_note_id: newNoteId,
          color: fromNote?.pin_color === "gold" ? "twine" : "red",
          tension: "normal",
          created_at: new Date().toISOString(),
        };
        nextConnections.push(autoString);
        setPendingConnectSourceId(null);
      }

      updateBoard({
        ...boardData,
        notes: [...boardData.notes, newNote],
        connections: nextConnections,
      });
    }
  };

  // Delete Note and its connected strings
  const handleDeleteNote = (id: string) => {
    updateBoard({
      ...boardData,
      notes: boardData.notes.filter((n) => n.id !== id),
      connections: boardData.connections.filter(
        (c) => c.from_note_id !== id && c.to_note_id !== id
      ),
    });
  };

  // Duplicate Note
  const handleDuplicateNote = (note: IdeaNote) => {
    const dup: IdeaNote = {
      ...note,
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: `${note.title} (Copy)`,
      x: note.x + 30,
      y: note.y + 30,
      rotation: +(Math.random() * 4 - 2).toFixed(1),
      z_index: Math.max(...boardData.notes.map((n) => n.z_index), 1) + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    updateBoard({
      ...boardData,
      notes: [...boardData.notes, dup],
    });
  };

  // Update Connection
  const handleUpdateConnection = (
    connectionId: string,
    updates: Partial<IdeaStringConnection>
  ) => {
    updateBoard({
      ...boardData,
      connections: boardData.connections.map((c) =>
        c.id === connectionId ? { ...c, ...updates } : c
      ),
    });
  };

  // Reset current project's board
  const handleResetBoard = () => {
    if (confirm("Reset this project's Idea Board to default layout?")) {
      pushUndoSnapshot(boardData);
      const reset = resetIdeaBoard(projectId);
      setBoardData(reset);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };

  // Drag and Drop files / images / links onto corkboard to pin automatically WITHOUT any modals or dialogs!
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const coords = clientToBoardCoords(e.clientX, e.clientY);
    const files = Array.from(e.dataTransfer.files);

    // 1. Dropped Local Files (Images / Videos / Documents)
    if (files.length > 0) {
      const newNotes: IdeaNote[] = [];
      let curMaxZ = Math.max(...boardData.notes.map((n) => n.z_index), 1);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isImg = file.type.startsWith("image/");
        const isVid = file.type.startsWith("video/");
        const fileUrl = await uploadIdeaAttachment(file);

        const note: IdeaNote = {
          id: `note-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          project_id: projectId && projectId !== "all" ? projectId : null,
          type: isImg ? "image" : isVid ? "video" : "file",
          title: file.name.replace(/\.[^/.]+$/, ""),
          content: "",
          file_url: fileUrl,
          file_name: file.name,
          color: isImg ? "white" : "kraft",
          pin_color: isImg ? "gold" : "red",
          x: Math.round(coords.x - 140 + i * 20),
          y: Math.round(coords.y - 20 + i * 20),
          width: 300,
          rotation: +(Math.random() * 4 - 2).toFixed(1),
          z_index: ++curMaxZ,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        newNotes.push(note);
      }

      const updated = {
        ...boardData,
        notes: [...boardData.notes, ...newNotes],
      };
      updateBoard(updated);
      return;
    }

    // 2. Dropped Web Images (extracted from HTML if dragged from web page)
    const html = e.dataTransfer.getData("text/html");
    let imgFromHtml = "";
    if (html) {
      const match = html.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
      if (match) imgFromHtml = match[1];
    }

    if (imgFromHtml) {
      const curMaxZ = Math.max(...boardData.notes.map((n) => n.z_index), 1);
      const newNote: IdeaNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        project_id: projectId && projectId !== "all" ? projectId : null,
        type: "image",
        title: "Web Image",
        content: "",
        file_url: imgFromHtml,
        color: "white",
        pin_color: "gold",
        x: Math.round(coords.x - 140),
        y: Math.round(coords.y - 20),
        width: 300,
        rotation: +(Math.random() * 4 - 2).toFixed(1),
        z_index: curMaxZ + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const updated = {
        ...boardData,
        notes: [...boardData.notes, newNote],
      };
      updateBoard(updated);
      return;
    }

    // 3. Dropped Link or Text Resource
    const droppedText =
      e.dataTransfer.getData("text/uri-list") ||
      e.dataTransfer.getData("text/plain") ||
      e.dataTransfer.getData("text");

    if (droppedText && droppedText.trim()) {
      const text = droppedText.trim();
      const isUrl = text.startsWith("http://") || text.startsWith("https://");
      const isImg = isUrl && /\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(text);
      const isYt =
        isUrl &&
        (text.includes("youtube.com") || text.includes("youtu.be") || text.includes("vimeo.com"));

      const curMaxZ = Math.max(...boardData.notes.map((n) => n.z_index), 1);
      const newNote: IdeaNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        project_id: projectId && projectId !== "all" ? projectId : null,
        type: isImg ? "image" : isYt ? "video" : isUrl ? "link" : "text",
        title: isUrl
          ? isYt
            ? "Video Link"
            : isImg
            ? "Web Image"
            : "Pinned Link"
          : text.slice(0, 32),
        content: isUrl ? `Resource: ${text}` : text,
        file_url: isUrl ? text : undefined,
        color: isImg ? "white" : isUrl ? "sky" : "yellow",
        pin_color: isUrl ? "blue" : "red",
        x: Math.round(coords.x - 140),
        y: Math.round(coords.y - 20),
        width: 300,
        rotation: +(Math.random() * 4 - 2).toFixed(1),
        z_index: curMaxZ + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const updated = {
        ...boardData,
        notes: [...boardData.notes, newNote],
      };
      updateBoard(updated);
    }
  };

  const currentTheme = THEME_STYLES[boardData.theme] || THEME_STYLES.cork;

  // Active string source (either hold-dragging or click-to-connect)
  const activeStringSourceNoteId = pinDragSourceId || connectingSourceNoteId;
  const activeStringSourceNote = boardData.notes.find((n) => n.id === activeStringSourceNoteId);

  // Search filter
  const isSearchActive = Boolean(searchQuery && searchQuery.trim());
  const queryLower = searchQuery.toLowerCase().trim();

  return (
    <div
      className="relative w-full flex-1 min-h-0 flex flex-col overflow-hidden select-none"
      style={{ height: "100%", minHeight: "calc(100vh - 116px)" }}
    >
      {/* Active Connecting Indicator Banner */}
      {activeStringSourceNote && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600/95 backdrop-blur text-white px-4 py-2 rounded-full shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in select-none pointer-events-auto border border-white/20">
          <span className="h-2 w-2 rounded-full bg-white animate-ping" />
          <span>
            {pinDragSourceId
              ? "Release on another pin to tie string, or on empty board to spawn a connected idea"
              : "Click another pin to tie string • Press Esc to cancel"}
          </span>
          <button
            type="button"
            onClick={() => {
              setConnectingSourceNoteId(null);
              setPinDragSourceId(null);
              setPinDragStartPos(null);
              setHoveredTargetPinNoteId(null);
            }}
            className="ml-1 hover:bg-white/20 p-1 rounded-full cursor-pointer transition-colors"
            title="Cancel connection (Esc)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Corkboard Interactive Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleBoardMouseDown}
        onMouseMove={handleBoardMouseMove}
        onMouseUp={handleBoardMouseUp}
        onDoubleClick={handleDoubleClick}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={handleDrop}
        className={`relative w-full flex-1 min-h-0 overflow-hidden ${
          isPanning ? "cursor-grabbing" : "cursor-default"
        } ${currentTheme.bgClass}`}
        style={{
          height: "100%",
          minHeight: "calc(100vh - 116px)",
          backgroundImage:
            boardData.theme === "cork" || boardData.theme === "dark-cork"
              ? `radial-gradient(${currentTheme.dotColor} 1.5px, transparent 1.5px), radial-gradient(${currentTheme.corkColor2} 1.2px, transparent 1.2px)`
              : boardData.theme === "blueprint"
              ? `linear-gradient(to right, rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.07) 1px, transparent 1px)`
              : `radial-gradient(rgba(255,255,255,0.08) 1.5px, transparent 1.5px)`,
          backgroundSize:
            boardData.theme === "blueprint" ? "40px 40px" : "28px 28px, 14px 14px",
          backgroundPosition: "0 0, 14px 14px",
        }}
      >
        {/* Subtle Warm Vignette Frame Reflection */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_60px_rgba(120,70,20,0.12)] z-20" />

        {/* Floating Board Hierarchy Breadcrumb Overlay (Requirement 4 & 8: Light & Dark theme) */}
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute top-3 left-4 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 text-zinc-900 border border-zinc-200 shadow-md backdrop-blur-md dark:bg-black/85 dark:text-white dark:border-white/20 pointer-events-auto text-xs font-medium"
        >
          {currentBoardId && (
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                handleNavigateToBoard(null);
              }}
              className="flex items-center gap-1 px-2.5 py-1 mr-1 rounded-md bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              title="Return to Root / Main Board"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Root</span>
            </button>
          )}

          {boardPath.map((item, idx) => {
            const isLast = idx === boardPath.length - 1;
            const IconComponent =
              (item.icon && SUBBOARD_ICON_MAP[item.icon]) || Folder;

            return (
              <React.Fragment key={item.id ?? "root"}>
                {idx > 0 && <span className="text-zinc-400 dark:text-zinc-500 select-none">/</span>}
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigateToBoard(item.id);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    isLast
                      ? "font-bold text-amber-800 bg-amber-500/20 border border-amber-500/40 shadow-xs dark:text-amber-300 dark:bg-amber-500/25 dark:border-amber-400/40"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/15"
                  }`}
                  title={isLast ? `Current: ${item.name}` : `Navigate to ${item.name}`}
                >
                  <IconComponent className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="truncate max-w-[130px] sm:max-w-[200px]">{item.name}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Empty State Card if no notes exist (Requirement 2) */}
        {boardData.notes.length === 0 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-3 p-6 rounded-2xl bg-[#fff9db] border-2 border-[#caa065] shadow-2xl text-center max-w-sm pointer-events-auto">
            <span className="text-3xl">📌</span>
            <h4 className="font-extrabold text-base text-zinc-900">Your board is empty</h4>
            <p className="text-xs text-zinc-600">
              Pin your thoughts, link tasks, create nested boards, or drag images &amp; links directly onto the corkboard.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
              {currentBoardId && (
                <button
                  type="button"
                  onClick={() => handleNavigateToBoard(null)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>← Back to Root</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setEditingNote(null);
                  setPendingConnectSourceId(null);
                  setIsNoteModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Pin Note</span>
              </button>
              <button
                type="button"
                onClick={() => setIsLinkTaskModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span>+ Link Task</span>
              </button>
              <button
                type="button"
                onClick={() => setIsNewBoardModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>+ New Board</span>
              </button>
            </div>
          </div>
        )}

        {/* Transformed Canvas Container (Pan & Zoom) */}
        <div
          className="absolute inset-0 origin-top-left pointer-events-none"
          style={{
            transform: `translate(${isNaN(pan.x) ? 0 : pan.x}px, ${isNaN(pan.y) ? 0 : pan.y}px) scale(${isNaN(zoom) || zoom <= 0 ? 1 : zoom})`,
          }}
        >
          {/* SVG Overlay: Renders all connected yarn strings ON TOP of notes (zIndex 30) */}
          <svg
            className="absolute inset-0 w-[5000px] h-[5000px] overflow-visible pointer-events-none"
            style={{ zIndex: 30 }}
          >
            <defs>
              <mask
                id="hovered-note-yarn-mask"
                maskUnits="userSpaceOnUse"
                maskContentUnits="userSpaceOnUse"
              >
                {/* Solid white canvas background = 100% visible strings outside notes */}
                <rect x="-10000" y="-10000" width="30000" height="30000" fill="white" />
                {/* Over notes: strings crossing any note are semi-transparent (~35% opacity), and become extra faint on hover */}
                {boardData.notes.map((note) => {
                  const isHovered = hoveredCardInfo?.id === note.id;
                  const isMaskTarget = activeMaskCard?.id === note.id;
                  const width =
                    (isMaskTarget ? activeMaskCard?.width : undefined) ||
                    (note.type === "board" ? 220 : note.width || 300);
                  const height =
                    (isMaskTarget ? activeMaskCard?.height : undefined) ||
                    (note.type === "board"
                      ? 220
                      : note.height ||
                        (note.type === "image" || note.type === "video" ? 300 : 250));
                  const rot = note.rotation || 0;

                  return (
                    <g
                      key={`mask-note-${note.id}`}
                      transform={`translate(${note.x}, ${note.y}) rotate(${rot} ${width / 2} ${height / 2})`}
                    >
                      <rect
                        x="0"
                        y="0"
                        width={width}
                        height={height}
                        rx="12"
                        ry="12"
                        fill={isHovered ? "#222222" : "#595959"}
                        style={{ transition: "fill 180ms ease" }}
                      />
                    </g>
                  );
                })}
              </mask>
            </defs>

            {/* Render all established string connections */}
            {boardData.connections.map((conn) => {
              const sourceNote = boardData.notes.find((n) => n.id === conn.from_note_id);
              const targetNote = boardData.notes.find((n) => n.id === conn.to_note_id);
              if (!sourceNote || !targetNote) return null;

              const p1 = getNotePinPosition(sourceNote);
              const p2 = getNotePinPosition(targetNote);

              return (
                <YarnString
                  key={conn.id}
                  connection={conn}
                  startPoint={p1}
                  endPoint={p2}
                  isSelected={selectedConnectionId === conn.id}
                  isNoteHovered={hoveredCardInfo !== null}
                  onSelect={() => setSelectedConnectionId(conn.id)}
                  onDelete={() => handleDeleteConnection(conn.id)}
                  onUpdate={(updates) => handleUpdateConnection(conn.id, updates)}
                />
              );
            })}

            {/* Live Yarn String being stretched / dragged */}
            {activeStringSourceNote && (
              <LiveYarnStringPreview
                startPoint={getNotePinPosition(activeStringSourceNote)}
                currentPoint={mouseBoardPos}
                color={activeStringSourceNote.pin_color === "gold" ? "twine" : "red"}
              />
            )}
          </svg>

          {/* Marquee Box Multi-Selection Visual Indicator */}
          {isMarqueeSelecting && marqueeStart && marqueeEnd && (
            <div
              className="absolute border-2 border-dashed border-amber-700 bg-amber-500/20 rounded pointer-events-none z-40"
              style={{
                left: Math.min(marqueeStart.x, marqueeEnd.x),
                top: Math.min(marqueeStart.y, marqueeEnd.y),
                width: Math.abs(marqueeEnd.x - marqueeStart.x),
                height: Math.abs(marqueeEnd.y - marqueeStart.y),
              }}
            />
          )}

          {/* HTML Overlay: Renders all pinned notes (zIndex 20, or 40 while actively dragging a note) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: draggingNoteId ? 40 : 20 }}
          >
            {boardData.notes.map((note) => {
              const matchesSearch =
                !isSearchActive ||
                note.title.toLowerCase().includes(queryLower) ||
                note.content.toLowerCase().includes(queryLower);

              const isSource = activeStringSourceNoteId === note.id;
              const isTarget = hoveredTargetPinNoteId === note.id;

              return (
                <div
                  key={note.id}
                  className={`pointer-events-auto transition-opacity duration-200 ${
                    isSearchActive && !matchesSearch ? "opacity-25" : "opacity-100"
                  }`}
                >
                  <IdeaNoteCard
                    note={note}
                    isDragging={draggingNoteId === note.id}
                    isConnectingSource={isSource}
                    isConnectTarget={isTarget}
                    isSelected={selectedNoteIds.includes(note.id)}
                    isTargetHighlight={targetHighlightNoteId === note.id}
                    onSelect={() => {
                      if (!selectedNoteIds.includes(note.id)) {
                        setSelectedNoteIds([note.id]);
                      }
                    }}
                    onHoverCard={(info) => {
                      if (info) {
                        handleCardMouseEnter(info);
                      } else {
                        handleCardMouseLeave(note.id);
                      }
                    }}
                    onStartDrag={handleStartDragNote}
                    onPinMouseDown={handlePinMouseDown}
                    onPinMouseUp={handlePinMouseUp}
                    onPinMouseEnter={handlePinMouseEnter}
                    onPinMouseLeave={handlePinMouseLeave}
                    onPinClick={handlePinClick}
                    onEdit={(n) => {
                      setEditingNote(n);
                      setIsNoteModalOpen(true);
                    }}
                    onDelete={handleDeleteNote}
                    onDuplicate={handleDuplicateNote}
                    onToggleScratch={(noteId) => handleToggleScratchSelectedNotes([noteId])}
                    onOpenTask={onOpenTask}
                    onOpenSubBoard={(subBoardId) => handleOpenSubBoard(subBoardId)}
                    onDeleteBoard={(subBoardId, boardName) => handleDeleteBoardRequest(subBoardId, boardName)}
                    onStartResize={handleStartResizeNote}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Minimal Floating Zoom & Board Controls (Requirement 8: Light & Dark theme) */}
        <div className="absolute bottom-4 right-4 z-40 flex items-center gap-1.5 p-1 rounded-xl bg-white/90 text-zinc-800 border border-zinc-200/90 shadow-xl backdrop-blur-md dark:bg-black/80 dark:text-white dark:border-white/20 pointer-events-auto">
          {/* Fit & Center View on Notes (Shift + F) */}
          <button
            type="button"
            onClick={handleFitToContent}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-800 hover:text-amber-950 dark:bg-amber-500/25 dark:hover:bg-amber-500/40 dark:border-amber-400/40 dark:text-amber-300 dark:hover:text-amber-100 text-xs font-semibold cursor-pointer transition-all active:scale-95"
            title="Focus & Fit to Notes / Tasks (Shift + F)"
          >
            <Focus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Fit (Shift+F)</span>
          </button>
          <div className="h-4 w-px bg-zinc-300 dark:bg-white/20 mx-0.5" />
          <button
            type="button"
            onClick={() => setZoom((prev) => Math.max(0.3, +(prev - 0.15).toFixed(2)))}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 dark:hover:bg-white/20 dark:text-zinc-300 dark:hover:text-white cursor-pointer transition-colors"
            title="Zoom Out (or scroll wheel)"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="px-2 py-0.5 rounded-lg hover:bg-zinc-100 text-zinc-800 hover:text-zinc-950 dark:hover:bg-white/20 dark:text-white text-xs font-mono font-bold cursor-pointer transition-colors"
            title="Reset Zoom & Pan (100%)"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoom((prev) => Math.min(2.5, +(prev + 0.15).toFixed(2)))}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 dark:hover:bg-white/20 dark:text-zinc-300 dark:hover:text-white cursor-pointer transition-colors"
            title="Zoom In (or scroll wheel)"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <div className="h-4 w-px bg-zinc-300 dark:bg-white/20 mx-0.5" />
          <button
            type="button"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              undoStack.length === 0
                ? "opacity-30 cursor-not-allowed text-zinc-400 dark:text-zinc-500"
                : "hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 dark:hover:bg-white/20 dark:text-zinc-300 dark:hover:text-white"
            }`}
            title="Undo Board Action (Ctrl+Z)"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              redoStack.length === 0
                ? "opacity-30 cursor-not-allowed text-zinc-400 dark:text-zinc-500"
                : "hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 dark:hover:bg-white/20 dark:text-zinc-300 dark:hover:text-white"
            }`}
            title="Redo Board Action (Ctrl+Y or Ctrl+Shift+Z)"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
          <div className="h-4 w-px bg-zinc-300 dark:bg-white/20 mx-0.5" />
          <button
            type="button"
            onClick={handleResetBoard}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 dark:hover:bg-white/20 dark:text-zinc-300 dark:hover:text-white cursor-pointer transition-colors"
            title="Reset this project's board to initial layout"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 dark:hover:bg-white/20 dark:text-zinc-300 dark:hover:text-white cursor-pointer transition-colors"
            title="Gestures & Shortcuts Guide"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Floating Help Modal / Tooltip */}
        {showHelp && (
          <div className="absolute bottom-16 right-4 z-40 w-84 p-4 rounded-xl bg-white/95 text-zinc-900 border border-zinc-200 shadow-2xl backdrop-blur-md dark:bg-black/95 dark:text-white dark:border-amber-400/40 text-xs space-y-2.5 animate-in fade-in slide-in-from-bottom-2 pointer-events-auto">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-1.5">
              <span className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 text-sm">
                <span>📌</span>
                <span>Idea Board Controls &amp; Shortcuts</span>
              </span>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <ul className="space-y-2 text-zinc-600 dark:text-zinc-300 text-[11px] leading-relaxed">
              <li>
                <strong className="text-amber-800 dark:text-amber-200">↩️ Undo &amp; Redo:</strong> Press <kbd className="bg-zinc-100 border dark:bg-white/10 px-1 py-0.5 rounded">Ctrl + Z</kbd> to undo board moves, creates, deletes, and connections. Press <kbd className="bg-zinc-100 border dark:bg-white/10 px-1 py-0.5 rounded">Ctrl + Y</kbd> or <kbd className="bg-zinc-100 border dark:bg-white/10 px-1 py-0.5 rounded">Ctrl + Shift + Z</kbd> to redo. When typing inside text fields or note descriptions, your text undo works independently without affecting the board!
              </li>
              <li>
                <strong className="text-amber-800 dark:text-amber-200">🖱️ Pan &amp; Zoom:</strong> Drag with <kbd className="bg-zinc-100 border dark:bg-white/10 px-1 py-0.5 rounded">Middle Mouse</kbd> or <kbd className="bg-zinc-100 border dark:bg-white/10 px-1 py-0.5 rounded">Ctrl + Left Click</kbd> to pan. Scroll the mouse wheel to zoom directly into wherever your cursor is.
              </li>
              <li>
                <strong className="text-amber-800 dark:text-amber-200">📦 Multi-Select:</strong> Drag a box on the corkboard background to select multiple notes. Drag any selected note to move the whole group together! Press <kbd className="bg-zinc-100 border dark:bg-white/10 px-1 py-0.5 rounded">Delete</kbd> to remove selected notes.
              </li>
              <li>
                <strong className="text-amber-800 dark:text-amber-200">🧶 Strings &amp; Ideas:</strong> Click and hold down any note&apos;s pushpin, then drag the string. Drop on another pin to tie them, or drop on empty corkboard to spawn a connected note!
              </li>
              <li>
                <strong className="text-amber-800 dark:text-amber-200">🖼️ Instant Drag &amp; Drop:</strong> Drag images, videos, or web links directly onto the board or press <kbd className="bg-zinc-100 border dark:bg-white/10 px-1 py-0.5 rounded">Ctrl + V</kbd> to paste immediately without opening any modals.
              </li>
              <li>
                <strong className="text-amber-800 dark:text-amber-200">✂️ Scratch / Cross-out (-):</strong> Select any note(s) and press <kbd className="bg-zinc-100 border dark:bg-white/10 px-1 py-0.5 rounded">-</kbd> to scratch them out (desaturates paper color and crosses out text to mark ideas as failed, completed, or irrelevant). Press <kbd className="bg-zinc-100 border dark:bg-white/10 px-1 py-0.5 rounded">-</kbd> again to unscratch.
              </li>
              <li>
                <strong className="text-amber-800 dark:text-amber-200">📝 Edit Notes:</strong> Double-click any note card or click the pencil icon to edit formatting, content, or paper colors with full rich-text Markdown and dedicated Undo/Redo.
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Note Creation / Editing Modal */}
      <IdeaNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => {
          setIsNoteModalOpen(false);
          setEditingNote(null);
          setPendingConnectSourceId(null);
        }}
        onSave={handleSaveNote}
        editingNote={editingNote}
        availableTasks={availableTasks}
        initialCoords={clickCoords}
      />

      {/* Task Picker & Linking Modal */}
      <LinkTaskModal
        isOpen={isLinkTaskModalOpen}
        onClose={() => setIsLinkTaskModalOpen(false)}
        availableTasks={availableTasks}
        linkedTaskIds={linkedTaskIds}
        onSelectTask={handleDirectLinkTask}
        onJumpToNote={handleJumpToTaskNote}
        currentProjectId={projectId}
      />

      {/* New Nested Sub-Board Modal (Requirement 4) */}
      <NewBoardModal
        isOpen={isNewBoardModalOpen}
        onClose={() => setIsNewBoardModalOpen(false)}
        onSubmit={handleCreateSubboard}
        parentBoardName={currentBoardName}
      />

      {/* Delete Sub-board Confirmation Dialog (Requirement 4: Confirm popup) */}
      <ConfirmDialog
        isOpen={Boolean(boardToDelete)}
        onClose={() => setBoardToDelete(null)}
        onConfirm={handleConfirmDeleteBoard}
        title="Delete Idea Board?"
        description={`Are you sure you want to delete "${boardToDelete?.name}"? All nested notes and string connections within this board will be removed permanently.`}
        confirmText="Delete Board"
        variant="destructive"
      />
    </div>
  );
}
