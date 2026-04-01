/**
 * Template Routes
 */

const express = require('express');
const templateEngine = require('../template-engine');

const router = express.Router();

/**
 * GET /api/templates - List all templates
 */
router.get('/', (req, res) => {
  try {
    const templates = templateEngine.getTemplates();
    res.json({
      success: true,
      data: templates.map(t => ({
        name: t.name,
        css: t.css
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/templates/:name - Get template by name
 */
router.get('/:name', (req, res) => {
  try {
    const template = templateEngine.getTemplate(req.params.name);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/templates - Save a custom template
 */
router.post('/', (req, res) => {
  try {
    const { name, css } = req.body;
    if (!name || !css) {
      return res.status(400).json({
        success: false,
        error: 'Name and CSS are required'
      });
    }
    const result = templateEngine.saveTemplate(name, css);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/templates/:name - Delete a template
 */
router.delete('/:name', (req, res) => {
  try {
    const deleted = templateEngine.deleteTemplate(req.params.name);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    res.json({
      success: true
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
