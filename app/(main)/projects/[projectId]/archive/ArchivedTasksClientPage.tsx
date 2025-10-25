// app/projects/[projectId]/archive/ArchivedTasksClientPage.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Tag, TaskWithDetails } from '@/types'; // 👈 Asegúrate que incluya archivedByUser
import { unarchiveTask } from '@/services/kanbanService';
import { toast } from 'sonner'; // O tu librería de toast
import { ArchiveRestore as UnarchiveIcon, Loader2, Square, CheckSquare, Tag as TagIcon, UsersIcon } from 'lucide-react'; // 👈 Añadir iconos
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils'; // 👈 Importa cn si no lo tienes

interface ArchivedTasksClientPageProps {
    initialTasks: TaskWithDetails[];
    userRole: 'admin' | 'member' | null;
    userId: string;
    teamId: string;
    projectId: string;
}

// Micro-componente para mostrar etiquetas (similar a otros componentes)
const TagChip = ({ tag }: { tag: Tag }) => (
    <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ring-gray-500/10 bg-gray-50 dark:bg-gray-400/10 text-gray-600 dark:text-gray-400" // Estilo genérico, ajusta si quieres
    >
        <span
            className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: tag.color || '#9ca3af' }} // Color por defecto gris
        />
        {tag.tagName}
    </span>
);

const initials = (name?: string | null) =>
  (name || "")
    .trim()
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";


export function ArchivedTasksClientPage({
    initialTasks,
    userRole,
    userId,
    teamId,
    projectId
}: ArchivedTasksClientPageProps) {

    const [tasks, setTasks] = useState(initialTasks);
    const [unarchivingTaskId, setUnarchivingTaskId] = useState<string | null>(null);

    // ... (handleUnarchive sin cambios) ...
    const handleUnarchive = async (taskId: string) => {
        if (unarchivingTaskId || userRole !== 'admin') return;
        setUnarchivingTaskId(taskId);
        const toastId = toast.loading("Desarchivando tarea...");
        const originalTasks = tasks;
        setTasks(currentTasks => currentTasks.filter(t => t.id !== taskId));
        try {
            await unarchiveTask(taskId, userId, teamId);
            toast.success("Tarea desarchivada.", { id: toastId });
        } catch (error) {
            console.error("Error al desarchivar:", error);
            toast.error("No se pudo desarchivar la tarea.", { id: toastId });
            setTasks(originalTasks); // Revertir
        } finally {
            setUnarchivingTaskId(null);
        }
    };


    if (tasks.length === 0) {
        return <p className="text-muted-foreground">No hay tareas archivadas en este proyecto.</p>;
    }

    return (
        <div className="space-y-4">
            {tasks.map((task) => {
                const archivedDate = task.archivedAt ? new Date(task.archivedAt.seconds * 1000).toLocaleDateString() : 'N/A';
                const archivedByName = task.archivedByUser?.displayName ?? task.archivedBy ?? 'Desconocido';
                const isCurrentlyUnarchiving = unarchivingTaskId === task.id;
                const assignedUsers = task.assignedTo || [];
                
                return (
                    <div
                        key={task.id}
                        // --- CAMBIO: Añadir padding y flex-col para más espacio ---
                        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-lg shadow-sm bg-card text-card-foreground"
                    >
                        {/* --- Contenido principal (izquierda) --- */}
                        <div className="flex-1 space-y-3">
                            <p className="font-semibold">{task.title}</p>

                            {/* --- Info de Archivo --- */}
                            <p className="text-xs text-muted-foreground">
                                Archivado el: {archivedDate} por: {archivedByName}
                            </p>
                            {/* --- 👇 CAMBIO 4: Mostrar Usuarios Asignados --- */}
                            {assignedUsers.length > 0 && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <UsersIcon className="h-4 w-4 flex-shrink-0" />
                                    <span>Asignada a:</span>
                                    <div className="flex items-center -space-x-2 ml-1">
                                        {/* Mostrar los primeros 3 avatares */}
                                        {assignedUsers.slice(0, 3).map((user) => (
                                            user.photoURL ? (
                                                <img
                                                    key={user.uid}
                                                    src={user.photoURL}
                                                    alt={user.displayName || "usuario"}
                                                    title={user.displayName || "usuario"}
                                                    className="h-6 w-6 rounded-full object-cover ring-2 ring-background" // ring-background para solapamiento
                                                />
                                            ) : (
                                                <div
                                                    key={user.uid}
                                                    title={user.displayName || "usuario"}
                                                    className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold ring-2 ring-background"
                                                >
                                                    {initials(user.displayName)}
                                                </div>
                                            )
                                        ))}
                                        {/* Indicador "+N" si hay más */}
                                        {assignedUsers.length > 3 && (
                                            <div
                                                title={`${assignedUsers.length - 3} más asignados`}
                                                className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold ring-2 ring-background"
                                            >
                                                +{assignedUsers.length - 3}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {/* --- Mostrar Subtareas --- */}
                            {task.subtasks && task.subtasks.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Subtareas:</h4>
                                    <ul className="space-y-1">
                                        {task.subtasks.map(sub => (
                                            <li key={sub.id} className="flex items-center text-sm">
                                                {sub.completed ? (
                                                    <CheckSquare className="mr-2 h-4 w-4 text-green-500 flex-shrink-0" />
                                                ) : (
                                                    <Square className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                )}
                                                <span className={cn(sub.completed && "line-through text-muted-foreground")}>
                                                    {sub.title}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* --- Mostrar Etiquetas --- */}
                            {task.tags && task.tags.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <TagIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                    {task.tags.map(tag => (
                                        <TagChip key={tag.id} tag={tag} />
                                    ))}
                                </div>
                            )}

                        </div> {/* Fin contenido principal */}

                        {/* --- Botón Desarchivar (derecha) --- */}
                        <div className="flex-shrink-0 self-start md:self-center"> {/* Alinear botón */}
                            {userRole === 'admin' && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUnarchive(task.id)}
                                    disabled={isCurrentlyUnarchiving}
                                >
                                    {isCurrentlyUnarchiving ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <UnarchiveIcon className="mr-2 h-4 w-4" />
                                    )}
                                    Desarchivar
                                </Button>
                            )}
                        </div> {/* Fin botón */}

                    </div> // Fin tarjeta
                );
            })}
        </div> // Fin contenedor principal
    );
}