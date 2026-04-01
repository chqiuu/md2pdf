/**
 * Parse Routes - Markdown parsing and preview
 */

const express = require('express');
const parser = require('../parser');
const renderer = require('../renderer');
const templateEngine = require('../template-engine');

const router = express.Router();

/**
 * POST /api/parse - Parse Markdown to HTML
 */
router.post('/', (req, res) => {
  try {
    const { markdown, template } = req.body;
    if (!markdown) {
      return res.status(400).json({
        success: false,
        error: 'Markdown content is required'
      });
    }

    // Parse markdown
    const htmlContent = parser.parse(markdown);

    // Get template CSS
    let css = '';
    if (template && template !== 'custom') {
      const templateData = templateEngine.getTemplate(template);
      if (templateData) {
        css = templateData.css;
      }
    } else if (template === 'custom' && req.body.css) {
      css = req.body.css;
    }

    res.json({
      success: true,
      data: {
        html: htmlContent,
        css
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/preview - Generate preview HTML
 */
router.post('/preview', (req, res) => {
  try {
    const { markdown, template, css: customCSS, toc } = req.body;
    if (!markdown) {
      return res.status(400).json({
        success: false,
        error: 'Markdown content is required'
      });
    }

    // Parse markdown
    let htmlContent = parser.parse(markdown);

    // Extract headings for TOC
    const headings = parser.extractHeadings(markdown);

    // Get template CSS
    let css = customCSS || '';
    if (!css && template && template !== 'custom') {
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

    // Insert TOC after first paragraph or at beginning
    if (tocHTML) {
      const firstPTagIndex = htmlContent.indexOf('<p>');
      if (firstPTagIndex > 0) {
        htmlContent = htmlContent.slice(0, firstPTagIndex) + tocHTML + htmlContent.slice(firstPTagIndex);
      } else {
        htmlContent = tocHTML + htmlContent;
      }
    }

    // Generate complete HTML document
    const documentHTML = templateEngine.generateHTMLDocument(htmlContent, css, {
      title: req.body.title || 'Document'
    });

    res.json({
      success: true,
      data: {
        html: documentHTML,
        headings
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
