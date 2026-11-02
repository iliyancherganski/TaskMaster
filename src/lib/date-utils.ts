/**
 * Utility functions for formatting deadlines and calculating remaining/overdue time.
 */

/**
 * Format deadline date with weekday: e.g. "Mon, Nov 30, 2026"
 */
export function formatDeadlineDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  let d: Date;
  if (dateStr.includes("T")) {
    d = new Date(dateStr);
  } else {
    const [year, month, day] = dateStr.split("-").map(Number);
    d = new Date(year, month - 1, day);
  }
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export interface DeadlineRemaining {
  label: string;
  shortLabel: string;
  isOverdue: boolean;
  isToday: boolean;
  diffDays: number;
  badgeStyle: string;
}

/**
 * Calculate time remaining from now until deadline (days, weeks, months, or overdue)
 */
export function getDeadlineTimeRemaining(dueDateStr: string | null | undefined): DeadlineRemaining | null {
  if (!dueDateStr) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let targetDate: Date;
  if (dueDateStr.includes("T")) {
    const parsed = new Date(dueDateStr);
    targetDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  } else {
    const [y, m, d] = dueDateStr.split("-").map(Number);
    targetDate = new Date(y, m - 1, d);
  }

  if (isNaN(targetDate.getTime())) return null;

  const diffMs = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return {
      label: "Due today",
      shortLabel: "Today",
      isOverdue: false,
      isToday: true,
      diffDays: 0,
      badgeStyle: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40",
    };
  }

  if (diffDays > 0) {
    let label = "";
    let shortLabel = "";
    if (diffDays === 1) {
      label = "1 day left";
      shortLabel = "1d left";
    } else if (diffDays < 7) {
      label = `${diffDays} days left`;
      shortLabel = `${diffDays}d left`;
    } else if (diffDays < 14) {
      label = "1 week left";
      shortLabel = "1w left";
    } else if (diffDays < 28) {
      const weeks = Math.round(diffDays / 7);
      label = `${weeks} weeks left`;
      shortLabel = `${weeks}w left`;
    } else if (diffDays < 55) {
      label = "1 month left";
      shortLabel = "1mo left";
    } else if (diffDays < 365) {
      const months = Math.round(diffDays / 30);
      label = `${months} months left`;
      shortLabel = `${months}mo left`;
    } else {
      const years = Math.round(diffDays / 365);
      label = years === 1 ? "1 year left" : `${years} years left`;
      shortLabel = `${years}y left`;
    }

    let badgeStyle = "bg-primary/10 text-primary border-primary/25";
    if (diffDays <= 2) {
      badgeStyle = "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40";
    } else if (diffDays <= 7) {
      badgeStyle = "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30";
    }

    return {
      label,
      shortLabel,
      isOverdue: false,
      isToday: false,
      diffDays,
      badgeStyle,
    };
  } else {
    const absDays = Math.abs(diffDays);
    let label = "";
    let shortLabel = "";
    if (absDays === 1) {
      label = "1 day overdue";
      shortLabel = "1d overdue";
    } else if (absDays < 7) {
      label = `${absDays} days overdue`;
      shortLabel = `${absDays}d overdue`;
    } else if (absDays < 14) {
      label = "1 week overdue";
      shortLabel = "1w overdue";
    } else if (absDays < 28) {
      const weeks = Math.round(absDays / 7);
      label = `${weeks} weeks overdue`;
      shortLabel = `${weeks}w overdue`;
    } else if (absDays < 55) {
      label = "1 month overdue";
      shortLabel = "1mo overdue";
    } else {
      const months = Math.round(absDays / 30);
      label = `${months} months overdue`;
      shortLabel = `${months}mo overdue`;
    }

    return {
      label,
      shortLabel,
      isOverdue: true,
      isToday: false,
      diffDays,
      badgeStyle: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/40 font-semibold",
    };
  }
}

