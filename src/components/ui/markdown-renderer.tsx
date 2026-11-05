"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import { ExternalLink, Paperclip, ChevronDown } from "lucide-react";
import { ResourceWithFiles } from "@/types/database.types";
import { TaskAttachmentItemView } from "@/components/tasks/TaskAttachmentItemView";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  resources?: ResourceWithFiles[];
  renderUntaggedAttachments?: boolean;
  onUpdateResourceDescription?: (id: string, description: string | null) => Promise<void>;
  onDeleteResource?: (resource: ResourceWithFiles) => void;
  onUpdateAttachmentSize?: (resourceId: string, size: number) => void;
}

/**
 * Preserves consecutive empty lines (created with multiple Enters).
 * Standard Markdown collapses all blank lines into a single paragraph margin.
 * This converts each extra newline beyond 2 into a non-breaking space paragraph,
 * while safely ignoring fenced code blocks.
 */
function preserveEmptyLines(content: string): string {
  if (!content) return "";
  const normalized = content.replace(/\r\n/g, "\n").replace(/\n[ \t]+(?=\n)/g, "\n");
  const parts = normalized.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g);

  return parts
    .map((part, index) => {
      // Odd indices are code blocks - preserve verbatim
      if (index % 2 === 1) {
        return part;
      }
      // For prose, convert 3 or more consecutive newlines into visible empty lines
      return part.replace(/\n{3,}/g, (match) => {
        const extraCount = match.length - 2;
        return "\n\n" + "&nbsp;\n\n".repeat(extraCount);
      });
    })
    .join("");
}

const markdownComponents = {
  a: ({ node, href, children, ...props }: any) => {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary font-medium underline underline-offset-4 decoration-primary/60 hover:text-sky-500 hover:decoration-sky-500 dark:hover:text-sky-400 dark:hover:decoration-sky-400 transition-colors inline-flex items-center gap-0.5 cursor-pointer"
        {...props}
      >
        <span>{children}</span>
        <ExternalLink className="inline-block h-3 w-3 opacity-75 shrink-0 ml-0.5" />
      </a>
    );
  },
  h1: ({ node, ...props }: any) => (
    <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-4 mb-2 pb-1.5 border-b border-border text-foreground" {...props} />
  ),
  h2: ({ node, ...props }: any) => (
    <h2 className="text-lg sm:text-xl font-bold tracking-tight mt-3 mb-1.5 text-foreground" {...props} />
  ),
  h3: ({ node, ...props }: any) => (
    <h3 className="text-base sm:text-lg font-semibold mt-2 mb-1 text-foreground" {...props} />
  ),
  p: ({ node, ...props }: any) => (
    <p className="my-1.5 leading-relaxed text-foreground min-h-[1.25em]" {...props} />
  ),
  ul: ({ node, ...props }: any) => (
    <ul className="list-disc list-outside pl-5 space-y-1 my-2 text-foreground" {...props} />
  ),
  ol: ({ node, ...props }: any) => (
    <ol className="list-decimal list-outside pl-5 space-y-1 my-2 text-foreground" {...props} />
  ),
  li: ({ node, ...props }: any) => (
    <li className="leading-relaxed text-foreground pl-0.5" {...props} />
  ),
  table: ({ node, ...props }: any) => (
    <div className="my-3 w-full overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-xs sm:text-sm" {...props} />
    </div>
  ),
  th: ({ node, ...props }: any) => (
    <th className="border-b border-border bg-muted/60 px-3 py-2 font-semibold text-foreground text-left" {...props} />
  ),
  td: ({ node, ...props }: any) => (
    <td className="border-b border-border/50 px-3 py-1.5 text-foreground" {...props} />
  ),
  blockquote: ({ node, ...props }: any) => (
    <blockquote className="border-l-4 border-primary/60 bg-muted/20 pl-3 py-1 italic text-muted-foreground my-2 rounded-r-md" {...props} />
  ),
  code: ({ node, className, children, ...props }: any) => {
    const isInline = !className?.includes("language-");
    if (isInline) {
      return (
        <code className="px-1.5 py-0.5 rounded bg-muted/80 font-mono text-xs text-primary border border-border/50" {...props}>
          {children}
        </code>
      );
    }
    return (
      <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 dark:bg-black/60 font-mono text-xs overflow-x-auto my-2.5 border border-border/60">
        <code {...props}>{children}</code>
      </pre>
    );
  },
  hr: ({ node, ...props }: any) => (
    <hr className="my-4 border-border/80" {...props} />
  ),
  mark: ({ node, ...props }: any) => (
    <mark className="rounded px-1 py-0.5 font-medium text-foreground" {...props} />
  ),
  u: ({ node, ...props }: any) => (
    <u className="underline decoration-primary underline-offset-2" {...props} />
  ),
};

export function MarkdownRenderer({
  content,
  className = "",
  resources,
  renderUntaggedAttachments = true,
  onUpdateResourceDescription,
  onDeleteResource,
  onUpdateAttachmentSize,
}: MarkdownRendererProps) {
  const [isAdditionalOpen, setIsAdditionalOpen] = React.useState(false);

  // Check if content has attachment tags e.g. {{attachment:<id>}} or {{attachment:<id> size=50%}}
  const hasAttachmentTags = content
    ? /{{\s*(?:attachment|media|resource):\s*[^}]+}}/i.test(content)
    : false;

  const taggedResourceIds = new Set<string>();

  let renderedElements: React.ReactNode = null;

  if (content && content.trim()) {
    if (!hasAttachmentTags) {
      renderedElements = (
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          rehypePlugins={[rehypeRaw]}
          components={markdownComponents}
        >
          {preserveEmptyLines(content)}
        </ReactMarkdown>
      );
    } else {
      const chunks = content.split(/({{\s*(?:attachment|media|resource):\s*[^}]+}})/gi);
      renderedElements = chunks.map((chunk, idx) => {
        const match = chunk.match(
          /{{\s*(?:attachment|media|resource):\s*([a-zA-Z0-9_-]+)(?:[\s|]+(?:size=)?(\d{1,3}%?))?\s*}}/i
        );
        if (match) {
          const resId = match[1];
          const rawSize = match[2];
          taggedResourceIds.add(resId);
          const res = resources?.find((r) => r.id === resId);

          let sizePercent = 100;
          if (rawSize) {
            const num = parseInt(rawSize.replace("%", ""), 10);
            if (!isNaN(num)) {
              sizePercent = Math.max(10, Math.min(100, num));
            }
          }

          if (res) {
            return (
              <div key={`att-${resId}-${idx}`} className="my-4 not-prose flex justify-center w-full">
                <TaskAttachmentItemView
                  resource={res}
                  size={sizePercent}
                  onUpdateDescription={onUpdateResourceDescription}
                  onDelete={onDeleteResource}
                  onUpdateSize={
                    onUpdateAttachmentSize
                      ? (newSize) => onUpdateAttachmentSize(resId, newSize)
                      : undefined
                  }
                />
              </div>
            );
          }

          return (
            <div
              key={`att-missing-${idx}`}
              className="my-2 p-2 rounded-xl border border-dashed border-border/80 bg-transparent text-xs text-muted-foreground flex items-center justify-center gap-2 not-prose"
            >
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
              <span>Attachment tag <code>&#123;&#123;attachment:{resId}&#125;&#125;</code> (item not found or removed)</span>
            </div>
          );
        }

        if (!chunk.trim()) return null;

        return (
          <ReactMarkdown
            key={`text-${idx}`}
            remarkPlugins={[remarkGfm, remarkBreaks]}
            rehypePlugins={[rehypeRaw]}
            components={markdownComponents}
          >
            {preserveEmptyLines(chunk)}
          </ReactMarkdown>
        );
      });
    }
  }

  // Untagged resources are resources not placed in the description via tag
  const untagged = resources
    ? resources.filter((r) => !taggedResourceIds.has(r.id))
    : [];

  const hasUntagged = renderUntaggedAttachments && untagged.length > 0;

  if (!renderedElements && !hasUntagged) {
    return null;
  }

  return (
    <div className={`prose dark:prose-invert max-w-none text-foreground ${className}`}>
      {renderedElements}

      {/* Untagged / Additional Attachments at the bottom (collapsible, collapsed by default) */}
      {hasUntagged && (
        <div className="mt-6 pt-4 border-t border-border/40 space-y-3 not-prose">
          <button
            type="button"
            onClick={() => setIsAdditionalOpen((prev) => !prev)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border/40 hover:border-border/70 hover:bg-muted/20 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Paperclip className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-semibold text-foreground">
                Additional Attachments
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground border border-border/50">
                {untagged.length}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
              <span className="hidden sm:inline">
                {isAdditionalOpen ? "Click to collapse" : "Click to view unplaced attachments"}
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 text-muted-foreground group-hover:text-foreground ${
                  isAdditionalOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {isAdditionalOpen && (
            <div className="space-y-4 pt-1 animate-in fade-in-50 duration-150">
              {untagged.map((res) => (
                <div key={res.id} className="flex justify-center w-full">
                  <TaskAttachmentItemView
                    resource={res}
                    onUpdateDescription={onUpdateResourceDescription}
                    onDelete={onDeleteResource}
                    onUpdateSize={
                      onUpdateAttachmentSize
                        ? (newSize) => onUpdateAttachmentSize(res.id, newSize)
                        : undefined
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
