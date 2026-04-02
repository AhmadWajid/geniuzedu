import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { prompt } = await request.json();
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Missing prompt parameter' },
        { status: 400 }
      );
    }
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer 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",
        "HTTP-Referer": "https://geniuzedu.com", 
        "X-Title": "GeniuzEdu",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "deepseek/deepseek-chat-v3-0324:free",
        "messages": [
          {
            "role": "system",
            "content": "You are an expert at creating detailed table of contents for educational documents. Your output should be well-structured HTML that includes proper anchors and links to sections."
          },
          {
            "role": "user",
            "content": prompt
          }
        ]
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenRouter API error:', errorData);
      throw new Error(`OpenRouter API returned an error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract the table of contents from the response
    const tocContent = data.choices[0].message.content;
    
    return NextResponse.json({ toc: tocContent });
    
  } catch (error) {
    console.error('Error generating table of contents:', error);
    return NextResponse.json(
      { error: `Failed to generate table of contents: ${error.message}` },
      { status: 500 }
    );
  }
}
