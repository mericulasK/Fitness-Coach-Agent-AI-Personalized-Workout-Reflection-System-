import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 800); // 800ms quick check timeout

    const res = await fetch('http://localhost:3000/api/tags', {
      signal: controller.signal,
      cache: 'no-store'
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const models = data.models ? (data.models as { name: string }[]).map((m) => m.name) : [];
      return NextResponse.json({
        success: true,
        online: true,
        models
      });
    }
  } catch {
    // Ollama is offline or not installed
  }

  return NextResponse.json({
    success: true,
    online: false,
    models: []
  });
}
