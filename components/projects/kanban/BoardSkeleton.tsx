import React from "react";

export default function BoardSkeleton() {
  return (
    <div className="mt-4 flex gap-4 md:gap-6 overflow-x-auto pb-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex-[0_0_320px] md:flex-[0_0_360px] xl:flex-[0_0_380px] shrink-0">
          <div className="rounded-2xl border-2 border-black dark:border-transparent dark:bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="h-5 w-28 animate-pulse rounded bg-muted" />
              <div className="h-5 w-8 animate-pulse rounded bg-muted" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((__, j) => (
                <div key={j} className="h-28 animate-pulse rounded-xl bg-muted/70" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}