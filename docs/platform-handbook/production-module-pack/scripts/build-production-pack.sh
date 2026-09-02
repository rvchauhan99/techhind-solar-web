#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACK_DIR="$(dirname "$SCRIPT_DIR")"
HANDBOOK_DIR="$(dirname "$PACK_DIR")"
MARKDOWN_DIR="$PACK_DIR/markdown"
OUTPUT_DIR="$PACK_DIR/output"
STAGING_MD="$MARKDOWN_DIR/staging"
COMBINED_MD="$OUTPUT_DIR/combined-production-module.md"
OUTPUT_PDF="$OUTPUT_DIR/Production-Assembly-Guide.pdf"
OUTPUT_ZIP="$OUTPUT_DIR/TechHind-Production-Assembly-Module-Pack.zip"

mkdir -p "$OUTPUT_DIR" "$STAGING_MD"

# Stage canonical sources into pack markdown folder for ZIP (fresh copy each build)
cp "$MARKDOWN_DIR/00-module-introduction.md" "$STAGING_MD/"
cp "$HANDBOOK_DIR/modules/18-production-assembly.md" "$STAGING_MD/"
cp "$HANDBOOK_DIR/workflows/bom-to-finished-good.md" "$STAGING_MD/"
cp "$MARKDOWN_DIR/document-outputs-production.md" "$STAGING_MD/"

# Combine for PDF (fix relative links for standalone reading)
: > "$COMBINED_MD"
for chapter in \
  "$STAGING_MD/00-module-introduction.md" \
  "$STAGING_MD/18-production-assembly.md" \
  "$STAGING_MD/bom-to-finished-good.md" \
  "$STAGING_MD/document-outputs-production.md"
do
  if [[ -f "$chapter" ]]; then
    printf '\n\n' >> "$COMBINED_MD"
    sed \
      -e 's|](../modules/|](|g' \
      -e 's|](../workflows/|](|g' \
      -e 's|](11-procurement-inventory.md)|](18-production-assembly.md)|g' \
      -e 's|](17-document-outputs.md)|](document-outputs-production.md)|g' \
      -e 's|](18-production-assembly.md)|](18-production-assembly.md)|g' \
      -e 's|](bom-to-finished-good.md)|](bom-to-finished-good.md)|g' \
      "$chapter" >> "$COMBINED_MD"
  else
    echo "Warning: missing chapter $chapter" >&2
    exit 1
  fi
done

# Generate PDF via Playwright
node "$SCRIPT_DIR/build-production-pdf.mjs"

# Build customer ZIP: PDF at root + markdown/ folder with all sources
ZIP_STAGING="$OUTPUT_DIR/zip-staging"
rm -rf "$ZIP_STAGING"
mkdir -p "$ZIP_STAGING/markdown"
cp "$OUTPUT_PDF" "$ZIP_STAGING/Production-Assembly-Guide.pdf"
cp "$STAGING_MD/"*.md "$ZIP_STAGING/markdown/"

rm -f "$OUTPUT_ZIP"
(cd "$ZIP_STAGING" && zip -r "$OUTPUT_ZIP" .)
rm -rf "$ZIP_STAGING"

echo "ZIP created: $OUTPUT_ZIP"
echo "Contents:"
unzip -l "$OUTPUT_ZIP"
