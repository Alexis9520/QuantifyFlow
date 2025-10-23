"use client";

import React from "react";

export function KanbanColumnsWrapper({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "flex w-full gap-4 md:gap-6",
        "overflow-x-auto overflow-y-hidden",
        "scroll-px-4 py-1",
        "snap-x snap-mandatory",
        // Importante: sin transform/scale/blur aquí para no romper el drag
        className || "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export default KanbanColumnsWrapper;