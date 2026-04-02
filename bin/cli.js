#!/usr/bin/env node

/**
 * md2pdf - CLI Entry Point
 */

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');

const templateEngine = require('../src/template-engine');
const renderer = require('../src/renderer');
const { markdownToPdfBuffer } = require('../src/pdf-pipeline');

const program = new Command();

program
  .name('md2pdf')
  .description('Markdown to PDF converter with template support')
  .version('1.0.0');

// Convert command
program
  .command('convert <input>')
  .alias('c')
  .description('Convert Markdown file to PDF')
  .option('-o, --output <file>', 'Output PDF file', 'output.pdf')
  .option('-t, --template <name>', 'Template name')
  .option('-c, --css <file>', 'Custom CSS file')
  .option('--toc', 'Generate table of contents')
  .option('--toc-title <title>', 'TOC title', '目录')
  .option('--watermark <text>', 'Watermark text')
  .option('--format <size>', 'Paper size (A4, Letter, Legal)', 'A4')
  .option('--margin <cm>', 'Page margin in cm', '2.5')
  .action(async (inputFile, options) => {
    try {
      // Read input file
      let markdown;
      if (fs.existsSync(inputFile)) {
        markdown = fs.readFileSync(inputFile, 'utf8');
        console.log('Reading:', inputFile);
      } else {
        console.error('File not found:', inputFile);
        process.exit(1);
      }

      let css = '';
      let templateName;
      if (options.css && fs.existsSync(options.css)) {
        css = fs.readFileSync(options.css, 'utf8');
        templateName = 'custom';
        console.log('Using custom CSS');
      } else if (options.template) {
        const template = templateEngine.getTemplate(options.template);
        if (template) {
          templateName = options.template;
          console.log('Using template:', options.template);
        } else {
          console.error('Template not found:', options.template);
          process.exit(1);
        }
      }

      const margin = options.margin + 'cm';
      console.log('Rendering PDF...');
      const pdfBuffer = await markdownToPdfBuffer({
        markdown,
        template: templateName,
        css: templateName === 'custom' ? css : undefined,
        options: {
          title: path.basename(inputFile, path.extname(inputFile)),
          format: options.format,
          printBackground: true,
          displayHeaderFooter: false,
          margin: { top: margin, right: margin, bottom: margin, left: margin }
        },
        toc:
          options.toc
            ? { enabled: true, title: options.tocTitle || '目录' }
            : undefined,
        watermark: options.watermark
          ? {
              enabled: true,
              type: 'text',
              content: options.watermark,
              position: 'center',
              opacity: 0.1
            }
          : undefined
      });

      // Write output
      fs.writeFileSync(options.output, pdfBuffer);
      console.log('PDF generated:', options.output);

      await renderer.closeBrowser();
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// List templates command
program
  .command('templates')
  .alias('t')
  .description('List available templates')
  .action(() => {
    const templates = templateEngine.getTemplates();
    if (templates.length === 0) {
      console.log('No templates found.');
      return;
    }
    console.log('Available templates:');
    templates.forEach(t => {
      console.log('  -', t.name);
    });
  });

// Generate CSS from params
program
  .command('generate-css')
  .alias('g')
  .description('Generate CSS from parameters')
  .option('--font-size <size>', 'Font size', '12pt')
  .option('--line-height <height>', 'Line height', '1.6')
  .option('--margin <cm>', 'Page margin', '2.5cm')
  .option('--title-size <size>', 'Title size', '16pt')
  .option('-o, --output <file>', 'Output CSS file')
  .action((options) => {
    const css = templateEngine.generateCSSFromParams({
      fontSize: options.fontSize,
      lineHeight: options.lineHeight,
      pageMargin: options.margin,
      titleSize: options.titleSize
    });

    if (options.output) {
      fs.writeFileSync(options.output, css);
      console.log('CSS written to:', options.output);
    } else {
      console.log(css);
    }
  });

program.parse();
