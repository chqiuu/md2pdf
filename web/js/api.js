/**
 * API Helper Module
 */

(function() {
  'use strict';

  // State - 自动检测 serverUrl
  function getDefaultServerUrl() {
    // 如果有保存的配置，优先使用
    const saved = localStorage.getItem('md2pdf_server_url');
    if (saved) return saved;

    // 自动检测：通过相对路径访问时，自动使用当前域名
    const currentPath = window.location.pathname;
    if (currentPath.includes('/pdf/')) {
      // 通过 nginx 代理访问
      const basePath = currentPath.split('/pdf/')[0] + '/pdf';
      return window.location.origin + basePath;
    }

    // 默认端口
    return 'http://localhost:33000';
  }

  let serverUrl = getDefaultServerUrl();

  /**
   * Set server URL
   */
  function setServerUrl(url) {
    serverUrl = url;
    localStorage.setItem('md2pdf_server_url', url);
  }

  /**
   * Get server URL
   */
  function getServerUrl() {
    return serverUrl;
  }

  /**
   * API request helper
   */
  async function api(endpoint, options = {}) {
    const url = serverUrl + endpoint;
    const fetchOptions = {
      headers: {
        'Content-Type': 'application/json'
      },
      ...options
    };

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
      delete fetchOptions.body;
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      let error = { message: 'Request failed' };
      try {
        const data = await response.json();
        error = data;
      } catch (e) {}
      throw new Error(error.error || error.message || 'Request failed');
    }

    // Check content type
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/pdf')) {
      return response.blob();
    }

    return response.json();
  }

  // Templates
  async function getTemplates() {
    return api('/api/templates');
  }

  async function getTemplate(name) {
    return api('/api/templates/' + name);
  }

  async function saveTemplate(name, css) {
    return api('/api/templates', {
      method: 'POST',
      body: { name, css }
    });
  }

  async function deleteTemplate(name) {
    return api('/api/templates/' + name, {
      method: 'DELETE'
    });
  }

  // Parse & Preview
  async function parsePreview(markdown, template, css, toc) {
    return api('/api/preview', {
      method: 'POST',
      body: { markdown, template, css, toc }
    });
  }

  async function generateCSS(params) {
    return api('/api/template/generate-css', {
      method: 'POST',
      body: params
    });
  }

  // Render
  async function renderPDF(options) {
    return api('/api/render', {
      method: 'POST',
      body: options
    });
  }

  async function batchRender(files, template, options, toc) {
    return api('/api/batch-render/batch', {
      method: 'POST',
      body: { files, template, options, toc }
    });
  }

  // AI
  async function getAIProviders() {
    return api('/api/ai/providers');
  }

  async function generateTemplate(requirement, apiKey, provider) {
    return api('/api/ai/generate-template', {
      method: 'POST',
      body: { requirement, apiKey, provider }
    });
  }

  // Fonts
  async function getFonts() {
    return api('/api/fonts');
  }

  // Export
  window.md2pdfAPI = {
    setServerUrl,
    getServerUrl,
    // Templates
    getTemplates,
    getTemplate,
    saveTemplate,
    deleteTemplate,
    // Parse
    parsePreview,
    generateCSS,
    // Render
    renderPDF,
    batchRender,
    // AI
    getAIProviders,
    generateTemplate,
    // Fonts
    getFonts
  };
})();
