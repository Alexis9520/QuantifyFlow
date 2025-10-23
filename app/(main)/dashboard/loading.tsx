"use client";

import React from "react";
import Spinner from "@/components/ui/spinner";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        <Spinner size={56} label="Preparando tu Dashboard…" className="justify-center" />
        
        <p className="mt-1 text-sm text-muted-foreground">Estamos preparando tu espacio de trabajo.</p>

        {/* Indicadores de progreso sutiles (opcionales) */}
        <div className="mx-auto mt-6 h-1 w-56 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-[loadingBar_1.2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
        </div>
      </div>

      {/* Keyframes locales para la barrita de progreso */}
      <style jsx>{`
        @keyframes loadingBar {
          0% {
            transform: translateX(-120%);
          }
          50% {
            transform: translateX(20%);
          }
          100% {
            transform: translateX(120%);
          }
        }
      `}</style>
    </div>
  );
}