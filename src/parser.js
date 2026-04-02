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
 * Parse Markdown to HTML with stable heading ids (for TOC / 锚点)
 * @param {string} markdown
 * @returns {{ html: string, headings: Array<{level: number, text: string, anchor: string}> }}
 */
function parseDocument(markdown) {
  const md = createParser();
  const tokens = md.parse(markdown, {});
  const headings = [];
  const slugCount = {};

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type !== 'heading_open') continue;
    const inline = tokens[i + 1];
    if (!inline || inline.type !== 'inline') continue;

    const level = parseInt(t.tag.substring(1), 10);
    const text = inline.content;
    const base = textToAnchor(text);
    slugCount[base] = (slugCount[base] || 0) + 1;
    const id = slugCount[base] === 1 ? base : `${base}-${slugCount[base]}`;
    t.attrSet('id', id);
    headings.push({ level, text, anchor: id });
  }

  const inner = md.renderer.render(tokens, md.options, {});
  const html = `<div class="md-content">${inner}</div>`;
  return { html, headings };
}

/**
 * Convert Markdown to HTML
 * @param {string} markdown - Markdown content
 * @returns {string} HTML content
 */
function parse(markdown) {
  return parseDocument(markdown).html;
}

/**
 * Extract headings for TOC generation（与 parseDocument 中 id 规则一致）
 * @param {string} markdown
 * @returns {Array} Array of {level, text, anchor}
 */
function extractHeadings(markdown) {
  return parseDocument(markdown).headings;
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
  parseDocument,
  parse,
  extractHeadings,
  createParser
};
