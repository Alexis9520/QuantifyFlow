import { collection, getDocs, writeBatch, doc, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Asegúrate que la ruta sea correcta

// Límite de Firebase por cada batch
const BATCH_SIZE = 499;

export async function migrateTasksToV2() {
  console.log("Iniciando migración de tareas...");
  const tasksRef = collection(db, "tasks");
  
  
  const q = query(
    tasksRef,
    // where("isArchived", "==", undefined) // <-- Esto no es válido en Firestore
    limit(BATCH_SIZE) // Limitamos a 500 para no sobrecargar
  );

  let updatedCount = 0;
  let batch = writeBatch(db);

  try {
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log("No se encontraron tareas para migrar.");
      return "No hay tareas para migrar.";
    }

    querySnapshot.forEach(document => {
      const taskData = document.data();

      // Verificamos si el campo falta
      if (taskData.isArchived === undefined) {
        const taskDocRef = doc(db, "tasks", document.id);
        batch.update(taskDocRef, { isArchived: false });
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
      console.log(`¡Lote completado! ${updatedCount} tareas fueron actualizadas.`);
      // Si se actualizaron tareas, es posible que queden más.
      return `Lote exitoso: ${updatedCount} tareas actualizadas. Por favor, vuelve a ejecutar el script si el número fue ${BATCH_SIZE}.`;
    } else {
      console.log("No se encontraron tareas que necesiten migración en este lote.");
      return "Tareas ya migradas en este lote.";
    }
    
  } catch (error) {
    console.error("Error durante la migración:", error);
    return "Error en la migración. Revisa la consola.";
  }
}