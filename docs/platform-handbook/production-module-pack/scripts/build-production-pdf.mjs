#!/usr/bin/env node
/**
 * Build Production / Assembly module guide PDF (standalone customer pack).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import { marked } from "marked";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACK_DIR = join(__dirname, "..");
const HANDBOOK_DIR = join(PACK_DIR, "..");
const COMBINED_MD = join(PACK_DIR, "output", "combined-production-module.md");
const OUTPUT_DIR = join(PACK_DIR, "output");
const OUTPUT_PDF = join(OUTPUT_DIR, "Production-Assembly-Guide.pdf");
const OUTPUT_HTML = join(OUTPUT_DIR, "production-guide-preview.html");

function fixImagePaths(html, baseDir) {
  return html.replace(/src="([^"]+)"/g, (_, src) => {
    if (src.startsWith("file://") || src.startsWith("http")) return `src="${src}"`;
    const clean = src.replace(/^\.\.\//, "").replace(/^\//, "");
    return `src="file://${join(baseDir, clean)}"`;
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
    /^Production \/ Assembly Module — Introduction$/i,
    /^TechHind Solar — Production \/ Assembly Module$/i,
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
    console.error(`Missing combined markdown: ${COMBINED_MD}`);
    console.error("Run build-production-pack.sh first.");
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

  const generatedDate = new Date().toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>TechHind Solar — Production / Assembly Module</title>
  <style>
    @page { size: A4; margin: 16mm 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Helvetica, Arial, sans-serif; font-size: 10.5pt; line-height: 1.5; color: #1a1a1a; margin: 0; padding: 0; }
    .cover { page-break-after: always; text-align: center; padding: 100px 40px 60px; min-height: 90vh; display: flex; flex-direction: column; justify-content: center; }
    .cover h1 { font-size: 28pt; color: #065f46; margin: 0 0 12px; border: none; page-break-before: avoid; }
    .cover .tagline { font-size: 14pt; color: #444; margin: 8px 0; }
    .cover .meta { font-size: 11pt; color: #666; margin-top: 40px; }
    .toc { page-break-after: always; padding: 20px 0 40px; }
    .toc-title { font-size: 18pt; color: #065f46; border-bottom: 2px solid #065f46; padding-bottom: 8px; page-break-before: avoid; }
    .toc ol { line-height: 1.9; font-size: 11pt; padding-left: 24px; }
    .toc a { color: #047857; text-decoration: none; }
    .chapter { page-break-before: always; break-before: page; }
    .chapter:first-of-type { page-break-before: avoid; }
    h1 { font-size: 20pt; color: #065f46; border-bottom: 2px solid #065f46; padding-bottom: 6px; margin: 0 0 16px; page-break-before: always; break-after: avoid; }
    .chapter-opener { break-inside: avoid; page-break-inside: avoid; margin-bottom: 20px; }
    h2 { font-size: 14pt; color: #047857; margin: 20px 0 10px; break-after: avoid; page-break-after: avoid; }
    h3 { font-size: 11.5pt; color: #333; margin: 14px 0 8px; break-after: avoid; }
    section.block { break-inside: avoid-page; page-break-inside: avoid; margin-bottom: 18px; }
    p { margin: 0 0 10px; orphans: 3; widows: 3; }
    ul, ol { margin: 8px 0 12px 22px; }
    li { margin: 4px 0; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 10pt; break-inside: avoid; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
    th { background: #ecfdf5; }
    pre { background: #f5f5f5; padding: 10px; font-size: 9pt; overflow-x: auto; break-inside: avoid; }
    blockquote { border-left: 3px solid #065f46; margin: 12px 0; padding: 8px 14px; background: #f0fdf4; break-inside: avoid; }
    hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="cover">
    <h1>TechHind Solar</h1>
    <p class="tagline">Production / Assembly Module</p>
    <p class="tagline">BOM · Work Orders · Bookings · Dashboard</p>
    <p class="meta">Module Guide · ${generatedDate}</p>
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
