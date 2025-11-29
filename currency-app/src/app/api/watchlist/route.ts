import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/config';

export async function GET() {
  try {
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/watchlist`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json(
        { message: error.message || 'Failed to fetch watchlist' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { message: 'Failed to fetch watchlist' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/watchlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || 'Failed to add watchlist item' },
        { status: response.status }
      );
    }
    
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: 'Failed to add watchlist item' },
      { status: 500 }
    );
  }
}

