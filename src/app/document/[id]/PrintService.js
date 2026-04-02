"use client";

/**
 * PrintService - A completely rewritten service for document printing
 * with special focus on reliable cheatsheet generation
 */
const PrintService = {
  /**
   * Convert markdown to simplified HTML optimized for printing
   */
  markdownToHTML: (markdown) => {
    if (!markdown || typeof markdown !== 'string') return '';
    
    let html = markdown;

    // Basic Markdown conversion - headers
    html = html
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>');

    // Bold and italic
    html = html
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>');

    // Lists
    html = html.replace(/^\s*[\-\*]\s+(.*$)/gim, '<li>$1</li>');
    if (html.includes('<li>')) {
      html = html.replace(/(?:^|\n)(<li>.*?<\/li>)(?:\n|$)/gs, '\n<ul>$1</ul>\n');
      html = html.replace(/<\/ul>\s*<ul>/g, '');
    }

    // Links
    html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>');

    // Code blocks and inline code
    html = html.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');
    html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');

    // Paragraphs
    html = html.replace(/\n\n/gim, '</p><p>');
    html = `<p>${html}</p>`.replace(/<p>\s*<\/p>/gim, '');

    return html;
  },

  /**
   * Generate stylesheet for printing
   * @param {boolean|object} condensedConfig - If true, uses default condensed settings. If object, use custom settings.
   * @param {number} condensedConfig.columnCount - Number of columns (default: 6)
   * @param {number} condensedConfig.baseFontSize - Base font size in pt (default: 5)
   * @param {number} condensedConfig.h1Size - H1 font size in pt (default: 8)
   * @param {number} condensedConfig.h2Size - H2 font size in pt (default: 7)
   * @param {number} condensedConfig.h3Size - H3 font size in pt (default: 6)
   */
  getStylesheet: (condensedConfig) => {
    const baseStyles = `
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        margin: 0;
        padding: 0;
      }
      h1, h2, h3 {
        color: #2c3e50;
        font-weight: bold;
      }
      strong { font-weight: bold; }
      em { font-style: italic; }
      ul {
        padding-left: 20px;
      }
      li {
        margin-bottom: 0px;
      }
      a {
        color: #007bff;
        text-decoration: none;
      }
      code {
        background-color: #f8f9fa;
        border-radius: 4px;
        font-family: monospace;
      }
      pre {
        background-color: #f8f9fa;
        border-radius: 4px;
        text-wrap: initial;
      }
    `;

    if (condensedConfig) {
      // Default condensed settings
      const settings = typeof condensedConfig === 'object' ? condensedConfig : {};
      const columnCount = settings.columnCount ?? 6;
      const baseFontSize = settings.baseFontSize ?? 5;
      const h1Size = settings.h1Size ?? 8;
      const h2Size = settings.h2Size ?? 7;
      const h3Size = settings.h3Size ?? 6;

      return `
        ${baseStyles}
        * {
        margin: 0px;
        }
        body {
          font-size: ${baseFontSize}pt;
          column-count: ${columnCount};
          column-fill: auto; /* This ensures columns are filled one by one */
          column-rule: 1px solid;
        }
        h1 {
          font-size: ${h1Size}pt;
          margin: 0px;
        }
        h2 {
          font-size: ${h2Size}pt;
        }
        h3 {
          font-size: ${h3Size}pt;
        }
      `;
    } else {
      return `
        ${baseStyles}
        body {
          font-size: 12pt;
          margin: 20px;
        }
        h1 {
          font-size: 18pt;
        }
        h2 {
          font-size: 16pt;
        }
        h3 {
          font-size: 14pt;
        }
      `;
    }
  },

  /**
   * Print content as a cheatsheet
   * @param {string} content - The markdown content to print
   * @param {string} title - The title of the document
   * @param {boolean|object} condensedConfig - Condensed format config (true for defaults, object for custom)
   */
  printContent: (content, title, condensedConfig = false) => {
    if (!content || typeof content !== 'string') {
      alert('No content to print.');
      return;
    }

    const htmlContent = PrintService.markdownToHTML(content);
    const stylesheet = PrintService.getStylesheet(condensedConfig);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print content.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title || 'Cheatsheet'}</title>
          <style>${stylesheet}</style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }
};

export default PrintService;
