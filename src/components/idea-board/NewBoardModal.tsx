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
import { IdeaPaperColor, BoardTheme } from "@/types/idea-board.types";
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
} from "lucide-react";

interface NewBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBoard?: (data: {
    name: string;
    icon: string;
    color: IdeaPaperColor;
  }) => void;
  onSubmit?: (data: {
    name: string;
    icon?: string;
    theme?: BoardTheme;
    color?: IdeaPaperColor;
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
  onCreateBoard,
  onSubmit,
  parentBoardName = "Main Board",
}: NewBoardModalProps) {
  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("folder");
  const [selectedColor, setSelectedColor] = useState<IdeaPaperColor>("kraft");
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on title input when modal opens (Requirement 3)
  useEffect(() => {
    if (isOpen) {
      setName("");
      setSelectedIcon("folder");
      setSelectedColor("kraft");
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      icon: selectedIcon,
      color: selectedColor,
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Create Sub-Idea Board
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Nest a new sub-board inside{" "}
                <span className="font-semibold text-foreground">
                  {parentBoardName}
                </span>
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

          {/* Color Card Style */}
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
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 flex items-center justify-center">
            <div
              className={`w-36 h-36 rounded-2xl border-2 border-dashed border-amber-700/40 p-3 shadow-md flex flex-col items-center justify-center text-center gap-2 ${
                BOARD_COLORS.find((c) => c.id === selectedColor)?.bg ||
                "bg-[#fed7aa]"
              }`}
            >
              <div className="h-12 w-12 rounded-xl bg-black/10 flex items-center justify-center text-amber-900">
                <SelectedIconComp className="h-7 w-7" />
              </div>
              <span className="text-xs font-bold text-amber-950 truncate max-w-[120px]">
                {name.trim() || "Sub-Board"}
              </span>
              <span className="text-[10px] text-amber-900/60 font-medium">
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
              <Plus className="h-3.5 w-3.5" />
              <span>Create Board</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
