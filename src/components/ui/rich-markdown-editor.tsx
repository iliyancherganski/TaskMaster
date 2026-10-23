"use client";

import React, { useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  ListChecks,
  Table as TableIcon,
  Palette,
  Highlighter,
  Quote,
  Code,
  Eye,
  Edit3,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MarkdownRenderer } from "./markdown-renderer";

interface RichMarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  minHeight?: string;
  className?: string;
  onSave?: () => void;
}

const TEXT_COLORS = [
  { name: "Default", color: "inherit", label: "Reset" },
  { name: "Red", color: "#ef4444", label: "Red" },
  { name: "Blue", color: "#3b82f6", label: "Blue" },
  { name: "Green", color: "#10b981", label: "Green" },
  { name: "Amber", color: "#f59e0b", label: "Amber" },
  { name: "Purple", color: "#8b5cf6", label: "Purple" },
  { name: "Pink", color: "#ec4899", label: "Pink" },
  { name: "Cyan", color: "#06b6d4", label: "Cyan" },
];

const HIGHLIGHT_COLORS = [
  { name: "Yellow", bg: "#fef08a", text: "#713f12", label: "Yellow" },
  { name: "Green", bg: "#bbf7d0", text: "#14532d", label: "Green" },
  { name: "Pink", bg: "#fbcfe8", text: "#831843", label: "Pink" },
  { name: "Blue", bg: "#bfdbfe", text: "#1e3a8a", label: "Blue" },
  { name: "Orange", bg: "#fed7aa", text: "#7c2d12", label: "Orange" },
  { name: "Purple", bg: "#e9d5ff", text: "#581c87", label: "Purple" },
];

export function RichMarkdownEditor({
  value,
  onChange,
  placeholder = "Write your formatted description here...",
  rows = 5,
  minHeight = "160px",
  className = "",
  onSave,
}: RichMarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper to wrap selected text with markdown/HTML syntax
  const wrapSelection = (before: string, after: string, defaultPlaceholder = "text") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end) || defaultPlaceholder;

    const replacement = `${before}${selectedText}${after}`;
    const nextVal =
      textarea.value.substring(0, start) + replacement + textarea.value.substring(end);

    onChange(nextVal);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    });
  };

  // Helper to prepend syntax to lines (headings, lists)
  const prependLines = (prefix: string, defaultPlaceholder = "Item") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    if (start === end) {
      // Find beginning of current line
      const lineStart = text.lastIndexOf("\n", start - 1) + 1;
      const lineEnd = text.indexOf("\n", start);
      const actualLineEnd = lineEnd === -1 ? text.length : lineEnd;
      const currentLine = text.substring(lineStart, actualLineEnd);

      const newLine = currentLine.trim() ? `${prefix}${currentLine}` : `${prefix}${defaultPlaceholder}`;
      const nextVal = text.substring(0, lineStart) + newLine + text.substring(actualLineEnd);
      onChange(nextVal);

      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(lineStart + prefix.length, lineStart + newLine.length);
      });
      return;
    }

    // Multiple lines selected: prefix each
    const selected = text.substring(start, end);
    const lines = selected.split("\n");
    const formatted = lines.map((l) => (l.trim() ? `${prefix}${l}` : l)).join("\n");

    const nextVal = text.substring(0, start) + formatted + text.substring(end);
    onChange(nextVal);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + formatted.length);
    });
  };

  // Insert raw snippet at cursor
  const insertSnippet = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const nextVal = text.substring(0, start) + snippet + text.substring(end);
    onChange(nextVal);

    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + snippet.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  };

  // Table template
  const insertTable = () => {
    const tableTemplate = `\n| Header 1 | Header 2 | Header 3 |\n| :--- | :---: | ---: |\n| Row 1 Col 1 | Row 1 Col 2 | Row 1 Col 3 |\n| Row 2 Col 1 | Row 2 Col 2 | Row 2 Col 3 |\n\n`;
    insertSnippet(tableTemplate);
  };

  // Keyboard shortcut listener
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        wrapSelection("**", "**", "bold text");
      } else if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        wrapSelection("*", "*", "italic text");
      } else if (e.key === "u" || e.key === "U") {
        e.preventDefault();
        wrapSelection("<u>", "</u>", "underlined text");
      } else if (e.key === "Enter" && onSave) {
        e.preventDefault();
        onSave();
      }
    }
  };

  return (
    <div className={`rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs ${className}`}>
      {/* Top Formatting Toolbar & Write/Preview Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-1 p-2 bg-muted/40 border-b border-border/70 select-none">
        {/* Left Formatting Action Buttons (Word-like Toolbar) */}
        <div className="flex flex-wrap items-center gap-0.5">
          {/* Headings H1, H2, H3 */}
          <div className="flex items-center gap-0.5 pr-1 border-r border-border/60">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-xs font-bold hover:bg-muted text-muted-foreground hover:text-foreground"
              onClick={() => prependLines("# ", "Heading 1")}
              title="Heading 1 (# text)"
            >
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-xs font-bold hover:bg-muted text-muted-foreground hover:text-foreground"
              onClick={() => prependLines("## ", "Heading 2")}
              title="Heading 2 (## text)"
            >
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-xs font-bold hover:bg-muted text-muted-foreground hover:text-foreground"
              onClick={() => prependLines("### ", "Heading 3")}
              title="Heading 3 (### text)"
            >
              <Heading3 className="h-4 w-4" />
            </Button>
          </div>

          {/* Bold, Italic, Underline */}
          <div className="flex items-center gap-0.5 px-1 border-r border-border/60">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground"
              onClick={() => wrapSelection("**", "**", "bold text")}
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground"
              onClick={() => wrapSelection("*", "*", "italic text")}
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground"
              onClick={() => wrapSelection("<u>", "</u>", "underlined text")}
              title="Underline (Ctrl+U)"
            >
              <Underline className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Text Color Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Text Color"
              >
                <Palette className="h-3.5 w-3.5 text-primary" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="text-[11px] font-semibold text-muted-foreground mb-1.5 px-1">
                Text Color
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      if (c.color === "inherit") {
                        wrapSelection("", "", "plain text");
                      } else {
                        wrapSelection(`<span style="color: ${c.color}">`, "</span>", "colored text");
                      }
                    }}
                    className="flex flex-col items-center gap-1 p-1 rounded-md hover:bg-muted transition-colors text-[10px]"
                    title={c.name}
                  >
                    <span
                      className="h-4 w-4 rounded-full border shadow-2xs"
                      style={{ backgroundColor: c.color === "inherit" ? "#94a3b8" : c.color }}
                    />
                    <span className="truncate max-w-[36px]">{c.label}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Highlight Color Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Highlight Background"
              >
                <Highlighter className="h-3.5 w-3.5 text-amber-500" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="text-[11px] font-semibold text-muted-foreground mb-1.5 px-1">
                Highlight Background
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {HIGHLIGHT_COLORS.map((h) => (
                  <button
                    key={h.name}
                    type="button"
                    onClick={() =>
                      wrapSelection(
                        `<mark style="background-color: ${h.bg}; color: ${h.text}; padding: 1px 4px; border-radius: 4px;">`,
                        "</mark>",
                        "highlighted text"
                      )
                    }
                    className="p-1.5 rounded-md text-center text-[10px] font-medium border shadow-2xs hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: h.bg, color: h.text }}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <span className="text-border/80 mx-0.5">•</span>

          {/* Alignment: Left, Center, Right */}
          <div className="flex items-center gap-0.5 px-1 border-r border-border/60">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground"
              onClick={() => wrapSelection('<div align="left">\n\n', "\n\n</div>", "Left aligned text")}
              title="Align Left"
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground"
              onClick={() => wrapSelection('<div align="center">\n\n', "\n\n</div>", "Centered text")}
              title="Align Center"
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground"
              onClick={() => wrapSelection('<div align="right">\n\n', "\n\n</div>", "Right aligned text")}
              title="Align Right"
            >
              <AlignRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Nested / Multi-layer Lists */}
          <div className="flex items-center gap-0.5 px-1 border-r border-border/60">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground"
              onClick={() => prependLines("- ", "List item")}
              title="Bullet List (- item)"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground"
              onClick={() => prependLines("1. ", "Numbered item")}
              title="Numbered List (1. item)"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground"
              onClick={() => prependLines("- [ ] ", "Checklist item")}
              title="Checklist (- [ ] item)"
            >
              <ListChecks className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground text-[10px] font-mono"
              onClick={() => prependLines("  ", "")}
              title="Indent (Nested Sub-item level)"
            >
              Tab
            </Button>
          </div>

          {/* Table Inserter */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={insertTable}
            title="Insert Markdown Table"
          >
            <TableIcon className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Table</span>
          </Button>

          {/* Quote, Code, Divider */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground"
            onClick={() => prependLines("> ", "Quote")}
            title="Quote (> text)"
          >
            <Quote className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground"
            onClick={() => wrapSelection("`", "`", "code")}
            title="Inline Code (`code`)"
          >
            <Code className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground"
            onClick={() => insertSnippet("\n---\n")}
            title="Horizontal Divider (---)"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Right Mode Switch: Write vs Preview */}
        <div className="flex items-center gap-1 bg-background/80 p-0.5 rounded-lg border border-border/60">
          <button
            type="button"
            onClick={() => setActiveTab("write")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              activeTab === "write"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Edit3 className="h-3 w-3" />
            <span>Write</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              activeTab === "preview"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="h-3 w-3" />
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* Editor Content Body: Write Mode (Textarea) vs Preview Mode (Formatted Markdown) */}
      {activeTab === "write" ? (
        <div className="p-2">
          <Textarea
            ref={textareaRef}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={rows}
            style={{ minHeight }}
            className="border-0 shadow-none focus-visible:ring-0 text-sm leading-relaxed resize-y font-mono"
          />
          <div className="flex items-center justify-between px-2 pt-1.5 text-[10px] text-muted-foreground border-t border-border/40">
            <span>
              Supports GitHub Markdown, tables, colors, highlights & HTML
            </span>
            <span className="hidden sm:inline">
              Shortcuts: <kbd className="px-1 py-0.5 bg-muted rounded border">Ctrl+B</kbd> Bold •{" "}
              <kbd className="px-1 py-0.5 bg-muted rounded border">Ctrl+I</kbd> Italic •{" "}
              <kbd className="px-1 py-0.5 bg-muted rounded border">Ctrl+U</kbd> Underline
            </span>
          </div>
        </div>
      ) : (
        <div
          className="p-4 bg-muted/10 overflow-y-auto"
          style={{ minHeight }}
        >
          {value.trim() ? (
            <MarkdownRenderer content={value} />
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Nothing to preview. Switch to the Write tab to type content.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

