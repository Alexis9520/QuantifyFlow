// services/adminService.ts

import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    orderBy,
    limit,
    getCountFromServer, // 👈 1. Importado
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
    User,
    Team,
    Project,
    Task,
    ActivityLog,
    TeamMember,
    TaskCountBreakdown, // 👈 2. Importado
} from '@/types/index';
import {
    AdminDashboardData,
    TeamMemberWithDetails,
} from '@/types/dashboard-types';
import { getCurrentUserTasks } from './kanbanService';

// 3. Helper copiado de projectService para obtener desglose de tareas
async function getTaskBreakdown(
    projectId: string
): Promise<TaskCountBreakdown> {
    const tasksRef = collection(db, 'tasks');

    // Query base (solo tareas no archivadas)
    const baseQuery = query(
        tasksRef,
        where('projectId', '==', projectId),
        where('isArchived', '==', false)
    );

    // Queries para cada estado
    const allSnap = getCountFromServer(baseQuery);
    const todoSnap = getCountFromServer(
        query(baseQuery, where('status', '==', 'todo'))
    );
    const inProgressSnap = getCountFromServer(
        query(baseQuery, where('status', '==', 'in-progress'))
    );
    const doneSnap = getCountFromServer(
        query(baseQuery, where('status', '==', 'done'))
    );

    // Esperamos todas las consultas en paralelo
    const [allCount, todoCount, inProgressCount, doneCount] = await Promise.all([
        allSnap,
        todoSnap,
        inProgressSnap,
        doneSnap,
    ]);

    return {
        all: allCount.data().count,
        todo: todoCount.data().count,
        inProgress: inProgressCount.data().count,
        done: doneCount.data().count,
    };
}

export const getAdminDashboardData = async (
    teamId: string,
    adminUserId: string
): Promise<AdminDashboardData | null> => {
    console.log(
        `[AdminService] Iniciando la obtención de datos para el equipo: ${teamId}`
    );

    // 1. Validar que el equipo existe
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);

    if (!teamSnap.exists()) {
        console.error(
            `[AdminService] ERROR: No se encontró el equipo con ID: ${teamId}`
        );
        return null;
    }
    const teamData = { id: teamSnap.id, ...teamSnap.data() } as Team;
    console.log(
        `[AdminService] ✅ Datos del equipo '${teamData.teamName}' obtenidos.`
    );

    try {
        // 2. Ejecutar todas las demás consultas en paralelo para máxima eficiencia
        const [
            members,
            projects, // Esta es la sección que se modificará
            tasks,
            recentActivity,
            adminAssignedTasks,
        ] = await Promise.all([
            // --- Obtener Miembros del Equipo con sus Detalles de Usuario ---
            (async (): Promise<TeamMemberWithDetails[]> => {
                const membersQuery = query(
                    collection(db, 'teamMembers'),
                    where('teamId', '==', teamId)
                );
                const membersSnap = await getDocs(membersQuery);
                const memberDocsData = membersSnap.docs.map((d) => ({
                    id: d.id, // ID del documento teamMembers
                    ...(d.data() as Omit<TeamMember, 'id'>),
                }));

                console.log(
                    `[AdminService] Obtenidos ${memberDocsData.length} registros de miembros.`
                );
                if (memberDocsData.length === 0) return [];

                const userIds = memberDocsData.map((m) => m.userId);
                // Asumiendo que userId es el ID del documento en 'users'
                const usersQuery = query(
                    collection(db, 'users'),
                    where('__name__', 'in', userIds)
                );
                const usersSnap = await getDocs(usersQuery);
                const usersDataMap: Record<string, User> = {};
                usersSnap.forEach((d) => {
                    usersDataMap[d.id] = { uid: d.id, ...d.data() } as User;
                });

                // Unir datos de usuario con datos de miembro (rol, fecha de unión)
                const membersWithDetails: TeamMemberWithDetails[] = memberDocsData.map(
                    (memberDoc) => {
                        const userDetail = usersDataMap[memberDoc.userId];
                        return {
                            ...(userDetail || {
                                uid: memberDoc.userId,
                                displayName: 'Usuario Desconocido',
                                email: '',
                                preferences: { theme: 'light', colorPalette: 'default' },
                                createdAt: new Date(),
                            }), // Fallback más completo
                            role: memberDoc.rol,
                            teamMemberDocId: memberDoc.id,
                            joinedAt: memberDoc ? memberDoc.joinedAt : undefined, // Si tienes joinedAt
                        };
                    }
                );
                console.log(
                    `[AdminService] ✅ Obtenidos detalles completos de ${membersWithDetails.length} miembros.`
                );
                return membersWithDetails;
            })(),

            // --- 4. MODIFICADO: Obtener Proyectos con desglose de tareas ---
            (async (): Promise<Project[]> => {
                // Nota: A diferencia de projectService, aquí traemos TODOS (activos y archivados)
                // porque es un dashboard de admin.
                const projectsQuery = query(
                    collection(db, 'projects'),
                    where('teamId', '==', teamId),
                    where('status', '==', 'active'),   // 👈 1. Solo activos
                    orderBy('updatedAt', 'desc'), // 👈 2. Más recientes primero
                    limit(6)
                );
                const projectsSnap = await getDocs(projectsQuery);
                const projectsData = projectsSnap.docs.map(
                    (d) =>
                    ({
                        id: d.id,
                        ...d.data(),
                        urls: d.data().urls || [],
                    } as Project)
                );

                console.log(
                    `[AdminService] Obtenidos ${projectsData.length} proyectos base.`
                );

                // Para cada proyecto, obtenemos el desglose de tareas
                const projectPromises = projectsData.map(async (project) => {
                    const taskCounts = await getTaskBreakdown(project.id); // 👈 Usamos el helper
                    return {
                        ...project,
                        taskCounts: taskCounts, // 👈 Asignamos el desglose
                    };
                });

                const projectsWithCounts = await Promise.all(projectPromises);
                console.log(
                    `[AdminService] ✅ Obtenidos ${projectsWithCounts.length} proyectos con conteo de tareas.`
                );
                return projectsWithCounts;
            })(),

            // --- Obtener todas las Tareas del Equipo (sin cambios) ---
            (async (): Promise<Task[]> => {
                const tasksQuery = query(
                    collection(db, 'tasks'),
                    where('teamId', '==', teamId)
                );
                const tasksSnap = await getDocs(tasksQuery);
                const tasksData = tasksSnap.docs.map(
                    (d) => ({ id: d.id, ...d.data() } as Task)
                );

                console.log(
                    `[AdminService] ✅ Obtenidas ${tasksData.length} tareas totales.`
                );
                return tasksData;
            })(),

            // --- Obtener la Actividad Reciente del Equipo (sin cambios) ---
            (async (): Promise<ActivityLog[]> => {
                const activityQuery = query(
                    collection(db, 'activityLog'),
                    where('teamId', '==', teamId),
                    orderBy('createdAt', 'desc'),
                    limit(20)
                );
                const activitySnap = await getDocs(activityQuery);
                const activityData = activitySnap.docs.map(
                    (d) => ({ id: d.id, ...d.data() } as ActivityLog)
                );

                console.log(
                    `[AdminService] ✅ Obtenidos ${activityData.length} registros de actividad reciente.`
                );
                return activityData;
            })(),

            // --- Obtener Tareas Asignadas al Admin (sin cambios) ---
            getCurrentUserTasks(adminUserId).then((tasks) => {
                console.log(
                    `[AdminService] ✅ Obtenidas ${tasks.length} tareas asignadas al admin.`
                );
                return tasks;
            }),
        ]);

        // 3. Ensamblar el objeto final
        const dashboardData: AdminDashboardData = {
            team: teamData,
            members,
            projects, // ✨ Esta propiedad ahora contiene el desglose 'taskCounts'
            tasks,
            recentActivity,
            adminAssignedTasks,
        };

        console.log(
            `[AdminService] 🚀 Ensamblaje de datos del dashboard de admin completado.`,
            //       dashboardData // Comentado para evitar spam masivo en consola
        );
        return dashboardData;
    } catch (error) {
        console.error(
            '[AdminService] ERROR: Ocurrió un error al obtener los datos en paralelo.',
            error
        );
        return null;
    }
};