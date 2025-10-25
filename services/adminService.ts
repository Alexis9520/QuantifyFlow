// services/adminService.ts

import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
    User,
    Team,
    Project,
    Task,
    ActivityLog,
    TeamMember
} from '@/types/index';
import { AdminDashboardData, TeamMemberWithDetails } from '@/types/dashboard-types';
import { getCurrentUserTasks } from './kanbanService';


export const getAdminDashboardData = async (
    teamId: string,
    adminUserId: string
): Promise<AdminDashboardData | null> => {
    console.log(`[AdminService] Iniciando la obtención de datos para el equipo: ${teamId}`);

    // 1. Validar que el equipo existe
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);

    if (!teamSnap.exists()) {
        console.error(`[AdminService] ERROR: No se encontró el equipo con ID: ${teamId}`);
        return null;
    }
    const teamData = { id: teamSnap.id, ...teamSnap.data() } as Team;
    console.log(`[AdminService] ✅ Datos del equipo '${teamData.teamName}' obtenidos.`);

    try {
        // 2. Ejecutar todas las demás consultas en paralelo para máxima eficiencia
        const [
            members,
            projects,
            tasks, // Tareas básicas de todo el equipo
            recentActivity,
            adminAssignedTasks
        ] = await Promise.all([
            // --- Obtener Miembros del Equipo con sus Detalles de Usuario ---
            (async (): Promise<TeamMemberWithDetails[]> => {
                const membersQuery = query(collection(db, 'teamMembers'), where('teamId', '==', teamId));
                const membersSnap = await getDocs(membersQuery);
                const memberDocsData = membersSnap.docs.map(d => ({ 
                   id: d.id, // ID del documento teamMembers
                   ...(d.data() as Omit<TeamMember, 'id'>) 
                }));

                console.log(`[AdminService] Obtenidos ${memberDocsData.length} registros de miembros.`);
                if (memberDocsData.length === 0) return [];

                const userIds = memberDocsData.map(m => m.userId);
                 // Asumiendo que userId es el ID del documento en 'users'
                const usersQuery = query(collection(db, 'users'), where('__name__', 'in', userIds)); 
                const usersSnap = await getDocs(usersQuery);
                const usersDataMap: Record<string, User> = {};
                 usersSnap.forEach(d => {
                    usersDataMap[d.id] = { uid: d.id, ...d.data() } as User;
                 });

                // Unir datos de usuario con datos de miembro (rol, fecha de unión)
                const membersWithDetails: TeamMemberWithDetails[] = memberDocsData.map(memberDoc => {
                    const userDetail = usersDataMap[memberDoc.userId];
                    return {
                        ...(userDetail || { uid: memberDoc.userId, displayName: 'Usuario Desconocido', email: '', preferences: { theme:'light', colorPalette:'default'}, createdAt: new Date() }), // Fallback más completo
                        role: memberDoc.rol, 
                          teamMemberDocId: memberDoc.id, 
                        joinedAt: memberDoc ? memberDoc.joinedAt : undefined, // Si tienes joinedAt
                    };
                });
                console.log(`[AdminService] ✅ Obtenidos detalles completos de ${membersWithDetails.length} miembros.`);
                return membersWithDetails;
            })(),

            // --- Obtener todos los Proyectos del Equipo ---
            (async (): Promise<Project[]> => {
                const projectsQuery = query(collection(db, 'projects'), where('teamId', '==', teamId));
                const projectsSnap = await getDocs(projectsQuery);
                const projectsData = projectsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Project));

                console.log(`[AdminService] ✅ Obtenidos ${projectsData.length} proyectos.`);
                return projectsData;
            })(),

            // --- Obtener todas las Tareas del Equipo ---
            (async (): Promise<Task[]> => {
                const tasksQuery = query(collection(db, 'tasks'), where('teamId', '==', teamId));
                const tasksSnap = await getDocs(tasksQuery);
                const tasksData = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() } as Task));

                console.log(`[AdminService] ✅ Obtenidas ${tasksData.length} tareas totales.`);
                return tasksData;
            })(),

            // --- Obtener la Actividad Reciente del Equipo ---
            (async (): Promise<ActivityLog[]> => {
                const activityQuery = query(
                    collection(db, 'activityLog'),
                    where('teamId', '==', teamId),
                    orderBy('createdAt', 'desc'), // Ordenar por más reciente
                    limit(20) // Limitar a las últimas 20 actividades
                );
                const activitySnap = await getDocs(activityQuery);
                const activityData = activitySnap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog));

                console.log(`[AdminService] ✅ Obtenidos ${activityData.length} registros de actividad reciente.`);
                return activityData;
            })(),

            getCurrentUserTasks(adminUserId).then(tasks => {
                console.log(`[AdminService] ✅ Obtenidas ${tasks.length} tareas asignadas al admin.`);
                return tasks;
            }),
        ]);

        // 3. Ensamblar el objeto final
        const dashboardData: AdminDashboardData = {
            team: teamData,
            members,
            projects,
            tasks, // Tareas básicas de todo el equipo (activas)
            recentActivity,
            adminAssignedTasks
        };

        console.log(`[AdminService] 🚀 Ensamblaje de datos del dashboard de admin completado.`, dashboardData);
        return dashboardData;

    } catch (error) {
        console.error("[AdminService] ERROR: Ocurrió un error al obtener los datos en paralelo.", error);
        return null;
    }
};