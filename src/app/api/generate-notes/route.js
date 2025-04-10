import { NextResponse } from 'next/server';

// Make sure environment variables are properly set up
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent';

// Define system prompts as reusable constants
const SYSTEM_PROMPTS = {
  notes: `You are an expert study notes creator. Create detailed, well-structured revision notes from the provided PDF document. Cover every single topic and explain it. Make the notes very detailed. \n\nCRITICAL: GENERATE THE NOTES IN EN LANGUAGE. EVEN IF THE DOCUMENT IS IN A DIFFERENT LANGUAGE, THE NOTES MUST BE IN EN. THIS IS EXTREMELY IMPORTANT.\n\nCRITICAL: IF CUSTOM INSTRUCTIONS ARE PROVIDED, YOU MUST FOLLOW THEM. THEY MUST BE PRIORITIZED OVER ANYTHING ELSE, EXCLUDING THE FORMATTING RULES BELOW.\n\nIMPORTANT: DO NOT WRAP THE NOTES IN ANY CODE BLOCKS. Only use code blocks for code. DO NOT USE \`\`\` ANYWHERE IN YOUR RESPONSE.\n\n1. Use clear headings with # for main sections and ## for subsections\n2. Use bullet points (- ) for key points\n3. Use numbered lists (1. ) for sequential information or steps\n4. Add two blank lines between main sections for better readability\n5. Use bold (**text**) for important terms and concepts\n6. Use > for important quotes or definitions\n7. Group related information under appropriate headings\n8. Use --- for horizontal rules between major sections\n9. Keep paragraphs short and focused\n10. Use lists and bullet points liberally for better scanning\n11. For mathematical expressions:\n    - Use double dollar signs ($$...$$) for display/block equations\n    - Use single dollar signs ($...$) for inline math\n    - Use \\text{} for text within equations\n    - Format complex equations properly with LaTeX syntax\n    - Add explanations after complex equations\n12. For equations, always:\n    - Define all variables and symbols used\n    - Break down complex equations into steps\n    - Use proper mathematical notation (e.g., fractions with \\frac{}{}, subscripts with _{}, etc.)\n    - Align multi-line equations using proper LaTeX alignment\n\nMake the notes visually organized and easy to read. Use English by default, BUT if additional instructions mention using another language, use that language. IMPORTNT: ALWAYS use LaTeX format (dollar signs) for math expressions - ALWAYS use $ or $$, AROUND maths expressions.\n\nCreate comprehensive revision notes from the following text in EN language, organizing key concepts and important details in a clear, structured format. Make sure to cover every single topic of the text in depth and explain harder concepts with your own knowledge. IMPORTNT: ALWAYS use LaTeX format (dollar signs) for math expressions - ALWAYS use $ or $$, AROUND maths expressions. DO NOT WRAP THE RESPONSE IN CODE BLOCKS.\n\n`,
  
  flashcards: `Create 20-50 educational flashcards from the provided PDF document. \n    \nCRITICAL: GENERATE THE FLASHCARDS IN EN LANGUAGE. EVEN IF THE DOCUMENT IS IN A DIFFERENT LANGUAGE, THE FLASHCARDS MUST BE IN EN. THIS IS EXTREMELY IMPORTANT.\n\nMake them proper flashcards that will ask the user about the educational content (nothing like teacher\'s name) of the document provided. Don\'t make the answers too long. Do not make any True/False questions. Make sure to cover every topic of the document. Questions must be about the educational content of the document. Keep the answers concise\n\nCRITICAL: IF CUSTOM INSTRUCTIONS ARE PROVIDED, YOU MUST FOLLOW THEM. THEY MUST BE PRIORITIZED OVER ANYTHING ELSE, EXCLUDING THE FORMATTING RULES BELOW.\n\nIMPORTANT: For any mathematical expressions:\n1. Formatting Rules:\n   - Use double dollar signs ($$...$$) for display/block equations\n   - Use single dollar signs ($...$) for inline math\n   - NEVER use parentheses ( ) around equations or matrices - ALWAYS use $ or $$\n   - ALL backslashes in LaTeX must be doubled (\\\\)\n\n2. Common LaTeX Commands (always use double backslashes):\n   - Fractions: $\\\\frac{numerator}{denominator}$\n   - Greek letters: $\\\\tau$, $\\\\alpha$, etc.\n   - Subscripts: $x_{\\\\text{subscript}}$\n   - Superscripts: $x^{\\\\text{superscript}}$\n   - Text in math: $\\\\text{text here}$\n\n3. Examples:\n   - Correct: $\\\\frac{dt}{\\\\tau}$\n   - Incorrect: \\\\frac{dt}{\\\\tau}\n   - Correct: $(1 - \\\\frac{dt}{\\\\tau})$\n   - Incorrect: (1 - \\\\frac{dt}{\\\\tau})\n\nReturn only valid JSON in the specified format. Make sure to answer in the exact format as specified!\n\nCreate flashcards in this exact JSON format:\n{\n  "flashcards": [\n    {\n      "question": "What is the probability of electron scattering in the Drude model? (Example with proper math formatting)",\n      "answer": "The probability is $\\\\frac{dt}{\\\\tau}$ where $\\\\tau$ is the mean free time between collisions"\n    }\n  ]\n}\n\nCreate flashcards in EN language, in this exact JSON format:\n{\n  "flashcards": [\n    {\n      "question": "What is the probability of electron scattering in the Drude model? (Example with proper math formatting)",\n      "answer": "The probability is $\\\\frac{dt}{\\\\tau}$ where $\\\\tau$ is the mean free time between collisions"\n    }\n  ]\n}\n\n`
};

// Add the ability to process different response formats
const RESPONSE_PROCESSORS = {
  notes: (data) => {
    return {
      notes: data.candidates?.[0]?.content?.parts?.[0]?.text || "Failed to generate notes",
      tokens: data.usageMetadata?.totalTokenCount || 0
    };
  },
  
  flashcards: (data) => {
    try {
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      // Find JSON within the response
      const jsonMatch = text.match(/{[\s\S]*}/);
      const jsonString = jsonMatch ? jsonMatch[0] : "{}";
      const flashcards = JSON.parse(jsonString);
      
      return {
        flashcards: flashcards.flashcards || [],
        tokens: data.usageMetadata?.totalTokenCount || 0
      };
    } catch (error) {
      console.error('Error parsing flashcards JSON:', error);
      throw new Error('Failed to parse flashcards response');
    }
  }
};

// Utility function to call Gemini API
async function callGeminiApi(prompt, contentType = 'notes') {
  console.log(`Calling Gemini API for generation...`);
  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      generationConfig: {
        // temperature: 0.2,
        // topP: 0.8,
        // topK: 40,
        // maxOutputTokens: 8192,
      },
      safetySettings: [],
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
    throw new Error('Failed to generate content');
  }
  
  return await response.json();
}

// In Next.js App Router, export must be named exactly 'POST', 'GET', etc.
export async function POST(request) {
  
  try {
    // Parse the request body
    const body = await request.json();
    const { documentText, customInstructions, type = 'notes' } = body;
    
    if (!documentText) {
      return NextResponse.json({ error: 'Document text is required' }, { status: 400 });
    }
    
    if (!GEMINI_API_KEY) {
      console.error('Missing GEMINI_API_KEY environment variable');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    // Select system prompt from predefined options
    let systemPrompt;
    if (SYSTEM_PROMPTS[type]) {
      // Use predefined prompt if available for the requested type
      systemPrompt = SYSTEM_PROMPTS[type];
    } else {
      // Default to notes if type not recognized
      systemPrompt = SYSTEM_PROMPTS.notes;
      console.warn(`Unrecognized content type "${type}", defaulting to notes`);
    }
    
    // Prepare the prompt with system prompt, document text and optional custom instructions
    let prompt = '';
    
    if (customInstructions) {
      if (type === 'flashcards') {
        // Special handling for flashcards with custom instructions
        prompt = `${systemPrompt}\n\n\n\nAdditional instructions: ${customInstructions}\n\nPrioritize following these custom instructions while maintaining the general guidelines and JSON format above. Remember that if custom instructions do not specify the language, then generate the flashcards in EN language.\n\nCreate flashcards in EN language, in this exact JSON format:\n{\n  \"flashcards\": [\n    {\n      \"question\": \"What is the probability of electron scattering in the Drude model? (Example with proper math formatting)\",\n      \"answer\": \"The probability is $\\\\frac{dt}{\\\\tau}$ where $\\\\tau$ is the mean free time between collisions\"\n    }\n  ]\n}\n\n Text to analyze: ${documentText}`;
      } else if (type === 'notes') {
        // Special handling for notes with custom instructions
        prompt = `${systemPrompt}\n\n\n\nAdditional instructions: ${customInstructions}\n\n\nCreate comprehensive revision notes from the following text in EN language, organizing key concepts and important details in a clear, structured format. Make sure to cover every single topic of the text in depth and explain harder concepts with your own knowledge. IMPORTNT: ALWAYS use LaTeX format (dollar signs) for math expressions - ALWAYS use $ or $$, AROUND maths expressions. DO NOT WRAP THE RESPONSE IN CODE BLOCKS.\n\n Text to analyze: ${documentText}`;
      } else {
        // Default handling for other types
        prompt = `${systemPrompt}\n\n\n\nAdditional instructions: ${customInstructions}\n\n Text to analyze: ${documentText}`;
      }
    } else {
      // No custom instructions
      prompt = `${systemPrompt}\n\n Text to analyze: ${documentText}`;
    }
    
    // Call the Gemini API
    const data = await callGeminiApi(prompt, type);
    console.log('Successfully received Gemini API response');
    
    // Process the response based on content type
    try {
      const processor = RESPONSE_PROCESSORS[type] || RESPONSE_PROCESSORS.notes;
      const result = processor(data);
      return NextResponse.json(result);
    } catch (error) {
      console.error(`Error processing ${type} response:`, error);
      return NextResponse.json({ 
        error: `Failed to generate valid ${type}`, 
        rawResponse: data.candidates?.[0]?.content?.parts?.[0]?.text 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error in POST handler:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
