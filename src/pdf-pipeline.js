/**
 * Markdown → PDF Buffer（含目录双次渲染与页码探测）
 */

const parser = require('./parser');
const renderer = require('./renderer');
const templateEngine = require('./template-engine');
const tocPdf = require('./toc-pdf');

function appendWatermarkToBodyFragment(htmlContent, watermark) {
  if (!watermark || !watermark.enabled) return htmlContent;
  const watermarkContent =
    watermark.type === 'image'
      ? `<img src="${watermark.content || watermark.text}" class="watermark">`
      : `<div class="watermark">${watermark.content || watermark.text}</div>`;
  return htmlContent + watermarkContent;
}

function watermarkCSS(watermark) {
  if (!watermark || !watermark.enabled) return '';
  return renderer.getWatermarkStyles({
    type: watermark.type || 'text',
    content: watermark.content || watermark.text || '',
    position: watermark.position || 'center',
    opacity: watermark.opacity || 0.1,
    angle: watermark.angle || -45,
    fontSize: watermark.fontSize || '48px',
    color: watermark.color || '#cccccc'
  });
}

/**
 * @param {object} body - 与 /api/render、preview 请求体一致
 * @returns {Promise<Buffer>}
 */
async function markdownToPdfBuffer(body) {
  const { markdown, template, css: customCSS, options, toc, watermark } = body;
  if (!markdown) {
    const err = new Error('Markdown content is required');
    err.status = 400;
    throw err;
  }

  const { html: mdHtml, headings } = parser.parseDocument(markdown);

  let css = customCSS || '';
  if (!css && template && template !== 'custom') {
    const templateData = templateEngine.getTemplate(template);
    if (templateData) {
      css = templateData.css;
    }
  }

  const pdfOptions = {
    format: options?.format || 'A4',
    printBackground: options?.printBackground !== false,
    margin: options?.margin || {
      top: '2cm',
      right: '2.5cm',
      bottom: '2cm',
      left: '2.5cm'
    },
    displayHeaderFooter: options?.displayHeaderFooter !== false,
    headerTemplate: options?.headerTemplate || '<div></div>',
    footerTemplate: options?.footerTemplate || `
        <div style="font-size: 10px; width: 100%; text-align: center;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>
      `
  };

  const minLevel = toc?.minLevel ?? 1;
  const maxLevel = toc?.maxLevel ?? 3;
  const tocHeadings = headings.filter(
    (h) => h.level >= minLevel && h.level <= maxLevel
  );

  const tocEnabled = toc && toc.enabled && tocHeadings.length > 0;

  if (!tocEnabled) {
    let htmlContent = appendWatermarkToBodyFragment(mdHtml, watermark);
    const fullCss = css + watermarkCSS(watermark);
    const documentHTML = templateEngine.generateHTMLDocument(htmlContent, fullCss, {
      title: options?.title || 'Document',
      fonts: options?.fonts || []
    });
    return renderer.render(documentHTML, pdfOptions);
  }

  const tocOptions = {
    title: toc.title || '目录',
    minLevel,
    maxLevel
  };

  const tocPlaceholder = renderer.generateTOCHTML(tocHeadings, {
    ...tocOptions,
    pageByAnchor: null
  });

  const { html: markedBody, markers } = tocPdf.injectHeadingMarkers(
    mdHtml,
    tocHeadings
  );

  let cssPass1 =
    css + renderer.getTOCStyles() + tocPdf.getMarkerProbeStyles() + watermarkCSS(watermark);
  let htmlPass1 = tocPdf.insertTocInsideMdContent(markedBody, tocPlaceholder);
  htmlPass1 = appendWatermarkToBodyFragment(htmlPass1, watermark);

  const docPass1 = templateEngine.generateHTMLDocument(htmlPass1, cssPass1, {
    title: options?.title || 'Document',
    fonts: options?.fonts || []
  });

  const pdfPass1 = await renderer.render(docPass1, pdfOptions);
  let pageByAnchor = await tocPdf.mapMarkersToPages(pdfPass1, markers);

  const missing =
    markers.length > 0 &&
    markers.some((m) => pageByAnchor[m.anchor] == null);
  if (missing) {
    const cheerio = require('cheerio');
    const $ = cheerio.load(mdHtml, { decodeEntities: false }, false);
    const escapeIdForSelector = (id) =>
      String(id).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const retryMarkers = [];
    tocHeadings.forEach((h, idx) => {
      const el = $(`[id="${escapeIdForSelector(h.anchor)}"]`).first();
      if (!el.length) return;
      const marker = `MD2PDFX${idx}X`;
      el.prepend(
        `<span class="md2pdf-pn-marker md2pdf-pn-fallback" aria-hidden="true">${marker}</span>`
      );
      retryMarkers.push({ anchor: h.anchor, marker });
    });
    const retryBody = $.root().html();
    const fallbackProbeCss = `
      .md2pdf-pn-fallback {
        position: static !important;
        width: auto !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        clip: auto !important;
        font-size: 0.5pt !important;
        line-height: 0.5pt !important;
        color: #010101 !important;
        display: inline !important;
      }
    `;
    let htmlRetry = tocPdf.insertTocInsideMdContent(retryBody, tocPlaceholder);
    htmlRetry = appendWatermarkToBodyFragment(htmlRetry, watermark);
    const cssRetry =
      css +
      renderer.getTOCStyles() +
      tocPdf.getMarkerProbeStyles() +
      fallbackProbeCss +
      watermarkCSS(watermark);
    const docRetry = templateEngine.generateHTMLDocument(htmlRetry, cssRetry, {
      title: options?.title || 'Document',
      fonts: options?.fonts || []
    });
    const pdfRetry = await renderer.render(docRetry, pdfOptions);
    pageByAnchor = await tocPdf.mapMarkersToPages(pdfRetry, retryMarkers);
  }

  const tocFinal = renderer.generateTOCHTML(tocHeadings, {
    ...tocOptions,
    pageByAnchor
  });

  let htmlPass2 = tocPdf.insertTocInsideMdContent(mdHtml, tocFinal);
  htmlPass2 = appendWatermarkToBodyFragment(htmlPass2, watermark);
  const cssPass2 = css + renderer.getTOCStyles() + watermarkCSS(watermark);

  const docPass2 = templateEngine.generateHTMLDocument(htmlPass2, cssPass2, {
    title: options?.title || 'Document',
    fonts: options?.fonts || []
  });

  return renderer.render(docPass2, pdfOptions);
}

module.exports = {
  markdownToPdfBuffer
};
