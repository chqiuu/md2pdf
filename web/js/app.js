/**
 * md2pdf - Main Application
 */

(function() {
  'use strict';

  // State
  const state = {
    markdown: '',
    currentTemplate: '',
    customCSS: '',
    templates: [],
    previewZoom: 100,
    previewUrl: null
  };

  // DOM Elements cache
  const $ = (id) => document.getElementById(id);

  // Initialize
  function init() {
    // Load settings
    const savedServerUrl = localStorage.getItem('md2pdf_server_url');
    if (savedServerUrl) {
      md2pdfAPI.setServerUrl(savedServerUrl);
    }

    // Load templates
    loadTemplates();

    // Setup event listeners
    setupEditorEvents();
    setupTemplateEvents();
    setupTuningEvents();
    setupRenderEvents();
    setupFileEvents();
    setupModalEvents();
    setupTabEvents();
    setupZoomEvents();

    // Load demo content
    loadDemoContent();

    setStatus('就绪');
  }

  // Templates
  async function loadTemplates() {
    try {
      const result = await md2pdfAPI.getTemplates();
      state.templates = result.data;
      renderTemplateOptions();
      setStatus('模板加载完成');
    } catch (error) {
      console.error('Failed to load templates:', error);
      setStatus('模板加载失败');
    }
  }

  function renderTemplateOptions() {
    const options = state.templates.map(t =>
      `<option value="${t.name}">${t.name}</option>`
    ).join('');

    $('templateSelect').innerHTML = `
      <option value="">选择模板...</option>
      ${options}
    `;

    $('templateList').innerHTML = `
      <option value="">请先选择模板...</option>
      ${state.templates.map(t =>
        `<option value="${t.name}">${t.name}</option>`
      ).join('')}
    `;
  }

  // Editor
  function setupEditorEvents() {
    const editor = $('editor');
    editor.addEventListener('input', () => {
      state.markdown = editor.value;
      updateCharCount();
      setEditorStatus('输入中...');
      debouncedPreview();
    });
  }

  // Template
  function setupTemplateEvents() {
    $('templateSelect').addEventListener('change', (e) => {
      state.currentTemplate = e.target.value;
      state.customCSS = '';
      $('customCSS').value = '';
      updatePreview();
    });

    $('templateList').addEventListener('change', (e) => {
      if (e.target.value) {
        $('templateSelect').value = e.target.value;
        state.currentTemplate = e.target.value;
        const template = state.templates.find(t => t.name === e.target.value);
        if (template) {
          state.customCSS = '';
          $('customCSS').value = template.css;
          updatePreview();
        }
      }
    });

    $('customCSS').addEventListener('input', () => {
      state.customCSS = $('customCSS').value;
      debouncedPreview();
    });

    $('applyCSS').addEventListener('click', () => {
      state.customCSS = $('customCSS').value;
      updatePreview();
      setStatus('样式已应用');
    });

    $('resetCSS').addEventListener('click', () => {
      state.customCSS = '';
      $('customCSS').value = '';
      state.currentTemplate = '';
      $('templateSelect').value = '';
      $('templateList').value = '';
      updatePreview();
    });

    $('saveTemplateBtn').addEventListener('click', saveTemplate);
    $('refreshTemplates').addEventListener('click', loadTemplates);
  }

  // Tuning
  function setupTuningEvents() {
    // Sliders
    $('fontSize').addEventListener('input', () => {
      $('fontSizeValue').textContent = $('fontSize').value + 'pt';
    });
    $('lineHeight').addEventListener('input', () => {
      $('lineHeightValue').textContent = $('lineHeight').value;
    });
    $('pageMargin').addEventListener('input', () => {
      $('pageMarginValue').textContent = $('pageMargin').value + 'cm';
    });
    $('titleSize').addEventListener('input', () => {
      $('titleSizeValue').textContent = $('titleSize').value + 'pt';
    });

    // Color pickers
    $('textColor').addEventListener('input', () => {
      $('textColorValue').value = $('textColor').value;
    });
    $('textColorValue').addEventListener('input', () => {
      $('textColor').value = $('textColorValue').value;
    });
    $('codeBg').addEventListener('input', () => {
      $('codeBgValue').value = $('codeBg').value;
    });
    $('codeBgValue').addEventListener('input', () => {
      $('codeBg').value = $('codeBgValue').value;
    });

    $('applyTuning').addEventListener('click', applyTuning);
  }

  // Render
  function setupRenderEvents() {
    $('includeToc').addEventListener('change', (e) => {
      $('tocOptions').style.display = e.target.checked ? 'block' : 'none';
      debouncedPreview();
    });

    $('tocTitle').addEventListener('input', debouncedPreview);
    $('paperSize').addEventListener('change', debouncedPreview);
    $('includeBackground').addEventListener('change', debouncedPreview);
    $('watermarkText').addEventListener('input', debouncedPreview);
    $('outputFilename').addEventListener('input', debouncedPreview);
    $('renderBtn').addEventListener('click', renderPDF);
    $('refreshPreview').addEventListener('click', updatePreview);
  }

  // File
  function setupFileEvents() {
    $('selectFileBtn').addEventListener('click', () => $('fileInput').click());
    $('fileInput').addEventListener('change', (e) => handleFile(e.target.files[0]));

    const dropZone = $('dropZone');
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith('.md') || file.name.endsWith('.markdown'))) {
        handleFile(file);
      }
    });
  }

  // Modal
  function setupModalEvents() {
    $('settingsBtn').addEventListener('click', () => {
      $('settingsModal').classList.add('show');
      $('serverUrl').value = md2pdfAPI.getServerUrl();
    });

    $('saveSettings').addEventListener('click', () => {
      md2pdfAPI.setServerUrl($('serverUrl').value);
      $('settingsModal').classList.remove('show');
      loadTemplates();
    });

    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        $('settingsModal').classList.remove('show');
      });
    });

    $('settingsModal').addEventListener('click', (e) => {
      if (e.target === $('settingsModal')) {
        $('settingsModal').classList.remove('show');
      }
    });
  }

  // Tabs
  function setupTabEvents() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === btn.dataset.tab));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-' + btn.dataset.tab));
      });
    });
  }

  // Zoom
  function setupZoomEvents() {
    $('zoomIn').addEventListener('click', () => {
      state.previewZoom = Math.min(state.previewZoom + 10, 200);
      $('previewFrame').style.transform = `scale(${state.previewZoom / 100})`;
      $('zoomLevel').textContent = state.previewZoom + '%';
    });
    $('zoomOut').addEventListener('click', () => {
      state.previewZoom = Math.max(state.previewZoom - 10, 50);
      $('previewFrame').style.transform = `scale(${state.previewZoom / 100})`;
      $('zoomLevel').textContent = state.previewZoom + '%';
    });
  }

  // AI
  $('generateTemplateBtn')?.addEventListener('click', generateTemplate);

  // Preview：与导出共用 Playwright PDF 管线，保证版式一致（iframe 内嵌 PDF）
  const PREVIEW_DEBOUNCE_MS = 600;
  let previewTimeout = null;
  let previewRequestId = 0;

  function buildRenderRequestBody() {
    const tocEnabled = $('includeToc').checked;
    const toc = tocEnabled ? { enabled: true, title: $('tocTitle').value || '目录' } : null;
    const watermarkText = $('watermarkText').value.trim();
    const watermark = watermarkText ? {
      enabled: true,
      type: 'text',
      content: watermarkText,
      position: 'center',
      opacity: 0.1,
      angle: -45
    } : null;
    return {
      markdown: state.markdown,
      template: state.currentTemplate,
      css: state.customCSS,
      options: {
        title: $('outputFilename').value || 'document',
        format: $('paperSize').value,
        printBackground: $('includeBackground').checked
      },
      toc,
      watermark
    };
  }

  function debouncedPreview() {
    clearTimeout(previewTimeout);
    previewTimeout = setTimeout(updatePreview, PREVIEW_DEBOUNCE_MS);
  }

  async function updatePreview() {
    if (!state.markdown) return;

    const reqId = ++previewRequestId;
    try {
      setEditorStatus('渲染中...');
      setStatus('正在生成 PDF 预览...');

      const blob = await md2pdfAPI.previewPDF(buildRenderRequestBody());
      if (reqId !== previewRequestId) return;

      if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
      state.previewUrl = URL.createObjectURL(blob);
      $('previewFrame').src = state.previewUrl;

      setEditorStatus('已渲染');
      setStatus('预览就绪');
    } catch (error) {
      if (reqId !== previewRequestId) return;
      console.error('Preview error:', error);
      setEditorStatus('渲染失败');
      setStatus('预览失败: ' + error.message);
    }
  }

  // Render PDF
  async function renderPDF() {
    if (!state.markdown) {
      md2pdfUtils.showToast('请先输入 Markdown 内容', 'error');
      return;
    }

    try {
      setStatus('正在生成 PDF...');
      $('renderBtn').disabled = true;
      $('renderBtn').textContent = '生成中...';

      const blob = await md2pdfAPI.renderPDF(buildRenderRequestBody());

      md2pdfUtils.downloadBlob(blob, ($('outputFilename').value || 'document') + '.pdf');
      setStatus('PDF 生成完成');
      md2pdfUtils.showToast('PDF 生成成功', 'success');
    } catch (error) {
      console.error('Render error:', error);
      setStatus('PDF 生成失败: ' + error.message);
      md2pdfUtils.showToast('PDF 生成失败: ' + error.message, 'error');
    } finally {
      $('renderBtn').disabled = false;
      $('renderBtn').textContent = '生成 PDF';
    }
  }

  // AI Template Generation
  async function generateTemplate() {
    const requirement = $('aiRequirement').value.trim();
    if (!requirement) {
      md2pdfUtils.showToast('请输入模板需求描述', 'error');
      return;
    }

    const apiKey = $('aiApiKey').value.trim();
    if (!apiKey) {
      md2pdfUtils.showToast('请输入 API Key', 'error');
      return;
    }

    const provider = $('aiProvider').value || 'minimax';

    try {
      $('aiLoading').style.display = 'flex';
      $('generateTemplateBtn').disabled = true;

      const result = await md2pdfAPI.generateTemplate(requirement, apiKey, provider);

      state.customCSS = result.data.css;
      $('customCSS').value = result.data.css;
      updatePreview();
      setStatus('AI 模板生成完成');
      md2pdfUtils.showToast('AI 模板生成成功', 'success');
    } catch (error) {
      console.error('AI error:', error);
      setStatus('AI 生成失败: ' + error.message);
      md2pdfUtils.showToast('AI 生成失败: ' + error.message, 'error');
    } finally {
      $('aiLoading').style.display = 'none';
      $('generateTemplateBtn').disabled = false;
    }
  }

  // Tuning
  async function applyTuning() {
    try {
      const result = await md2pdfAPI.generateCSS({
        fontMain: 'Noto Serif SC',
        fontCode: 'Fira Code',
        fontSize: $('fontSize').value + 'pt',
        lineHeight: $('lineHeight').value,
        pageMargin: $('pageMargin').value + 'cm',
        titleSize: $('titleSize').value + 'pt',
        textColor: $('textColor').value,
        codeBg: $('codeBg').value
      });

      state.customCSS = result.data.css;
      $('customCSS').value = result.data.css;
      updatePreview();
      setStatus('样式已应用');
      md2pdfUtils.showToast('样式已应用', 'success');
    } catch (error) {
      console.error('Tuning error:', error);
    }
  }

  // Save template
  async function saveTemplate() {
    const name = $('newTemplateName').value.trim();
    if (!name) {
      md2pdfUtils.showToast('请输入模板名称', 'error');
      return;
    }

    const css = state.customCSS || $('customCSS').value;
    if (!css) {
      md2pdfUtils.showToast('没有可保存的样式', 'error');
      return;
    }

    try {
      await md2pdfAPI.saveTemplate(name, css);
      await loadTemplates();
      $('newTemplateName').value = '';
      setStatus('模板已保存');
      md2pdfUtils.showToast('模板保存成功', 'success');
    } catch (error) {
      console.error('Save template error:', error);
      md2pdfUtils.showToast('保存失败: ' + error.message, 'error');
    }
  }

  // File handling
  async function handleFile(file) {
    if (!file) return;

    try {
      const content = await md2pdfUtils.readFileAsText(file);
      state.markdown = content;
      $('editor').value = content;
      updateCharCount();
      updatePreview();
      setStatus('文件已加载: ' + file.name);
    } catch (error) {
      console.error('File error:', error);
      setStatus('文件加载失败');
    }
  }

  // Helpers
  function updateCharCount() {
    $('charCount').textContent = state.markdown.length + ' 字符';
  }

  function setStatus(text) {
    $('statusText').textContent = text;
  }

  function setEditorStatus(text) {
    $('editorStatus').textContent = text;
  }

  function loadDemoContent() {
    const demo = `# 示例文档

这是一个 **Markdown** 转 **PDF** 的演示文档。

## 特性列表

- 实时预览
- 模板切换
- AI 生成模板
- 手动微调

## 代码示例

\`\`\`javascript
const greeting = "Hello, md2pdf!";
console.log(greeting);
\`\`\`

## 表格示例

| 功能 | 状态 |
|------|------|
| MD 解析 | ✅ |
| PDF 渲染 | ✅ |
| 模板系统 | ✅ |
| AI 生成 | 🔜 |

## 引用

> 这是一个引用文本。
> 可以有多行。

---

**正文结束**`;

    state.markdown = demo;
    $('editor').value = demo;
    updateCharCount();
    updatePreview();
  }

  // Debounce helper
  function debounce(fn, delay) {
    let timer = null;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // Start
  init();
})();
