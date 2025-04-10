// This file will act as a proxy for Firebase Storage requests

export async function GET(request, { params }) {
  const fullPath = params.path.join('/');
  const url = `https://firebasestorage.googleapis.com/v0/b/${fullPath}`;
  
  // Extract search params
  const { searchParams } = new URL(request.url);
  const queryString = Array.from(searchParams.entries())
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  
  const finalUrl = queryString ? `${url}?${queryString}` : url;
  
  try {
    const response = await fetch(finalUrl, {
      headers: {
        'Accept': 'application/pdf',
      },
    });
    
    const blob = await response.blob();
    return new Response(blob, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/pdf',
        'Content-Disposition': response.headers.get('Content-Disposition') || 'inline',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch resource' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
