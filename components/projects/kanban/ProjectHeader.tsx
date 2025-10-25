"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { getProjectById } from "@/services/projectService"; // 1. Importar el servicio
import { Project, User, Tag } from "@/types"; // 2. Importar el tipo Project
import { Button } from "@/components/ui/button"; // Importar para el nuevo botón
import { Search, Plus, User as UserIcon, Tag as TagIcon, X, Link2, Settings, Loader2, ArchiveIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProjectHeaderProps {
  projectId: string;
  teamMembers: User[];
  availableTags: Tag[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedUsers: string[];
  onUserFilterChange: (userIds: string[]) => void;
  selectedTags: string[];
  onTagFilterChange: (tagIds: string[]) => void;
  onNewTaskClick: () => void;
  userRole: "admin" | "member" | null;
  currentUserId?: string;
  onArchiveAllDone: () => void;
  isArchivingAll: boolean;
}

export default function ProjectHeader({
  projectId,
  teamMembers,
  availableTags,
  searchQuery,
  onSearchChange,
  selectedUsers,
  onUserFilterChange,
  selectedTags,
  onTagFilterChange,
  onNewTaskClick,
  userRole,
  currentUserId,
  onArchiveAllDone,
  isArchivingAll,
}: ProjectHeaderProps) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    if (!projectId) return;

    const fetchProjectData = async () => {
      setIsLoading(true);
      try {
        const projectData = await getProjectById(projectId);
        setProject(projectData);
      } catch (error) {
        console.error("Error al obtener los datos del proyecto:", error);
        setProject(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId]);
  // --- búsqueda con debounce ---
  const [localQuery, setLocalQuery] = useState(searchQuery);
  useEffect(() => setLocalQuery(searchQuery), [searchQuery]);
  useEffect(() => {
    const id = setTimeout(() => onSearchChange(localQuery), 250);
    return () => clearTimeout(id);
  }, [localQuery, onSearchChange]);

  // --- cálculos de seleccionados ---
  const selectedUserObjs = useMemo(
    () => teamMembers.filter((u) => selectedUsers.includes(u.uid)),
    [teamMembers, selectedUsers]
  );
  const selectedTagObjs = useMemo(
    () => availableTags.filter((t) => selectedTags.includes(t.id)),
    [availableTags, selectedTags]
  );

  // --- toggles ---
  const toggleUser = (uid: string) => {
    if (selectedUsers.includes(uid)) onUserFilterChange(selectedUsers.filter((id) => id !== uid));
    else onUserFilterChange([...selectedUsers, uid]);
  };
  const toggleTag = (id: string) => {
    if (selectedTags.includes(id)) onTagFilterChange(selectedTags.filter((t) => t !== id));
    else onTagFilterChange([...selectedTags, id]);
  };

  // --- helper ---
  const initials = (name?: string | null) =>
    (name || "")
      .trim()
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  // --- estilos popover ---
  const popoverPanelLight =
    "z-50 w-[min(90vw,360px)] p-0 rounded-2xl border-2 border-black bg-white text-black shadow-none";
  const popoverPanelDark =
    "z-50 w-[min(90vw,360px)] p-0 rounded-2xl shadow-xl border border-white/10 ring-1 ring-white/10 bg-neutral-900 text-foreground";

  return (
    <div className="w-full">
      {/* Título + acción */}
      {/* --- 5. SECCIÓN DE TÍTULO MODIFICADA --- */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        {/* Columna izquierda: Información del proyecto */}
        <div className="flex-1">
          {isLoading ? (
            // Esqueleto de carga
            <>
              <div className="h-8 w-1/2 animate-pulse rounded-md bg-muted"></div>
              <div className="mt-2 h-4 w-3/4 animate-pulse rounded-md bg-muted"></div>
            </>
          ) : project ? (
            // Datos del proyecto
            <>
              <div className="flex items-center gap-3">
                <h1 className={isLight ? "text-2xl font-extrabold tracking-tight text-black" : "text-2xl font-extrabold tracking-tight"}>
                  {project.name}
                </h1>
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${project.status === "active"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300"
                    }`}
                >
                  {project.status === "active" ? "Activo" : "Archivado"}
                </span>
              </div>

              {project.description && (
                <p className={isLight ? "mt-1 text-sm text-black/70" : "mt-1 text-sm text-muted-foreground"}>
                  {project.description}
                </p>
              )}

              {project.urls && project.urls.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  {project.urls.map(url => (
                    <a
                      key={url.id}
                      href={url.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 transition-colors"
                    >
                      <Link2 className="h-4 w-4" />
                      {url.label}
                    </a>
                  ))}
                </div>
              )}
            </>
          ) : (
            // Estado de error
            <p className="text-destructive">No se pudo cargar el proyecto.</p>
          )}
        </div>

        {/* Columna derecha: Acciones */}
        <div className="flex flex-shrink-0 items-center gap-2">

          {/* --- 👇 CAMBIO: Añadir botón/link a Archivo --- */}
          {/* Visible para todos los miembros */}
          <Button variant="outline" size="icon" asChild title="Ver tareas archivadas">
            <Link href={`/projects/${projectId}/archive`}>
              <ArchiveIcon className="h-5 w-5" />
              <span className="sr-only">Tareas Archivadas</span>
            </Link>
          </Button>
          {/* --- Fin del botón/link --- */}

          {/* Botones de Admin */}
          {userRole === 'admin' && (
            <> {/* Usamos Fragment para agrupar botones de admin */}
              {/* Botón Archivar Completadas (existente) */}
              <Button
                variant="outline"
                size="sm"
                onClick={onArchiveAllDone}
                disabled={isArchivingAll}
                className="hidden sm:inline-flex"
              >
                {isArchivingAll ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArchiveIcon className="mr-2 h-4 w-4" /> // Reutilizamos icono
                )}
                Archivar Completadas
              </Button>

              {/* Botón de Configuración (existente) */}
              <Button variant="outline" size="icon" asChild title="Configuración del proyecto">
                <Link href={`/projects/${projectId}/settings`}>
                  <Settings className="h-5 w-5" />
                  <span className="sr-only">Configuración del Proyecto</span>
                </Link>
              </Button>
            </>
          )}

          {/* Botón Nueva Tarea (Visible para Admin) */}
          {userRole === 'admin' && (
            <button
              onClick={onNewTaskClick}
              className={
                isLight
                  ? "inline-flex h-11 items-center gap-2 rounded-2xl border-2 border-black px-4 font-semibold text-black transition-colors hover:bg-black hover:text-white"
                  : "relative inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-4 font-semibold text-white shadow-md transition-all hover:from-indigo-400 hover:via-violet-500 hover:to-fuchsia-400 active:scale-[0.99]"
              }
              aria-label="Añadir tarea"
              disabled={isArchivingAll}
            >
              <Plus size={18} />
              Añadir tarea
            </button>
          )}

        </div> {/* Cierre del div flex de acciones */}
      </div>

      {/* Filtros */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {/* Buscador (icono alineado: sin absolute) */}
        <div>
          <label htmlFor="task-search" className="sr-only">
            Buscar tarea por título
          </label>
          <div
            className={
              isLight
                ? "flex h-11 w-full items-center gap-2 rounded-2xl border-2 border-black px-3"
                : "flex h-11 w-full items-center gap-2 rounded-2xl ring-2 ring-white/20 px-3"
            }
          >
            <Search className={isLight ? "h-4 w-4 shrink-0 text-black/70" : "h-4 w-4 shrink-0 text-muted-foreground"} />
            <input
              id="task-search"
              type="text"
              placeholder="Buscar tarea por título..."
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              className={
                isLight
                  ? "h-full flex-1 bg-transparent text-sm text-black placeholder:text-black/50 outline-none"
                  : "h-full flex-1 bg-transparent text-sm outline-none"
              }
              aria-label="Buscar tarea"
            />
          </div>
        </div>

        {/* Usuarios */}
        <div className="min-w-0">
          <label className="sr-only">Filtrar por usuario</label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={
                  isLight
                    ? "flex h-11 w-full items-center justify-between gap-2 rounded-2xl border-2 border-black bg-transparent px-3 text-left text-sm"
                    : "flex h-11 w-full items-center justify-between gap-2 rounded-2xl bg-transparent px-3 text-left text-sm outline-none transition ring-2 ring-white/20 hover:ring-violet-400/60 focus-visible:ring-violet-400/70"
                }
                aria-label="Filtrar por usuario"
              >
                <span className="inline-flex items-center gap-2 truncate">
                  <UserIcon className={isLight ? "h-4 w-4 text-black/80" : "h-4 w-4 text-muted-foreground"} />
                  {selectedUserObjs.length > 0 ? (
                    <span className="truncate">{selectedUserObjs.length} seleccionado(s)</span>
                  ) : (
                    <span className={isLight ? "text-black/60" : "text-muted-foreground"}>Filtrar por usuario...</span>
                  )}
                </span>
                <span
                  className={
                    isLight
                      ? "rounded-full border-2 border-black px-2 py-0.5 text-xs"
                      : "rounded-full bg-white/10 px-2 py-0.5 text-xs ring-1 ring-white/10"
                  }
                >
                  {selectedUserObjs.length}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className={isLight ? popoverPanelLight : popoverPanelDark}>
              <Command className="bg-transparent">


                <CommandEmpty className="px-3 py-2">Sin resultados.</CommandEmpty>
                <CommandList className="px-1 pb-2">
                  <ScrollArea className="max-h-64">
                    <CommandGroup heading="Miembros">
                      {teamMembers.map((m) => {
                        const checked = selectedUsers.includes(m.uid);
                        return (
                          <CommandItem
                            key={m.uid}
                            value={m.displayName || m.uid}
                            onSelect={() => toggleUser(m.uid)}
                            className="cursor-pointer"
                          >
                            <div
                              className={
                                isLight
                                  ? "mr-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-black"
                                  : "mr-2 flex h-6 w-6 items-center justify-center rounded-full ring-1 ring-white/10"
                              }
                            >
                              {m.photoURL ? (
                                <img
                                  src={m.photoURL}
                                  alt={m.displayName || "usuario"}
                                  className="h-6 w-6 rounded-full object-cover"
                                />
                              ) : (
                                <span className={isLight ? "text-[10px] font-extrabold text-black" : "text-[10px] font-semibold"}>
                                  {initials(m.displayName)}
                                </span>
                              )}
                            </div>
                            <span className="flex-1 truncate">{m.displayName}</span>
                            <Checkbox checked={checked} className="pointer-events-none" />
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </ScrollArea>
                </CommandList>
                {selectedUsers.length > 0 && (
                  <div className={isLight ? "border-t-2 border-black p-2 text-right" : "border-t p-2 text-right"}>
                    <button
                      className={isLight ? "text-xs text-black/60 hover:text-black" : "text-xs text-muted-foreground hover:text-foreground"}
                      onClick={() => onUserFilterChange([])}
                    >
                      Limpiar selección
                    </button>
                  </div>
                )}
              </Command>
            </PopoverContent>
          </Popover>

          {/* Chips usuarios */}
          {selectedUserObjs.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedUserObjs.map((u) => (
                <button
                  key={u.uid}
                  onClick={() => toggleUser(u.uid)}
                  className={
                    isLight
                      ? "inline-flex items-center gap-1 rounded-full border-2 border-black px-2 py-1 text-xs"
                      : "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ring-2 ring-white/20 hover:ring-violet-400/60"
                  }
                  title={u.displayName || ""}
                >
                  <span
                    className={
                      isLight
                        ? "inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-black"
                        : "inline-flex h-4 w-4 items-center justify-center rounded-full ring-1 ring-white/10"
                    }
                  >
                    {u.photoURL ? (
                      <img
                        src={u.photoURL}
                        alt={u.displayName || "usuario"}
                        className="h-4 w-4 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-[8px] font-semibold">{initials(u.displayName)}</span>
                    )}
                  </span>
                  <span className="max-w-[120px] truncate">{u.displayName}</span>
                  <X className="h-3 w-3 opacity-60" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Etiquetas */}
        <div className="min-w-0">
          <label className="sr-only">Filtrar por etiqueta</label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={
                  isLight
                    ? "flex h-11 w-full items-center justify-between gap-2 rounded-2xl border-2 border-black bg-transparent px-3 text-left text-sm"
                    : "flex h-11 w-full items-center justify-between gap-2 rounded-2xl bg-transparent px-3 text-left text-sm outline-none transition ring-2 ring-white/20 hover:ring-violet-400/60 focus-visible:ring-violet-400/70"
                }
                aria-label="Filtrar por etiqueta"
              >
                <span className="inline-flex items-center gap-2 truncate">
                  <TagIcon className={isLight ? "h-4 w-4 text-black/80" : "h-4 w-4 text-muted-foreground"} />
                  {selectedTagObjs.length > 0 ? (
                    <span className="truncate">{selectedTagObjs.length} etiqueta(s)</span>
                  ) : (
                    <span className={isLight ? "text-black/60" : "text-muted-foreground"}>Filtrar por etiqueta...</span>
                  )}
                </span>
                <span
                  className={
                    isLight
                      ? "rounded-full border-2 border-black px-2 py-0.5 text-xs"
                      : "rounded-full bg-white/10 px-2 py-0.5 text-xs ring-1 ring-white/10"
                  }
                >
                  {selectedTagObjs.length}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className={isLight ? popoverPanelLight : popoverPanelDark}>
              <Command className="bg-transparent">



                <CommandEmpty className="px-3 py-2">Sin resultados.</CommandEmpty>
                <CommandList className="px-1 pb-2">
                  <ScrollArea className="max-h-64">
                    <CommandGroup heading="Etiquetas">
                      {availableTags.map((t) => {
                        const checked = selectedTags.includes(t.id);
                        return (
                          <CommandItem
                            key={t.id}
                            value={t.tagName}
                            onSelect={() => toggleTag(t.id)}
                            className="cursor-pointer"
                          >
                            <span
                              className={
                                isLight
                                  ? "mr-2 inline-block h-3 w-3 rounded-full border-2 border-black"
                                  : "mr-2 inline-block h-3 w-3 rounded-full ring-1 ring-white/20"
                              }
                              style={{ backgroundColor: t.color || (isLight ? "#000000" : "#64748b") }}
                            />
                            <span className="flex-1 truncate">{t.tagName}</span>
                            <Checkbox checked={checked} className="pointer-events-none" />
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </ScrollArea>
                </CommandList>
                {selectedTags.length > 0 && (
                  <div className={isLight ? "border-t-2 border-black p-2 text-right" : "border-t p-2 text-right"}>
                    <button
                      className={isLight ? "text-xs text-black/60 hover:text-black" : "text-xs text-muted-foreground hover:text-foreground"}
                      onClick={() => onTagFilterChange([])}
                    >
                      Limpiar selección
                    </button>
                  </div>
                )}
              </Command>
            </PopoverContent>
          </Popover>

          {/* Chips etiquetas */}
          {selectedTagObjs.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedTagObjs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => toggleTag(t.id)}
                  className={
                    isLight
                      ? "inline-flex items-center gap-1 rounded-full border-2 border-black px-2 py-1 text-xs"
                      : "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ring-2 ring-white/20 hover:ring-violet-400/60"
                  }
                  title={t.tagName}
                >
                  <span
                    className={
                      isLight
                        ? "inline-block h-2.5 w-2.5 rounded-full border-2 border-black"
                        : "inline-block h-2.5 w-2.5 rounded-full ring-1 ring-white/20"
                    }
                    style={{ backgroundColor: t.color || (isLight ? "#000000" : "#64748b") }}
                  />
                  <span className="max-w-[140px] truncate">{t.tagName}</span>
                  <X className="h-3 w-3 opacity-60" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}