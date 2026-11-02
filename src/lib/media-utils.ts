/**
 * Media detection, validation, and embed utilities for YouTube, Vimeo, direct videos, and images.
 */

export interface ValidatedMedia {
  isValid: boolean;
  type: "youtube" | "vimeo" | "video" | "image" | "unsupported";
  url: string;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  warning?: string | null;
  suggestedTitle?: string;
}

/**
 * Safe decodeURIComponent that never throws
 */
export function decodeURIComponentSafe(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

/**
 * Extracts 11-char YouTube ID from any valid YouTube URL format
 */
export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const str = url.trim();
  const regExp =
    /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = str.match(regExp);
  return match ? match[1] : null;
}

/**
 * Extracts Vimeo ID
 */
export function extractVimeoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.trim().match(/(?:vimeo\.com\/)(\d+)/);
  return match ? match[1] : null;
}

export function isDirectVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return /\.(mp4|webm|ogg|mov|m4v|mkv|wmv|flv|m3u8|mpg|mpeg)$/i.test(clean);
}

export function isDirectImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return /\.(jpeg|jpg|gif|png|webp|svg|bmp|avif|ico)$/i.test(clean);
}

/**
 * Comprehensive safe validation for media URLs
 */
export function validateMediaUrl(raw: string | null | undefined): ValidatedMedia {
  if (!raw || !raw.trim()) {
    return {
      isValid: false,
      type: "unsupported",
      url: "",
      embedUrl: null,
      thumbnailUrl: null,
      warning: "Please enter a valid media URL.",
    };
  }

  const str = raw.trim();
  let normalized = str;
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = "https://" + normalized;
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return {
      isValid: false,
      type: "unsupported",
      url: str,
      embedUrl: null,
      thumbnailUrl: null,
      warning: "Invalid URL format. Please check the pasted link.",
    };
  }

  // 1. YouTube
  const ytId = extractYouTubeId(normalized);
  if (ytId) {
    return {
      isValid: true,
      type: "youtube",
      url: normalized,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0`,
      thumbnailUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      suggestedTitle: "YouTube Video",
    };
  }

  const host = parsed.hostname.toLowerCase();
  if (host.includes("youtube.com") || host.includes("youtu.be")) {
    return {
      isValid: false,
      type: "unsupported",
      url: normalized,
      embedUrl: null,
      thumbnailUrl: null,
      warning: "This YouTube link does not point to a specific video clip or short. Please paste a direct video link (e.g. https://youtube.com/watch?v=...).",
    };
  }

  // 2. Vimeo
  const vimeoId = extractVimeoId(normalized);
  if (vimeoId) {
    return {
      isValid: true,
      type: "vimeo",
      url: normalized,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}?autoplay=1`,
      thumbnailUrl: null,
      suggestedTitle: "Vimeo Video",
    };
  }

  // 3. Direct Video
  const cleanPath = parsed.pathname.toLowerCase();
  if (isDirectVideoUrl(cleanPath)) {
    const filename = cleanPath.split("/").pop() || "Video";
    return {
      isValid: true,
      type: "video",
      url: normalized,
      embedUrl: normalized,
      thumbnailUrl: null,
      suggestedTitle: decodeURIComponentSafe(filename),
    };
  }

  // 4. Direct Image
  if (isDirectImageUrl(cleanPath)) {
    const filename = cleanPath.split("/").pop() || "Image";
    return {
      isValid: true,
      type: "image",
      url: normalized,
      embedUrl: null,
      thumbnailUrl: normalized,
      suggestedTitle: decodeURIComponentSafe(filename),
    };
  }

  return {
    isValid: false,
    type: "unsupported",
    url: normalized,
    embedUrl: null,
    thumbnailUrl: null,
    warning: "Unsupported link format. Please provide a YouTube link, Vimeo link, direct video (.mp4, .webm), or direct image URL.",
  };
}

