#!/usr/bin/env node
/**
 * Build customer handbook PDF with proper page breaks and embedded screenshots.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import { marked } from "marked";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HANDBOOK_DIR = join(__dirname, "..");
const COMBINED_MD = join(HANDBOOK_DIR, "combined-handbook.md");
const OUTPUT_DIR = join(HANDBOOK_DIR, "output");
const OUTPUT_PDF = join(OUTPUT_DIR, "TechHind-Solar-CRM-Handbook.pdf");
const OUTPUT_HTML = join(OUTPUT_DIR, "handbook-preview.html");

function fixImagePaths(html, handbookDir) {
  return html.replace(/src="([^"]+)"/g, (_, src) => {
    if (src.startsWith("file://") || src.startsWith("http")) return `src="${src}"`;
    const clean = src.replace(/^\.\.\//, "").replace(/^\//, "");
    return `src="file://${join(handbookDir, clean)}"`;
  });
}

function wrapSections(html) {
  const parts = html.split(/(?=<h2)/);
  return parts
    .map((part, i) => (i === 0 ? part : `<section class="block">${part}</section>`))
    .join("");
}

function buildToc(html) {
  const skipPatterns = [
    /^TechHind Solar CRM — Platform Handbook$/i,
    /^TechHind Solar CRM$/i,
  ];
  const chapters = [];
  let idx = 0;
  const bodyHtml = html.replace(/<h1([^>]*)>(.*?)<\/h1>/g, (full, attrs, inner) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    if (skipPatterns.some((p) => p.test(text))) {
      return `<h1${attrs}>${inner}</h1>`;
    }
    idx += 1;
    const id = `chapter-${idx}`;
    chapters.push({ text, id });
    return `<h1 id="${id}"${attrs}>${inner}</h1>`;
  });

  const tocItems = chapters
    .map((ch) => `<li><a href="#${ch.id}">${ch.text}</a></li>`)
    .join("");

  return {
    tocHtml: chapters.length
      ? `<nav class="toc"><h2 class="toc-title">Contents</h2><ol>${tocItems}</ol></nav>`
      : "",
    bodyHtml,
  };
}

function wrapChapters(html) {
  return html.replace(/<h1 id="(chapter-\d+)"/g, '<div class="chapter"><h1 id="$1"');
}

function preprocessMd(md) {
  return md
    .replace(/^---[\s\S]*?---\n+/m, "")
    .replace(
    /!\[([^\]]*)\]\(([^)]+)\)\{\.(hero|compact)\}/g,
    (_, alt, src, cls) =>
      `<figure class="shot ${cls}"><img src="${src}" alt="${alt}" /><figcaption>${alt}</figcaption></figure>\n\n`
  );
}

function postProcessFigures(html) {
  return html.replace(/<figure class="shot (hero|compact)">/g, '<figure class="shot $1">');
}

async function main() {
  if (!existsSync(COMBINED_MD)) {
    console.error("Run build-pdf.sh first to generate combined-handbook.md");
    process.exit(1);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const md = readFileSync(COMBINED_MD, "utf8");
  const rawHtml = marked.parse(preprocessMd(md), { gfm: true, breaks: false });
  let bodyHtml = fixImagePaths(String(rawHtml), HANDBOOK_DIR);
  bodyHtml = postProcessFigures(bodyHtml);
  bodyHtml = wrapSections(bodyHtml);

  const toc = buildToc(bodyHtml);
  bodyHtml = wrapChapters(toc.bodyHtml || bodyHtml);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>TechHind Solar CRM Platform Handbook</title>
  <style>
    @page { size: A4; margin: 16mm 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Helvetica, Arial, sans-serif; font-size: 10.5pt; line-height: 1.5; color: #1a1a1a; margin: 0; padding: 0; }
    .cover { page-break-after: always; text-align: center; padding: 100px 40px 60px; min-height: 90vh; display: flex; flex-direction: column; justify-content: center; }
    .cover h1 { font-size: 32pt; color: #0d47a1; margin: 0 0 12px; border: none; page-break-before: avoid; }
    .cover .tagline { font-size: 14pt; color: #444; margin: 8px 0; }
    .cover .meta { font-size: 11pt; color: #666; margin-top: 40px; }
    .toc { page-break-after: always; padding: 20px 0 40px; }
    .toc-title { font-size: 18pt; color: #0d47a1; border-bottom: 2px solid #0d47a1; padding-bottom: 8px; page-break-before: avoid; }
    .toc ol { line-height: 1.9; font-size: 11pt; padding-left: 24px; }
    .toc a { color: #1565c0; text-decoration: none; }
    .chapter { page-break-before: always; break-before: page; }
    .chapter:first-of-type { page-break-before: avoid; }
    h1 { font-size: 20pt; color: #0d47a1; border-bottom: 2px solid #0d47a1; padding-bottom: 6px; margin: 0 0 16px; page-break-before: always; break-after: avoid; }
    .chapter-opener { break-inside: avoid; page-break-inside: avoid; margin-bottom: 20px; }
    h2 { font-size: 14pt; color: #1565c0; margin: 20px 0 10px; break-after: avoid; page-break-after: avoid; }
    h3 { font-size: 11.5pt; color: #333; margin: 14px 0 8px; break-after: avoid; }
    section.block { break-inside: avoid-page; page-break-inside: avoid; margin-bottom: 18px; }
    p { margin: 0 0 10px; orphans: 3; widows: 3; }
    ul, ol { margin: 8px 0 12px 22px; }
    li { margin: 4px 0; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 10pt; break-inside: avoid; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
    th { background: #f0f4f8; }
    figure.shot { break-inside: avoid; page-break-inside: avoid; margin: 14px 0 18px; text-align: center; }
    figure.shot.hero { page-break-before: auto; }
    figure.shot img, img.hero, img.compact { display: block; margin: 0 auto; border: 1px solid #ddd; border-radius: 4px; }
    figure.shot.hero img, img.hero { max-width: 100%; max-height: 520px; object-fit: contain; }
    figure.shot.compact img, img.compact { max-width: 100%; max-height: 360px; object-fit: contain; }
    figcaption { font-size: 9pt; color: #555; margin-top: 6px; font-style: italic; break-before: avoid; }
    blockquote { border-left: 3px solid #0d47a1; margin: 12px 0; padding: 8px 14px; background: #f5f8fc; break-inside: avoid; }
    hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="cover">
    <h1>TechHind Solar CRM</h1>
    <p class="tagline">Platform Handbook</p>
    <p class="tagline">Complete Solar Business Management — Sales to Service</p>
    <p class="meta">Customer Presentation · June 2026 · Version 2.0</p>
  </div>
  ${toc.tocHtml || ""}
  <div class="chapter-opener">${bodyHtml}</div>
</body>
</html>`;

  writeFileSync(OUTPUT_HTML, html);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`file://${OUTPUT_HTML}`, { waitUntil: "networkidle" });
  await page.pdf({
    path: OUTPUT_PDF,
    format: "A4",
    printBackground: true,
    margin: { top: "16mm", right: "14mm", bottom: "16mm", left: "14mm" },
  });
  await browser.close();

  console.log(`PDF generated: ${OUTPUT_PDF}`);
  console.log(`HTML preview: ${OUTPUT_HTML}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
