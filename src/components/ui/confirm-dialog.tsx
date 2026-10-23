"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "default";
  isLoading?: boolean;
  /**
   * If provided, the user must type this exact text (case-insensitive) to confirm.
   */
  requiredMatchText?: string;
  matchPlaceholder?: string;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "destructive",
  isLoading = false,
  requiredMatchText,
  matchPlaceholder,
}: ConfirmDialogProps) {
  const [typedMatch, setTypedMatch] = useState("");

  // Reset typed input when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setTypedMatch("");
    }
  }, [isOpen]);

  const isMatchValid = requiredMatchText
    ? typedMatch.trim().toLowerCase() === requiredMatchText.trim().toLowerCase()
    : true;

  const handleConfirm = async () => {
    if (!isMatchValid || isLoading) return;
    await onConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                variant === "destructive"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-primary/15 text-primary"
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
            {description}
          </DialogDescription>
        </DialogHeader>

        {requiredMatchText && (
          <div className="space-y-2 py-2">
            <p className="text-xs text-foreground font-medium">
              To verify, type{" "}
              <span className="font-mono font-bold bg-muted px-1.5 py-0.5 rounded border text-primary">
                {requiredMatchText}
              </span>{" "}
              below:
            </p>
            <Input
              value={typedMatch}
              onChange={(e) => setTypedMatch(e.target.value)}
              placeholder={matchPlaceholder || `Type "${requiredMatchText}" to confirm`}
              className="text-xs font-mono"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && isMatchValid) {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="text-xs"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant}
            size="sm"
            onClick={handleConfirm}
            disabled={!isMatchValid || isLoading}
            className="text-xs gap-1.5"
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

