import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/config';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/users/${id}/rates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || 'Failed to fetch user rates' },
        { status: response.status }
      );
    }
    
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { message: 'Failed to fetch user rates' },
      { status: 500 }
    );
  }
}

