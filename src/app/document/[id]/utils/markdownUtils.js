/**
 * Converts markdown content to HTML for printing
 */
export const convertMarkdownToHTML = (markdown) => {
  // Replace headers
  let html = markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Replace bold text
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  
  // Replace italic text
  html = html.replace(/\_(.*?)\_/gim, '<em>$1</em>');
  
  // Replace bullet points
  html = html.replace(/^\s*[\-\*]\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');
  
  // Replace links
  html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>');
  
  // Replace code blocks
  html = html.replace(/```(.*?)```/gms, '<pre><code>$1</code></pre>');
  
  // Replace inline code
  html = html.replace(/`(.*?)`/gm, '<code>$1</code>');
  
  // Replace paragraphs and line breaks
  html = html.replace(/\n\n/gim, '</p><p>');
  
  // Fix any potential issues with lists
  html = html.replace(/<\/ul>\s*<ul>/gim, '');
  
  return '<p>' + html + '</p>';
};

/**
 * Generates a condensed cheatsheet HTML from markdown content
 */
export const generateCheatsheetHtml = (markdown, title = 'Study Cheatsheet') => {
  // Remove extra whitespace to condense content
  let content = markdown.trim();
  
  // Extract key points and definitions
  const keyPoints = [];
  
  // Process headings
  content = content.replace(/^(#+)\s+(.*)$/gm, (match, hashes, title) => {
    const level = hashes.length;
    return `<h${level} class="cheatsheet-h${level}">${title}</h${level}>`;
  });
  
  // Process bullet points more efficiently for cheatsheet
  content = content.replace(/^\s*[\-\*]\s+(.*$)/gim, (match, text) => {
    // Check if this is a key definition or important point
    if (text.includes(':') || text.includes(' - ') || 
        text.toLowerCase().includes('important') || 
        text.toLowerCase().includes('key ') || 
        text.toLowerCase().includes('definition')) {
      keyPoints.push(text);
    }
    return `<li class="cheatsheet-item">${text}</li>`;
  });
  
  // Organize into a two-column layout for efficiency
  const processedContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            font-size: 9pt;
            line-height: 1.3;
            margin: 1cm;
            color: #000;
          }
          .cheatsheet-container {
            column-count: 2;
            column-gap: 20px;
            column-rule: 1px solid #ddd;
          }
          .cheatsheet-section {
            break-inside: avoid;
            margin-bottom: 10px;
          }
          .cheatsheet-h1 {
            font-size: 14pt;
            margin: 8px 0;
            border-bottom: 1px solid #333;
            break-after: avoid;
          }
          .cheatsheet-h2 {
            font-size: 12pt;
            margin: 6px 0;
            break-after: avoid;
          }
          .cheatsheet-h3 {
            font-size: 10pt;
            margin: 4px 0;
            break-after: avoid;
          }
          ul {
            padding-left: 15px;
            margin: 4px 0;
          }
          .cheatsheet-item {
            margin-bottom: 2px;
          }
          .key-points {
            background-color: #f8f9fa;
            border-left: 2px solid #58b595;
            padding: 5px;
            margin: 8px 0;
          }
          strong, em {
            font-size: inherit;
          }
          .cheatsheet-header {
            text-align: center;
            margin-bottom: 10px;
          }
          .cheatsheet-footer {
            text-align: center;
            margin-top: 10px;
            font-size: 8pt;
            color: #666;
            border-top: 1px solid #eee;
            padding-top: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8pt;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 3px;
          }
          th {
            background-color: #f2f2f2;
          }
          code {
            font-family: monospace;
            font-size: 8pt;
            background-color: #f6f8fa;
            padding: 1px 2px;
            border-radius: 2px;
          }
          @media print {
            body { margin: 0.5cm; }
            .page-break { page-break-after: always; }
          }
        </style>
      </head>
      <body>
        <div class="cheatsheet-header">
          <h1>${title}</h1>
          <p>Condensed study material - Geniuzedu</p>
        </div>
        
        ${keyPoints.length > 0 ? `
        <div class="key-points">
          <strong>Key Points:</strong>
          <ul>
            ${keyPoints.slice(0, 5).map(point => `<li>${point}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
        
        <div class="cheatsheet-container">
          ${content.replace(/<li class="cheatsheet-item">(.*?)<\/li>/g, (match, text) => {
            // Condense bullet points further by looking for definitions
            if (text.includes(':')) {
              const [term, definition] = text.split(':', 2);
              return `<li class="cheatsheet-item"><strong>${term.trim()}</strong>: ${definition.trim()}</li>`;
            }
            return match;
          })}
        </div>
        
        <div class="cheatsheet-footer">
          <p>Created with Geniuzedu - ${new Date().toLocaleDateString()}</p>
        </div>
      </body>
    </html>
  `;
  
  return processedContent;
};
