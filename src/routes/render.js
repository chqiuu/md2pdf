/**
 * Render Routes - PDF rendering
 */

const express = require('express');
const { markdownToPdfBuffer } = require('../pdf-pipeline');

const router = express.Router();

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
        const pdfBuffer = await markdownToPdfBuffer({
          markdown,
          template,
          options,
          toc
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
