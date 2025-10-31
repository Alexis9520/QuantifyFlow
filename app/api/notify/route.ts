import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // 1. Obtener la URL secreta de n8n desde las variables de entorno
  const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

  if (!N8N_WEBHOOK_URL) {
    console.error("N8N_WEBHOOK_URL no está configurada en .env.local");
    return NextResponse.json(
      { error: 'Configuración de servidor incorrecta.' },
      { status: 500 }
    );
  }

  try {
    // 2. Obtener el 'body' (payload) que envió el modal.
    // En App Router, usamos req.json() en lugar de req.body
    const taskPayload = await req.json();

    // 3. Enviar los datos de forma segura a n8n
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskPayload),
    });

    if (!n8nResponse.ok) {
      console.error("Error desde n8n:", await n8nResponse.text());
    }

    // 4. Responder al cliente (Modal) que todo salió bien.
    return NextResponse.json({ success: true }, { status: 202 });

  } catch (error) {
    console.error("Error al llamar al webhook de n8n:", error);
    return NextResponse.json(
      { error: 'Error interno al notificar.' },
      { status: 500 }
    );
  }
}