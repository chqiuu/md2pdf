/**
 * Font Routes - Font management
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

/**
 * GET /api/fonts - Get available fonts
 */
router.get('/', (req, res) => {
  try {
    const fontsPath = path.join(__dirname, '..', '..', 'fonts', 'fonts.json');
    if (fs.existsSync(fontsPath)) {
      const fontsConfig = JSON.parse(fs.readFileSync(fontsPath, 'utf8'));
      res.json({
        success: true,
        data: fontsConfig
      });
    } else {
      res.json({
        success: true,
        data: { fonts: [], note: 'Font config not found' }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
