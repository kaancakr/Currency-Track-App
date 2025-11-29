import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/config';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; favId: string } }
) {
  try {
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/users/${params.id}/favorites/${params.favId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json(
        { message: error.message || 'Failed to delete favorite' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { message: 'Failed to delete favorite' },
      { status: 500 }
    );
  }
}

