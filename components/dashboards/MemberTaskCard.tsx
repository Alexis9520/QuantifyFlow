'use client';

import { useState, useEffect } from 'react';
import type { Task, TaskWithDetails, User } from '@/types';
// Importa la función que acabas de crear
import { enrichTaskWithDetails } from '@/services/kanbanService';
import { CheckCircle, Users, Tag as TagIcon } from 'lucide-react';

interface MemberTaskCardProps {
  // La tarea básica que viene de la consulta inicial
  task: Task; 
  // El caché de usuarios para evitar consultas repetidas
  usersCache: Record<string, User>;
  // Opcional: una función para manejar el click en la tarjeta
  onClick?: (taskDetails: TaskWithDetails) => void;
}

// Un componente simple para mostrar mientras se cargan los datos
const CardSkeleton = () => (
  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 w-full animate-pulse">
    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-4"></div>
    <div className="flex justify-between items-center mb-4">
      <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
      <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
    </div>
    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
  </div>
);


export default function MemberTaskCard({ task, usersCache, onClick }: MemberTaskCardProps) {
  // Estado para guardar la tarea con todos sus detalles
  const [details, setDetails] = useState<TaskWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // useEffect para llamar a la función asíncrona cuando el componente se monta o la tarea cambia
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setIsLoading(true);
        // ✨ ¡Aquí usamos tu nueva función! ✨
        const enrichedData = await enrichTaskWithDetails(task, usersCache);
        setDetails(enrichedData);
      } catch (error) {
        console.error(`Error al enriquecer la tarea ${task.id}:`, error);
        setDetails(null); // Resetea en caso de error
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [task, usersCache]); // Se ejecuta si la tarea o el caché cambian

  // Si está cargando, muestra el esqueleto
  if (isLoading) {
    return <CardSkeleton />;
  }

  // Si no se pudieron cargar los detalles, no muestra nada
  if (!details) {
    return null;
  }

  // Calculamos los datos para mostrar
  const completedSubtasks = details.subtasks.filter(st => st.completed).length;

  return (
    <div
      onClick={() => onClick?.(details)}
      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 w-full cursor-pointer hover:shadow-md hover:border-blue-500 transition-all duration-200"
    >
      {/* Título de la tarea */}
      <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-2 truncate">{details.title}</h4>
      
      {/* Estado y Prioridad */}
      <div className="flex items-center gap-4 mb-3 text-xs">
        <span className="capitalize px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold">{details.status.replace('-', ' ')}</span>
        <span className="capitalize px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full font-semibold">{details.priority}</span>
      </div>

      {/* Progreso de Subtareas */}
      {details.subtasks.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
          <CheckCircle size={16} />
          <span>{completedSubtasks} de {details.subtasks.length} completadas</span>
        </div>
      )}

      {/* Etiquetas */}
      {details.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <TagIcon size={16} className="text-gray-400" />
          {details.tags.map(tag => (
            <span key={tag.id} className="text-xs px-2 py-1 rounded-full text-white" style={{ backgroundColor: tag.color }}>
              {tag.tagName}
            </span>
          ))}
        </div>
      )}

      {/* 👇 CAMBIO: Renderizar un "avatar stack" para múltiples asignados */}
      {details.assignedTo && details.assignedTo.length > 0 && (
        <div className="flex items-center gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <Users size={16} className="text-gray-400 flex-shrink-0" />
          <div className="flex -space-x-2">
            {/* Mostramos los primeros 3 avatares */}
            {details.assignedTo.slice(0, 3).map((user) => (
              <img
                key={user.uid}
                src={user.photoURL || 'https://placehold.co/32x32'}
                alt={user.displayName || 'usuario'}
                title={user.displayName || 'usuario'} // Tooltip con el nombre
                className="w-6 h-6 rounded-full ring-2 ring-white dark:ring-gray-800"
              />
            ))}
            {/* Si hay más de 3, mostramos un indicador "+N" */}
            {details.assignedTo.length > 3 && (
              <div 
                title={`${details.assignedTo.length - 3} más asignados`}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 ring-2 ring-white dark:ring-gray-800"
              >
                +{details.assignedTo.length - 3}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}