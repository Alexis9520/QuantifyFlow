"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { signOut } from "firebase/auth"

import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"
import { auth } from "@/lib/firebase"

import {
  LayoutDashboard,
  Settings,
  LogOut,
  FolderKanban,
  Workflow,
} from "lucide-react"
import { Button } from "@/components/ui/button"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const [openMobile, setOpenMobile] = useState(false)

  const navItems: readonly NavItem[] = useMemo(
    () => [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/projects", label: "Proyectos", icon: FolderKanban },
      { href: "/settings", label: "Configuración", icon: Settings },
    ],
    []
  )

  // Cierra el drawer al cambiar de ruta
  useEffect(() => {
    setOpenMobile(false)
  }, [pathname])

  // Escucha el evento del Header
  useEffect(() => {
    const handler = () => setOpenMobile(true)
    window.addEventListener("open-sidebar" as any, handler as EventListener)
    return () => window.removeEventListener("open-sidebar" as any, handler as EventListener)
  }, [])

  const handleLogout = async () => {
    const toastId = toast.loading("Cerrando sesión...")
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      await signOut(auth)
      toast.success("Sesión cerrada.", { id: toastId })
      window.location.href = "/login"
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
      toast.error("Error al cerrar sesión.", { id: toastId })
    }
  }

  const NavList = ({ onItemClick }: { onItemClick?: () => void }) => (
    <nav className="flex-1 space-y-1 px-3">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
        return (
          <Button
            key={item.href}
            asChild
            variant="ghost"
            onClick={onItemClick}
            className={cn(
              "group relative w-full justify-start gap-3 rounded-xl px-3 py-3 transition-all",
              "hover:bg-black/5 dark:hover:bg-white/5",
              isActive && "text-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Link href={item.href}>
              <span className="relative inline-flex items-center gap-3">
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active-bg"
                    className="absolute inset-0 rounded-xl bg-black/5 dark:bg-white/5"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-3">
                  <motion.span
                    aria-hidden="true"
                    className={cn(
                      "relative -ml-1 h-6 w-[3px] rounded-full bg-gradient-to-b from-indigo-500 via-violet-500 to-fuchsia-500",
                      isActive ? "opacity-100" : "opacity-0"
                    )}
                    animate={{ opacity: isActive ? 1 : 0 }}
                    transition={{ duration: 0.18 }}
                  />
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </span>
              </span>
            </Link>
          </Button>
        )
      })}
    </nav>
  )

  const Panel = ({ className }: { className?: string }) => (
    <div
      className={cn(
        "relative flex h-full flex-col bg-background/70 backdrop-blur-md supports-[backdrop-filter]:backdrop-blur-xl",
        className
      )}
    >
      {/* Marco sutil a la derecha en desktop */}
      <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-px bg-gradient-to-b from-transparent via-neutral-300/70 to-transparent dark:via-white/10 lg:block" />

      {/* Branding */}
      <div className="px-6 pb-5 pt-6">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Workflow className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">QuantifyFlow</h1>
        </div>
      </div>

      <NavList onItemClick={() => setOpenMobile(false)} />

      {/* Footer */}
      <div className="mt-auto space-y-2 px-3 pb-4 pt-2">
        <div
          className="truncate rounded-xl bg-black/5 px-3 py-2 text-sm font-medium text-muted-foreground dark:bg-white/10"
          title={user?.displayName || user?.email || "Usuario"}
        >
          {user?.displayName || user?.email || "Usuario"}
        </div>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 rounded-xl px-3 py-3 text-muted-foreground transition-colors",
            "hover:bg-destructive/10 hover:text-destructive"
          )}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Aside Desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <Panel className="h-full" />
      </aside>

      {/* Drawer móvil (z alto para estar encima del Header) */}
      <AnimatePresence>
        {openMobile && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpenMobile(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-[70] w-[88vw] max-w-[18rem] shadow-2xl lg:hidden"
              initial={{ x: -28, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -28, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              role="dialog"
              aria-modal="true"
              aria-label="Navegación"
            >
              <Panel className="h-full" />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}