// app/projects/[projectId]/settings/page.tsx

// 1. Importa tu componente de cliente (le cambiaremos el nombre en el paso 2)
import ProjectSettingsClientPage from '@/components/projects/ProjectSettingsClientPage'; // 👈 Ajusta esta ruta
import { Suspense } from 'react';

// 2. Define la interfaz de props para la PÁGINA
interface SettingsPageProps {
  params: {
    projectId: string;
  };
}

// 3. Este es el Componente de Servidor por defecto
export default function SettingsPage({ params }: SettingsPageProps) {
  const { projectId } = params;

  // 4. Renderiza el componente de CLIENTE, pasándole el ID como una prop simple
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ProjectSettingsClientPage projectId={projectId} />
    </Suspense>
  );
}