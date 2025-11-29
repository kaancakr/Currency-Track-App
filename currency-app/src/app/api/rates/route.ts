import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pairs = searchParams.get('pairs');
    
    const url = pairs 
      ? `${API_CONFIG.BACKEND_URL}/rates?pairs=${encodeURIComponent(pairs)}`
      : `${API_CONFIG.BACKEND_URL}/rates`;
    
    const response = await fetch(url, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json(
        { message: error.message || 'Failed to fetch rates' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    } catch {
    return NextResponse.json(
      { message: 'Failed to fetch rates' },
      { status: 500 }
    );
  }
}

