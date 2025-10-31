"use client";

import { useEffect, useRef } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase"; // Tu config de cliente

export function AuthListener({ children }: { children: React.ReactNode }) {
  const listenerInitialized = useRef(false);

  useEffect(() => {
    if (listenerInitialized.current) {
      console.log("AuthListener: El listener ya estaba inicializado.");
      return;
    }
    listenerInitialized.current = true;
    
    console.log("AuthListener: Registrando listener de auth UNA SOLA VEZ.");

    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      
      console.log("----------");
      console.log("AuthListener: ¡onAuthStateChanged SE DISPARÓ!");
      
      const currentPath = window.location.pathname;
      const protectedRoutes = ["/dashboard", "/projects", "/team"];
      const isCurrentlyProtected = protectedRoutes.some(path => currentPath.startsWith(path));

      console.log("AuthListener: Path actual:", currentPath, "¿Es protegida?", isCurrentlyProtected);
      
      if (user) {
        console.log(`AuthListener: Firebase reporta un USUARIO (UID: ${user.uid}).`);

        // Si el SDK nos da un usuario, pero estamos en una ruta protegida,
        // forzamos una recarga del token para estar 100% seguros.
        if (isCurrentlyProtected) {
          console.log("AuthListener: Forzando recarga de token para verificar sesión...");
          try {
            // true = forzar recarga desde el servidor
            await user.getIdToken(true); 
            console.log("AuthListener: Recarga de token exitosa. El usuario es VÁLIDO.");
          } catch (error) {
            // ¡AJÁ! El token de caché era inválido.
            console.error("AuthListener: La recarga de token falló. Este es el usuario 'fantasma'.", error);
            
            // --- ¡CAMBIO CLAVE! ---
            // Si el token falló, la sesión es inválida. Punto.
            // FORZAMOS la redirección para que el middleware borre la cookie.
            // Eliminamos el `if (window.location.pathname === currentPath)`
            // porque causaba el bucle de redirección que describiste.
            
            console.log("%cAuthListener: ¡FORZANDO REDIRECCIÓN TRAS ERROR DE TOKEN!", "color: red; font-size: 1.2em;");
            window.location.href = "/login?session=expired";
            // --- FIN DEL CAMBIO ---
          }
        }

      } else {
        console.log("AuthListener: Firebase reporta un usuario NULO (null).");
        
        if (isCurrentlyProtected) {
          console.log("%cAuthListener: ¡CONDICIÓN CUMPLIDA! Redirigiendo...", "color: red; font-size: 1.2em;");
          window.location.href = "/login?session=expired";
        }
      }
      console.log("----------");
    });

    return () => {
      console.log("AuthListener: Limpiando listener.");
      unsubscribe();
    };

  }, []); 

  return <>{children}</>;
}