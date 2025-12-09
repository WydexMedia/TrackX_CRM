import { NextRequest } from 'next/server';
import { authenticateRequest, createUnauthorizedResponse } from '@/lib/clerkAuth';

export async function GET(request: NextRequest) {
  try {
    // Authenticate with Clerk
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error || 'Authentication failed', authResult.statusCode || 401);
    }

    const response = await fetch('https://flowline.wydex.co/admin/api/daily-reports', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    return Response.json(data);
  } catch (error) {
    console.error('Error fetching daily reports:', error);
    return Response.json(
      { error: 'Failed to fetch daily reports' },
      { status: 500 }
    );
  }
} 