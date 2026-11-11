"use client";

import React, { useState } from "react";
import {
  IdeaStringColor,
  IdeaStringTension,
  IdeaStringConnection,
} from "@/types/idea-board.types";
import { Scissors, Tag, Zap, Palette, Trash2, X } from "lucide-react";

interface Point {
  x: number;
  y: number;
}

interface YarnStringProps {
  connection: IdeaStringConnection;
  startPoint: Point;
  endPoint: Point;
  isSelected?: boolean;
  isNoteHovered?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
  onUpdate?: (updates: Partial<IdeaStringConnection>) => void;
}

export const YARN_COLORS: Record<
  IdeaStringColor,
  {
    main: string;
    dark: string;
    light: string;
    shadow: string;
    name: string;
  }
> = {
  red: {
    main: "#dc2626",
    dark: "#991b1b",
    light: "#f87171",
    shadow: "rgba(153, 27, 27, 0.4)",
    name: "Detective Red",
  },
  twine: {
    main: "#b45309",
    dark: "#78350f",
    light: "#fcd34d",
    shadow: "rgba(120, 53, 15, 0.4)",
    name: "Natural Twine",
  },
  black: {
    main: "#27272a",
    dark: "#09090b",
    light: "#71717a",
    shadow: "rgba(0, 0, 0, 0.45)",
    name: "Black Thread",
  },
  blue: {
    main: "#2563eb",
    dark: "#1e40af",
    light: "#93c5fd",
    shadow: "rgba(30, 64, 175, 0.4)",
    name: "Electric Blue",
  },
  green: {
    main: "#059669",
    dark: "#065f46",
    light: "#6ee7b7",
    shadow: "rgba(6, 95, 70, 0.4)",
    name: "Forest Green",
  },
  yellow: {
    main: "#ca8a04",
    dark: "#854d0e",
    light: "#fde047",
    shadow: "rgba(133, 77, 14, 0.4)",
    name: "Golden Yarn",
  },
  pink: {
    main: "#db2777",
    dark: "#9d174d",
    light: "#f472b6",
    shadow: "rgba(157, 23, 77, 0.4)",
    name: "Neon Pink",
  },
};

export function calculateStringCurve(
  p1: Point,
  p2: Point,
  tension: IdeaStringTension = "normal"
) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Natural gravity sag based on distance and tension
  const tensionMultiplier =
    tension === "loose" ? 0.22 : tension === "tight" ? 0.03 : 0.12;

  const minSag = tension === "loose" ? 25 : tension === "tight" ? 4 : 14;
  const maxSag = tension === "loose" ? 140 : tension === "tight" ? 20 : 75;

  const sag = Math.min(maxSag, Math.max(minSag, dist * tensionMultiplier));

  // Midpoint control point with gravity pulled downward (+y)
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2 + sag;

  // Midpoint coordinate on quadratic bezier curve at t = 0.5:
  // B(0.5) = 0.25*p1 + 0.5*control + 0.25*p2
  const labelX = 0.25 * p1.x + 0.5 * mx + 0.25 * p2.x;
  const labelY = 0.25 * p1.y + 0.5 * my + 0.25 * p2.y;

  const path = `M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`;

  return { path, mx, my, labelX, labelY, dist };
}

export function YarnString({
  connection,
  startPoint,
  endPoint,
  isSelected = false,
  isNoteHovered = false,
  onSelect,
  onDelete,
  onUpdate,
}: YarnStringProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelText, setLabelText] = useState(connection.label || "");
  const [showColorPicker, setShowColorPicker] = useState(false);

  const colors = YARN_COLORS[connection.color] || YARN_COLORS.red;
  const { path, labelX, labelY } = calculateStringCurve(
    startPoint,
    endPoint,
    connection.tension
  );

  const handleSaveLabel = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onUpdate?.({ label: labelText.trim() || undefined });
    setIsEditingLabel(false);
  };

  return (
    <g
      className="group select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        if (!isNoteHovered) {
          e.stopPropagation();
          onSelect?.();
        }
      }}
    >
      {/* Masked string paths & shadows: section over hovered note becomes semi-transparent */}
      <g mask="url(#hovered-note-yarn-mask)">
        {/* 1. Underlying Soft Drop Shadow onto Corkboard */}
        <path
          d={path}
          fill="none"
          stroke="rgba(0,0,0,0.28)"
          strokeWidth={2.6}
          strokeLinecap="round"
          transform="translate(1.5, 3)"
          className="pointer-events-none filter blur-[1px]"
        />

        {/* 2. Invisible Wide Hitbox for Easy Clicking */}
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth={16}
          strokeLinecap="round"
          className={isNoteHovered ? "pointer-events-none" : "pointer-events-auto cursor-pointer"}
        />

        {/* 3. Selection / Hover Glow Aura */}
        {(isSelected || isHovered) && (
          <path
            d={path}
            fill="none"
            stroke={colors.light}
            strokeWidth={isSelected ? 5.5 : 4.5}
            strokeLinecap="round"
            strokeOpacity={0.45}
            className="pointer-events-none animate-pulse"
          />
        )}

        {/* 4. Main Textured Yarn Core (Thinned for realistic twine/thread appearance) */}
        <path
          d={path}
          fill="none"
          stroke={colors.main}
          strokeWidth={isSelected ? 2.4 : 1.75}
          strokeLinecap="round"
          className="pointer-events-none transition-all duration-150"
        />

        {/* 5. Twisted Multi-ply Fiber Highlight (gives real thread/yarn texture) */}
        <path
          d={path}
          fill="none"
          stroke={colors.light}
          strokeWidth={0.7}
          strokeDasharray="4 3"
          strokeLinecap="round"
          strokeOpacity={0.65}
          className="pointer-events-none"
        />

        {/* 6. Dark Fiber Twist Accent */}
        <path
          d={path}
          fill="none"
          stroke={colors.dark}
          strokeWidth={0.5}
          strokeDasharray="2 5"
          strokeLinecap="round"
          strokeOpacity={0.5}
          className="pointer-events-none"
        />

        {/* 7. Tiny Thread Knots / Anchor Rings around Start & End Pins */}
        <circle
          cx={startPoint.x}
          cy={startPoint.y}
          r={2.8}
          fill="none"
          stroke={colors.main}
          strokeWidth={1.3}
          className="pointer-events-none"
        />
        <circle
          cx={endPoint.x}
          cy={endPoint.y}
          r={2.8}
          fill="none"
          stroke={colors.main}
          strokeWidth={1.3}
          className="pointer-events-none"
        />
      </g>

      {/* 8. Interactive String Midpoint Label / Action Badge (unmasked) */}
      <foreignObject
        x={labelX - 110}
        y={labelY - 18}
        width={220}
        height={90}
        className="overflow-visible pointer-events-none"
      >
        <div className="flex flex-col items-center justify-center pointer-events-none select-none">
          {/* Label Display or Input */}
          {isEditingLabel ? (
            <form
              onSubmit={handleSaveLabel}
              className="flex items-center gap-1 bg-background/95 backdrop-blur-md px-2 py-1 rounded-lg border shadow-lg z-30 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={labelText}
                onChange={(e) => setLabelText(e.target.value)}
                placeholder="String note / label..."
                className="w-28 text-xs bg-transparent border-0 focus:outline-hidden text-foreground font-medium px-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Escape") setIsEditingLabel(false);
                }}
              />
              <button
                type="submit"
                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary text-primary-foreground cursor-pointer"
              >
                Save
              </button>
            </form>
          ) : connection.label ? (
            <div
              className={`group/badge flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold tracking-wide shadow-md transition-all pointer-events-auto cursor-pointer ${
                isSelected || isHovered
                  ? "bg-background/95 text-foreground border-primary scale-105"
                  : "bg-background/80 text-foreground/80 border-border/60 backdrop-blur-xs"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.();
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: colors.main }} />
              <span className="truncate max-w-[120px]">{connection.label}</span>
            </div>
          ) : null}

          {/* Floating Actions on Hover / Selection */}
          {(isHovered || isSelected) && !isEditingLabel && (
            <div
              className="mt-1 flex items-center gap-1 p-1 bg-background/95 backdrop-blur-md rounded-lg border border-border/80 shadow-xl text-xs z-30 animate-in fade-in zoom-in-95 duration-100 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Change Tension */}
              <button
                type="button"
                onClick={() => {
                  const nextTension: IdeaStringTension =
                    connection.tension === "normal"
                      ? "loose"
                      : connection.tension === "loose"
                      ? "tight"
                      : "normal";
                  onUpdate?.({ tension: nextTension });
                }}
                className="px-1.5 py-0.5 rounded hover:bg-muted text-[10px] font-mono text-muted-foreground hover:text-foreground capitalize flex items-center gap-0.5 cursor-pointer"
                title={`Tension: ${connection.tension} (click to cycle loose/normal/tight)`}
              >
                <Zap className="h-2.5 w-2.5 text-amber-500" />
                <span>{connection.tension}</span>
              </button>

              {/* Edit Label */}
              <button
                type="button"
                onClick={() => setIsEditingLabel(true)}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                title="Edit label"
              >
                <Tag className="h-3 w-3" />
              </button>

              {/* Color Switcher */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground flex items-center cursor-pointer"
                  title="Change yarn color"
                >
                  <Palette className="h-3 w-3" />
                </button>
                {showColorPicker && (
                  <div className="absolute top-full mt-1 left-0 flex items-center gap-1 bg-background/95 backdrop-blur-md p-1.5 rounded-lg border shadow-xl z-40">
                    {(Object.keys(YARN_COLORS) as IdeaStringColor[]).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          onUpdate?.({ color: c });
                          setShowColorPicker(false);
                        }}
                        className={`h-4 w-4 rounded-full border-2 transition-transform hover:scale-125 cursor-pointer ${
                          connection.color === c ? "border-foreground ring-1 ring-primary" : "border-white/60"
                        }`}
                        style={{ backgroundColor: YARN_COLORS[c].main }}
                        title={YARN_COLORS[c].name}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Cut / Delete String with Scissors */}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive cursor-pointer"
                  title="Cut string (Delete)"
                >
                  <Scissors className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </foreignObject>
    </g>
  );
}

// Live drag string preview shown while user is connecting two notes
export function LiveYarnStringPreview({
  startPoint,
  currentPoint,
  color = "red",
}: {
  startPoint: Point;
  currentPoint: Point;
  color?: IdeaStringColor;
}) {
  const colors = YARN_COLORS[color] || YARN_COLORS.red;
  const { path } = calculateStringCurve(startPoint, currentPoint, "normal");

  return (
    <g className="pointer-events-none select-none" mask="url(#hovered-note-yarn-mask)">
      {/* Drop shadow */}
      <path
        d={path}
        fill="none"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth={2.6}
        strokeLinecap="round"
        transform="translate(1.5, 3)"
        className="filter blur-[1px]"
      />
      {/* Glow */}
      <path
        d={path}
        fill="none"
        stroke={colors.light}
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeOpacity={0.5}
        className="animate-pulse"
      />
      {/* Yarn line */}
      <path
        d={path}
        fill="none"
        stroke={colors.main}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {/* Fiber highlights */}
      <path
        d={path}
        fill="none"
        stroke={colors.light}
        strokeWidth={0.7}
        strokeDasharray="4 3"
        strokeLinecap="round"
        strokeOpacity={0.7}
      />
      {/* Pulsing indicator at cursor */}
      <circle
        cx={currentPoint.x}
        cy={currentPoint.y}
        r={5}
        fill={colors.main}
        className="animate-ping"
      />
      <circle
        cx={currentPoint.x}
        cy={currentPoint.y}
        r={4}
        fill={colors.light}
        stroke="#ffffff"
        strokeWidth={1}
      />
    </g>
  );
}
