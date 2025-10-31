"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { getArchivedProjectsByTeamWithTaskCount } from "@/services/projectService";
import { Project } from "@/types";
import { ArchiveProjectCard } from "@/components/projects/ArchiveProjectCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Spinner from "@/components/ui/spinner";
import { Search, RefreshCcw, Archive, ArrowLeft } from "lucide-react";

export default function ArchivedProjectsPage() {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  const { currentTeam, userRole, isLoading: isLoadingTeam } = useCurrentTeam(user?.uid);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Cargar proyectos archivados
  const loadArchivedProjects = async () => {
    if (!currentTeam?.teamId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const archivedProjects = await getArchivedProjectsByTeamWithTaskCount(currentTeam.teamId);
      setProjects(archivedProjects);
      setFilteredProjects(archivedProjects);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al cargar proyectos archivados";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar proyectos basado en búsqueda
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredProjects(projects);
    } else {
      const filtered = projects.filter(project =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProjects(filtered);
    }
  }, [searchQuery, projects]);

  // Cargar proyectos cuando el equipo esté disponible
  useEffect(() => {
    if (currentTeam?.teamId) {
      loadArchivedProjects();
    }
  }, [currentTeam?.teamId]);

  const handleProjectUnarchived = async () => {
    await loadArchivedProjects();
    toast.success("Proyecto desarchivado correctamente");
  };

  const handleRefresh = async () => {
    const toastId = toast.loading("Actualizando proyectos archivados...");
    try {
      await loadArchivedProjects();
      toast.success("Lista actualizada", { id: toastId });
    } catch (err) {
      toast.error("Error al actualizar", { id: toastId });
    }
  };

  if (!userRole || userRole !== 'admin') {
    return (
      <div className="w-full px-4 py-10 sm:px-6 lg:px-8 2xl:px-12">
        <div className="text-center">
          <Archive className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Acceso restringido</h2>
          <p className="text-muted-foreground">
            Solo los administradores pueden ver los proyectos archivados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 2xl:px-12">
      {/* Header */}
      <div className="mb-6 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <a href="/projects">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a proyectos
              </a>
            </Button>
          </div>
          <h1 className={isLight ? "text-2xl font-extrabold tracking-tight text-black" : "text-2xl font-bold tracking-tight"}>
            {isLight ? "Proyectos Archivados" : <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">Proyectos Archivados</span>}
          </h1>
          <p className={isLight ? "text-xs text-black/70" : "text-xs text-muted-foreground"}>
            {currentTeam?.teamName ? `Equipo: ${currentTeam.teamName}` : "Equipo no seleccionado"} • {filteredProjects.length} de {projects.length} proyectos
          </p>
        </div>

        <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
          {/* Buscador */}
          <div className="relative w-full sm:w-72">
            <Search className={isLight ? "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/70" : "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"} />
            <Input
              placeholder="Buscar en archivados..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={
                isLight
                  ? "h-11 w-full rounded-2xl border-2 border-black bg-transparent pl-9 text-black placeholder:text-black/50 focus-visible:ring-0"
                  : "h-11 w-full rounded-2xl bg-background/60 pl-9 focus-visible:ring-2 focus-visible:ring-amber-400/70"
              }
            />
          </div>

          {/* Actualizar */}
          <Button
            type="button"
            onClick={handleRefresh}
            className={
              isLight
                ? "h-11 rounded-2xl border-2 border-black bg-transparent px-4 font-semibold text-black hover:bg-black hover:text-white"
                : "h-11 rounded-2xl px-4 bg-amber-500 hover:bg-amber-600"
            }
            variant={isLight ? "ghost" : "default"}
            title="Actualizar lista"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="py-10 flex justify-center">
          <Spinner size={40} label="Cargando proyectos archivados…" />
        </div>
      ) : error ? (
        <div className="text-center py-10">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={loadArchivedProjects}>Reintentar</Button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div
          className={
            isLight
              ? "rounded-2xl border-2 border-black p-10 text-center"
              : "relative overflow-hidden rounded-2xl bg-card/60 p-10 text-center shadow-[0_8px_30px_-20px_rgba(0,0,0,0.6)]"
          }
        >
          {!isLight && <div className="absolute inset-0 opacity-20 blur-2xl bg-gradient-to-r from-amber-500 to-orange-500" />}
          <div className="relative z-10">
            <Archive className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h2 className={isLight ? "text-xl font-extrabold text-black" : "text-xl font-semibold"}>
              {searchQuery ? "No se encontraron proyectos" : "No hay proyectos archivados"}
            </h2>
            <p className={isLight ? "mt-2 text-sm text-black/70" : "mt-2 text-sm text-muted-foreground"}>
              {searchQuery 
                ? "No hay proyectos archivados que coincidan con tu búsqueda."
                : "Los proyectos archivados aparecerán aquí. Actualmente no hay ninguno."
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <ArchiveProjectCard 
              key={project.id} 
              project={project}
              onUnarchive={handleProjectUnarchived}
            />
          ))}
        </div>
      )}
    </div>
  );
}