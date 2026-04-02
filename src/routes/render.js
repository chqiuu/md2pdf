/**
 * Render Routes - PDF rendering
 */

const express = require('express');
const parser = require('../parser');
const renderer = require('../renderer');
const templateEngine = require('../template-engine');

const router = express.Router();

/**
 * 与导出共用：Markdown + 模板/选项 → PDF Buffer（Playwright page.pdf）
 */
async function markdownToPdfBuffer(body) {
  const { markdown, template, css: customCSS, options, toc, watermark } = body;
  if (!markdown) {
    const err = new Error('Markdown content is required');
    err.status = 400;
    throw err;
  }

  let htmlContent = parser.parse(markdown);
  const headings = parser.extractHeadings(markdown);

  let css = customCSS || '';
  if (!css && template && template !== 'custom') {
    const templateData = templateEngine.getTemplate(template);
    if (templateData) {
      css = templateData.css;
    }
  }

  let tocHTML = '';
  if (toc && toc.enabled && headings.length > 0) {
    const tocOptions = {
      title: toc.title || '目录',
      minLevel: toc.minLevel || 1,
      maxLevel: toc.maxLevel || 3
    };
    tocHTML = renderer.generateTOCHTML(headings, tocOptions);
    css += renderer.getTOCStyles();
  }

  if (tocHTML) {
    const firstPTagIndex = htmlContent.indexOf('<p>');
    if (firstPTagIndex > 0) {
      htmlContent = htmlContent.slice(0, firstPTagIndex) + tocHTML + htmlContent.slice(firstPTagIndex);
    } else {
      htmlContent = tocHTML + htmlContent;
    }
  }

  if (watermark && watermark.enabled) {
    const watermarkCSS = renderer.getWatermarkStyles({
      type: watermark.type || 'text',
      content: watermark.content || watermark.text || '',
      position: watermark.position || 'center',
      opacity: watermark.opacity || 0.1,
      angle: watermark.angle || -45,
      fontSize: watermark.fontSize || '48px',
      color: watermark.color || '#cccccc'
    });
    css += watermarkCSS;

    const watermarkContent = watermark.type === 'image'
      ? `<img src="${watermark.content || watermark.text}" class="watermark">`
      : `<div class="watermark">${watermark.content || watermark.text}</div>`;
    htmlContent = htmlContent.replace('</body>', `${watermarkContent}</body>`);
  }

  const documentHTML = templateEngine.generateHTMLDocument(htmlContent, css, {
    title: options?.title || 'Document',
    fonts: options?.fonts || []
  });

  return renderer.render(documentHTML, {
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
  });
}

/**
 * POST /api/render/preview - 与导出相同的 PDF，供 iframe 内嵌预览（inline）
 */
router.post('/preview', async (req, res) => {
  try {
    const pdfBuffer = await markdownToPdfBuffer(req.body);
    const title = (req.body.options && req.body.options.title) || 'document';
    const safeName = String(title).replace(/[^\w\u4e00-\u9fa5.-]/g, '_') || 'document';
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${safeName}.pdf"`,
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'no-store'
    });
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Preview render error:', error);
    const status = error.status || 500;
    res.status(status).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/render - Render PDF
 */
router.post('/', async (req, res) => {
  try {
    const { options } = req.body;
    const pdfBuffer = await markdownToPdfBuffer(req.body);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${options?.title || 'document'}.pdf"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Render error:', error);
    const status = error.status || 500;
    res.status(status).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/batch-render - Batch render multiple files
 */
router.post('/batch', async (req, res) => {
  try {
    const { files, template, options, toc } = req.body;
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Files array is required'
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [],
      files: []
    };

    for (const file of files) {
      try {
        const { name, markdown } = file;

        // Parse markdown
        let htmlContent = parser.parse(markdown);
        const headings = parser.extractHeadings(markdown);

        // Get template CSS
        let css = '';
        if (template && template !== 'custom') {
          const templateData = templateEngine.getTemplate(template);
          if (templateData) {
            css = templateData.css;
          }
        }

        // Add TOC if requested
        let tocHTML = '';
        if (toc && toc.enabled && headings.length > 0) {
          const tocOptions = {
            title: toc.title || '目录',
            minLevel: toc.minLevel || 1,
            maxLevel: toc.maxLevel || 3
          };
          tocHTML = renderer.generateTOCHTML(headings, tocOptions);
          css += renderer.getTOCStyles();
        }

        if (tocHTML) {
          const firstPTagIndex = htmlContent.indexOf('<p>');
          if (firstPTagIndex > 0) {
            htmlContent = htmlContent.slice(0, firstPTagIndex) + tocHTML + htmlContent.slice(firstPTagIndex);
          } else {
            htmlContent = tocHTML + htmlContent;
          }
        }

        const documentHTML = templateEngine.generateHTMLDocument(htmlContent, css, {
          title: name,
          fonts: options?.fonts || []
        });

        const pdfBuffer = await renderer.render(documentHTML, {
          format: options?.format || 'A4',
          printBackground: options?.printBackground !== false,
          margin: options?.margin || {
            top: '2cm',
            right: '2.5cm',
            bottom: '2cm',
            left: '2.5cm'
          }
        });

        results.success++;
        results.files.push({
          name,
          size: pdfBuffer.length,
          pdf: pdfBuffer.toString('base64')
        });
      } catch (err) {
        results.failed++;
        results.errors.push({
          file: file.name,
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
