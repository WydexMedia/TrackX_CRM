export async function GET() {
  try {
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