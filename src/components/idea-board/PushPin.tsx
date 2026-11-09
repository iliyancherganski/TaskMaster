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

const PIN_GRADIENTS: Record<
  IdeaPinColor,
  {
    outer: string;
    rim: string;
    center: string;
    shadow: string;
  }
> = {
  red: {
    outer: "#7f1d1d",
    rim: "#dc2626",
    center: "#f87171",
    shadow: "rgba(127, 29, 29, 0.5)",
  },
  gold: {
    outer: "#78350f",
    rim: "#d97706",
    center: "#fde68a",
    shadow: "rgba(180, 83, 9, 0.5)",
  },
  silver: {
    outer: "#334155",
    rim: "#94a3b8",
    center: "#f8fafc",
    shadow: "rgba(71, 85, 105, 0.5)",
  },
  blue: {
    outer: "#1e3a8a",
    rim: "#2563eb",
    center: "#93c5fd",
    shadow: "rgba(30, 58, 138, 0.5)",
  },
  green: {
    outer: "#064e3b",
    rim: "#059669",
    center: "#6ee7b7",
    shadow: "rgba(6, 78, 59, 0.5)",
  },
  yellow: {
    outer: "#713f12",
    rim: "#ca8a04",
    center: "#fef08a",
    shadow: "rgba(161, 98, 7, 0.5)",
  },
  pink: {
    outer: "#831843",
    rim: "#db2777",
    center: "#f9a8d4",
    shadow: "rgba(131, 24, 67, 0.5)",
  },
};

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
  const gradient = PIN_GRADIENTS[color] || PIN_GRADIENTS.red;

  const dims =
    size === "sm"
      ? { w: 20, h: 26, r: 8, needleH: 10 }
      : size === "lg"
      ? { w: 32, h: 42, r: 13, needleH: 16 }
      : { w: 26, h: 34, r: 10, needleH: 13 };

  return (
    <div
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      title={title || "Pushpin: Click or hold and drag to connect a string"}
      className={`relative inline-flex items-center justify-center select-none group cursor-pointer transition-transform ${
        isTarget ? "scale-125 animate-pulse" : "hover:scale-110"
      } ${className}`}
      style={{ width: `${dims.w}px`, height: `${dims.h}px` }}
    >
      {/* Target Glow Ring when active or hovered during string connection */}
      {(isConnecting || isTarget) && (
        <span
          className={`absolute inset-[-4px] rounded-full animate-ping opacity-75 ${
            isTarget ? "bg-amber-400" : "bg-red-500"
          }`}
        />
      )}

      {/* SVG Realistic 3D Pushpin */}
      <svg
        width={dims.w}
        height={dims.h}
        viewBox="0 0 26 34"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible filter drop-shadow-[2px_3px_2px_rgba(0,0,0,0.45)]"
      >
        <defs>
          {/* Pushpin Head Radial 3D Sphere */}
          <radialGradient
            id={`pin-grad-${color}`}
            cx="38%"
            cy="35%"
            r="65%"
            fx="30%"
            fy="30%"
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="35%" stopColor={gradient.center} />
            <stop offset="75%" stopColor={gradient.rim} />
            <stop offset="100%" stopColor={gradient.outer} />
          </radialGradient>

          {/* Needle Metallic Gradient */}
          <linearGradient id="needle-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="40%" stopColor="#f8fafc" />
            <stop offset="80%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          {/* Cast Drop Shadow of Pin Needle on Board */}
          <filter id="pin-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow
              dx="2"
              dy="3"
              stdDeviation="1.5"
              floodOpacity="0.4"
              floodColor="#000000"
            />
          </filter>
        </defs>

        {/* Needle Point (pointing straight down into cork) */}
        <path
          d="M 12 18 L 14 18 L 13.5 32 L 12.5 32 Z"
          fill="url(#needle-grad)"
        />
        {/* Needle tip sharpness */}
        <polygon points="12.5,32 13.5,32 13,34" fill="#334155" />

        {/* Small collar / washer at base of the pin head */}
        <ellipse cx="13" cy="18" rx="4.5" ry="1.8" fill="#475569" opacity="0.8" />
        <ellipse cx="13" cy="17.5" rx="4" ry="1.4" fill="url(#needle-grad)" />

        {/* Tiny yarn loop wrapped around the pin collar (visual string anchor) */}
        <path
          d="M 9.5 17.5 C 9 19, 17 19, 16.5 17.5"
          stroke="#b91c1c"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.75"
        />

        {/* Main Pushpin Spherical Head */}
        <circle
          cx="13"
          cy="11"
          r="10"
          fill={`url(#pin-grad-${color})`}
          stroke={gradient.outer}
          strokeWidth="0.8"
        />

        {/* Top Rim Ridge for Plastic / Metal Grip */}
        <ellipse
          cx="13"
          cy="8.5"
          rx="7"
          ry="3"
          fill="none"
          stroke="#ffffff"
          strokeWidth="0.75"
          opacity="0.5"
        />

        {/* Specular Highlight Spot */}
        <ellipse
          cx="10"
          cy="7"
          rx="2.8"
          ry="1.8"
          transform="rotate(-25 10 7)"
          fill="#ffffff"
          opacity="0.85"
        />
      </svg>
    </div>
  );
}
