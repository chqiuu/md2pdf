/**
 * AI Routes - AI template generation
 */

const express = require('express');
const templateEngine = require('../template-engine');
const aiProviders = require('../../ai-providers');

const router = express.Router();

/**
 * GET /api/ai/providers - List available AI providers
 */
router.get('/providers', (req, res) => {
  res.json({
    success: true,
    data: aiProviders.listProviders()
  });
});

/**
 * POST /api/ai/generate-template - Generate template using AI
 */
router.post('/generate-template', async (req, res) => {
  try {
    const { requirement, provider = 'minimax', apiKey } = req.body;
    if (!requirement) {
      return res.status(400).json({
        success: false,
        error: 'Requirement description is required'
      });
    }

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API key is required'
      });
    }

    const aiProvider = aiProviders.getProvider(provider);
    if (!aiProvider) {
      return res.status(400).json({
        success: false,
        error: `Unsupported AI provider: ${provider}`
      });
    }

    console.log(`[AI] Generating template using ${provider}...`);
    const css = await aiProvider.generateTemplateCSS(apiKey, requirement);

    res.json({
      success: true,
      data: { css }
    });
  } catch (error) {
    console.error('[AI] Generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/template/generate-css - Generate CSS from tuning parameters
 */
router.post('/generate-css', (req, res) => {
  try {
    const css = templateEngine.generateCSSFromParams(req.body);
    res.json({
      success: true,
      data: { css }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
