"use client";

import React, { useState } from "react";
import {
  Upload,
  Link as LinkIcon,
  Video,
  FileText,
  ImageIcon,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
  Play,
  Globe,
} from "lucide-react";
import { ResourceWithFiles } from "@/types/database.types";
import { uploadTaskAttachment, addMediaLinkAttachment } from "@/lib/supabase/actions";
import { validateMediaUrl, extractYouTubeId } from "@/lib/media-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface AddAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  onAttachmentCreated: (newResource: ResourceWithFiles, insertTagImmediately: boolean, size?: number) => void;
}

export function AddAttachmentModal({
  isOpen,
  onClose,
  taskId,
  onAttachmentCreated,
}: AddAttachmentModalProps) {
  const [activeTab, setActiveTab] = useState<"file" | "link">("file");

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileDescription, setFileDescription] = useState("");
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  // Link State
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");
  const [linkDescription, setLinkDescription] = useState("");
  const [mediaWarning, setMediaWarning] = useState<string | null>(null);

  // Auto-insert checkbox & size
  const [insertImmediately, setInsertImmediately] = useState(true);
  const [insertSize, setInsertSize] = useState<number>(100);
  const [insertSizeInput, setInsertSizeInput] = useState<string>("100");

  const commitInsertSize = () => {
    let num = parseInt(insertSizeInput, 10);
    if (isNaN(num)) {
      num = insertSize;
    } else {
      num = Math.max(10, Math.min(100, num));
    }
    setInsertSize(num);
    setInsertSizeInput(String(num));
  };

  // Loading & error
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    setSelectedFile(null);
    setFileName("");
    setFileDescription("");
    setFilePreviewUrl(null);
    setLinkUrl("");
    setLinkName("");
    setLinkDescription("");
    setMediaWarning(null);
    setErrorMessage(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFileName(file.name);
    setErrorMessage(null);

    // If image, create temporary preview URL
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleDropFile = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFileName(file.name);
    setErrorMessage(null);

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleLinkUrlChange = (val: string) => {
    setLinkUrl(val);
    setErrorMessage(null);

    if (!val.trim()) {
      setMediaWarning(null);
      return;
    }

    const validated = validateMediaUrl(val.trim());
    if (validated.isValid) {
      setMediaWarning(null);
      if (!linkName && validated.suggestedTitle) {
        setLinkName(validated.suggestedTitle);
      }
    } else {
      setMediaWarning(validated.warning || "Unsupported URL format.");
    }
  };

  const handleSubmitFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage("Please select a file to upload.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const newResource = await uploadTaskAttachment(
        taskId,
        selectedFile,
        fileName.trim() || selectedFile.name,
        fileDescription.trim() || null
      );

      onAttachmentCreated(newResource, insertImmediately, insertSize);
      handleClose();
    } catch (err: any) {
      console.error("Failed to upload attachment:", err);
      setErrorMessage(err.message || "Failed to upload file. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = linkUrl.trim();
    if (!url) {
      setErrorMessage("Please enter a media or web link.");
      return;
    }

    const validated = validateMediaUrl(url);
    if (!validated.isValid) {
      setMediaWarning(validated.warning || "Unsupported URL format.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setMediaWarning(null);

    try {
      let finalName = linkName.trim();
      if (!finalName) {
        if (validated.type === "youtube") finalName = "YouTube Video";
        else if (validated.type === "vimeo") finalName = "Vimeo Video";
        else if (validated.suggestedTitle) finalName = validated.suggestedTitle;
        else finalName = "Web Media";
      }

      const newResource = await addMediaLinkAttachment(
        taskId,
        validated.url,
        finalName,
        linkDescription.trim() || null
      );

      onAttachmentCreated(newResource, insertImmediately, insertSize);
      handleClose();
    } catch (err: any) {
      console.error("Failed to add link attachment:", err);
      setErrorMessage(err.message || "Failed to add link. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview info for link
  const linkValidated = linkUrl.trim() ? validateMediaUrl(linkUrl.trim()) : null;
  const linkYtId = linkUrl.trim() ? extractYouTubeId(linkUrl.trim()) : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl border border-border/80 shadow-2xl">
        <DialogHeader className="p-5 pb-3 border-b bg-muted/20">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <Upload className="h-4 w-4 text-primary" />
            <span>Add Task Attachment</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Upload files, images, videos or link web media with descriptions to embed directly in the task description.
          </DialogDescription>

          {/* Tab Selector */}
          <div className="flex items-center gap-2 pt-3">
            <button
              type="button"
              onClick={() => setActiveTab("file")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                activeTab === "file"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/80"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Upload File / Media</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("link")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                activeTab === "link"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/80"
              }`}
            >
              <LinkIcon className="h-3.5 w-3.5" />
              <span>Web Link / YouTube</span>
            </button>
          </div>
        </DialogHeader>

        {errorMessage && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* TAB 1: FILE UPLOAD */}
        {activeTab === "file" && (
          <form onSubmit={handleSubmitFile} className="p-5 space-y-4">
            {/* File Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDropFile}
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                selectedFile
                  ? "border-primary/60 bg-primary/5"
                  : "border-border/80 hover:border-primary/40 bg-muted/10 hover:bg-muted/20"
              }`}
            >
              <input
                type="file"
                id="file-attachment-input"
                onChange={handleFileChange}
                className="hidden"
              />

              {!selectedFile ? (
                <label
                  htmlFor="file-attachment-input"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
                    <Upload className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    Click to browse or drag and drop file here
                  </span>
                  <span className="text-[11px] text-muted-foreground/70">
                    Images (JPG, PNG, WebP, GIF), Videos (MP4, WebM), PDFs, or Documents
                  </span>
                </label>
              ) : (
                <div className="flex items-center gap-3 text-left">
                  {filePreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={filePreviewUrl}
                      alt="Preview"
                      className="h-14 w-14 rounded-xl object-cover border border-border/80 shrink-0"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FileText className="h-6 w-6" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-foreground block truncate">
                      {selectedFile.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type || "file"}
                    </span>
                  </div>
                  <label
                    htmlFor="file-attachment-input"
                    className="cursor-pointer text-[11px] font-medium text-primary hover:underline shrink-0 px-2 py-1"
                  >
                    Change
                  </label>
                </div>
              )}
            </div>

            {/* Attachment Name Field */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Attachment Name (optional)
              </label>
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Custom title or filename..."
                className="h-8 text-xs"
              />
            </div>

            {/* Description / Caption Field */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Description / Caption (optional)
              </label>
              <Textarea
                value={fileDescription}
                onChange={(e) => setFileDescription(e.target.value)}
                placeholder="Write notes, description or acceptance context for this attachment..."
                rows={3}
                className="text-xs"
              />
            </div>

            {/* Auto-insert checkbox */}
            <div className="space-y-1.5 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground select-none">
                <input
                  type="checkbox"
                  checked={insertImmediately}
                  onChange={(e) => setInsertImmediately(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span className="font-medium">
                  Insert <code>&#123;&#123;attachment:...&#125;&#125;</code> tag into description automatically
                </span>
              </label>

              {insertImmediately && (
                <div className="flex items-center gap-2 pl-6 text-xs text-muted-foreground">
                  <span className="text-[11px] font-medium">Tag Size:</span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
                      <input
                        type="number"
                        min={10}
                        max={100}
                        value={insertSizeInput}
                        onChange={(e) => setInsertSizeInput(e.target.value)}
                        onBlur={commitInsertSize}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          }
                        }}
                        className="w-9 h-5 text-center text-[11px] font-bold bg-background text-foreground border border-border/70 rounded px-0.5 focus:outline-hidden focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        title="Type width percentage (10% to 100%) and press Enter"
                      />
                      <span className="text-[10px] font-bold text-muted-foreground select-none">%</span>
                    </div>
                    <div className="flex items-center gap-0.5 border-l border-border/50 pl-1">
                      {([50, 75, 100] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setInsertSize(s);
                            setInsertSizeInput(String(s));
                          }}
                          className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${
                            insertSize === s
                              ? "bg-primary text-primary-foreground shadow-2xs"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                        >
                          {s}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!selectedFile || isSubmitting}
                className="h-8 text-xs gap-1.5 font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload &amp; Attach</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* TAB 2: WEB MEDIA / YOUTUBE LINK */}
        {activeTab === "link" && (
          <form onSubmit={handleSubmitLink} className="p-5 space-y-4">
            {/* Link URL Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Media URL (YouTube, Vimeo, MP4, or Image URL)
              </label>
              <Input
                value={linkUrl}
                onChange={(e) => handleLinkUrlChange(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or direct .mp4/.png URL"
                className="h-8 text-xs"
              />
            </div>

            {/* URL Validation Feedback & Preview */}
            {mediaWarning && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{mediaWarning}</span>
              </div>
            )}

            {linkValidated && linkValidated.isValid && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                {linkYtId ? (
                  <div className="relative h-12 w-20 rounded-lg overflow-hidden bg-black shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://img.youtube.com/vi/${linkYtId}/hqdefault.jpg`}
                      alt="Thumbnail preview"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Play className="h-3.5 w-3.5 text-white fill-current" />
                    </div>
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Globe className="h-5 w-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Valid {linkValidated.type.toUpperCase()} Link
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate block">
                    {linkValidated.url}
                  </span>
                </div>
              </div>
            )}

            {/* Custom Link Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Title / Name (optional)
              </label>
              <Input
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                placeholder="e.g. Gameplay Walkthrough or Reference Clip..."
                className="h-8 text-xs"
              />
            </div>

            {/* Description / Notes */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Description / Notes (optional)
              </label>
              <Textarea
                value={linkDescription}
                onChange={(e) => setLinkDescription(e.target.value)}
                placeholder="Write timestamps, notes or instructions for this clip/link..."
                rows={3}
                className="text-xs"
              />
            </div>

            {/* Auto-insert checkbox */}
            <div className="space-y-1.5 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground select-none">
                <input
                  type="checkbox"
                  checked={insertImmediately}
                  onChange={(e) => setInsertImmediately(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span className="font-medium">
                  Insert <code>&#123;&#123;attachment:...&#125;&#125;</code> tag into description automatically
                </span>
              </label>

              {insertImmediately && (
                <div className="flex items-center gap-2 pl-6 text-xs text-muted-foreground">
                  <span className="text-[11px] font-medium">Tag Size:</span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
                      <input
                        type="number"
                        min={10}
                        max={100}
                        value={insertSizeInput}
                        onChange={(e) => setInsertSizeInput(e.target.value)}
                        onBlur={commitInsertSize}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          }
                        }}
                        className="w-9 h-5 text-center text-[11px] font-bold bg-background text-foreground border border-border/70 rounded px-0.5 focus:outline-hidden focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        title="Type width percentage (10% to 100%) and press Enter"
                      />
                      <span className="text-[10px] font-bold text-muted-foreground select-none">%</span>
                    </div>
                    <div className="flex items-center gap-0.5 border-l border-border/50 pl-1">
                      {([50, 75, 100] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setInsertSize(s);
                            setInsertSizeInput(String(s));
                          }}
                          className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${
                            insertSize === s
                              ? "bg-primary text-primary-foreground shadow-2xs"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                        >
                          {s}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!linkUrl.trim() || Boolean(mediaWarning) || isSubmitting}
                className="h-8 text-xs gap-1.5 font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Attaching...</span>
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-3.5 w-3.5" />
                    <span>Attach Link</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

