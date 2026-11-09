"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  IdeaBoardData,
  IdeaNote,
  IdeaStringConnection,
  BoardTheme,
  IdeaStringColor,
} from "@/types/idea-board.types";
import {
  loadIdeaBoard,
  saveIdeaBoard,
  resetIdeaBoard,
  generateInitialProjectBoard,
} from "@/lib/idea-board-storage";
import { IdeaNoteCard } from "./IdeaNoteCard";
import { YarnString, LiveYarnStringPreview, YARN_COLORS } from "./YarnString";
import { IdeaNoteModal } from "./IdeaNoteModal";
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
} from "lucide-react";

interface IdeaBoardViewProps {
  projectId?: string | null;
  projects?: Project[];
  availableTasks?: TaskWithDetails[];
  searchQuery?: string;
  onOpenTask?: (taskId: string) => void;
  pinNoteTrigger?: number;
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
}: IdeaBoardViewProps) {
  // Separate board per project
  const [boardData, setBoardData] = useState<IdeaBoardData>(() =>
    loadIdeaBoard(projectId)
  );

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

  // Help info overlay
  const [showHelp, setShowHelp] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Helper: Read a file to a base64 Data URL so it persists cleanly in storage
  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(URL.createObjectURL(file));
      reader.readAsDataURL(file);
    });
  };

  // Re-load board cleanly whenever projectId changes
  useEffect(() => {
    const loaded = loadIdeaBoard(projectId);
    setBoardData(loaded);
    setSelectedNoteIds([]);
    setSelectedConnectionId(null);
    setConnectingSourceNoteId(null);
    setPinDragSourceId(null);
    setPinDragStartPos(null);
    setHoveredTargetPinNoteId(null);
    setDraggingNoteId(null);
  }, [projectId]);

  // Persist board strictly for current project
  const updateBoard = useCallback(
    (newBoard: IdeaBoardData) => {
      setBoardData(newBoard);
      saveIdeaBoard(projectId, newBoard);
    },
    [projectId]
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

  // Keyboard Shortcuts: Shift + F to frame/focus, Escape to cancel string connection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
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
        return;
      }

      // Shift + F: Frame / focus on notes or tasks
      if (e.shiftKey && (e.key.toLowerCase() === "f" || e.code === "KeyF")) {
        e.preventDefault();
        handleFitToContent();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFitToContent, connectingSourceNoteId, pinDragSourceId, selectedNoteIds]);

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
        setDraggingNoteId(null);
        setDragSelectedInitialPositions(null);
        setDragStartBoardPos(null);
        saveIdeaBoard(projectId, boardData);
      }
      if (isMarqueeSelecting) {
        setIsMarqueeSelecting(false);
        setMarqueeStart(null);
        setMarqueeEnd(null);
      }
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, [isPanning, draggingNoteId, isMarqueeSelecting, projectId, boardData]);

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
          const dataUrl = await readFileAsDataUrl(file);
          const curMaxZ = Math.max(...boardData.notes.map((n) => n.z_index), 1);
          const newNote: IdeaNote = {
            id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            project_id: projectId && projectId !== "all" ? projectId : null,
            type: "image",
            title: "Pasted Image",
            content: "",
            file_url: dataUrl,
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
          setBoardData(updated);
          saveIdeaBoard(projectId, updated);
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
        setBoardData(updated);
        saveIdeaBoard(projectId, updated);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [mouseBoardPos, pan, zoom, projectId, boardData]);

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

  // Pushpin Press: Start stretching a string, or tie string if in click-to-connect mode!
  const handlePinMouseDown = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // If currently in click-to-connect mode:
    if (connectingSourceNoteId) {
      if (connectingSourceNoteId !== noteId) {
        // Complete the connection immediately!
        createStringConnection(connectingSourceNoteId, noteId);
      }
      // Stop connecting mode cleanly - do not stretch a second string!
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

    // If currently in click-to-connect mode and clicked a different pin
    if (connectingSourceNoteId && connectingSourceNoteId !== targetNoteId) {
      createStringConnection(connectingSourceNoteId, targetNoteId);
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
    // 1. Finish Panning
    if (isPanning) {
      setIsPanning(false);
    }

    // 2. Finish Note Dragging
    if (draggingNoteId) {
      setDraggingNoteId(null);
      setDragSelectedInitialPositions(null);
      setDragStartBoardPos(null);
      saveIdeaBoard(projectId, boardData);
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
    updateBoard({
      ...boardData,
      notes: boardData.notes.map((n) =>
        n.id === id ? { ...n, z_index: maxZ + 1 } : n
      ),
    });
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

  // Delete Connection (Cut string)
  const handleDeleteConnection = (connectionId: string) => {
    updateBoard({
      ...boardData,
      connections: boardData.connections.filter((c) => c.id !== connectionId),
    });
    setSelectedConnectionId(null);
  };

  // Reset current project's board
  const handleResetBoard = () => {
    if (confirm("Reset this project's Idea Board to default layout?")) {
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
        const dataUrl = await readFileAsDataUrl(file);

        const note: IdeaNote = {
          id: `note-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          project_id: projectId && projectId !== "all" ? projectId : null,
          type: isImg ? "image" : isVid ? "video" : "file",
          title: file.name.replace(/\.[^/.]+$/, ""),
          content: "",
          file_url: dataUrl,
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
      setBoardData(updated);
      saveIdeaBoard(projectId, updated);
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
      setBoardData(updated);
      saveIdeaBoard(projectId, updated);
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
      setBoardData(updated);
      saveIdeaBoard(projectId, updated);
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

        {/* Empty State Card if no notes exist */}
        {boardData.notes.length === 0 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-3 p-6 rounded-2xl bg-[#fff9db] border-2 border-[#caa065] shadow-2xl text-center max-w-sm pointer-events-auto">
            <span className="text-3xl">📌</span>
            <h4 className="font-extrabold text-base text-zinc-900">Your Idea Board is Empty</h4>
            <p className="text-xs text-zinc-600">
              Click <strong>+ Pin Note</strong> above, drag images/links onto the board, or load starter notes for this project.
            </p>
            <button
              type="button"
              onClick={handleResetBoard}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              Load Starter Project Notes
            </button>
          </div>
        )}

        {/* Transformed Canvas Container (Pan & Zoom) */}
        <div
          className="absolute inset-0 origin-top-left pointer-events-none"
          style={{
            transform: `translate(${isNaN(pan.x) ? 0 : pan.x}px, ${isNaN(pan.y) ? 0 : pan.y}px) scale(${isNaN(zoom) || zoom <= 0 ? 1 : zoom})`,
          }}
        >
          {/* SVG Overlay: Renders all connected yarn strings (pointer-events-none on canvas) */}
          <svg
            className="absolute inset-0 w-[5000px] h-[5000px] overflow-visible pointer-events-none"
            style={{ zIndex: 10 }}
          >
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

          {/* HTML Overlay: Renders all pinned notes (high z-index, notes interactive) */}
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
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
                    onSelect={() => {
                      if (!selectedNoteIds.includes(note.id)) {
                        setSelectedNoteIds([note.id]);
                      }
                    }}
                    onStartDrag={handleStartDragNote}
                    onPinMouseDown={handlePinMouseDown}
                    onPinMouseEnter={handlePinMouseEnter}
                    onPinMouseLeave={handlePinMouseLeave}
                    onPinClick={handlePinClick}
                    onEdit={(n) => {
                      setEditingNote(n);
                      setIsNoteModalOpen(true);
                    }}
                    onDelete={handleDeleteNote}
                    onDuplicate={handleDuplicateNote}
                    onOpenTask={onOpenTask}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Minimal Floating Zoom & Board Controls (Bottom Right Pill) */}
        <div className="absolute bottom-4 right-4 z-40 flex items-center gap-1.5 p-1 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 text-white shadow-xl pointer-events-auto">
          {/* Fit & Center View on Notes (Shift + F) */}
          <button
            type="button"
            onClick={handleFitToContent}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/25 hover:bg-amber-500/40 border border-amber-400/40 text-amber-300 hover:text-amber-100 text-xs font-semibold cursor-pointer transition-all active:scale-95"
            title="Focus & Fit to Notes / Tasks (Shift + F)"
          >
            <Focus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Fit (Shift+F)</span>
          </button>
          <div className="h-4 w-px bg-white/20 mx-0.5" />
          <button
            type="button"
            onClick={() => setZoom((prev) => Math.max(0.3, +(prev - 0.15).toFixed(2)))}
            className="p-1.5 rounded-lg hover:bg-white/20 text-zinc-300 hover:text-white cursor-pointer"
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
            className="px-2 py-0.5 rounded-lg hover:bg-white/20 text-xs font-mono font-bold cursor-pointer"
            title="Reset Zoom & Pan (100%)"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoom((prev) => Math.min(2.5, +(prev + 0.15).toFixed(2)))}
            className="p-1.5 rounded-lg hover:bg-white/20 text-zinc-300 hover:text-white cursor-pointer"
            title="Zoom In (or scroll wheel)"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <div className="h-4 w-px bg-white/20 mx-0.5" />
          <button
            type="button"
            onClick={handleResetBoard}
            className="p-1.5 rounded-lg hover:bg-white/20 text-zinc-300 hover:text-white cursor-pointer"
            title="Reset this project's board to initial layout"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="p-1.5 rounded-lg hover:bg-white/20 text-zinc-300 hover:text-white cursor-pointer"
            title="Gestures & Shortcuts Guide"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Floating Help Modal / Tooltip */}
        {showHelp && (
          <div className="absolute bottom-16 right-4 z-40 w-84 p-4 rounded-xl bg-black/95 backdrop-blur-md border border-amber-400/40 text-white shadow-2xl text-xs space-y-2.5 animate-in fade-in slide-in-from-bottom-2 pointer-events-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="font-bold text-amber-300 flex items-center gap-1.5 text-sm">
                <span>📌</span>
                <span>Idea Board Controls &amp; Shortcuts</span>
              </span>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <ul className="space-y-2 text-zinc-300 text-[11px] leading-relaxed">
              <li>
                <strong className="text-amber-200">🖱️ Pan &amp; Zoom:</strong> Drag with <kbd className="bg-white/10 px-1 py-0.5 rounded">Middle Mouse</kbd> or <kbd className="bg-white/10 px-1 py-0.5 rounded">Ctrl + Left Click</kbd> to pan. Scroll the mouse wheel to zoom directly into wherever your cursor is.
              </li>
              <li>
                <strong className="text-amber-200">📦 Multi-Select:</strong> Drag a box on the corkboard background to select multiple notes. Drag any selected note to move the whole group together!
              </li>
              <li>
                <strong className="text-amber-200">🧶 Strings &amp; Ideas:</strong> Click and hold down any note&apos;s pushpin, then drag the string. Drop on another pin to tie them, or drop on empty corkboard to spawn a connected note!
              </li>
              <li>
                <strong className="text-amber-200">🖼️ Instant Drag &amp; Drop:</strong> Drag images, videos, or web links directly onto the board or press <kbd className="bg-white/10 px-1 py-0.5 rounded">Ctrl + V</kbd> to paste immediately without opening any modals.
              </li>
              <li>
                <strong className="text-amber-200">📝 Edit Notes:</strong> Double-click any note card or click the pencil icon to edit formatting, content, or paper colors.
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
    </div>
  );
}
