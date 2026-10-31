"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  StudyGroup,
  StudyGroupWithDetails,
  StudyGroupConnection,
} from "@/types/database.types";
import { Network, Link2, Trash2, ArrowRight, Sparkles, X } from "lucide-react";
import { getGroupIconComponent } from "./StudyGroupModal";

interface ConnectGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceGroup: StudyGroupWithDetails | null;
  allGroups: StudyGroup[];
  connections: StudyGroupConnection[];
  onConnect: (sourceGroupId: string, targetGroupId: string, label?: string) => Promise<void>;
  onDisconnect: (connectionId: string) => Promise<void>;
}

export function ConnectGroupsModal({
  isOpen,
  onClose,
  sourceGroup,
  allGroups,
  connections,
  onConnect,
  onDisconnect,
}: ConnectGroupsModalProps) {
  const [targetGroupId, setTargetGroupId] = useState("");
  const [connectionLabel, setConnectionLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!sourceGroup) return null;

  // Find all current connections for sourceGroup
  const existingConnections = connections.filter(
    (c) =>
      c.source_group_id === sourceGroup.id || c.target_group_id === sourceGroup.id
  );

  const connectedGroupIds = new Set(
    existingConnections.map((c) =>
      c.source_group_id === sourceGroup.id ? c.target_group_id : c.source_group_id
    )
  );

  // Groups eligible to connect (not self, and not already connected)
  const eligibleTargets = allGroups.filter(
    (g) => g.id !== sourceGroup.id && !connectedGroupIds.has(g.id)
  );

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetGroupId) {
      setError("Please select a target group to connect with.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onConnect(sourceGroup.id, targetGroupId, connectionLabel.trim() || undefined);
      setTargetGroupId("");
      setConnectionLabel("");
    } catch (err: any) {
      console.error("Failed to connect groups:", err);
      setError(err?.message || "Failed to create connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const SourceIcon = getGroupIconComponent(sourceGroup.icon);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Network className="h-4 w-4" />
            </span>
            <span>Cross-Group Connections &amp; Topic Relations</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Link groups across different parent categories to build a knowledge graph (e.g.
            connect &quot;Environment Art - Texturing&quot; to &quot;Photoreal Visualisation - Shading&quot;).
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-2.5 text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4 text-xs">
          {/* Source Group Banner */}
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl border bg-muted/30">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white shrink-0"
              style={{ backgroundColor: sourceGroup.color }}
            >
              <SourceIcon className="h-4 w-4" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-foreground text-xs truncate">
                {sourceGroup.name}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {sourceGroup.parent ? `Parent: ${sourceGroup.parent.name}` : "Top-Level Study Field"}
              </div>
            </div>
          </div>

          {/* New Connection Form */}
          <form onSubmit={handleConnect} className="space-y-3 p-3 rounded-xl border border-dashed bg-card/60">
            <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5 text-primary" />
              <span>Connect to Another Study Group</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Target Group</Label>
              <Select value={targetGroupId} onValueChange={setTargetGroupId}>
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder="Choose a group to connect..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {eligibleTargets.length === 0 ? (
                    <div className="p-2 text-center text-xs text-muted-foreground">
                      No other groups available to connect
                    </div>
                  ) : (
                    eligibleTargets.map((g) => {
                      const parent = allGroups.find((p) => p.id === g.parent_id);
                      return (
                        <SelectItem key={g.id} value={g.id} className="text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: g.color }}
                            />
                            <span>{g.name}</span>
                            {parent && (
                              <span className="text-[10px] text-muted-foreground">
                                (under {parent.name})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="conn-label" className="text-xs">
                Relationship Note / Cross-Reference Reason (Optional)
              </Label>
              <Input
                id="conn-label"
                value={connectionLabel}
                onChange={(e) => setConnectionLabel(e.target.value)}
                placeholder="e.g. Shared PBR roughness workflow, Prerequisite technique..."
                className="text-xs h-8"
              />
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !targetGroupId}
              className="w-full text-xs h-8 gap-1.5"
            >
              <Link2 className="h-3 w-3" />
              {isSubmitting ? "Connecting..." : "Add Connection"}
            </Button>
          </form>

          {/* Active Connections List */}
          <div className="space-y-2">
            <div className="font-semibold text-foreground text-xs flex items-center justify-between">
              <span>Active Cross-Connections ({existingConnections.length})</span>
            </div>

            {existingConnections.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 italic text-center">
                No cross-group connections yet. Connect with another study topic above!
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {existingConnections.map((conn) => {
                  const otherGroupId =
                    conn.source_group_id === sourceGroup.id
                      ? conn.target_group_id
                      : conn.source_group_id;
                  const otherGroup = allGroups.find((g) => g.id === otherGroupId);
                  if (!otherGroup) return null;
                  const otherParent = allGroups.find((p) => p.id === otherGroup.parent_id);

                  return (
                    <div
                      key={conn.id}
                      className="flex items-start justify-between gap-2 p-2 rounded-lg border bg-muted/20 text-xs"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: otherGroup.color }}
                          />
                          <span className="font-medium text-foreground truncate">
                            {otherGroup.name}
                          </span>
                          {otherParent && (
                            <span className="text-[10px] text-muted-foreground truncate">
                              ({otherParent.name})
                            </span>
                          )}
                        </div>
                        {conn.label && (
                          <div className="text-[11px] text-muted-foreground italic pl-3.5">
                            &quot;{conn.label}&quot;
                          </div>
                        )}
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                        title="Remove connection"
                        onClick={() => onDisconnect(conn.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose} className="text-xs h-8">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

