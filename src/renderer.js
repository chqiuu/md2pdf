/**
 * PDF Renderer - Uses Playwright to render HTML to PDF
 */

const playwright = require('playwright');
const path = require('path');

// macOS Chrome path
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

let browser = null;

/**
 * Initialize Playwright browser
 * @param {object} options - Browser options
 * @returns {Promise<Browser>}
 */
async function initBrowser(options = {}) {
  if (!browser) {
    const launchOptions = {
      headless: true
    };

    // Use system Chrome if available
    const fs = require('fs');
    if (fs.existsSync(CHROME_PATH) && options.useSystemChrome !== false) {
      launchOptions.executablePath = CHROME_PATH;
      console.log('Using system Chrome for PDF rendering');
    }

    browser = await playwright.chromium.launch(launchOptions);
  }
  return browser;
}

/**
 * Close browser instance
 */
async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

/**
 * Render HTML to PDF
 * @param {string} html - HTML content
 * @param {object} options - PDF options
 * @returns {Promise<Buffer>} PDF buffer
 */
async function render(html, options = {}) {
  const {
    format = 'A4',
    printBackground = true,
    margin = {
      top: '2cm',
      right: '2.5cm',
      bottom: '2cm',
      left: '2.5cm'
    },
    displayHeaderFooter = true,
    headerTemplate = '<div></div>',
    footerTemplate = `
      <div style="font-size: 10px; width: 100%; text-align: center;">
        <span class="pageNumber"></span> / <span class="totalPages"></span>
      </div>
    `,
    scale = 1.0,
    pageRanges = ''
  } = options;

  const browserInstance = await initBrowser();
  const context = await browserInstance.newContext({
    viewport: { width: 794, height: 1123 } // A4 at 96 DPI
  });
  const page = await context.newPage();

  // Set content
  await page.setContent(html, {
    waitUntil: 'networkidle'
  });

  // Generate PDF
  const pdfBuffer = await page.pdf({
    format,
    printBackground,
    margin,
    displayHeaderFooter,
    headerTemplate,
    footerTemplate,
    scale,
    pageRanges
  });

  await context.close();

  return Buffer.from(pdfBuffer);
}

/**
 * Render PDF and save to file
 * @param {string} html - HTML content
 * @param {string} outputPath - Output file path
 * @param {object} options - PDF options
 */
async function renderToFile(html, outputPath, options = {}) {
  const pdfBuffer = await render(html, options);
  const fs = require('fs');
  fs.writeFileSync(outputPath, pdfBuffer);
}

/**
 * Get PDF page count (by rendering and counting pages)
 * @param {string} html - HTML content
 * @param {object} options - PDF options
 * @returns {Promise<number>}
 */
async function getPageCount(html, options = {}) {
  const browserInstance = await initBrowser();
  const context = await browserInstance.newContext();
  const page = await context.newPage();

  await page.setContent(html, { waitUntil: 'networkidle' });

  // Get content height to estimate pages
  const contentHeight = await page.evaluate(() => {
    return document.body.scrollHeight;
  });

  const viewportHeight = 1123; // A4 height at 96 DPI
  const estimatedPages = Math.ceil(contentHeight / viewportHeight);

  await context.close();

  return estimatedPages;
}

/**
 * Generate TOC HTML
 * @param {Array} headings - Array of {level, text, anchor}
 * @param {object} options - TOC options；pageByAnchor 为 { [anchor]: number } 时显示页码
 * @returns {string} TOC HTML
 */
function generateTOCHTML(headings, options = {}) {
  const {
    title = '目录',
    minLevel = 1,
    maxLevel = 3,
    pageByAnchor = null
  } = options;

  if (!headings || headings.length === 0) {
    return '';
  }

  let html = `<div class="toc"><h1 class="toc-title">${escapeHtml(title)}</h1>`;

  for (const heading of headings) {
    if (heading.level < minLevel || heading.level > maxLevel) {
      continue;
    }

    const indent = (heading.level - minLevel) * 20;
    const page =
      pageByAnchor && pageByAnchor[heading.anchor] != null
        ? String(pageByAnchor[heading.anchor])
        : '?';
    const hrefAttr = heading.anchor
      ? `#${String(heading.anchor).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}`
      : '#';

    html += `
      <a class="toc-item level-${heading.level}" href="${hrefAttr}" style="padding-left: ${indent}pt;">
        <span class="toc-text">${escapeHtml(heading.text)}</span>
        <span class="toc-dots"></span>
        <span class="toc-page">${page}</span>
      </a>
    `;
  }

  html += '</div>';

  return html;
}

/**
 * Get TOC styles
 * @returns {string} CSS for TOC
 */
function getTOCStyles() {
  return `
.toc {
  margin: 0;
  padding: 24pt 16pt 32pt;
  background: #f9f9f9;
  border-radius: 0;
  page-break-after: always;
  break-after: page;
  min-height: 0;
  box-sizing: border-box;
}

.toc-title {
  font-size: 18pt;
  font-weight: bold;
  margin: 0 0 16pt;
  text-align: center;
  page-break-after: avoid;
}

a.toc-item {
  display: flex;
  align-items: baseline;
  padding: 6pt 0;
  font-size: 11pt;
  page-break-inside: avoid;
  text-decoration: none;
  color: inherit;
  box-sizing: border-box;
}

a.toc-item:hover {
  color: inherit;
}

.toc-item.level-2 {
  padding-left: 20pt;
}

.toc-item.level-3 {
  padding-left: 40pt;
}

.toc-text {
  flex-shrink: 0;
}

.toc-dots {
  flex: 1;
  border-bottom: 1px dotted #999;
  margin: 0 8pt;
  position: relative;
  top: -4pt;
  min-width: 8pt;
}

.toc-page {
  flex-shrink: 0;
  min-width: 1.5em;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
`;
}

/**
 * Generate watermark styles
 * @param {object} options - Watermark options
 * @returns {string} CSS for watermark
 */
function getWatermarkStyles(options = {}) {
  const {
    type = 'text',
    content = '',
    position = 'center',
    opacity = 0.1,
    angle = -45,
    fontSize = '48px',
    color = '#cccccc'
  } = options;

  if (type === 'image' && content) {
    return `
.watermark {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(${angle}deg);
  opacity: ${opacity};
  z-index: 9999;
  pointer-events: none;
}
.watermark img {
  max-width: 200px;
  height: auto;
}
`;
  }

  const positionStyles = {
    'center': 'top: 50%; left: 50%; transform: translate(-50%, -50%);',
    'top-left': 'top: 10%; left: 10%;',
    'top-right': 'top: 10%; right: 10%;',
    'bottom-left': 'bottom: 10%; left: 10%;',
    'bottom-right': 'bottom: 10%; right: 10%;',
    'tile': 'top: 0; left: 0; width: 100%; height: 100%; transform: none;'
  };

  return `
.watermark {
  position: fixed;
  ${positionStyles[position] || positionStyles.center}
  transform: ${position === 'tile' ? 'none' : `translate(-50%, -50%) rotate(${angle}deg)`};
  opacity: ${opacity};
  font-size: ${fontSize};
  color: ${color};
  z-index: 9999;
  pointer-events: none;
  white-space: nowrap;
}
`;
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = {
  render,
  renderToFile,
  getPageCount,
  generateTOCHTML,
  getTOCStyles,
  getWatermarkStyles,
  initBrowser,
  closeBrowser
};
