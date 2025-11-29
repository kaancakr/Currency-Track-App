import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/config';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/watchlist/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json(
        { message: error.message || 'Failed to delete watchlist item' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { message: 'Failed to delete watchlist item' },
      { status: 500 }
    );
  }
}

