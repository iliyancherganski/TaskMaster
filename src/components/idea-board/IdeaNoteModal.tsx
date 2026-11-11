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
import { Textarea } from "@/components/ui/textarea";
import {
  IdeaNote,
  IdeaNoteType,
  IdeaPaperColor,
  IdeaPinColor,
} from "@/types/idea-board.types";
import {
  FileText,
  Image as ImageIcon,
  Video,
  Globe,
  CheckSquare,
  Sparkles,
  Link2,
  Upload,
} from "lucide-react";
import { TaskWithDetails } from "@/types/database.types";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { RichMarkdownEditor } from "@/components/ui/rich-markdown-editor";
import { PushPin } from "./PushPin";
import { uploadIdeaAttachment } from "@/lib/idea-board-storage";

interface IdeaNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (noteData: Partial<IdeaNote>) => void;
  editingNote?: IdeaNote | null;
  availableTasks?: TaskWithDetails[];
  initialCoords?: { x: number; y: number };
}

const PAPER_COLORS: { id: IdeaPaperColor; label: string; color: string }[] = [
  { id: "yellow", label: "Post-it Yellow", color: "#fef08a" },
  { id: "white", label: "Index White", color: "#ffffff" },
  { id: "kraft", label: "Kraft Card", color: "#fed7aa" },
  { id: "mint", label: "Mint Green", color: "#bbf7d0" },
  { id: "sky", label: "Sky Blue", color: "#bfdbfe" },
  { id: "lavender", label: "Lavender", color: "#e9d5ff" },
  { id: "rose", label: "Rose Pink", color: "#fbcfe8" },
  { id: "dark", label: "Slate Dark", color: "#1e293b" },
];

const PIN_COLORS: { id: IdeaPinColor; label: string; color: string }[] = [
  { id: "red", label: "Classic Red", color: "#ef4444" },
  { id: "gold", label: "Brass Gold", color: "#f59e0b" },
  { id: "silver", label: "Chrome Silver", color: "#94a3b8" },
  { id: "blue", label: "Royal Blue", color: "#3b82f6" },
  { id: "green", label: "Emerald Green", color: "#10b981" },
  { id: "yellow", label: "Canary Yellow", color: "#eab308" },
  { id: "pink", label: "Neon Pink", color: "#ec4899" },
];

export function IdeaNoteModal({
  isOpen,
  onClose,
  onSave,
  editingNote,
  availableTasks = [],
  initialCoords = { x: 300, y: 200 },
}: IdeaNoteModalProps) {
  const [type, setType] = useState<IdeaNoteType>("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [taskId, setTaskId] = useState<string>("");
  const [color, setColor] = useState<IdeaPaperColor>("yellow");
  const [pinColor, setPinColor] = useState<IdeaPinColor>("red");
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingNote) {
      setType(editingNote.type);
      setTitle(editingNote.title);
      setContent(editingNote.content);
      setFileUrl(editingNote.file_url || "");
      setFileName(editingNote.file_name || "");
      setTaskId(editingNote.task_id || "");
      setColor(editingNote.color);
      setPinColor(editingNote.pin_color);
    } else {
      setType("text");
      setTitle("");
      setContent("");
      setFileUrl("");
      setFileName("");
      setTaskId("");
      setColor("yellow");
      setPinColor("red");
    }

    if (isOpen) {
      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [editingNote, isOpen]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));

    // Create object URL for client preview immediately
    const previewUrl = URL.createObjectURL(file);
    setFileUrl(previewUrl);

    // Upload to Supabase Storage (or persistent storage) in background
    uploadIdeaAttachment(file).then((persistentUrl) => {
      setFileUrl(persistentUrl);
    });

    if (file.type.startsWith("image/")) {
      setType("image");
    } else if (file.type.startsWith("video/")) {
      setType("video");
    } else {
      setType("file");
    }
  };

  const handleSelectTask = (tId: string) => {
    setTaskId(tId);
    const task = availableTasks.find((t) => t.id === tId);
    if (task && !title) {
      setTitle(task.name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim() && !fileUrl.trim()) return;

    onSave({
      type,
      title: title.trim() || (type === "text" ? "Thought Note" : "Untitled Attachment"),
      content: content.trim(),
      file_url: fileUrl.trim() || null,
      file_name: fileName.trim() || null,
      task_id: type === "task" && taskId ? taskId : null,
      color,
      pin_color: pinColor,
      ...(editingNote ? {} : { x: initialCoords.x, y: initialCoords.y }),
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <PushPin color={pinColor} size="sm" />
            <DialogTitle className="text-base sm:text-lg">
              {editingNote ? "Edit Pinned Note" : "Pin a New Idea on Board"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Note Type Selector */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
              Note Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: "text", label: "Text Note", icon: FileText },
                { id: "image", label: "Image Ref", icon: ImageIcon },
                { id: "video", label: "Video", icon: Video },
                { id: "link", label: "Link / File", icon: Globe },
                { id: "task", label: "Project Task", icon: CheckSquare },
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = type === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id as IdeaNoteType)}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Media / Link Input if not pure text note */}
          {type !== "text" && (
            <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-3">
              {type === "task" ? (
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">
                    Select Existing Task from Project
                  </label>
                  <select
                    value={taskId}
                    onChange={(e) => handleSelectTask(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border bg-background text-foreground"
                  >
                    <option value="">-- Choose a task to pin --</option>
                    {availableTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.status?.name || "Task"})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1">
                      {type === "image"
                        ? "Image URL (or upload below)"
                        : type === "video"
                        ? "Video URL (YouTube, Vimeo, MP4)"
                        : "Web Link or File URL"}
                    </label>
                    <Input
                      type="url"
                      value={fileUrl}
                      onChange={(e) => setFileUrl(e.target.value)}
                      placeholder={
                        type === "video"
                          ? "https://www.youtube.com/watch?v=..."
                          : "https://example.com/file..."
                      }
                      className="text-xs font-mono"
                    />
                  </div>

                  {type !== "video" && (
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-border hover:bg-muted cursor-pointer text-xs font-medium">
                        <Upload className="h-3.5 w-3.5 text-primary" />
                        <span>Upload local file</span>
                        <input
                          type="file"
                          onChange={handleFileUpload}
                          className="hidden"
                          accept={type === "image" ? "image/*" : "*/*"}
                        />
                      </label>
                      {fileName && (
                        <span className="text-[11px] text-muted-foreground truncate max-w-xs">
                          {fileName}
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Note Title */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Title / Header
            </label>
            <Input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your idea or clue a title..."
              className="text-sm font-semibold"
              autoFocus
            />
          </div>

          {/* Formatted Content Editor */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Formatted Description / Notes
            </label>
            <RichMarkdownEditor
              value={content}
              onChange={setContent}
              placeholder="Write your thoughts (Markdown supported: **bold**, *italic*, lists, tables, code, quotes)..."
              rows={5}
              minHeight="140px"
            />
          </div>

          {/* Paper Color & Pin Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Paper Color */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Paper Color
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {PAPER_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`h-6 w-6 rounded-md border-2 transition-transform hover:scale-110 ${
                      color === c.id ? "border-primary ring-2 ring-primary/40 scale-105" : "border-black/20"
                    }`}
                    style={{ backgroundColor: c.color }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Pin Color */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Pushpin Color
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {PIN_COLORS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPinColor(p.id)}
                    className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center ${
                      pinColor === p.id ? "border-primary ring-2 ring-primary/40 scale-105" : "border-white/60"
                    }`}
                    style={{ backgroundColor: p.color }}
                    title={p.label}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button type="button" variant="ghost" onClick={onClose} size="sm">
              Cancel
            </Button>
            <Button type="submit" size="sm" className="gap-1.5 font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{editingNote ? "Save Changes" : "Pin Note to Board"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
