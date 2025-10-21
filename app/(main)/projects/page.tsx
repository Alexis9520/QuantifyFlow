"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { useProjects } from "@/hooks/useProjects";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, RefreshCcw } from "lucide-react";

// Skeleton — adaptado a modo claro (B/N) y modo oscuro
const SkeletonLoader = ({ isLight }: { isLight: boolean }) => (
  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className={
          isLight
            ? "rounded-2xl border-2 border-black p-5"
            : "relative overflow-hidden rounded-2xl bg-card/60 p-5 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.6)] backdrop-blur supports-[backdrop-filter]:backdrop-blur-xl"
        }
      >
        <div className={isLight ? "h-6 w-3/4 rounded-md bg-black/10" : "h-6 w-3/4 animate-pulse rounded-md bg-muted/60"} />
        <div className={isLight ? "mt-3 h-4 w-full rounded-md bg-black/10" : "mt-3 h-4 w-full animate-pulse rounded-md bg-muted/50"} />
        <div className={isLight ? "mt-2 h-4 w-1/2 rounded-md bg-black/10" : "mt-2 h-4 w-1/2 animate-pulse rounded-md bg-muted/50"} />
        <div className="mt-6 flex justify-end">
          <div className={isLight ? "h-5 w-24 rounded-md bg-black/10" : "h-5 w-24 animate-pulse rounded-md bg-muted/60"} />
        </div>
      </div>
    ))}
  </div>
);

export default function ProjectsPage() {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  const { currentTeam, userRole, isLoading: isLoadingTeam } = useCurrentTeam(user?.uid);
  const {
    projects,
    isLoading: isLoadingProjects,
    error,
    refreshProjects,
    setSearchTerm,
  } = useProjects(currentTeam?.teamId);

  const isAdmin = userRole === "admin";
  const isLoading = isLoadingTeam || isLoadingProjects;

  // Toasts controlados
  const loadToastRef = useRef<string | number | null>(null);

  // Toast para carga de datos
  useEffect(() => {
    if (isLoading) {
      if (!loadToastRef.current) {
        loadToastRef.current = toast.loading("Cargando proyectos...");
      }
    } else if (loadToastRef.current) {
      toast.success("Proyectos cargados.", { id: loadToastRef.current });
      loadToastRef.current = null;
    }
  }, [isLoading]);

  // Toast de error
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // Búsqueda con debounce + toast
  const [query, setQuery] = useState("");
  useEffect(() => {
    const id = setTimeout(() => {
      setSearchTerm(query);
      if (query.trim()) {
        toast.message("Filtro aplicado", { description: `Búsqueda: "${query.trim()}"` });
      }
    }, 300);
    return () => clearTimeout(id);
  }, [query, setSearchTerm]);

  const total = useMemo(() => projects.length, [projects]);

  const handleManualRefresh = async () => {
    const t = toast.loading("Actualizando proyectos...");
    try {
      await refreshProjects();
      toast.success("Lista actualizada.", { id: t });
    } catch (e) {
      toast.error("No se pudo actualizar.", { id: t });
    }
  };

  const handleProjectCreated = async () => {
    const t = toast.loading("Creando proyecto...");
    try {
      await refreshProjects();
      toast.success("Proyecto creado y listado actualizado.", { id: t });
    } catch {
      toast.error("Proyecto creado, pero falló refrescar la lista.", { id: t });
    }
  };

  if (error) {
    return (
      <div className="w-full px-4 py-10 sm:px-6 lg:px-8 2xl:px-12">
        <p className={isLight ? "text-center text-sm font-semibold text-black" : "text-center text-sm font-medium text-destructive"}>
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 2xl:px-12">
      {/* Header */}
      <div className="mb-6 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className={isLight ? "text-2xl font-extrabold tracking-tight text-black" : "text-2xl font-bold tracking-tight"}>
            {isLight ? "Proyectos" : <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">Proyectos</span>}
          </h1>
          <p className={isLight ? "text-xs text-black/70" : "text-xs text-muted-foreground"}>
            {currentTeam?.teamName ? `Equipo: ${currentTeam.teamName}` : "Equipo no seleccionado"} • {total} resultados
          </p>
        </div>

        <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
          {/* Buscador */}
          <div className="relative w-full sm:w-72">
            <Search className={isLight ? "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/70" : "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"} />
            <Input
              placeholder="Buscar proyectos..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={
                isLight
                  ? "h-11 w-full rounded-2xl border-2 border-black bg-transparent pl-9 text-black placeholder:text-black/50 focus-visible:ring-0"
                  : "h-11 w-full rounded-2xl bg-background/60 pl-9 focus-visible:ring-2 focus-visible:ring-violet-400/70"
              }
            />
          </div>

          {/* Actualizar */}
          <Button
            type="button"
            onClick={handleManualRefresh}
            className={
              isLight
                ? "h-11 rounded-2xl border-2 border-black bg-transparent px-4 font-semibold text-black hover:bg-black hover:text-white"
                : "h-11 rounded-2xl px-4"
            }
            variant={isLight ? "ghost" : "default"}
            title="Actualizar lista"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>

          {/* Crear proyecto */}
          {isAdmin && (
            <CreateProjectModal teamId={currentTeam?.teamId} onProjectCreated={handleProjectCreated}>
              {isLight ? (
                <Button className="h-11 rounded-2xl border-2 border-black bg-transparent px-4 font-semibold text-black hover:bg-black hover:text-white">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nuevo proyecto
                </Button>
              ) : (
                <Button className="relative h-11 rounded-2xl font-semibold shadow-md bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 hover:from-indigo-400 hover:via-violet-500 hover:to-fuchsia-400">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nuevo proyecto
                </Button>
              )}
            </CreateProjectModal>
          )}
        </div>
      </div>

      {/* Contenido */}
      {isLoading ? (
        <SkeletonLoader isLight={isLight} />
      ) : projects.length === 0 ? (
        <div
          className={
            isLight
              ? "rounded-2xl border-2 border-black p-10 text-center"
              : "relative overflow-hidden rounded-2xl bg-card/60 p-10 text-center shadow-[0_8px_30px_-20px_rgba(0,0,0,0.6)] backdrop-blur supports-[backdrop-filter]:backdrop-blur-xl"
          }
        >
          {!isLight && <div className="absolute inset-0 opacity-20 blur-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />}
          <div className="relative z-10">
            <h2 className={isLight ? "text-xl font-extrabold text-black" : "text-xl font-semibold"}>No se encontraron proyectos</h2>
            <p className={isLight ? "mt-2 text-sm text-black/70" : "mt-2 text-sm text-muted-foreground"}>
              Ajusta tu búsqueda o crea un nuevo proyecto si tienes permisos.
            </p>
            {isAdmin && (
              <div className="mt-6 inline-block">
                <CreateProjectModal teamId={currentTeam?.teamId} onProjectCreated={handleProjectCreated}>
                  {isLight ? (
                    <Button className="h-11 rounded-2xl border-2 border-black bg-transparent px-4 font-semibold text-black hover:bg-black hover:text-white">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Crear proyecto
                    </Button>
                  ) : (
                    <Button className="rounded-2xl">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Crear proyecto
                    </Button>
                  )}
                </CreateProjectModal>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}