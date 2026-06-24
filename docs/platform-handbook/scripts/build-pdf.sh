#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HANDBOOK_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$HANDBOOK_DIR/output"
OUTPUT_PDF="$OUTPUT_DIR/TechHind-Solar-CRM-Handbook.pdf"
COMBINED_MD="$OUTPUT_DIR/combined-handbook.md"

mkdir -p "$OUTPUT_DIR"

CHAPTERS=(
  "$HANDBOOK_DIR/01-executive-overview.md"
  "$HANDBOOK_DIR/02-platform-capabilities.md"
  "$HANDBOOK_DIR/03-getting-started.md"
  "$HANDBOOK_DIR/modules/04-dashboard.md"
  "$HANDBOOK_DIR/modules/05-marketing-leads-meta.md"
  "$HANDBOOK_DIR/modules/06-inquiry-management.md"
  "$HANDBOOK_DIR/modules/07-quotations.md"
  "$HANDBOOK_DIR/modules/08-order-lifecycle.md"
  "$HANDBOOK_DIR/modules/09-fabrication-installation-delivery.md"
  "$HANDBOOK_DIR/modules/10-payments-outstanding.md"
  "$HANDBOOK_DIR/modules/11-procurement-inventory.md"
  "$HANDBOOK_DIR/modules/12-b2b-trading.md"
  "$HANDBOOK_DIR/modules/13-commission.md"
  "$HANDBOOK_DIR/modules/14-service-warranty.md"
  "$HANDBOOK_DIR/modules/15-reports-audit.md"
  "$HANDBOOK_DIR/modules/16-settings-administration.md"
  "$HANDBOOK_DIR/modules/17-document-outputs.md"
  "$HANDBOOK_DIR/workflows/lead-to-installation.md"
  "$HANDBOOK_DIR/workflows/procurement-to-stock.md"
  "$HANDBOOK_DIR/workflows/b2b-order-to-invoice.md"
)

: > "$COMBINED_MD"
for chapter in "${CHAPTERS[@]}"; do
  if [[ -f "$chapter" ]]; then
    printf '\n\n' >> "$COMBINED_MD"
    sed 's|](../assets/screenshots/|](assets/screenshots/|g; s|](assets/screenshots/|](assets/screenshots/|g' "$chapter" >> "$COMBINED_MD"
  else
    echo "Warning: missing chapter $chapter" >&2
  fi
done

COMBINED_FOR_PDF="$HANDBOOK_DIR/combined-handbook.md"
cp "$COMBINED_MD" "$COMBINED_FOR_PDF"

cd "$HANDBOOK_DIR"

if command -v pandoc >/dev/null 2>&1; then
  pandoc "$COMBINED_FOR_PDF" \
    --from markdown \
    --to pdf \
    --output "$OUTPUT_PDF" \
    --resource-path="$HANDBOOK_DIR" \
    --toc \
    --toc-depth=2 \
    --number-sections \
    -V geometry:margin=1in \
    -V title="TechHind Solar CRM Platform Handbook" \
    -V author="TechHind" \
    -V date="$(date +%B\ %Y)"
  rm -f "$COMBINED_FOR_PDF"
  echo "PDF generated with Pandoc: $OUTPUT_PDF"
elif command -v npx >/dev/null 2>&1; then
  node "$SCRIPT_DIR/build-pdf-playwright.mjs"
  rm -f "$COMBINED_FOR_PDF"
  echo "PDF generated with Playwright: $OUTPUT_PDF"
else
  echo "Install Pandoc or ensure npx is available for md-to-pdf fallback." >&2
  exit 1
fi
