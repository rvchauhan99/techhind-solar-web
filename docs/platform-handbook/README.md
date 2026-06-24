# TechHind Solar CRM — Platform Handbook

Customer-facing platform documentation for the TechHind Solar Management System. Source Markdown chapters compile into a presentation-ready PDF.

## Structure

| Path | Purpose |
|------|---------|
| `00-cover-and-toc.md` | Cover page metadata and table of contents |
| `01-executive-overview.md` | Platform value proposition |
| `02-platform-architecture.md` | High-level architecture for stakeholders |
| `03-getting-started.md` | Login, navigation, search |
| `modules/` | 13 module chapters (04–16) |
| `workflows/` | End-to-end business workflows |
| `assets/screenshots/` | Demo screenshots from `demo.techhind.in` |
| `scripts/` | Screenshot capture and PDF build |
| `output/` | Generated PDF (gitignored) |

## Prerequisites

- Node.js 20+
- Playwright browsers: `npx playwright install chromium`
- PDF build (preferred): [Pandoc](https://pandoc.org/) + LaTeX (MacTeX / TeX Live)
- PDF build (fallback): `md-to-pdf` via npm script

## Capture Screenshots

Export a logged-in session **or** provide demo credentials:

```bash
# Option A: credentials (recommended for CI)
export DEMO_BASE_URL=https://demo.techhind.in
export DEMO_EMAIL=your@email.com
export DEMO_PASSWORD=yourpassword
export DEMO_TENANT_KEY=your-tenant-key   # if required

# Option B: reuse browser session
# Save storageState.json in scripts/ (see Playwright docs)

npm run docs:screenshots
```

Output: `assets/screenshots/*.png` and `scripts/coverage-report.json`.

## Build PDF

```bash
npm run docs:pdf
```

Output:
- `output/TechHind-Solar-CRM-Handbook.pdf` — final customer presentation PDF
- `output/handbook-preview.html` — HTML preview (optional)

Uses **Pandoc** when installed; otherwise **Playwright** renders PDF from combined Markdown.

## Screenshot Coverage

After capture, review `scripts/coverage-report.json`. Latest demo run: **64/65** screens captured from [demo.techhind.in](https://demo.techhind.in). `/reports/deliveries` returned access-denied for the demo superadmin role; the handbook uses the delivery execution screen for related logistics documentation.

## Refresh When Platform Changes

1. Update `scripts/screenshot-manifest.json` for new routes.
2. Re-run `npm run docs:screenshots`.
3. Update affected module chapters in `modules/`.
4. Re-run `npm run docs:pdf`.
