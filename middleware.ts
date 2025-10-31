import { type NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const token = request.cookies.get("session")?.value;

  console.log(`[Middleware Ligero] Path: ${pathname}, Token: ${token ? "Existe" : "No Existe"}`);

  const protectedRoutes = ["/dashboard", "/projects", "/team"];
  const publicRoutes = ["/login", "/register"];

  const isProtectedRoute = protectedRoutes.some(p => pathname.startsWith(p));
  const isPublicRoute = publicRoutes.some(p => pathname.startsWith(p));

  // --- Lógica de Rutas Protegidas ---
  if (isProtectedRoute && !token) {
    console.log("[Middleware Ligero] Bloqueado: No hay token. Redirigiendo a /login.");
    const response = NextResponse.redirect(new URL("/login?session=expired", request.url));
    response.cookies.delete("session");
    return response;
  }

  // --- Lógica de Rutas Públicas (Login/Register) ---
  if (isPublicRoute && token) {
    
    // ¡AQUÍ ESTÁ LA MAGIA!
    // Revisa si vienes de una redirección del servidor.
    const sessionInvalidFlag = searchParams.get("session") === "invalid" || 
                               searchParams.get("session") === "expired";

    if (sessionInvalidFlag) {
      // El Layout (servidor) nos echó.
      // Nos quedamos en /login y, AHORA SÍ, borramos la cookie.
      console.log("[Middleware Ligero] Flag de sesión inválida detectado. Permitiendo /login y borrando cookie.");
      
      // Esta es la forma correcta de borrar la cookie
      const response = NextResponse.next(); // Permite ver /login
      response.cookies.delete("session");
      return response;
    }

    // Si no hay flag, es un usuario logueado que va a /login por error.
    console.log("[Middleware Ligero] Usuario con token en ruta pública. Redirigiendo a /dashboard.");
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  
  // --- Lógica de la Raíz ("/") ---
  if (pathname === "/") {
    const url = token ? "/dashboard" : "/login";
    console.log(`[Middleware Ligero] Raíz. Redirigiendo a ${url}`);
    return NextResponse.redirect(new URL(url, request.url));
  }

  // Permite el paso
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};