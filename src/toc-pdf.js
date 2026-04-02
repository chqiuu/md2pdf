/**
 * 目录插入位置、PDF 内页码探测（Chromium 不支持 target-counter，需双次渲染）
 */

const path = require('path');
const { pathToFileURL } = require('url');
const cheerio = require('cheerio');

const MD_CONTENT_OPEN = '<div class="md-content">';

function insertTocInsideMdContent(htmlFragment, tocHTML) {
  const i = htmlFragment.indexOf(MD_CONTENT_OPEN);
  if (i < 0) {
    return tocHTML + htmlFragment;
  }
  const pos = i + MD_CONTENT_OPEN.length;
  return htmlFragment.slice(0, pos) + tocHTML + htmlFragment.slice(pos);
}

function escapeIdForSelector(id) {
  if (typeof id !== 'string') return '';
  return id.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * 在正文标题内注入唯一字符串，供首次 PDF 文本提取定位页码
 * @param {string} html - 含 .md-content 的片段
 * @param {Array<{ anchor: string }>} tocHeadings
 * @returns {{ html: string, markers: Array<{ anchor: string, marker: string }> }}
 */
function injectHeadingMarkers(html, tocHeadings) {
  const $ = cheerio.load(html, { decodeEntities: false }, false);
  const markers = [];
  tocHeadings.forEach((h, idx) => {
    const el = $(`[id="${escapeIdForSelector(h.anchor)}"]`).first();
    if (!el.length) return;
    const marker = `[[MD2PDF${idx}]]`;
    el.prepend(`<span class="md2pdf-pn-marker" aria-hidden="true">${marker}</span>`);
    markers.push({ anchor: h.anchor, marker });
  });
  return { html: $.root().html(), markers };
}

/**
 * @param {Buffer} pdfBuffer
 * @param {Array<{ anchor: string, marker: string }>} markers
 * @returns {Promise<Record<string, number>>} anchor -> 1-based 页码
 */
async function mapMarkersToPages(pdfBuffer, markers) {
  if (!markers.length) return {};

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pkgPath = require.resolve('pdfjs-dist/package.json');
  const workerPath = path.join(path.dirname(pkgPath), 'legacy', 'build', 'pdf.worker.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

  const data = new Uint8Array(pdfBuffer);
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const pageByAnchor = {};

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const text = tc.items.map((it) => it.str).join('');
    for (const { anchor, marker } of markers) {
      if (pageByAnchor[anchor] == null && text.includes(marker)) {
        pageByAnchor[anchor] = p;
      }
    }
    if (Object.keys(pageByAnchor).length >= markers.length) break;
  }

  return pageByAnchor;
}

function getMarkerProbeStyles() {
  return `
.md2pdf-pn-marker {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
  font-size: 0.01px;
  line-height: 0;
  color: transparent;
  user-select: none;
}
`;
}

module.exports = {
  insertTocInsideMdContent,
  injectHeadingMarkers,
  mapMarkersToPages,
  getMarkerProbeStyles
};
