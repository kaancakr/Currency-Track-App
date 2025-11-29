import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || 'Failed to create user' },
        { status: response.status }
      );
    }
    
    return NextResponse.json(data, { status: 201 });
    } catch {
    return NextResponse.json(
      { message: 'Failed to create user' },
      { status: 500 }
    );
  }
}

