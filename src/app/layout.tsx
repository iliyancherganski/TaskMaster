import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

export const metadata: Metadata = {
  title: "TaskMaster - Team Kanban & Sprint Manager",
  description:
    "Production-ready single-page task management application powered by Next.js App Router, Supabase PostgreSQL, and @dnd-kit.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans min-h-screen bg-background text-foreground antialiased transition-colors duration-200">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
