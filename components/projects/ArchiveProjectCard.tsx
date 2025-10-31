"use client";

import { Project } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Archive, Loader2, Calendar, Users, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { unarchivedProject } from '@/services/projectService';

interface ArchiveProjectCardProps {
  project: Project;
  onUnarchive: () => void;
}

// Función auxiliar para manejar fechas de Firebase
const convertToDate = (dateValue: any): Date => {
  if (!dateValue) return new Date();
  
  // Si es un objeto Timestamp de Firebase (tiene toDate method)
  if (typeof dateValue === 'object' && dateValue !== null && 'toDate' in dateValue) {
    return dateValue.toDate();
  }
  
  // Si ya es una instancia de Date
  if (dateValue instanceof Date) {
    return dateValue;
  }
  
  // Si es un string o number
  return new Date(dateValue);
};

export function ArchiveProjectCard({ project, onUnarchive }: ArchiveProjectCardProps) {
  const [isUnarchiving, setIsUnarchiving] = useState(false);

  const handleUnarchive = async () => {
    setIsUnarchiving(true);
    try {
      await unarchivedProject(project.id);
      onUnarchive();
    } catch (error) {
      console.error("Error al desarchivar el proyecto:", error);
    } finally {
      setIsUnarchiving(false);
    }
  };

  const formatDate = (dateValue: any): string => {
    if (!dateValue) return 'Sin fecha';
    
    try {
      const date = convertToDate(dateValue);
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  const getArchivedTime = (): string => {
    if (!project.updatedAt) return 'Recientemente';
    
    try {
      const archivedDate = convertToDate(project.updatedAt);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - archivedDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return 'Hace 1 día';
      if (diffDays < 30) return `Hace ${diffDays} días`;
      if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
      return `Hace ${Math.floor(diffDays / 365)} años`;
    } catch {
      return 'Recientemente';
    }
  };

  return (
    <Card className="group relative h-full flex flex-col transition-all duration-300 hover:shadow-lg border-amber-200/50 bg-amber-50/30 dark:bg-amber-950/10 dark:border-amber-800/50">
      {/* Archived badge */}
      <div className="absolute top-3 right-3 z-10">
        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700">
          <Archive className="w-3 h-3 mr-1" />
          Archivado
        </Badge>
      </div>

      <CardHeader className="p-5 pb-3 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-8">
            <CardTitle className="text-lg font-bold truncate leading-tight text-amber-900 dark:text-amber-100">
              {project.name}
            </CardTitle>
            <CardDescription className="mt-2 text-sm leading-relaxed line-clamp-2 min-h-[40px] text-amber-700/80 dark:text-amber-300/80">
              {project.description || "Sin descripción."}
            </CardDescription>
          </div>
        </div>

        {/* Project Metadata */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs font-medium bg-white/50 dark:bg-gray-800/50">
            <Calendar className="w-3 h-3 mr-1" />
            Creado: {formatDate(project.createdAt)}
          </Badge>
        
        </div>
      </CardHeader>

      {/* Task breakdown */}
      <CardContent className="p-5 pt-0 flex-1">
        <div className="space-y-3">
          {/* Task counts */}
          {project.taskCounts && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 bg-white/50 rounded-lg dark:bg-gray-800/50">
                <span className="text-amber-700 dark:text-amber-300">Total</span>
                <span className="font-semibold">{project.taskCounts.all || 0}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white/50 rounded-lg dark:bg-gray-800/50">
                <span className="text-green-600 dark:text-green-400">Completadas</span>
                <span className="font-semibold">{project.taskCounts.done || 0}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white/50 rounded-lg dark:bg-gray-800/50">
                <span className="text-blue-600 dark:text-blue-400">En progreso</span>
                <span className="font-semibold">{project.taskCounts.inProgress || 0}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white/50 rounded-lg dark:bg-gray-800/50">
                <span className="text-gray-600 dark:text-gray-400">Pendientes</span>
                <span className="font-semibold">{project.taskCounts.todo || 0}</span>
              </div>
            </div>
          )}

          {/* Archived time */}
          <div className="text-xs text-amber-600 dark:text-amber-400 text-center">
            <Archive className="w-3 h-3 inline mr-1" />
            Archivado {getArchivedTime()}
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-5 pt-3">
        <div className="flex items-center justify-between w-full">
          {/* Total tasks summary */}
          <div className="flex items-center text-sm text-amber-700 dark:text-amber-300 font-medium">
            <CheckSquare className="mr-2 h-4 w-4" />
            <span>{project.taskCounts?.all || 0} Tareas totales</span>
          </div>
          
          {/* Unarchive Button */}
          <Button
            onClick={handleUnarchive}
            disabled={isUnarchiving}
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-white font-medium"
          >
            {isUnarchiving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            Desarchivar
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}