"use client";

import Link from 'next/link';
// 👇 Importa los tipos actualizados
import { Project, TeamMemberRol } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// 👇 Importa todos los iconos necesarios
import {
  Archive,
  Loader2,
  ArrowUpRight,
  Circle,         // Para 'todo'
  PlayCircle,     // Para 'in-progress'
  CheckCircle2    // Para 'done'
} from 'lucide-react';
import { useState, MouseEvent } from 'react';

// (Asegúrate de tener este componente de Badge disponible o cópialo de tu otro archivo)
const StatusBadge = ({ status }: { status?: string }) => {
  const s = String(status || "").toLowerCase();
  const label = s.replace(/-/g, " ") || "—";
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ring-gray-500/10 bg-gray-50 dark:bg-gray-400/10 text-gray-600 dark:text-gray-400">
      {label}
    </span>
  );
};

// Función para generar color (de tu Card 2)
const getProjectColor = (name: string) => {
  const colors = [
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-green-500 to-emerald-500',
    'from-orange-500 to-red-500',
    'from-violet-500 to-purple-500',
    'from-amber-500 to-orange-500'
  ];
  const index = name.length % colors.length;
  return colors[index];
};


interface ProjectCardProps {
  project: Project;
  userRole?: TeamMemberRol;
  onArchive?: (projectId: string) => Promise<void>;
}

export function ProjectCard({ project, userRole, onArchive }: ProjectCardProps) {
  const [isArchiving, setIsArchiving] = useState(false);

  // --- Lógica de Progreso (de Card 1) ---
  // Usamos los datos del 'project.taskCounts'
  const counts = project.taskCounts;
  const showProgress = counts && counts.all > 0;
  const percent = showProgress ? Math.round((counts.done / counts.all) * 100) : 0;

  // --- Lógica de Botones (de Card 2) ---
  const showArchiveButton = userRole === 'admin' && !!onArchive;
  const showFooterButtons = !!onArchive; // Mostramos footer si 'onArchive' (o 'userRole') se pasa

  const handleArchive = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isArchiving) return;

    setIsArchiving(true);
    try {
      await onArchive!(project.id); // '!' es seguro gracias a 'showArchiveButton'
    } catch (error) {
      console.error("Error al archivar el proyecto:", error);
      setIsArchiving(false);
    }
  };

  return (
    <Card className="group relative h-full flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50 overflow-hidden">
      {/* Gradient accent */}
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${getProjectColor(project.name)}`} />

      <CardHeader className="p-5 pb-3 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-bold truncate leading-tight group-hover:text-primary transition-colors">
              {project.name}
            </CardTitle>
            {/* Mostramos el StatusBadge si no estamos mostrando los botones del footer */}
            {!showFooterButtons && (
              <div className="mt-2">
                <StatusBadge status={project.status} />
              </div>
            )}
          </div>

          {/* Archive Button */}
          {showArchiveButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleArchive}
              disabled={isArchiving}
              aria-label="Archivar proyecto"
              className="ml-2 flex-shrink-0 h-8 w-8 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all"
            >
              {isArchiving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        <CardDescription className="text-sm leading-relaxed line-clamp-2 min-h-[40px]">
          {project.description || "Sin descripción."}
        </CardDescription>
      </CardHeader>

      {/* --- INICIO: Contenido de Progreso (de Card 1) --- */}
      {/* Mostramos esto si 'tasks' fue pasado (Dashboard) */}
      {counts && (
        <CardContent className="p-5 pt-2">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Progreso</span>
            <span>{percent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-[width] duration-700"
              style={{ width: `${percent}%` }}
            />
          </div>
          {/* Estadísticas */}
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1" title="Tareas por hacer">
              <Circle className="h-3 w-3 text-zinc-400" /> {counts.todo}
            </span>
            <span className="inline-flex items-center gap-1" title="Tareas en progreso">
              <PlayCircle className="h-3 w-3 text-indigo-400" /> {counts.inProgress}
            </span>
            <span className="inline-flex items-center gap-1" title="Tareas completadas">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" /> {counts.done}
            </span>
          </div>
        </CardContent>
      )}
      {/* --- FIN: Contenido de Progreso --- */}

      {!showFooterButtons && <div className="flex-grow" />}


        <CardFooter className="p-5 pt-3 mt-auto">
          <div className="flex items-center justify-between w-full">
            {/* Task Counter */}
            <div className="flex items-center text-sm text-muted-foreground font-medium">
              <CheckCircle2 className="mr-2 h-4 w-4 text-blue-500" />
              <span>{counts?.all ?? 0} Tareas</span>
            </div>

            {/* View Project Button */}
            <Button asChild variant="ghost" size="sm" className="group/btn font-medium">
              <Link href={`/projects/${project.id}`} className="flex items-center">
                {/* 👇 AÑADE ESTE FRAGMENTO */}
                <>
                  Ver Proyecto
                  <ArrowUpRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                </>
                {/* 👆 CIERRA EL FRAGMENTO */}
              </Link>
            </Button>
          </div>
        </CardFooter>

      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </Card>
  );
}