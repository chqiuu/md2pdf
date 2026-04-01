/**
 * Utility Functions
 */

(function() {
  'use strict';

  /**
   * Debounce function
   */
  function debounce(fn, delay) {
    let timer = null;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /**
   * Throttle function
   */
  function throttle(fn, limit) {
    let inThrottle = false;
    return function(...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Format file size
   */
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Download blob as file
   */
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Read file as text
   */
  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = e => reject(e);
      reader.readAsText(file);
    });
  }

  /**
   * Escape HTML
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Generate unique ID
   */
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Check if is mobile device
   */
  function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Deep clone object
   */
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Show toast notification
   */
  function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#333'};
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
    `;
    if (!document.querySelector('style[data-toast]')) {
      style.setAttribute('data-toast', 'true');
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // Export
  window.md2pdfUtils = {
    debounce,
    throttle,
    formatSize,
    downloadBlob,
    readFileAsText,
    escapeHtml,
    generateId,
    isMobile,
    deepClone,
    showToast
  };
})();
