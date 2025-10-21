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

/**
 * Obtiene un conjunto completo de datos para el dashboard de un administrador de equipo.
 *
 * @param teamId - El ID del equipo para el que se recopilarán los datos.
 * @returns Una promesa que se resuelve con un objeto AdminDashboardData o null si el equipo no se encuentra.
 */
export const getAdminDashboardData = async (teamId: string): Promise<AdminDashboardData | null> => {
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
            tasks,
            recentActivity
        ] = await Promise.all([
            // --- Obtener Miembros del Equipo con sus Detalles de Usuario ---
            (async (): Promise<TeamMemberWithDetails[]> => {
                const membersQuery = query(collection(db, 'teamMembers'), where('teamId', '==', teamId));
                const membersSnap = await getDocs(membersQuery);
                const memberDocs = membersSnap.docs.map(d => d.data() as TeamMember);

                console.log(`[AdminService] Obtenidos ${memberDocs.length} registros de miembros.`);
                if (memberDocs.length === 0) return [];

                const userIds = memberDocs.map(m => m.userId);
                const usersQuery = query(collection(db, 'users'), where('uid', 'in', userIds));
                const usersSnap = await getDocs(usersQuery);
                const usersData = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as User));

                // Unir datos de usuario con datos de miembro (rol, fecha de unión)
                const membersWithDetails: TeamMemberWithDetails[] = usersData.map(user => {
                    const memberInfo = memberDocs.find(m => m.userId === user.uid);

                    // ✨ Lógica más explícita y segura
                    return {
                        ...user,
                        role: memberInfo ? memberInfo.rol : 'member', // Provee un fallback explícito
                        joinedAt: memberInfo ? memberInfo.joinedAt : undefined, // Asigna undefined si no se encuentra
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
            })()
        ]);

        // 3. Ensamblar el objeto final
        const dashboardData: AdminDashboardData = {
            team: teamData,
            members,
            projects,
            tasks,
            recentActivity
        };

        console.log(`[AdminService] 🚀 Ensamblaje de datos del dashboard de admin completado.`, dashboardData);
        return dashboardData;

    } catch (error) {
        console.error("[AdminService] ERROR: Ocurrió un error al obtener los datos en paralelo.", error);
        return null;
    }
};