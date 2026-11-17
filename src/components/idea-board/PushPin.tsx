"use client";

import React from "react";
import { IdeaPinColor } from "@/types/idea-board.types";

interface PushPinProps {
  color?: IdeaPinColor;
  size?: "sm" | "md" | "lg";
  className?: string;
  isConnecting?: boolean;
  isTarget?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
}

export const PIN_COLOR_PRESETS: { id: string; label: string; hex: string }[] = [
  { id: "red", label: "Red", hex: "#ef4444" },
  { id: "gold", label: "Amber", hex: "#f59e0b" },
  { id: "yellow", label: "Yellow", hex: "#eab308" },
  { id: "green", label: "Green", hex: "#10b981" },
  { id: "blue", label: "Blue", hex: "#3b82f6" },
  { id: "pink", label: "Pink", hex: "#ec4899" },
  { id: "silver", label: "Slate", hex: "#64748b" },
];

const PRESET_HEX_MAP: Record<string, string> = {
  red: "#ef4444",
  gold: "#f59e0b",
  silver: "#64748b",
  blue: "#3b82f6",
  green: "#10b981",
  yellow: "#eab308",
  pink: "#ec4899",
};

export function resolvePinHexColor(color?: string | null): string {
  if (!color) return "#ef4444";
  const trimmed = color.trim().toLowerCase();
  if (PRESET_HEX_MAP[trimmed]) return PRESET_HEX_MAP[trimmed];
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed;
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return "#ef4444";
}

export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h, s, v };
}

export function hsvToHex(h: number, s: number, v: number): string {
  const clampedV = Math.max(0, Math.min(1, v));
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = clampedV * (1 - s);
  const q = clampedV * (1 - f * s);
  const t = clampedV * (1 - (1 - f) * s);

  let r = 0;
  let g = 0;
  let b = 0;

  switch (i % 6) {
    case 0:
      r = clampedV;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = clampedV;
      b = p;
      break;
    case 2:
      r = p;
      g = clampedV;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = clampedV;
      break;
    case 4:
      r = t;
      g = p;
      b = clampedV;
      break;
    case 5:
      r = clampedV;
      g = p;
      b = q;
      break;
  }

  const toHex = (n: number) =>
    Math.round(n * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Computes pin color variations strictly by adjusting ONLY the Value (V in HSV)
 * of the selected color while keeping Hue (H) and Saturation (S) constant.
 */
export function getPinColorVariations(color?: string | null) {
  const baseHex = resolvePinHexColor(color);
  const { h, s, v } = hexToHsv(baseHex);

  const variations = [
    { label: "Light Tint", hex: hsvToHex(h, s * 0.8, Math.min(1, v * 1.16)) },
    { label: "Base Tone", hex: baseHex },
    { label: "Mellow", hex: hsvToHex(h, Math.min(1, s * 1.05), Math.max(0.12, v * 0.88)) },
    { label: "Deep Tone", hex: hsvToHex(h, Math.min(1, s * 1.15), Math.max(0.08, v * 0.72)) },
  ];

  return {
    base: baseHex,
    light: hsvToHex(h, s, Math.min(1, v * 1.16)),
    dark: hsvToHex(h, s, Math.max(0.08, v * 0.78)),
    border: hsvToHex(h, s, Math.max(0.05, v * 0.62)),
    variations,
  };
}

export const PAPER_COLOR_PRESETS: { id: string; label: string; hex: string }[] = [
  { id: "yellow", label: "Post-it Yellow", hex: "#fef9c3" },
  { id: "kraft", label: "Kraft Card", hex: "#fed7aa" },
  { id: "white", label: "Index White", hex: "#ffffff" },
  { id: "mint", label: "Mint Green", hex: "#dcfce7" },
  { id: "sky", label: "Sky Blue", hex: "#e0f2fe" },
  { id: "lavender", label: "Lavender", hex: "#f3e8ff" },
  { id: "rose", label: "Rose Pink", hex: "#fce7f3" },
  { id: "dark", label: "Slate Dark", hex: "#1e293b" },
];

const PRESET_PAPER_HEX_MAP: Record<string, string> = {
  yellow: "#fef9c3",
  white: "#ffffff",
  kraft: "#fed7aa",
  mint: "#dcfce7",
  sky: "#e0f2fe",
  lavender: "#f3e8ff",
  rose: "#fce7f3",
  dark: "#1e293b",
};

export function resolvePaperHexColor(color?: string | null): string {
  if (!color) return "#fef9c3";
  const trimmed = color.trim().toLowerCase();
  if (PRESET_PAPER_HEX_MAP[trimmed]) return PRESET_PAPER_HEX_MAP[trimmed];
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed;
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return "#fef9c3";
}

/**
 * Computes paper color variations strictly by adjusting ONLY the Value (V in HSV)
 * of the selected color while keeping Hue (H) and Saturation (S) constant.
 */
export function getPaperColorVariations(color?: string | null) {
  const baseHex = resolvePaperHexColor(color);
  const { h, s, v } = hexToHsv(baseHex);

  const variations = [
    { label: "Light Tint", hex: hsvToHex(h, s * 0.7, Math.min(1, v * 1.15)) },
    { label: "Soft Base", hex: baseHex },
    { label: "Mellow", hex: hsvToHex(h, Math.min(1, s * 1.05), Math.max(0.12, v * 0.88)) },
    { label: "Deep Tone", hex: hsvToHex(h, Math.min(1, s * 1.15), Math.max(0.08, v * 0.72)) },
  ];

  const clean = baseHex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const isDark = 0.299 * r + 0.587 * g + 0.114 * b < 130;

  return {
    base: baseHex,
    border: hsvToHex(h, Math.min(1, s * 1.1), Math.max(0.06, v * 0.78)),
    isDark,
    textColor: isDark ? "#f4f4f5" : "#18181b",
    mutedTextColor: isDark ? "#a1a1aa" : "#52525b",
    variations,
  };
}

export function PushPin({
  color = "red",
  size = "md",
  className = "",
  isConnecting = false,
  isTarget = false,
  onMouseDown,
  onMouseUp,
  onMouseEnter,
  onMouseLeave,
  onClick,
  title,
}: PushPinProps) {
  const tones = getPinColorVariations(color);

  const dims =
    size === "sm"
      ? { w: 16, h: 16 }
      : size === "lg"
      ? { w: 24, h: 24 }
      : { w: 20, h: 20 };

  return (
    <div
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      title={title || "Pin: Click or drag to connect string"}
      className={`relative inline-flex items-center justify-center select-none group cursor-pointer transition-transform ${
        isTarget ? "scale-125" : "hover:scale-110"
      } ${className}`}
      style={{ width: `${dims.w}px`, height: `${dims.h}px` }}
    >
      {/* Active / Target pulse ring when connecting string */}
      {(isConnecting || isTarget) && (
        <span
          className="absolute inset-[-3px] rounded-full animate-ping opacity-70"
          style={{ backgroundColor: tones.base }}
        />
      )}

      {/* Clean Minimalistic Flat-Modern Pin SVG */}
      <svg
        width={dims.w}
        height={dims.h}
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible drop-shadow-[0_2px_3px_rgba(0,0,0,0.28)]"
      >
        {/* Outer Pin Circle (Darker value shade for clean edge definition) */}
        <circle
          cx="10"
          cy="10"
          r="7.5"
          fill={tones.base}
          stroke={tones.border}
          strokeWidth="1.4"
        />

        {/* Subtle Inner Top-Left Value Highlight Disc */}
        <circle
          cx="9.3"
          cy="9.2"
          r="5"
          fill={tones.light}
        />

        {/* Minimal Center Core (Base Value) */}
        <circle
          cx="10"
          cy="10"
          r="2.6"
          fill={tones.dark}
        />
      </svg>
    </div>
  );
}
