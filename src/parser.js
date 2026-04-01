/**
 * Markdown Parser - Converts Markdown to HTML
 */

const MarkdownIt = require('markdown-it');
const hljs = require('highlight.js');

/**
 * Create a configured markdown-it instance
 * @returns {MarkdownIt}
 */
function createParser() {
  const md = new MarkdownIt({
    html: true,           // Enable HTML tags
    linkify: true,        // Auto-convert URL-like text to links
    typographer: true,     // Enable smartypants
    breaks: false,         // Convert '\n' in paragraphs into <br>
    highlight: function (str, lang) {
      // Code highlighting with highlight.js
      if (lang && hljs.getLanguage(lang)) {
        try {
          return '<pre class="hljs code-block"><code>' +
            hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
            '</code></pre>';
        } catch (__) {}
      }
      return '<pre class="hljs code-block"><code>' + escapeHtml(str) + '</code></pre>';
    }
  });

  return md;
}

/**
 * Escape HTML entities
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Convert Markdown to HTML
 * @param {string} markdown - Markdown content
 * @param {object} options - Parser options
 * @returns {string} HTML content
 */
function parse(markdown, options = {}) {
  const md = createParser();

  // Parse markdown to HTML
  let html = md.render(markdown);

  // Wrap in container for styling
  html = `<div class="md-content">${html}</div>`;

  return html;
}

/**
 * Extract headings for TOC generation
 * @param {string} markdown
 * @returns {Array} Array of {level, text, anchor}
 */
function extractHeadings(markdown) {
  const headings = [];
  const md = createParser();
  const tokens = md.parse(markdown, {});

  for (const token of tokens) {
    if (token.type === 'heading_open') {
      const level = parseInt(token.tag.substring(1));
      const inlineToken = tokens[tokens.indexOf(token) + 1];
      if (inlineToken && inlineToken.type === 'inline') {
        const text = inlineToken.content;
        const anchor = textToAnchor(text);
        headings.push({ level, text, anchor });
      }
    }
  }

  return headings;
}

/**
 * Convert text to anchor ID
 * @param {string} text
 * @returns {string}
 */
function textToAnchor(text) {
  return text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = {
  parse,
  extractHeadings,
  createParser
};
