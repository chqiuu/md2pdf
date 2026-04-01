/**
 * md2pdf - Main Entry Point
 */

const express = require('express');
const path = require('path');

// Import routes
const templateRoutes = require('./routes/templates');
const parseRoutes = require('./routes/parse');
const renderRoutes = require('./routes/render');
const aiRoutes = require('./routes/ai');
const fontRoutes = require('./routes/fonts');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'web')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/templates', templateRoutes);
app.use('/api/parse', parseRoutes);
app.use('/api/preview', parseRoutes);
app.use('/api/render', renderRoutes);
app.use('/api/batch-render', renderRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/template', aiRoutes);
app.use('/api/fonts', fontRoutes);

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web', 'index.html'));
});

// Start server with automatic port retry
function startServer(port = PORT) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`md2pdf server running at http://0.0.0.0:${port}`);
      resolve(server);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is in use, trying ${port + 1}...`);
        server.listen(port + 1);
      } else {
        reject(err);
      }
    });
  });
}

// CLI mode
if (require.main === module) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

// Export for testing
module.exports = {
  app,
  startServer
};
