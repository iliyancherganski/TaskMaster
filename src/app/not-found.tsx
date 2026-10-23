import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">404</h1>
      <p className="mt-3 text-base text-muted-foreground">
        The task or workspace view you are looking for does not exist.
      </p>
      <div className="mt-6">
        <Button asChild>
          <Link href="/">Back to Board</Link>
        </Button>
      </div>
    </div>
  );
}

