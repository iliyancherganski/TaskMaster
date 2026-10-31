"use client";

import React, { useState, useMemo } from "react";
import {
  StudyGroup,
  StudyGroupWithDetails,
  StudyGroupConnection,
  EducationalMaterial,
  EducationalMaterialWithDetails,
  MaterialType,
} from "@/types/database.types";
import {
  GraduationCap,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  ExternalLink,
  Pencil,
  Trash2,
  Network,
  Link2,
  Tag,
  Star,
  Clock,
  Check,
  Copy,
  BookOpen,
  Video,
  Layers,
  Sparkles,
  ArrowRight,
  CheckSquare,
  Filter,
  X,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  StudyGroupModal,
  getGroupIconComponent,
} from "./StudyGroupModal";
import { ConnectGroupsModal } from "./ConnectGroupsModal";
import {
  MaterialModal,
  MATERIAL_TYPES,
  getMaterialTypeMeta,
} from "./MaterialModal";

interface EducationHubViewProps {
  groups: StudyGroupWithDetails[];
  flatGroups: StudyGroup[];
  materials: EducationalMaterialWithDetails[];
  connections: StudyGroupConnection[];
  allTags: string[];
  onSaveGroup: (data: {
    name: string;
    description?: string;
    color: string;
    icon: string;
    parent_id: string | null;
    tags: string[];
  }, editingGroupId?: string) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
  onConnectGroups: (sourceGroupId: string, targetGroupId: string, label?: string) => Promise<void>;
  onDisconnectGroups: (connectionId: string) => Promise<void>;
  onSaveMaterial: (data: {
    title: string;
    url?: string | null;
    type: string;
    description?: string | null;
    group_id?: string | null;
    tags: string[];
    difficulty?: string | null;
    is_favorite?: boolean;
    estimated_duration?: string | null;
  }, editingMaterialId?: string) => Promise<void>;
  onDeleteMaterial: (materialId: string) => Promise<void>;
  onOpenTask?: (taskId: string) => void;
}

export function EducationHubView({
  groups,
  flatGroups,
  materials,
  connections,
  allTags,
  onSaveGroup,
  onDeleteGroup,
  onConnectGroups,
  onDisconnectGroups,
  onSaveMaterial,
  onDeleteMaterial,
  onOpenTask,
}: EducationHubViewProps) {
  // Navigation / Selection State
  const [selectedGroupId, setSelectedGroupId] = useState<string | "all">("all");
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(() => {
    // Default open root groups that have children
    const initial = new Set<string>();
    groups.forEach((g) => {
      if (g.children && g.children.length > 0) initial.add(g.id);
    });
    return initial;
  });

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // Modals State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<StudyGroup | null>(null);
  const [defaultParentIdForNewGroup, setDefaultParentIdForNewGroup] = useState<string | null>(null);

  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [sourceGroupForConnection, setSourceGroupForConnection] = useState<StudyGroupWithDetails | null>(null);

  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<EducationalMaterial | null>(null);
  const [defaultGroupIdForNewMaterial, setDefaultGroupIdForNewMaterial] = useState<string | null>(null);

  // Deletion Confirmations
  const [groupToDelete, setGroupToDelete] = useState<StudyGroup | null>(null);
  const [materialToDelete, setMaterialToDelete] = useState<EducationalMaterial | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Copied link animation state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleGroupExpanded = (groupId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Find active group object if one is selected
  const activeGroup = useMemo(() => {
    if (selectedGroupId === "all") return null;
    return flatGroups.find((g) => g.id === selectedGroupId) || null;
  }, [selectedGroupId, flatGroups]);

  // Find detailed active group (with children and connected groups)
  const activeDetailedGroup = useMemo(() => {
    if (!activeGroup) return null;
    const findInTree = (list: StudyGroupWithDetails[]): StudyGroupWithDetails | null => {
      for (const item of list) {
        if (item.id === activeGroup.id) return item;
        if (item.children && item.children.length > 0) {
          const found = findInTree(item.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findInTree(groups);
  }, [activeGroup, groups]);

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      // 1. Group Filter (includes descendant subgroups)
      if (selectedGroupId !== "all") {
        const descendantIds = new Set<string>([selectedGroupId]);
        let added = true;
        while (added) {
          added = false;
          for (const g of flatGroups) {
            if (g.parent_id && descendantIds.has(g.parent_id) && !descendantIds.has(g.id)) {
              descendantIds.add(g.id);
              added = true;
            }
          }
        }
        if (!m.group_id || !descendantIds.has(m.group_id)) return false;
      }

      // 2. Type Filter
      if (selectedType !== "all" && m.type !== selectedType) {
        return false;
      }

      // 3. Tag Filter
      if (selectedTag !== "all") {
        if (!m.tags || !m.tags.includes(selectedTag)) return false;
      }

      // 4. Favorites Only
      if (favoritesOnly && !m.is_favorite) {
        return false;
      }

      // 5. Search Query (title, description, tags, url)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = m.title.toLowerCase().includes(q);
        const matchesDesc = m.description?.toLowerCase().includes(q) ?? false;
        const matchesUrl = m.url?.toLowerCase().includes(q) ?? false;
        const matchesTags = m.tags?.some((t) => t.toLowerCase().includes(q)) ?? false;
        if (!matchesTitle && !matchesDesc && !matchesUrl && !matchesTags) {
          return false;
        }
      }

      return true;
    });
  }, [materials, selectedGroupId, flatGroups, selectedType, selectedTag, favoritesOnly, searchQuery]);

  // Open modals handlers
  const handleOpenCreateRootGroup = () => {
    setEditingGroup(null);
    setDefaultParentIdForNewGroup(null);
    setIsGroupModalOpen(true);
  };

  const handleOpenCreateSubgroup = (parentId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingGroup(null);
    setDefaultParentIdForNewGroup(parentId);
    setIsGroupModalOpen(true);
  };

  const handleOpenEditGroup = (g: StudyGroup, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingGroup(g);
    setDefaultParentIdForNewGroup(g.parent_id);
    setIsGroupModalOpen(true);
  };

  const handleOpenConnectModal = (g: StudyGroupWithDetails, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSourceGroupForConnection(g);
    setIsConnectModalOpen(true);
  };

  const handleOpenCreateMaterial = (groupId?: string) => {
    setEditingMaterial(null);
    setDefaultGroupIdForNewMaterial(
      groupId || (selectedGroupId !== "all" ? selectedGroupId : null)
    );
    setIsMaterialModalOpen(true);
  };

  const handleOpenEditMaterial = (m: EducationalMaterial) => {
    setEditingMaterial(m);
    setDefaultGroupIdForNewMaterial(m.group_id);
    setIsMaterialModalOpen(true);
  };

  const handleConfirmDeleteGroup = async () => {
    if (!groupToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteGroup(groupToDelete.id);
      if (selectedGroupId === groupToDelete.id) {
        setSelectedGroupId("all");
      }
      setGroupToDelete(null);
    } catch (err) {
      console.error("Failed to delete group:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDeleteMaterial = async () => {
    if (!materialToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteMaterial(materialToDelete.id);
      setMaterialToDelete(null);
    } catch (err) {
      console.error("Failed to delete material:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper to render tree node recursively
  const renderGroupTreeNode = (item: StudyGroupWithDetails, depth = 0) => {
    const isSelected = selectedGroupId === item.id;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedGroupIds.has(item.id);
    const IconComp = getGroupIconComponent(item.icon);
    const connCount = item.connected_groups?.length || 0;

    return (
      <div key={item.id} className="select-none">
        <div
          onClick={() => setSelectedGroupId(item.id)}
          className={`group flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
            isSelected
              ? "bg-primary/10 text-primary font-semibold shadow-2xs"
              : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
          }`}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleGroupExpanded(item.id, e)}
                className="p-0.5 rounded hover:bg-muted text-muted-foreground"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            ) : (
              <span className="w-3" />
            )}

            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />

            <IconComp className="h-3.5 w-3.5 shrink-0 opacity-80" />

            <span className="truncate">{item.name}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {connCount > 0 && (
              <span
                className="px-1 py-0.2 rounded text-[9px] bg-sky-500/10 text-sky-600 dark:text-sky-400 font-medium flex items-center gap-0.5"
                title={`${connCount} cross-group topic connections`}
              >
                <Network className="h-2.5 w-2.5" />
                {connCount}
              </span>
            )}

            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/80 text-muted-foreground font-mono">
              {item.materials_count || 0}
            </span>

            {/* Quick hover actions */}
            <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
              <button
                type="button"
                onClick={(e) => handleOpenCreateSubgroup(item.id, e)}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Add nested subgroup"
              >
                <Plus className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={(e) => handleOpenEditGroup(item, e)}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Edit group"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setGroupToDelete(item);
                }}
                className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Delete group"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5 mt-0.5">
            {item.children!.map((child) => renderGroupTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Banner Stats & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 text-primary shadow-xs">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                Knowledge &amp; Educational Materials Hub
              </h1>
              <Badge variant="outline" className="text-[10px] font-semibold text-primary border-primary/30">
                {materials.length} Materials
              </Badge>
              <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground">
                {flatGroups.length} Study Fields
              </Badge>
              {connections.length > 0 && (
                <Badge variant="outline" className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 border-sky-500/30">
                  {connections.length} Topic Graph Links
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Organize video tutorials, courses, study guides, and forums into nested study groups and cross-link directly to tasks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenCreateRootGroup}
            className="text-xs h-8 gap-1.5 rounded-xl cursor-pointer"
          >
            <Folder className="h-3.5 w-3.5 text-primary" />
            <span>New Study Field</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => handleOpenCreateMaterial()}
            className="text-xs h-8 gap-1.5 rounded-xl shadow-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Educational Material</span>
          </Button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Sidebar: Study Fields & Nested Subgroups Tree (3 cols) */}
        <div className="lg:col-span-4 xl:col-span-3 rounded-2xl border border-border/80 bg-card p-3 shadow-xs space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>Study Fields &amp; Groups</span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleOpenCreateRootGroup}
              className="h-6 px-1.5 text-[11px] text-primary hover:text-primary gap-0.5 rounded-lg"
              title="Add root study field"
            >
              <Plus className="h-3 w-3" />
              <span>Add Field</span>
            </Button>
          </div>

          <div className="space-y-1">
            {/* All Materials Item */}
            <div
              onClick={() => setSelectedGroupId("all")}
              className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer select-none ${
                selectedGroupId === "all"
                  ? "bg-primary/10 text-primary font-bold shadow-2xs"
                  : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                <span>All Educational Materials</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/80 text-muted-foreground font-mono">
                {materials.length}
              </span>
            </div>

            {/* Hierarchical Groups Tree */}
            <div className="space-y-0.5 pt-1">
              {groups.map((rootGroup) => renderGroupTreeNode(rootGroup, 0))}
            </div>
          </div>
        </div>

        {/* Right Content Area: Group Overview & Materials Grid (9 cols) */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {/* Active Group Details Card (Shown if a specific group is selected) */}
          {activeDetailedGroup && (
            <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-xs shrink-0"
                    style={{ backgroundColor: activeDetailedGroup.color }}
                  >
                    {React.createElement(getGroupIconComponent(activeDetailedGroup.icon), {
                      className: "h-4.5 w-4.5",
                    })}
                  </span>
                  <div>
                    {/* Nesting Breadcrumbs */}
                    {activeDetailedGroup.parent && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium mb-0.5">
                        <span
                          className="hover:underline cursor-pointer"
                          onClick={() => setSelectedGroupId(activeDetailedGroup.parent!.id)}
                        >
                          {activeDetailedGroup.parent.name}
                        </span>
                        <ChevronRight className="h-3 w-3" />
                        <span className="text-foreground">{activeDetailedGroup.name}</span>
                      </div>
                    )}
                    <h2 className="text-base font-bold text-foreground leading-tight">
                      {activeDetailedGroup.name}
                    </h2>
                  </div>
                </div>

                {/* Group Actions */}
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 rounded-lg"
                    onClick={() => handleOpenConnectModal(activeDetailedGroup)}
                  >
                    <Network className="h-3 w-3 text-sky-500" />
                    <span>Connect Topic</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 rounded-lg"
                    onClick={(e) => handleOpenCreateSubgroup(activeDetailedGroup.id, e)}
                  >
                    <Plus className="h-3 w-3 text-primary" />
                    <span>Subgroup</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 rounded-lg"
                    onClick={(e) => handleOpenEditGroup(activeDetailedGroup, e)}
                  >
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                    <span>Edit</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 rounded-lg text-destructive hover:bg-destructive/10 border-destructive/30"
                    onClick={() => setGroupToDelete(activeDetailedGroup)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {activeDetailedGroup.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {activeDetailedGroup.description}
                </p>
              )}

              {/* Tags */}
              {activeDetailedGroup.tags && activeDetailedGroup.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {activeDetailedGroup.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-muted text-muted-foreground font-medium"
                    >
                      <Tag className="h-2.5 w-2.5 text-primary" />
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Cross-Group Connections Box */}
              {activeDetailedGroup.connected_groups &&
                activeDetailedGroup.connected_groups.length > 0 && (
                  <div className="p-2.5 rounded-xl border bg-muted/20 space-y-1.5">
                    <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
                        <Network className="h-3.5 w-3.5" />
                        <span>Connected Topics &amp; Cross-References</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenConnectModal(activeDetailedGroup)}
                        className="text-[10px] text-primary hover:underline font-normal"
                      >
                        + Manage Connections
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {activeDetailedGroup.connected_groups.map((conn) => (
                        <div
                          key={conn.connection_id}
                          onClick={() => setSelectedGroupId(conn.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-xs cursor-pointer shadow-2xs group/conn"
                          title={conn.label ? `Relation: "${conn.label}"` : `Jump to ${conn.name}`}
                        >
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: conn.color || "#3b82f6" }}
                          />
                          <span className="font-semibold text-foreground group-hover/conn:text-primary">
                            {conn.name}
                          </span>
                          {conn.parent_name && (
                            <span className="text-[10px] text-muted-foreground">
                              ({conn.parent_name})
                            </span>
                          )}
                          {conn.label && (
                            <span className="text-[10px] text-muted-foreground/80 italic pl-1 border-l border-border/60">
                              {conn.label}
                            </span>
                          )}
                          <ArrowRight className="h-3 w-3 text-muted-foreground opacity-60 group-hover/conn:opacity-100 group-hover/conn:translate-x-0.5 transition-transform" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Filter & Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl border border-border/80 bg-card shadow-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search materials by title, notes, url, tags..."
                  className="pl-8 text-xs h-8"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Type Filter Buttons */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-0.5">
              <Button
                type="button"
                variant={selectedType === "all" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSelectedType("all")}
                className="h-7 px-2 text-xs rounded-lg"
              >
                All Types
              </Button>
              {MATERIAL_TYPES.slice(0, 5).map((m) => {
                const Icon = m.icon;
                const isSelected = selectedType === m.type;
                return (
                  <Button
                    key={m.type}
                    type="button"
                    variant={isSelected ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedType(isSelected ? "all" : m.type)}
                    className="h-7 px-2 text-xs gap-1 rounded-lg"
                  >
                    <Icon className="h-3 w-3" />
                    <span>{m.label.split("/")[0]}</span>
                  </Button>
                );
              })}

              <Button
                type="button"
                variant={favoritesOnly ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setFavoritesOnly(!favoritesOnly)}
                className={`h-7 px-2 text-xs gap-1 rounded-lg ${
                  favoritesOnly ? "text-amber-500 font-semibold" : ""
                }`}
                title="Filter favorites"
              >
                <Star className={`h-3 w-3 ${favoritesOnly ? "fill-amber-500" : ""}`} />
                <span>Favorites</span>
              </Button>
            </div>
          </div>

          {/* Active Tag Pills (if tags exist) */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs">
              <span className="text-[11px] text-muted-foreground font-medium shrink-0 flex items-center gap-1">
                <Tag className="h-3 w-3" />
                Tags:
              </span>
              <button
                type="button"
                onClick={() => setSelectedTag("all")}
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                  selectedTag === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(selectedTag === tag ? "all" : tag)}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors shrink-0 ${
                    selectedTag === tag
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* Materials Grid */}
          {filteredMaterials.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed text-center bg-card">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">No Educational Materials Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                {searchQuery || selectedType !== "all" || selectedTag !== "all" || favoritesOnly
                  ? "No materials match the active filters. Try clearing your filters or search query."
                  : "Add your first video course, YouTube tutorial, study guide, or website link to this study field."}
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => handleOpenCreateMaterial(activeGroup?.id)}
                className="mt-4 text-xs h-8 gap-1.5 rounded-xl cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Educational Material</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredMaterials.map((material) => {
                const typeMeta = getMaterialTypeMeta(material.type);
                const TypeIcon = typeMeta.icon;
                const isCopied = copiedId === material.id;

                return (
                  <div
                    key={material.id}
                    className="group relative flex flex-col justify-between p-4 rounded-2xl border border-border/80 bg-card hover:border-slate-400/80 dark:hover:border-border hover:shadow-md transition-all text-xs overflow-hidden"
                  >
                    {/* Top Type Accent Strip */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{ backgroundColor: typeMeta.color }}
                    />

                    <div className="space-y-2.5">
                      {/* Card Header: Type Badge, Group Badge, Actions */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white shadow-2xs"
                            style={{ backgroundColor: typeMeta.color }}
                          >
                            <TypeIcon className="h-3 w-3" />
                            <span>{typeMeta.label}</span>
                          </span>

                          {material.group && (
                            <button
                              type="button"
                              onClick={() => setSelectedGroupId(material.group!.id)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-muted/80 hover:bg-muted text-muted-foreground font-medium transition-colors"
                              title="Click to filter by this study field"
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: material.group.color }}
                              />
                              <span className="truncate max-w-[130px]">
                                {material.group_path && material.group_path.length > 1
                                  ? material.group_path[material.group_path.length - 1]
                                  : material.group.name}
                              </span>
                            </button>
                          )}

                          {material.is_favorite && (
                            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          {material.url && (
                            <button
                              type="button"
                              onClick={() => handleCopyLink(material.url!, material.id)}
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                              title={isCopied ? "Copied!" : "Copy URL"}
                            >
                              {isCopied ? (
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEditMaterial(material)}
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="Edit material"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setMaterialToDelete(material)}
                            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete material"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Material Title */}
                      <div>
                        {material.url ? (
                          <a
                            href={material.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-sm text-foreground hover:text-primary transition-colors flex items-start justify-between gap-1.5 leading-snug"
                          >
                            <span>{material.title}</span>
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          </a>
                        ) : (
                          <div className="font-bold text-sm text-foreground leading-snug">
                            {material.title}
                          </div>
                        )}

                        {material.url && (
                          <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">
                            {material.url.replace(/^https?:\/\/(www\.)?/, "")}
                          </p>
                        )}
                      </div>

                      {/* Description & Study Notes */}
                      {material.description && (
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {material.description}
                        </p>
                      )}

                      {/* Tags */}
                      {material.tags && material.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {material.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Metadata (Difficulty, Duration, Linked Tasks) */}
                    <div className="pt-3 mt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {material.difficulty && (
                          <span className="font-medium text-foreground">
                            {material.difficulty === "Beginner" && "🟢 Beg."}
                            {material.difficulty === "Intermediate" && "🟡 Inter."}
                            {material.difficulty === "Advanced" && "🔴 Adv."}
                          </span>
                        )}

                        {material.estimated_duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {material.estimated_duration}
                          </span>
                        )}
                      </div>

                      {/* Direct Task Link indicator */}
                      {material.linked_tasks && material.linked_tasks.length > 0 ? (
                        <div className="flex items-center gap-1 text-[10px]">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckSquare className="h-3 w-3" />
                            <span>Linked in {material.linked_tasks.length} task{material.linked_tasks.length > 1 ? "s" : ""}</span>
                          </span>
                          {onOpenTask && (
                            <button
                              type="button"
                              onClick={() => onOpenTask(material.linked_tasks![0].id)}
                              className="hover:underline text-primary"
                              title={`Jump to task: "${material.linked_tasks[0].name}"`}
                            >
                              (view)
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/60 italic">
                          Not linked to tasks yet
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Group Create/Edit Modal */}
      <StudyGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => {
          setIsGroupModalOpen(false);
          setEditingGroup(null);
        }}
        group={editingGroup}
        defaultParentId={defaultParentIdForNewGroup}
        allGroups={flatGroups}
        onSave={async (data) => {
          await onSaveGroup(data, editingGroup?.id);
        }}
      />

      {/* Connect Groups Modal */}
      <ConnectGroupsModal
        isOpen={isConnectModalOpen}
        onClose={() => {
          setIsConnectModalOpen(false);
          setSourceGroupForConnection(null);
        }}
        sourceGroup={sourceGroupForConnection}
        allGroups={flatGroups}
        connections={connections}
        onConnect={onConnectGroups}
        onDisconnect={onDisconnectGroups}
      />

      {/* Material Create/Edit Modal */}
      <MaterialModal
        isOpen={isMaterialModalOpen}
        onClose={() => {
          setIsMaterialModalOpen(false);
          setEditingMaterial(null);
        }}
        material={editingMaterial}
        defaultGroupId={defaultGroupIdForNewMaterial}
        allGroups={flatGroups}
        onSave={async (data) => {
          await onSaveMaterial(data, editingMaterial?.id);
        }}
      />

      {/* Delete Group Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(groupToDelete)}
        onClose={() => setGroupToDelete(null)}
        onConfirm={handleConfirmDeleteGroup}
        title="Delete Study Group?"
        description={
          <span>
            Are you sure you want to delete{" "}
            <strong className="text-foreground">&quot;{groupToDelete?.name}&quot;</strong>?
            Any nested subgroups will also be removed, and materials in this group will become uncategorized.
          </span>
        }
        confirmText="Delete Group"
        variant="destructive"
        isLoading={isDeleting}
      />

      {/* Delete Material Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(materialToDelete)}
        onClose={() => setMaterialToDelete(null)}
        onConfirm={handleConfirmDeleteMaterial}
        title="Delete Educational Material?"
        description={
          <span>
            Are you sure you want to delete{" "}
            <strong className="text-foreground">&quot;{materialToDelete?.title}&quot;</strong>?
            This will also remove any links between this material and tasks.
          </span>
        }
        confirmText="Delete Material"
        variant="destructive"
        isLoading={isDeleting}
      />
    </div>
  );
}

