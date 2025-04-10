import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Get the PDF URL from the query parameter
    const { searchParams } = new URL(request.url);
    const pdfUrl = searchParams.get('url');
    
    if (!pdfUrl) {
      return NextResponse.json({ error: 'Missing PDF URL' }, { status: 400 });
    }

    // Fetch the PDF from Firebase
    const response = await fetch(pdfUrl);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch PDF: ${response.statusText}` }, 
        { status: response.status }
      );
    }

    // Get the PDF buffer
    const pdfBuffer = await response.arrayBuffer();
    
    // Return the PDF with appropriate headers
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('PDF proxy error:', error);
    return NextResponse.json({ error: 'Failed to proxy PDF' }, { status: 500 });
  }
}
