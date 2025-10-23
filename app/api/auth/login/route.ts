// app/api/auth/login/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { initializeAdminApp, admin } from "@/lib/firebase-admin"; // 1. Importas la función y 'admin'

export async function POST(request: NextRequest) {
  // 2. La llamas al inicio de tu lógica. Es asíncrona.
  await initializeAdminApp();

  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "ID token is required" }, { status: 400 });
    }

    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    // 3. Usas el servicio de auth desde el 'admin' exportado.
    const sessionCookie = await admin.auth().createSessionCookie(token, { expiresIn });

    cookies().set('session', sessionCookie, {
      httpOnly: true,
      secure: false,
      maxAge: expiresIn,
      path: '/',
    });

    return NextResponse.json({ status: "success" });

  } catch (error) {
    console.error("Session login error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }
}