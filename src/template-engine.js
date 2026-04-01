/**
 * Template Engine - Manages CSS templates
 */

const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

/**
 * Get all available templates
 * @returns {Array} Array of template info {name, path, css}
 */
function getTemplates() {
  const templates = [];

  if (!fs.existsSync(TEMPLATES_DIR)) {
    return templates;
  }

  const files = fs.readdirSync(TEMPLATES_DIR);

  for (const file of files) {
    if (file.endsWith('.css')) {
      const name = file.replace('.css', '');
      const filePath = path.join(TEMPLATES_DIR, file);
      const css = fs.readFileSync(filePath, 'utf8');

      templates.push({
        name,
        path: filePath,
        css
      });
    }
  }

  return templates;
}

/**
 * Get template by name
 * @param {string} name
 * @returns {object|null} {name, css}
 */
function getTemplate(name) {
  const filePath = path.join(TEMPLATES_DIR, `${name}.css`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const css = fs.readFileSync(filePath, 'utf8');

  return {
    name,
    css
  };
}

/**
 * Save a custom template
 * @param {string} name - Template name
 * @param {string} css - CSS content
 */
function saveTemplate(name, css) {
  // Validate name (alphanumeric, Chinese, hyphen, underscore)
  const validName = name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '');

  if (!validName) {
    throw new Error('Invalid template name');
  }

  const filePath = path.join(TEMPLATES_DIR, `${validName}.css`);
  fs.writeFileSync(filePath, css, 'utf8');

  return {
    name: validName,
    path: filePath
  };
}

/**
 * Delete a template
 * @param {string} name
 * @returns {boolean}
 */
function deleteTemplate(name) {
  const filePath = path.join(TEMPLATES_DIR, `${name}.css`);

  if (!fs.existsSync(filePath)) {
    return false;
  }

  fs.unlinkSync(filePath);
  return true;
}

/**
 * Generate CSS from tuning parameters
 * @param {object} params - Tuning parameters
 * @returns {string} CSS content
 */
function generateCSSFromParams(params) {
  const {
    fontMain = 'Noto Serif SC',
    fontCode = 'Fira Code',
    fontSize = '12pt',
    lineHeight = '1.6',
    pageMargin = '2.5cm',
    titleSize = '16pt',
    textColor = '#333333',
    codeBg = '#f5f5f5',
    codeColor = '#333333'
  } = params;

  return `
:root {
  --font-main: "${fontMain}", "Source Han Serif CN", serif;
  --font-code: "${fontCode}", monospace;
  --font-size: ${fontSize};
  --line-height: ${lineHeight};
  --page-margin: ${pageMargin};
  --title-size: ${titleSize};
  --text-color: ${textColor};
  --code-bg: ${codeBg};
  --code-color: ${codeColor};
}

body {
  font-family: var(--font-main);
  font-size: var(--font-size);
  line-height: var(--line-height);
  color: var(--text-color);
  background: white;
}

.md-content {
  font-family: var(--font-main);
  font-size: var(--font-size);
  line-height: var(--line-height);
  color: var(--text-color);
}

h1 {
  font-size: var(--title-size);
  font-weight: bold;
  margin: 24pt 0 12pt;
  page-break-after: avoid;
}

h2 {
  font-size: calc(var(--title-size) * 0.85);
  font-weight: bold;
  margin: 18pt 0 9pt;
  page-break-after: avoid;
}

h3 {
  font-size: calc(var(--title-size) * 0.75);
  font-weight: bold;
  margin: 12pt 0 6pt;
  page-break-after: avoid;
}

h4, h5, h6 {
  font-size: var(--font-size);
  font-weight: bold;
  margin: 9pt 0 6pt;
  page-break-after: avoid;
}

p {
  margin: 12pt 0;
}

a {
  color: #0066cc;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

strong {
  font-weight: bold;
}

em {
  font-style: italic;
}

del {
  text-decoration: line-through;
}

ul, ol {
  margin: 12pt 0;
  padding-left: 24pt;
}

li {
  margin: 6pt 0;
  page-break-inside: avoid;
}

code {
  font-family: var(--font-code);
  font-size: calc(var(--font-size) * 0.9);
  background: var(--code-bg);
  padding: 2pt 4pt;
  border-radius: 3px;
}

pre.code-block {
  background: var(--code-bg);
  color: var(--code-color);
  padding: 12pt;
  margin: 12pt 0;
  border-radius: 4px;
  overflow-x: auto;
  page-break-inside: avoid;
}

pre.code-block code {
  background: none;
  padding: 0;
  font-size: calc(var(--font-size) * 0.85);
}

blockquote {
  border-left: 4px solid #ddd;
  padding-left: 16pt;
  margin: 16pt 0;
  color: #666;
  font-style: italic;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 16pt 0;
  page-break-inside: avoid;
}

th, td {
  border: 1px solid #ddd;
  padding: 8pt;
  text-align: left;
}

th {
  background: #f5f5f5;
  font-weight: bold;
}

img {
  max-width: 100%;
  height: auto;
  page-break-inside: avoid;
}

hr {
  border: none;
  border-top: 1px solid #ddd;
  margin: 24pt 0;
}

/* Task lists */
input[type="checkbox"] {
  margin-right: 8pt;
}

/* Footnotes */
.footnotes {
  margin-top: 24pt;
  padding-top: 12pt;
  border-top: 1px solid #ddd;
}

/* Print styles */
@media print {
  @page {
    size: A4;
    margin: var(--page-margin);
  }

  body {
    background: white;
  }

  h1, h2, h3 {
    page-break-after: avoid;
  }

  table, pre {
    page-break-inside: avoid;
  }
}
`;
}

/**
 * Generate HTML document with CSS
 * @param {string} htmlContent - Parsed HTML content
 * @param {string} css - CSS styles
 * @param {object} options - Document options
 * @returns {string} Complete HTML document
 */
function generateHTMLDocument(htmlContent, css, options = {}) {
  const {
    title = 'Document',
    author = 'md2pdf',
    fonts = []
  } = options;

  // Build font-face rules if custom fonts provided
  let fontFaces = '';
  for (const font of fonts) {
    fontFaces += `
@font-face {
  font-family: '${font.family}';
  font-style: ${font.style || 'normal'};
  font-weight: ${font.weight || 'normal'};
  src: local('${font.family}');
}
`;
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="author" content="${escapeHtml(author)}">
  <style>
${fontFaces}
${css}
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = {
  getTemplates,
  getTemplate,
  saveTemplate,
  deleteTemplate,
  generateCSSFromParams,
  generateHTMLDocument,
  TEMPLATES_DIR
};
