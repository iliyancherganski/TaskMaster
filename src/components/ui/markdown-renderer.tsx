"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  if (!content || !content.trim()) {
    return null;
  }

  return (
    <div className={`prose dark:prose-invert max-w-none text-foreground ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-4 mb-2 pb-1.5 border-b border-border text-foreground" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-lg sm:text-xl font-bold tracking-tight mt-3 mb-1.5 text-foreground" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-base sm:text-lg font-semibold mt-2 mb-1 text-foreground" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="my-1.5 leading-relaxed text-foreground" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-outside pl-5 space-y-1 my-2 text-foreground" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-outside pl-5 space-y-1 my-2 text-foreground" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="leading-relaxed text-foreground pl-0.5" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="my-3 w-full overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-xs sm:text-sm" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th className="border-b border-border bg-muted/60 px-3 py-2 font-semibold text-foreground text-left" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="border-b border-border/50 px-3 py-1.5 text-foreground" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-primary/60 bg-muted/20 pl-3 py-1 italic text-muted-foreground my-2 rounded-r-md" {...props} />
          ),
          code: ({ node, className, children, ...props }) => {
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
          hr: ({ node, ...props }) => (
            <hr className="my-4 border-border/80" {...props} />
          ),
          mark: ({ node, ...props }) => (
            <mark className="rounded px-1 py-0.5 font-medium text-foreground" {...props} />
          ),
          u: ({ node, ...props }) => (
            <u className="underline decoration-primary underline-offset-2" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

