import { NextResponse } from 'next/server';

// Access the Gemini API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent';

export async function POST(request) {
  try {
    const body = await request.json();
    const { text, context } = body;
    
    if (!text) {
      return NextResponse.json({ error: 'Text to explain is required' }, { status: 400 });
    }
    
    if (!GEMINI_API_KEY) {
      console.error('Missing GEMINI_API_KEY environment variable');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    // Create a prompt for explaining the selected text
    const prompt = `
      You are an educational assistant helping students understand complex topics.
      
      I need a detailed explanation of the following text:
      
      "${text}"
      
      Here is some context from the surrounding document to help you understand the topic:
      
      ${context.substring(0, 3000)}
      
      Please provide a clear, detailed explanation that:
      1. Clarifies any complex concepts or terms
      2. Provides additional context if helpful
      3. Uses simple language where possible
      4. Keeps the explanation concise but thorough (max 3-4 sentences)
      
      IMPORTANT: Format your explanation as plain text without markdown. Keep it under 150 words and avoid starting with phrases like "This text explains" or "This passage refers to".
    `;
    
    // Call the Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', errorText);
      throw new Error('Failed to generate explanation');
    }
    
    const data = await response.json();
    const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                       "Sorry, I couldn't generate an explanation at this time.";
    
    return NextResponse.json({ explanation });
    
  } catch (error) {
    console.error('Error in explain-content API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
