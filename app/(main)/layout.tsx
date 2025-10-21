"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"

import { useAuth } from "@/context/AuthContext"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  // Evitar parpadeo de tema en SSR
  if (!mounted) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const isLight = resolvedTheme === "light"

  return (
    // El viewport no scrollea; solo el área principal a la derecha
    <div
      className={`relative h-screen w-screen overflow-hidden transition-colors ${
        isLight ? "bg-white text-black" : "bg-background"
      }`}
    >
      {/* Fondo ambiental con degradados: visible en dark, oculto en light */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className={`dashboard-ambient ${isLight ? "hidden" : ""}`} />
        <div className={`dashboard-blobs ${isLight ? "hidden" : ""}`}>
          <span className="blob blob-1" />
          <span className="blob blob-2" />
          <span className="blob blob-3" />
        </div>
      </div>

      <Sidebar />
      {/* Header fijo fuera del contenedor scrolleable para evitar cualquier “marco” arriba */}
      <Header />

      {/* Panel derecho scrolleable con compensación del header fijo */}
      <div className="flex h-full flex-col lg:pl-64">
        <main className="flex-1 overflow-y-auto pt-14">
          <div
            className={`w-full py-6 transition-colors ${
              isLight ? "px-4 sm:px-6 lg:px-8 2xl:px-12" : "px-4 sm:px-6 lg:px-8 2xl:px-12"
            }`}
          >
            {children}
          </div>
        </main>
      </div>

      {/* Estilos del fondo ambiental + modo claro minimalista */}
      <style jsx global>{`
        /* Fondo animado (solo dark) */
        .dashboard-ambient {
          position: absolute;
          inset: 0;
          background: radial-gradient(60% 45% at 80% 10%, rgba(99, 102, 241, 0.12), transparent 60%),
            radial-gradient(50% 40% at 10% 85%, rgba(34, 211, 238, 0.1), transparent 60%),
            radial-gradient(45% 35% at 30% 30%, rgba(236, 72, 153, 0.1), transparent 60%);
          filter: saturate(1.05);
          animation: ambientShift 26s ease-in-out infinite alternate;
        }
        .dashboard-blobs {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }
        .blob {
          position: absolute;
          border-radius: 9999px;
          filter: blur(40px);
          opacity: 0.18;
          will-change: transform;
        }
        .blob-1 {
          width: 32rem;
          height: 32rem;
          top: -12rem;
          right: -8rem;
          background: #8b5cf6;
          animation: blobDrift1 38s ease-in-out infinite;
        }
        .blob-2 {
          width: 26rem;
          height: 26rem;
          bottom: -10rem;
          left: -8rem;
          background: #22d3ee;
          animation: blobDrift2 42s ease-in-out infinite;
        }
        .blob-3 {
          width: 22rem;
          height: 22rem;
          top: 30%;
          left: 35%;
          background: #fb7185;
          animation: blobDrift3 36s ease-in-out infinite;
        }
        @keyframes ambientShift {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(0, -0.5rem, 0) scale(1.005);
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @keyframes blobDrift1 {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(-1.5rem, 0.75rem, 0) scale(1.04);
          }
        }
        @keyframes blobDrift2 {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(1rem, -1rem, 0) scale(0.97);
          }
        }
        @keyframes blobDrift3 {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(-0.75rem, 1rem, 0) scale(1.03);
          }
        }

        /* Modo claro minimalista (blanco y negro) */
        html.light body {
          background: #fff !important;
          color: #0a0a0a;
        }
        /* Ocultar completamente fondos ambientales en light (por si algún wrapper persiste) */
        html.light .dashboard-ambient,
        html.light .dashboard-blobs {
          display: none !important;
        }
        /* Scrollbar minimalista en light */
        html.light *::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        html.light *::-webkit-scrollbar-thumb {
          background: #d4d4d4;
          border-radius: 9999px;
          border: 2px solid #ffffff;
        }
        html.light *::-webkit-scrollbar-track {
          background: #ffffff;
        }
        /* Separadores sutiles (si algún contenedor usa border/ring por tema) */
        html.light .ring-white\\/20,
        html.light .ring-white\\/15,
        html.light .ring-white\\/10 {
          --tw-ring-color: rgba(0, 0, 0, 0.08) !important;
        }
        html.light .bg-background\\/70,
        html.light .bg-background\\/60,
        html.light .bg-background {
          background-color: #ffffff !important;
        }
        html.light .text-foreground {
          color: #0a0a0a !important;
        }
        html.light .text-muted-foreground {
          color: #6b7280 !important;
        }
        /* Botones y superficies con hover mínimo en light */
        html.light .hover\\:bg-white\\/5:hover,
        html.light .hover\\:bg-black\\/5:hover {
          background-color: rgba(0, 0, 0, 0.04) !important;
        }
      `}</style>
    </div>
  )
}