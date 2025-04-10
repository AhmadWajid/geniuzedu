import { NextResponse } from 'next/server';

export async function GET(request) {
  // Get the URL from the query parameter
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  
  if (!url) {
    return NextResponse.json(
      { error: 'Missing URL parameter' },
      { status: 400 }
    );
  }

  try {
    // Prepare fetch options with appropriate headers
    const fetchOptions = {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf',
        'User-Agent': 'Mozilla/5.0 (compatible; GeniuzeduProxy/1.0)',
        'Origin': process.env.NEXT_PUBLIC_BASE_URL || 'https://geniuzedu.com',
        'Referer': process.env.NEXT_PUBLIC_BASE_URL || 'https://geniuzedu.com'
      },
      // Important: include credentials in request
      credentials: 'include',
      // Set longer timeout
      signal: AbortSignal.timeout(30000) // 30 seconds timeout
    };

    console.log(`Attempting to fetch PDF from: ${url}`);
    
    // Fetch the PDF from Firebase Storage
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      console.error(`PDF fetch failed: ${response.status} ${response.statusText}`);
      
      // For debugging - log response headers
      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      console.log('Response headers:', responseHeaders);
      
      return NextResponse.json(
        { 
          error: `Failed to fetch PDF: ${response.statusText}`,
          status: response.status,
          url: url.split('?')[0] // Log URL without query params for security
        },
        { status: response.status }
      );
    }

    // Get the PDF as an array buffer
    const arrayBuffer = await response.arrayBuffer();
    
    // Create a new response with appropriate headers
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error proxying PDF:', error);
    return NextResponse.json(
      { 
        error: 'Failed to proxy PDF', 
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
