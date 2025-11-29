import { NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/config';

export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/health`, {
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json(
        {
          status: 'error',
          redis: false,
          message: `Backend returned status ${response.status}`,
        },
        { status: 503 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.name === 'AbortError'
          ? 'Backend request timed out'
          : `Connection error: ${error.message}`
        : 'Backend unavailable';

    return NextResponse.json(
      {
        status: 'error',
        redis: false,
        message: errorMessage,
        backendUrl: API_CONFIG.BACKEND_URL,
      },
      { status: 503 }
    );
  }
}

