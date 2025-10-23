import React from "react";

export default function ProjectHeaderSkeleton() {
  return (
    <div className="w-full">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex-1 space-y-2">
          <div className="h-8 w-1/2 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-11 w-11 animate-pulse rounded-2xl bg-muted" />
          <div className="h-11 w-36 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="h-11 animate-pulse rounded-2xl bg-muted" />
        <div className="h-11 animate-pulse rounded-2xl bg-muted" />
        <div className="h-11 animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  );
}