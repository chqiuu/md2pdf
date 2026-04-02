# md2pdf

将 Markdown 转为 PDF 的工具：提供 Web 工作台（编辑、预览、模板与导出）与命令行，底层使用 **markdown-it** 解析、**Playwright** 生成 PDF，并支持多套版式模板与自定义 CSS。

## 功能概览

- **Web 界面**：上传/编辑 Markdown、实时预览 PDF、模板切换、导出 PDF；可选 AI 辅助生成模板样式（需在界面中配置提供商与 API Key）。
- **命令行**：将本地 `.md` 转为 PDF，支持模板、自定义 CSS、目录、水印、纸张与页边距。
- **REST API**：`/api/parse`、`/api/render`、`/api/templates`、`/api/fonts`、`/api/ai` 等（详见 `src/routes/`）。

## 环境要求

- **Node.js** 18+（建议 LTS）
- PDF 渲染依赖 Playwright 自带的 Chromium，首次使用前需安装浏览器（见下文）

## 安装

```bash
git clone https://github.com/chqiuu/md2pdf.git
cd md2pdf
npm install
npx playwright install chromium
```

## 启动 Web 服务

```bash
npm start
```

默认监听 **http://127.0.0.1:33002**（若端口被占用会自动尝试下一个端口）。在浏览器中打开根路径即可使用界面。

可通过环境变量覆盖端口：

```bash
set PORT=8080
npm start
```

Linux / macOS：

```bash
PORT=8080 npm start
```

健康检查：`GET /health`。

## 命令行

全局安装（可选）：

```bash
npm link
```

或直接：

```bash
npm run cli -- <子命令>
```

### 转换 Markdown 为 PDF

```bash
md2pdf convert input.md -o out.pdf
md2pdf convert input.md -t <模板名> --toc --watermark "草稿"
md2pdf convert input.md -c custom.css --format A4 --margin 2
```

### 列出可用模板

```bash
md2pdf templates
```

### 从参数生成 CSS

```bash
md2pdf generate-css --font-size 12pt -o theme.css
```

## 项目结构（简要）

| 路径 | 说明 |
|------|------|
| `src/index.js` | Express 入口、静态资源与路由挂载 |
| `src/renderer.js`、`src/pdf-pipeline.js` | HTML/PDF 渲染与流水线 |
| `src/routes/` | API 路由 |
| `web/` | 前端页面与脚本 |
| `bin/cli.js` | CLI 入口 |

更完整的产品与接口说明见 `docs/` 下的设计文档。

## 许可证

MIT
