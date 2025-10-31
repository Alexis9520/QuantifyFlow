
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Asegúrate de que esta ruta sea correcta
import { 
  User, 
  Team, 
  ActivityLog, 
  TimeLog,
  TaskWithDetails
} from '@/types/index'; // Importa tus tipos
import { getCurrentUserTasks } from '@/services/kanbanService'; // Importa la función anterior
import { UserDashboardData } from '@/types/dashboard-types'; // Importa la nueva interfaz

export const getUserDashboardData = async (userId: string): Promise<UserDashboardData | null> => {
  // LOG: Inicio de la función
  console.log(`[DashboardService] Iniciando la obtención de datos para el usuario: ${userId}`);

  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // LOG: Error si el usuario no existe
    console.error(`[DashboardService] ERROR: No se encontró el documento del usuario con ID: ${userId}`);
    return null;
  }
  
  const userData = { uid: userSnap.id, ...userSnap.data() } as User;
  // LOG: Datos del usuario principal obtenidos
  console.log(`[DashboardService] ✅ Datos del usuario principal obtenidos:`, userData.displayName);

  // Usamos un bloque try...catch para manejar posibles errores en las promesas
  try {
    const [
      teams,
      assignedTasks,
      activityLogs,
      timeLogs
    ] = await Promise.all([
      // --- Obtener equipos del usuario ---
      (async () => {
        const teamMembersQuery = query(collection(db, 'teamMembers'), where('userId', '==', userId));
        const teamMembersSnap = await getDocs(teamMembersQuery);
        const teamIds = teamMembersSnap.docs.map(doc => doc.data().teamId);

        // LOG: IDs de los equipos encontrados
        console.log(`[DashboardService] IDs de equipos encontrados para el usuario:`, teamIds);

        if (teamIds.length === 0) {
          console.log(`[DashboardService] 🟡 El usuario no pertenece a ningún equipo.`);
          return [];
        }

        const teamsQuery = query(collection(db, 'teams'), where('__name__', 'in', teamIds));
        const teamsSnap = await getDocs(teamsQuery);
        const teamsData = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
        
        // LOG: Datos completos de los equipos
        console.log(`[DashboardService] ✅ Obtenidos ${teamsData.length} equipos.`);
        return teamsData;
      })(),

      // --- Obtener tareas asignadas (reutilizando la función) ---
      getCurrentUserTasks(userId).then(tasks => {
        // LOG: Resultado de la obtención de tareas
        console.log(`[DashboardService] ✅ Obtenidas ${tasks.length} tareas asignadas.`);
        return tasks;
      }),

      // --- Obtener registros de actividad ---
      (async () => {
        // Asegúrate de importar orderBy y limit de "firebase/firestore"
        const logsQuery = query(
          collection(db, 'activityLog'), 
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'), // <-- 1. Ordena por fecha (más reciente primero)
          limit(20)                     // <-- 2. Limita a los 20 primeros
        ); 
        
        const logsSnap = await getDocs(logsQuery);
        const logsData = logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));
        
        // LOG: Resultado de la obtención de logs de actividad
        console.log(`[DashboardService] ✅ Obtenidos ${logsData.length} registros de actividad.`);
        return logsData;
      })(),

      // --- Obtener registros de tiempo ---
      (async () => {
        const logsQuery = query(collection(db, 'timeLogs'), where('userId', '==', userId));
        const logsSnap = await getDocs(logsQuery);
        const logsData = logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeLog));

        // LOG: Resultado de la obtención de logs de tiempo
        console.log(`[DashboardService] ✅ Obtenidos ${logsData.length} registros de tiempo.`);
        return logsData;
      })()
    ]);

    const dashboardData: UserDashboardData = {
      user: userData,
      teams,
      assignedTasks,
      activityLogs,
      timeLogs,
    };

    // LOG: Objeto final antes de ser retornado
    console.log(`[DashboardService] 🚀 Ensamblaje de datos del dashboard completado.`, dashboardData);

    return dashboardData;

  } catch (error) {
    // LOG: Manejo de errores en las consultas paralelas
    console.error("[DashboardService] ERROR: Ocurrió un error al obtener los datos en paralelo.", error);
    return null; // Retornamos null si alguna de las promesas falla
  }
};