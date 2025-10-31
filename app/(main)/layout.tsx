import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// 1. Importa tu inicializador de admin
import { initializeAdminApp, admin } from "@/lib/firebase-admin";

// 2. Importa tu NUEVO layout de UI
import { MainUILayout } from "@/components/layouts/MainUILayout";

/**
 * Esta función se ejecuta en el SERVIDOR.
 * Es el "Guardia Inteligente".
 */
async function verifySessionOnServer() {
  const cookieStore = cookies();
  const token = cookieStore.get("session")?.value;

  try {
    await initializeAdminApp();
  } catch (e) {
    console.error("Layout Guardia: ¡Fallo al inicializar Admin SDK!", e);
    return false; // No podemos verificar, así que denegamos
  }

  if (!token) {
    console.log("Layout Guardia: No hay token.");
    return false;
  }

  try {
    console.log("Layout Guardia: Verificando token en servidor...");
    await admin.auth().verifySessionCookie(token, true);
    console.log("Layout Guardia: Token VÁLIDO.");
    return true; // ¡Adelante!

  } catch (error: any) {
    console.error("Layout Guardia: Token INVÁLIDO.", error.code);
    return false; // ¡Acceso denegado!
  }
}

// Este es el Layout de Servidor
export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const isAuthenticated = await verifySessionOnServer();

  if (!isAuthenticated) {
    
    redirect("/login?session=invalid");
  }

  // Si la autenticación es exitosa, envolvemos la página 
  // (children) con tu layout de UI.
  return (
    <MainUILayout>
      {children}
    </MainUILayout>
  );
}