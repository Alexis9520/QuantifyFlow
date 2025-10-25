// app/projects/[projectId]/archive/page.tsx
import { getCurrentUser } from '@/lib/server-auth';
import { redirect } from 'next/navigation';
import { getUserRoleAndTeam } from '@/app/(main)/dashboard/actions'; // O donde tengas esta función
import { getArchivedTasks } from '@/services/kanbanService';
import { ArchivedTasksClientPage } from './ArchivedTasksClientPage'; // Componente Cliente que crearemos

interface ArchivePageProps {
  params: { projectId: string };
}

export default async function ArchivePage({ params }: ArchivePageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const membership = await getUserRoleAndTeam(user.uid);
  if (!membership) {
     return <div>No perteneces a un equipo válido para ver este archivo.</div>;
  }
  
  // Obtener las tareas archivadas
  const archivedTasks = await getArchivedTasks(params.projectId, membership.teamId);

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 2xl:px-12">
      <h1 className="text-3xl font-extrabold mb-6">Tareas Archivadas</h1>
      <ArchivedTasksClientPage 
        initialTasks={archivedTasks}
        userRole={membership.role as 'admin' | 'member' | null}
        userId={user.uid}
        teamId={membership.teamId}
        projectId={params.projectId}
      />
    </div>
  );
}