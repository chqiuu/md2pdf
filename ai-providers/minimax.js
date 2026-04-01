/**
 * MiniMax AI Provider
 */

const https = require('https');

/**
 * Call MiniMax API
 * @param {string} apiKey - API Key
 * @param {string} model - Model name
 * @param {string} prompt - Prompt
 * @param {object} options - Options
 * @returns {Promise<string>} Generated content
 */
async function generate(apiKey, model, prompt, options = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: model || 'MiniMax-Text-01',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 2048,
      top_p: options.top_p || 0.95
    });

    const url = new URL('https://api.minimax.chat/v1/text/chatcompletion_pro');

    const options_ = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options_, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(body);

          if (response.choices && response.choices[0] && response.choices[0].message) {
            resolve(response.choices[0].message.content);
          } else if (response.error) {
            reject(new Error(response.error.message || 'API Error'));
          } else {
            reject(new Error('Unexpected response format'));
          }
        } catch (e) {
          reject(new Error('Failed to parse response: ' + e.message));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error('Request failed: ' + e.message));
    });

    req.write(data);
    req.end();
  });
}

/**
 * Generate CSS template using AI
 * @param {string} apiKey - API Key
 * @param {string} requirement - User requirement description
 * @returns {Promise<string>} Generated CSS
 */
async function generateTemplateCSS(apiKey, requirement) {
  const prompt = '请为 Markdown 转 PDF 生成一个 CSS 样式模板。\n\n需求描述：' + requirement + '\n\n要求：\n1. 中文字体优先（思源宋体/思源黑体）\n2. 正文字号 11-12pt\n3. 行距 1.6-1.8\n4. A4 纸张，页边距 2-2.5cm\n5. 支持代码块高亮\n6. 支持表格样式\n7. 分页控制合理（避免在标题后、表格内部分页）\n8. 使用 CSS 变量定义主题色和字体\n9. 响应式打印样式\n\n只输出纯 CSS 代码，使用 ```css 代码块包裹，不要有任何解释文字。';

  const result = await generate(apiKey, 'MiniMax-Text-01', prompt, {
    temperature: 0.7,
    max_tokens: 4096
  });

  // Extract CSS from code block
  const cssMatch = result.match(/```css\s*([\s\S]*?)\s*```/);
  if (cssMatch && cssMatch[1]) {
    return cssMatch[1].trim();
  }

  // If no code block found, return as is
  return result.trim();
}

module.exports = {
  generate,
  generateTemplateCSS
};
