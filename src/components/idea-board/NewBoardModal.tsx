"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IdeaPaperColor, IdeaPinColor, BoardTheme } from "@/types/idea-board.types";
import {
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
  Plus,
  Pencil,
  Check,
} from "lucide-react";
import {
  PushPin,
  PIN_COLOR_PRESETS,
  resolvePinHexColor,
  PAPER_COLOR_PRESETS,
  resolvePaperHexColor,
  getPaperColorVariations,
} from "./PushPin";

interface NewBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingBoard?: {
    name: string;
    icon?: string;
    color?: IdeaPaperColor;
    pinColor?: IdeaPinColor;
  } | null;
  onCreateBoard?: (data: {
    name: string;
    icon: string;
    color: IdeaPaperColor;
    pin_color?: IdeaPinColor;
  }) => void;
  onSubmit?: (data: {
    name: string;
    icon?: string;
    theme?: BoardTheme;
    color?: IdeaPaperColor;
    pin_color?: IdeaPinColor;
  }) => void | Promise<void>;
  parentBoardName?: string;
}

export const SUBBOARD_ICONS: { id: string; label: string; icon: any }[] = [
  { id: "folder", label: "Folder", icon: Folder },
  { id: "layers", label: "Layers", icon: Layers },
  { id: "layout", label: "Layout", icon: Layout },
  { id: "palette", label: "Design", icon: Palette },
  { id: "sparkles", label: "Sparkles", icon: Sparkles },
  { id: "lightbulb", label: "Idea", icon: Lightbulb },
  { id: "box", label: "Package", icon: Box },
  { id: "target", label: "Goal", icon: Target },
  { id: "coffee", label: "Beverage", icon: Coffee },
  { id: "compass", label: "Explore", icon: Compass },
  { id: "bookmark", label: "Saved", icon: Bookmark },
  { id: "flame", label: "Trend", icon: Flame },
];

const BOARD_COLORS: { id: IdeaPaperColor; label: string; bg: string }[] = [
  { id: "white", label: "White", bg: "bg-white" },
  { id: "kraft", label: "Kraft", bg: "bg-[#fed7aa]" },
  { id: "yellow", label: "Yellow", bg: "bg-[#fef08a]" },
  { id: "mint", label: "Mint", bg: "bg-[#bbf7d0]" },
  { id: "sky", label: "Sky", bg: "bg-[#bfdbfe]" },
  { id: "lavender", label: "Lavender", bg: "bg-[#e9d5ff]" },
  { id: "rose", label: "Rose", bg: "bg-[#fbcfe8]" },
  { id: "dark", label: "Slate", bg: "bg-[#1e293b]" },
];

export function NewBoardModal({
  isOpen,
  onClose,
  editingBoard = null,
  onCreateBoard,
  onSubmit,
  parentBoardName = "Main Board",
}: NewBoardModalProps) {
  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("folder");
  const [selectedColor, setSelectedColor] = useState<IdeaPaperColor>("kraft");
  const [selectedPinColor, setSelectedPinColor] = useState<IdeaPinColor>("gold");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(editingBoard);

  // Auto-focus on title input when modal opens (Requirement 3)
  useEffect(() => {
    if (isOpen) {
      if (editingBoard) {
        setName(editingBoard.name || "");
        setSelectedIcon(editingBoard.icon || "folder");
        setSelectedColor(editingBoard.color || "kraft");
        setSelectedPinColor(editingBoard.pinColor || "gold");
      } else {
        setName("");
        setSelectedIcon("folder");
        setSelectedColor("kraft");
        setSelectedPinColor("gold");
      }
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, editingBoard]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      icon: selectedIcon,
      color: selectedColor,
      pin_color: selectedPinColor,
      theme: "cork" as BoardTheme,
    };
    if (onSubmit) {
      onSubmit(data);
    } else if (onCreateBoard) {
      onCreateBoard(data);
    }
    onClose();
  };

  const SelectedIconComp =
    SUBBOARD_ICONS.find((i) => i.id === selectedIcon)?.icon || Folder;
  const paperTones = getPaperColorVariations(selectedColor);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              {isEditing ? (
                <Pencil className="h-5 w-5" />
              ) : (
                <Layers className="h-5 w-5" />
              )}
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {isEditing ? "Edit Sub-Idea Board" : "Create Sub-Idea Board"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEditing ? (
                  "Update sub-board name, icon, and card color"
                ) : (
                  <>
                    Nest a new sub-board inside{" "}
                    <span className="font-semibold text-foreground">
                      {parentBoardName}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Board Title Input with AutoFocus */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Board Name *
            </label>
            <Input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Design 1 - Sleek Minimalist..."
              className="text-sm font-semibold h-10"
              autoFocus
            />
          </div>

          {/* Icon Selector */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
              Board Icon
            </label>
            <div className="grid grid-cols-6 gap-2">
              {SUBBOARD_ICONS.map((item) => {
                const Icon = item.icon;
                const isSelected = selectedIcon === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedIcon(item.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-amber-600 text-white border-amber-600 shadow-sm scale-105"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                    }`}
                    title={item.label}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card Color Style + Colorwheel */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
              Card Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {BOARD_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedColor(c.id)}
                  className={`h-7 w-7 rounded-full border-2 transition-transform cursor-pointer ${
                    c.bg
                  } ${
                    selectedColor === c.id
                      ? "ring-2 ring-primary ring-offset-2 scale-110 border-black/30"
                      : "border-black/10 hover:scale-105"
                  }`}
                  title={c.label}
                />
              ))}
              {/* Custom Card Colorwheel Picker */}
              <label
                className={`relative h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center cursor-pointer overflow-hidden ${
                  !BOARD_COLORS.some((c) => c.id === selectedColor)
                    ? "ring-2 ring-primary ring-offset-2 scale-110 border-black/30"
                    : "border-black/20"
                }`}
                style={{
                  background: !BOARD_COLORS.some((c) => c.id === selectedColor)
                    ? resolvePaperHexColor(selectedColor)
                    : "conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #10b981, #3b82f6, #8b5cf6, #ec4899, #ef4444)",
                }}
                title="Pick custom card color from colorwheel"
              >
                <input
                  type="color"
                  value={resolvePaperHexColor(selectedColor)}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="sr-only"
                />
                <Palette className="h-3 w-3 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] pointer-events-none" />
              </label>
            </div>
          </div>

          {/* Pin Color Selector (Requirement 1: pin color on subboard to be editable) */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
              Pushpin Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PIN_COLOR_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPinColor(p.id)}
                  className={`h-7 w-7 rounded-full border-2 transition-transform cursor-pointer ${
                    selectedPinColor === p.id
                      ? "ring-2 ring-primary ring-offset-2 scale-110 border-black/40"
                      : "border-black/20 hover:scale-105"
                  }`}
                  style={{ backgroundColor: p.hex }}
                  title={p.label}
                />
              ))}
              {/* Custom Pin Colorwheel Picker */}
              <label
                className={`relative h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center cursor-pointer overflow-hidden ${
                  !PIN_COLOR_PRESETS.some((p) => p.id === selectedPinColor)
                    ? "ring-2 ring-primary ring-offset-2 scale-110 border-black/40"
                    : "border-black/20"
                }`}
                style={{
                  background: !PIN_COLOR_PRESETS.some((p) => p.id === selectedPinColor)
                    ? resolvePinHexColor(selectedPinColor)
                    : "conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #10b981, #3b82f6, #8b5cf6, #ec4899, #ef4444)",
                }}
                title="Pick custom pushpin color from colorwheel"
              >
                <input
                  type="color"
                  value={resolvePinHexColor(selectedPinColor)}
                  onChange={(e) => setSelectedPinColor(e.target.value)}
                  className="sr-only"
                />
                <Palette className="h-3 w-3 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] pointer-events-none" />
              </label>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 flex items-center justify-center">
            <div
              className={`relative w-36 h-36 rounded-2xl border-2 border-dashed p-3 shadow-md flex flex-col items-center justify-center text-center gap-1.5 ${
                BOARD_COLORS.find((c) => c.id === selectedColor)?.bg || ""
              }`}
              style={{
                ...(!BOARD_COLORS.some((c) => c.id === selectedColor)
                  ? {
                      backgroundColor: paperTones.base,
                      borderColor: paperTones.border,
                      color: paperTones.textColor,
                    }
                  : {}),
              }}
            >
              {/* Pushpin at top of preview */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                <PushPin color={selectedPinColor} size="sm" />
              </div>

              <div
                className={`h-11 w-11 rounded-xl flex items-center justify-center mt-1 ${
                  selectedColor === "dark" || paperTones.isDark
                    ? "bg-white/15 text-slate-100"
                    : "bg-black/10 text-amber-900"
                }`}
              >
                <SelectedIconComp className="h-6 w-6" />
              </div>
              <span className="text-xs font-bold leading-snug break-words line-clamp-2 max-w-[125px]">
                {name.trim() || "Sub-Board"}
              </span>
              <span
                className={`text-[10px] font-medium ${
                  selectedColor === "dark" || paperTones.isDark
                    ? "text-slate-300"
                    : "text-amber-900/60"
                }`}
              >
                Double click to open
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim()}
              className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {isEditing ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Save Changes</span>
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Board</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
