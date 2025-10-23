import React from "react";

export default function ProjectsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-2xl p-5 border-2 border-black dark:border-transparent dark:bg-card/60 dark:shadow-[0_8px_30px_-20px_rgba(0,0,0,0.6)]"
        >
          <div className="h-6 w-3/4 animate-pulse rounded-md bg-black/10 dark:bg-muted/60" />
          <div className="mt-3 h-4 w-full animate-pulse rounded-md bg-black/10 dark:bg-muted/50" />
          <div className="mt-2 h-4 w-1/2 animate-pulse rounded-md bg-black/10 dark:bg-muted/50" />
          <div className="mt-6 flex justify-end">
            <div className="h-5 w-24 animate-pulse rounded-md bg-black/10 dark:bg-muted/60" />
          </div>
        </div>
      ))}
    </div>
  );
}