/**
 * AI Provider Factory
 */

const minimax = require('./minimax');

/**
 * Supported providers
 */
const providers = {
  minimax: {
    name: 'MiniMax',
    generate: minimax.generate,
    generateTemplateCSS: minimax.generateTemplateCSS
  }
};

/**
 * Get provider by name
 * @param {string} name
 * @returns {object|null}
 */
function getProvider(name) {
  return providers[name] || null;
}

/**
 * Check if provider exists
 * @param {string} name
 * @returns {boolean}
 */
function hasProvider(name) {
  return !!providers[name];
}

/**
 * List available providers
 * @returns {Array}
 */
function listProviders() {
  return Object.keys(providers).map(key => ({
    id: key,
    name: providers[key].name
  }));
}

module.exports = {
  getProvider,
  hasProvider,
  listProviders
};
