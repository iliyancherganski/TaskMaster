"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
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
  Link2,
  Check,
  Sparkles,
  ChevronDown,
  Copy,
  Paperclip,
  Undo2,
  Redo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MarkdownRenderer } from "./markdown-renderer";
import { ResourceWithFiles } from "@/types/database.types";

interface RichMarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  minHeight?: string;
  className?: string;
  onSave?: () => void;
  resources?: ResourceWithFiles[];
  onToggleExplorer?: () => void;
  isExplorerOpen?: boolean;
  onUpdateAttachmentSize?: (resourceId: string, size: number) => void;
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

const TASK_DOCS_PROMPT = `Act strictly as a Markdown formatter for TaskMaster. Reformat the text into clean, structured Markdown matching the exact specification below.

CRITICAL RULES:
- DO NOT invent, assume, or add new facts, tasks, or requirements.
- DO NOT summarize or omit any existing details.
- Preserve 100% of the original information, technical names, and numbers exactly as written.
- Output ONLY the formatted Markdown. No intro, no greeting, no conversational text.

EXACT FORMAT SPECIFICATION:
1. Headings & Spacing:
   - Primary sections: '## Section Name' (two hashes, space, Title Case).
   - Subsections: '### Subsection Name' (three hashes, space).
   - Exactly ONE empty line before each heading and after each block.

2. Metadata & Properties:
   - Format single key-value properties as: '**Key:** Value' (e.g., '**Deadline:** Friday 5:00 PM', '**Software:** \`Blender 4.2\`').

3. Checklists (Action Items & Tasks):
   - Any statement expressing an action to take (e.g., "export", "bake", "fix", "check", "need to", "create", "clean up") must be formatted as:
     - [ ] Action item with \`code\` for values/files and **bold** for key tools/targets.
     (Example: '- [ ] Export high-poly mesh from **ZBrush** to \`character.fbx\`')

4. Bullet Lists:
   - Use '- ' for unordered items.
   - For sub-items, indent by 2 spaces: '  - Sub-item detail'.
   - Do NOT leave blank lines between consecutive list items.

5. Backticks (\`inline code\`):
   - Wrap strictly with single backticks:
     * File names & extensions: \`model.fbx\`, \`T_Albedo.png\`, \`/assets/\`
     * Hotkeys & shortcuts: \`Ctrl+B\`, \`Shift+A\`
     * Parameters, resolution & numbers: \`4096x4096\`, \`UDIM 1001-1004\`, \`0.05\`
     * Software tools, nodes & shaders: \`Nanite\`, \`Lumen\`, \`Principled BSDF\`

6. Tables:
   - If comparing items, properties, or specs, format as a clean Markdown table:
     | Property | Value | Notes |
     | :--- | :--- | :--- |

TARGET BLUEPRINT:
## [Topic / Section]
**[Property]:** Value

Brief contextual sentence from original text.

### [Details / Subtopic]
- Note with **key term** and \`parameter\`.
  - Nested detail.

## [Tasks / Action Items]
- [ ] Task 1
- [ ] Task 2`;

const IMAGE_DOCS_PROMPT = `Act strictly as a Markdown formatter for TaskMaster image and artwork descriptions. Reformat the text into clean, structured Markdown matching the exact specification below.

CRITICAL RULES:
- DO NOT invent, assume, or add new visual elements, feedback, or details.
- DO NOT omit any visual critique, settings, or specs.
- Preserve 100% of the original content and terminology exactly as written.
- Output ONLY the formatted Markdown. No intro, no greeting, no conversational text.

EXACT FORMAT SPECIFICATION:
1. Headings & Spacing:
   - Use '## ' for primary sections (e.g., '## Overview', '## Visual Feedback', '## Revisions', '## Technical Settings').
   - Exactly ONE empty line between sections.

2. Visual Notes & Critique:
   - Group observations by topic: '- **Area/Aspect:** Observation and critique'.
   - Bold focal points, lighting directions, materials, and colors with **bold**.

3. Revision Items (Checklist):
   - Any requested changes, fixes, or polish items must be formatted as:
     - [ ] Specific fix or revision item (e.g., '- [ ] Increase specular roughness on leather armor')

4. Technical Settings & Specifications:
   - Format tools, camera, and render settings using \`inline code\`:
     * Software & renderer: \`Blender Cycles\`, \`Unreal Engine 5.4\`, \`Substance Painter\`
     * Camera parameters: \`50mm\`, \`f/2.8\`, \`ISO 100\`, \`1920x1080\`
     * Material / Shader values: \`Roughness 0.35\`, \`Metallic 1.0\`
   - Use key-value format: '**Resolution:** \`4096x4096\`'.

TARGET BLUEPRINT:
## Overview
Brief concept or subject summary.

## Visual Feedback
- **Lighting:** Key light and shadow notes.
- **Materials:** Texture, shader, and color observations.

## Revisions
- [ ] Polish item 1
- [ ] Fix item 2

## Technical Settings
- **Software:** \`Blender 4.2\` / \`Cycles\`
- **Resolution:** \`3840x2160\``;

export function RichMarkdownEditor({
  value,
  onChange,
  placeholder = "Write your formatted description here...",
  rows = 5,
  minHeight = "160px",
  className = "",
  onSave,
  resources,
  onToggleExplorer,
  isExplorerOpen,
  onUpdateAttachmentSize,
}: RichMarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Hyperlink Popover state
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkFormat, setLinkFormat] = useState<"markdown" | "html">("markdown");
  const [linkSelection, setLinkSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });

  // AI Reformatting Prompt state
  const isImageEditor = placeholder.toLowerCase().includes("image");
  const [aiPromptType, setAiPromptType] = useState<"task" | "image">(
    isImageEditor ? "image" : "task"
  );
  const [aiTarget, setAiTarget] = useState<"docs" | "chat">("docs");
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const getFullPrompt = (
    type: "task" | "image" = aiPromptType,
    target: "docs" | "chat" = aiTarget
  ) => {
    const basePrompt = type === "image" ? IMAGE_DOCS_PROMPT : TASK_DOCS_PROMPT;
    if (target === "docs") {
      // In Google Docs: user selects text and clicks "Help me write". Pure instructions prevent Gemini from hallucinating or inserting placeholders.
      return basePrompt;
    }
    const textarea = textareaRef.current;
    let selected = "";
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      selected = textarea.value.substring(start, end).trim();
    }
    return `${basePrompt}\n\n--- TEXT TO REFORMAT ---\n${selected || "[Paste your raw text or draft notes here]"}`;
  };

  const handleCopyAiPrompt = async (targetOverride?: "docs" | "chat") => {
    try {
      const textToCopy = getFullPrompt(aiPromptType, targetOverride || aiTarget);
      await navigator.clipboard.writeText(textToCopy);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch (err) {
      console.error("Failed to copy AI prompt:", err);
    }
  };

  // Auto-resize textarea to fit full content without internal scrollbars
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const min = parseInt(minHeight) || 160;
    const targetHeight = Math.max(textarea.scrollHeight, min);
    textarea.style.height = `${targetHeight}px`;
  };

  useEffect(() => {
    if (activeTab === "write") {
      requestAnimationFrame(adjustHeight);
    }
  }, [value, activeTab]);

  // History Stack for Text & Formatting Undo / Redo inside the Editor
  const historyRef = useRef<{ text: string; selectionStart: number; selectionEnd: number }[]>([
    { text: value || "", selectionStart: 0, selectionEnd: 0 },
  ]);
  const historyIndexRef = useRef<number>(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const isUndoRedoApplyingRef = useRef<boolean>(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep initial history entry in sync on mount
  useEffect(() => {
    if (historyRef.current.length === 1 && historyRef.current[0].text === "" && value) {
      historyRef.current[0].text = value;
    }
  }, [value]);

  const pushHistory = useCallback((newText: string, selStart = 0, selEnd = 0) => {
    const current = historyRef.current[historyIndexRef.current];
    if (current && current.text === newText) return;

    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    nextHistory.push({ text: newText, selectionStart: selStart, selectionEnd: selEnd });
    if (nextHistory.length > 60) {
      nextHistory.shift();
    }
    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const handleUndo = useCallback(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    if (historyIndexRef.current <= 0) return;
    const nextIndex = historyIndexRef.current - 1;
    historyIndexRef.current = nextIndex;
    const target = historyRef.current[nextIndex];
    if (target !== undefined) {
      isUndoRedoApplyingRef.current = true;
      onChange(target.text);
      setCanUndo(nextIndex > 0);
      setCanRedo(true);
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(target.selectionStart, target.selectionEnd);
          adjustHeight();
        }
      });
    }
  }, [onChange]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    const nextIndex = historyIndexRef.current + 1;
    historyIndexRef.current = nextIndex;
    const target = historyRef.current[nextIndex];
    if (target !== undefined) {
      isUndoRedoApplyingRef.current = true;
      onChange(target.text);
      setCanUndo(true);
      setCanRedo(nextIndex < historyRef.current.length - 1);
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(target.selectionStart, target.selectionEnd);
          adjustHeight();
        }
      });
    }
  }, [onChange]);

  // Open Link popover and record current selection
  const handleOpenLinkPopover = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = textarea.value.substring(start, end);
      setLinkSelection({ start, end });
      setLinkText(selected || "");
      if (selected.startsWith("http://") || selected.startsWith("https://")) {
        setLinkUrl(selected);
      } else {
        setLinkUrl("");
      }
    }
    setIsLinkPopoverOpen(true);
  };

  // Insert or wrap with Hyperlink (either [text](url) or <a href="url">text</a>)
  const handleApplyLink = () => {
    let cleanUrl = linkUrl.trim();
    if (!cleanUrl) return;
    if (
      !cleanUrl.startsWith("http://") &&
      !cleanUrl.startsWith("https://") &&
      !cleanUrl.startsWith("mailto:") &&
      !cleanUrl.startsWith("#")
    ) {
      cleanUrl = `https://${cleanUrl}`;
    }

    const displayText = linkText.trim() || cleanUrl;
    const snippet =
      linkFormat === "html"
        ? `<a href="${cleanUrl}">${displayText}</a>`
        : `[${displayText}](${cleanUrl})`;

    const textarea = textareaRef.current;
    if (textarea) {
      const { start, end } = linkSelection;
      const text = textarea.value;
      const nextVal = text.substring(0, start) + snippet + text.substring(end);
      const newPos = start + snippet.length;
      pushHistory(nextVal, newPos, newPos);
      onChange(nextVal);

      setIsLinkPopoverOpen(false);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(newPos, newPos);
        adjustHeight();
      });
    } else {
      const nextVal = (value ? value + " " : "") + snippet;
      pushHistory(nextVal, nextVal.length, nextVal.length);
      onChange(nextVal);
      setIsLinkPopoverOpen(false);
    }
  };

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

    const selStart = start + before.length;
    const selEnd = start + before.length + selectedText.length;
    pushHistory(nextVal, selStart, selEnd);
    onChange(nextVal);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selStart, selEnd);
      adjustHeight();
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
      const selStart = lineStart + prefix.length;
      const selEnd = lineStart + newLine.length;
      pushHistory(nextVal, selStart, selEnd);
      onChange(nextVal);

      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(selStart, selEnd);
        adjustHeight();
      });
      return;
    }

    // Multiple lines selected: prefix each
    const selected = text.substring(start, end);
    const lines = selected.split("\n");
    const formatted = lines.map((l) => (l.trim() ? `${prefix}${l}` : l)).join("\n");

    const nextVal = text.substring(0, start) + formatted + text.substring(end);
    const selStart = start;
    const selEnd = start + formatted.length;
    pushHistory(nextVal, selStart, selEnd);
    onChange(nextVal);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selStart, selEnd);
      adjustHeight();
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
    const newPos = start + snippet.length;
    pushHistory(nextVal, newPos, newPos);
    onChange(nextVal);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
      adjustHeight();
    });
  };

  // Table template
  const insertTable = () => {
    const tableTemplate = `\n| Header 1 | Header 2 | Header 3 |\n| :--- | :---: | ---: |\n| Row 1 Col 1 | Row 1 Col 2 | Row 1 Col 3 |\n| Row 2 Col 1 | Row 2 Col 2 | Row 2 Col 3 |\n\n`;
    insertSnippet(tableTemplate);
  };

  // Keyboard shortcut listener that works across all languages and keyboard layouts (including Bulgarian Phonetic & BDS)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      const code = e.code;
      const key = e.key.toLowerCase();

      // Undo: Ctrl+Z (without shift)
      if (!e.shiftKey && (code === "KeyZ" || key === "z" || key === "з" || key === "я")) {
        e.preventDefault();
        handleUndo();
        return;
      }
      // Redo: Ctrl+Y OR Ctrl+Shift+Z / Cmd+Shift+Z
      if (
        code === "KeyY" ||
        key === "y" ||
        key === "ъ" ||
        key === "н" ||
        (e.shiftKey && (code === "KeyZ" || key === "z" || key === "з" || key === "я"))
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Bold: physical KeyB OR character 'b' or Bulgarian 'б' or 'ф'
      if (code === "KeyB" || key === "b" || key === "б" || key === "ф") {
        e.preventDefault();
        wrapSelection("**", "**", "bold text");
      }
      // Italic: physical KeyI OR character 'i' or Bulgarian 'и' or 'ш'
      else if (code === "KeyI" || key === "i" || key === "и" || key === "ш") {
        e.preventDefault();
        wrapSelection("*", "*", "italic text");
      }
      // Underline: physical KeyU OR character 'u' or Bulgarian 'у' or 'г'
      else if (code === "KeyU" || key === "u" || key === "у" || key === "г") {
        e.preventDefault();
        wrapSelection("<u>", "</u>", "underlined text");
      }
      // Hyperlink: physical KeyK OR character 'k' or Bulgarian 'к' or 'в'
      else if (code === "KeyK" || key === "k" || key === "к" || key === "в") {
        e.preventDefault();
        handleOpenLinkPopover();
      }
      // Save on Ctrl+Enter (handles all layouts, key codes, and numpad)
      else if (
        key === "enter" ||
        code === "Enter" ||
        code === "NumpadEnter" ||
        e.keyCode === 13 ||
        e.which === 13
      ) {
        if (onSave) {
          e.preventDefault();
          e.stopPropagation();
          onSave();
        }
      }
    }
  };

  return (
    <div
      className={`rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs ${className}`}
      onKeyDown={(e) => {
        if (
          (e.ctrlKey || e.metaKey) &&
          (e.key?.toLowerCase() === "enter" ||
            e.code === "Enter" ||
            e.code === "NumpadEnter" ||
            e.keyCode === 13 ||
            e.which === 13)
        ) {
          if (onSave) {
            e.preventDefault();
            e.stopPropagation();
            onSave();
          }
        }
      }}
    >
      {/* Top Formatting Toolbar & Write/Preview Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-1 p-2 bg-muted/40 border-b border-border/70 select-none">
        {/* Left Formatting Action Buttons (Word-like Toolbar) */}
        <div className="flex flex-wrap items-center gap-0.5">
          {/* Undo & Redo Controls */}
          <div className="flex items-center gap-0.5 pr-1 border-r border-border/60">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!canUndo}
              className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
              onClick={handleUndo}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!canRedo}
              className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
              onClick={handleRedo}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
          </div>

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

          {/* Bold, Italic, Underline, Hyperlink */}
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

            {/* Hyperlink Tool with Markdown [text](url) and HTML <a href="..."> tag support */}
            <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground"
                  onClick={handleOpenLinkPopover}
                  title="Insert Hyperlink (Ctrl+K)"
                >
                  <Link2 className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3 shadow-lg" align="start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Insert Link</span>
                    <div className="flex items-center gap-1 text-[11px] bg-muted/60 p-0.5 rounded border border-border/40">
                      <button
                        type="button"
                        onClick={() => setLinkFormat("markdown")}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          linkFormat === "markdown"
                            ? "bg-background text-foreground shadow-2xs font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        title="Markdown format: [text](url)"
                      >
                        [Markdown]
                      </button>
                      <button
                        type="button"
                        onClick={() => setLinkFormat("html")}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          linkFormat === "html"
                            ? "bg-background text-foreground shadow-2xs font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        title='HTML format: <a href="...">text</a>'
                      >
                        &lt;a href&gt;
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-muted-foreground font-medium">Text to display</label>
                    <Input
                      value={linkText}
                      onChange={(e) => setLinkText(e.target.value)}
                      placeholder="e.g. My Website or Click Here"
                      className="h-8 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleApplyLink();
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-muted-foreground font-medium">URL (href)</label>
                    <Input
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="h-8 text-xs font-mono"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleApplyLink();
                        }
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setIsLinkPopoverOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 px-2.5 text-xs gap-1"
                      onClick={handleApplyLink}
                      disabled={!linkUrl.trim()}
                    >
                      <Check className="h-3 w-3" />
                      Apply Link
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
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

        {/* Right side: AI Prompt Copy Button & Mode Switch: Write vs Preview */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* AI Reformatting Prompt Copy Button */}
          <div className="flex items-center rounded-lg border border-border/70 overflow-hidden bg-background/90 shadow-2xs">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleCopyAiPrompt()}
              className={`h-7 px-2 text-xs gap-1.5 rounded-none border-r border-border/50 transition-all ${
                copiedPrompt
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 font-medium"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
              title="Click to copy AI reformatting prompt (for Google Docs AI / ChatGPT)"
            >
              {copiedPrompt ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span className="font-medium text-xs">AI Prompt</span>
                </>
              )}
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-5 rounded-none hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="View & customize AI Prompt"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-88 sm:w-[480px] p-3.5 shadow-2xl" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-border/50">
                    <div className="flex items-center gap-1.5 font-semibold text-xs">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      <span>AI Reformatting Prompt</span>
                    </div>
                    {/* Task vs Image Type Selector */}
                    <div className="flex items-center gap-1 bg-muted/70 p-0.5 rounded-md border border-border/40 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setAiPromptType("task")}
                        className={`px-2 py-0.5 rounded font-medium transition-colors ${
                          aiPromptType === "task"
                            ? "bg-background text-foreground shadow-2xs font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Task
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiPromptType("image")}
                        className={`px-2 py-0.5 rounded font-medium transition-colors ${
                          aiPromptType === "image"
                            ? "bg-background text-foreground shadow-2xs font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Image
                      </button>
                    </div>
                  </div>

                  {/* Target Platform Selector: Google Docs vs Chat AI */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground font-medium">Use with:</span>
                    <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded border border-border/40 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setAiTarget("docs")}
                        className={`px-2 py-0.5 rounded font-medium transition-colors ${
                          aiTarget === "docs"
                            ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        title="For Google Docs 'Help me write' over highlighted text"
                      >
                        Google Docs (Help me write)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiTarget("chat")}
                        className={`px-2 py-0.5 rounded font-medium transition-colors ${
                          aiTarget === "chat"
                            ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        title="For ChatGPT, Claude, or Gemini Web Chat"
                      >
                        Chat (Prompt + Text)
                      </button>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-muted/40 border border-border/50 text-[11px] text-muted-foreground space-y-1">
                    <div className="font-medium text-foreground text-[10px] uppercase tracking-wider">
                      {aiTarget === "docs" ? "How to use in Google Docs:" : "How to use in Chat AI:"}
                    </div>
                    {aiTarget === "docs" ? (
                      <ol className="list-decimal list-inside space-y-0.5 text-[10.5px]">
                        <li>Write or open your notes in Google Docs.</li>
                        <li>Highlight the text and click <strong>Help me write</strong> (the Gemini pencil).</li>
                        <li>Paste this copied prompt and click <strong>Create</strong>.</li>
                      </ol>
                    ) : (
                      <p className="text-[10.5px]">
                        Paste this prompt into ChatGPT, Claude, or Gemini. It instructs the AI with strict anti-hallucination rules to reformat your text.
                      </p>
                    )}
                  </div>

                  <div className="relative">
                    <textarea
                      readOnly
                      value={getFullPrompt(aiPromptType, aiTarget)}
                      className="w-full h-52 text-[10px] font-mono leading-relaxed p-2.5 rounded-lg bg-muted/20 border border-border/60 text-foreground resize-none focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/40">
                    <span className="text-[10px] text-muted-foreground">
                      {copiedPrompt ? "Copied to clipboard!" : "Strict zero-hallucination prompt"}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs gap-1.5 px-3.5"
                      onClick={() => handleCopyAiPrompt(aiTarget)}
                    >
                      {copiedPrompt ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-500" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy Prompt</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Toggle Attachments Explorer Button */}
          {onToggleExplorer && (
            <button
              type="button"
              onClick={onToggleExplorer}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                isExplorerOpen
                  ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                  : "bg-background/80 text-muted-foreground border-border/70 hover:text-foreground hover:bg-muted"
              }`}
              title={isExplorerOpen ? "Hide Attachments Explorer" : "Show Attachments Explorer"}
            >
              <Paperclip className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Attachments</span>
              {resources && resources.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background/25 font-bold">
                  {resources.length}
                </span>
              )}
            </button>
          )}

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
      </div>

      {/* Editor Content Body: Write Mode (Textarea) vs Preview Mode (Formatted Markdown) */}
      {activeTab === "write" ? (
        <div className="p-2">
          <Textarea
            ref={textareaRef}
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              const newVal = e.target.value;
              onChange(newVal);
              adjustHeight();

              if (isUndoRedoApplyingRef.current) {
                isUndoRedoApplyingRef.current = false;
                return;
              }

              if (typingTimerRef.current) {
                clearTimeout(typingTimerRef.current);
              }
              const s = e.target.selectionStart;
              const end = e.target.selectionEnd;
              typingTimerRef.current = setTimeout(() => {
                pushHistory(newVal, s, end);
              }, 350);
            }}
            onInput={adjustHeight}
            onKeyDown={handleKeyDown}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(e) => {
              const textData = e.dataTransfer.getData("text/plain");
              if (textData && textData.includes("{{attachment:")) {
                e.preventDefault();
                const textarea = textareaRef.current;
                if (!textarea) return;
                let insertPos = textarea.selectionStart;
                if (document.caretPositionFromPoint) {
                  const range = document.caretPositionFromPoint(e.clientX, e.clientY);
                  if (range && range.offsetNode === textarea) {
                    insertPos = range.offset;
                  }
                } else if ((document as any).caretRangeFromPoint) {
                  const range = (document as any).caretRangeFromPoint(e.clientX, e.clientY);
                  if (range) {
                    insertPos = range.startOffset;
                  }
                }
                const text = textarea.value;
                const formatted = `\n\n${textData.trim()}\n\n`;
                const nextVal = text.substring(0, insertPos) + formatted + text.substring(insertPos);
                const newPos = insertPos + formatted.length;
                pushHistory(nextVal, newPos, newPos);
                onChange(nextVal);
                requestAnimationFrame(() => {
                  textarea.focus();
                  textarea.setSelectionRange(newPos, newPos);
                  adjustHeight();
                });
              }
            }}
            style={{ minHeight }}
            className="border-0 shadow-none focus-visible:ring-0 text-sm leading-relaxed resize-none font-mono overflow-hidden transition-[height] duration-75"
          />
          <div className="flex items-center justify-between px-2 pt-1.5 text-[10px] text-muted-foreground border-t border-border/40">
            <span>
              Supports GitHub Markdown, tables, colors, highlights & HTML
            </span>
            <span className="hidden sm:inline">
              Shortcuts: <kbd className="px-1 py-0.5 bg-muted rounded border">Ctrl+Z</kbd> Undo •{" "}
              <kbd className="px-1 py-0.5 bg-muted rounded border">Ctrl+Y</kbd> Redo •{" "}
              <kbd className="px-1 py-0.5 bg-muted rounded border">Ctrl+B</kbd> Bold •{" "}
              <kbd className="px-1 py-0.5 bg-muted rounded border">Ctrl+I</kbd> Italic •{" "}
              <kbd className="px-1 py-0.5 bg-muted rounded border">Ctrl+U</kbd> Underline •{" "}
              <kbd className="px-1 py-0.5 bg-muted rounded border">Ctrl+K</kbd> Link •{" "}
              <kbd className="px-1.5 py-0.5 bg-primary/10 text-primary font-semibold rounded border border-primary/20">Ctrl+Enter</kbd> Save
            </span>
          </div>
        </div>
      ) : (
        <div
          className="p-4 bg-muted/10"
          style={{ minHeight }}
        >
          {value.trim() ? (
            <MarkdownRenderer
              content={value}
              resources={resources}
              onUpdateAttachmentSize={(resId, newSize) => {
                const clamped = Math.max(10, Math.min(100, Math.round(newSize)));
                if (onUpdateAttachmentSize) {
                  onUpdateAttachmentSize(resId, clamped);
                  return;
                }
                const tagRegex = new RegExp(
                  `{{\\s*(?:attachment|media|resource):\\s*${resId}(?:[\\s|]+(?:size=)?[^}]+)?\\s*}}`,
                  "gi"
                );
                const replacementTag =
                  clamped === 100 ? `{{attachment:${resId}}}` : `{{attachment:${resId} size=${clamped}%}}`;
                if (tagRegex.test(value)) {
                  onChange(value.replace(tagRegex, replacementTag));
                } else {
                  onChange(value.trim() ? `${value.trim()}\n\n${replacementTag}\n` : `${replacementTag}\n`);
                }
              }}
            />
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

