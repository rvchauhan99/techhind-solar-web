"use client";

import Container from "@/components/container";
import { Button } from "@/components/ui/button";
import { IconPlus, IconDownload } from "@tabler/icons-react";
import FilterBar from "@/components/common/FilterBar";

/**
 * Common shell for listing pages: header (title + Add), optional FilterBar, main content slot.
 * Page owns sidebar state and content; render DetailsSidebar in the page when using view-on-click.
 *
 * @param {string} title - Page title
 * @param {string} [addButtonLabel] - Label for primary Add button
 * @param {function(): void} [onAddClick] - Called when Add is clicked
 * @param {string} [exportButtonLabel] - Label for Export button
 * @param {function(): void} [onExportClick] - Called when Export is clicked
 * @param {boolean} [exportDisabled] - Disable Export button (e.g. during export)
 * @param {string} [sampleCsvButtonLabel] - Label for Sample CSV button
 * @param {function(): void} [onSampleCsvClick] - Called when Sample CSV is clicked
 * @param {string} [importButtonLabel] - Label for Import button
 * @param {function(): void} [onImportClick] - Called when Import is clicked
 * @param {string} [secondaryButtonLabel] - Label for secondary action button (e.g. "PDF Templates")
 * @param {function(): void} [onSecondaryClick] - Called when secondary button is clicked
 * @param {Array} [filterConfig] - When provided, FilterBar is rendered; array of { key, label, type, options? }
 * @param {Object} [filterValues] - Values for FilterBar (keyed by filter key)
 * @param {function(string, string): void} [onFilterChange] - (key, value) for FilterBar
 * @param {function(): void} [onClearFilters] - Optional clear filters callback
 * @param {React.ReactNode} children - Main content (e.g. PaginatedTable or table + pagination)
 */
export default function ListingPageContainer({
  title,
  addButtonLabel,
  onAddClick,
  exportButtonLabel,
  onExportClick,
  exportDisabled = false,
  exportLoading = false,
  sampleCsvButtonLabel,
  onSampleCsvClick,
  importButtonLabel,
  onImportClick,
  secondaryButtonLabel,
  onSecondaryClick,
  filterConfig,
  filterValues = {},
  onFilterChange,
  onClearFilters,
  children,
}) {
  return (
    <Container className="flex flex-col gap-1 py-1 h-full min-h-0 max-w-[1536px] mx-auto">
      <div className="flex flex-shrink-0 justify-between items-center gap-2 border-b border-border pb-1.5">
        <h1 className="text-lg font-semibold text-[#1b365d] tracking-tight">{title}</h1>
        <div className="flex items-center gap-1.5">
          {onSecondaryClick && secondaryButtonLabel && (
            <Button onClick={onSecondaryClick} size="sm" variant="outline" className="gap-1">
              {secondaryButtonLabel}
            </Button>
          )}
          {onExportClick && exportButtonLabel && (
            <Button
              onClick={onExportClick}
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={exportDisabled}
              loading={exportLoading}
            >
              <IconDownload className="size-4" />
              {exportButtonLabel}
            </Button>
          )}
          {onSampleCsvClick && sampleCsvButtonLabel && (
            <Button onClick={onSampleCsvClick} size="sm" variant="outline" className="gap-1">
              {sampleCsvButtonLabel}
            </Button>
          )}
          {onImportClick && importButtonLabel && (
            <Button onClick={onImportClick} size="sm" variant="outline" className="gap-1">
              {importButtonLabel}
            </Button>
          )}
          {onAddClick && addButtonLabel && (
            <Button onClick={onAddClick} size="sm" className="gap-1">
              <IconPlus className="size-4" />
              {addButtonLabel}
            </Button>
          )}
        </div>
      </div>

      {filterConfig && filterConfig.length > 0 && onFilterChange && (
        <FilterBar
          filterConfig={filterConfig}
          values={filterValues}
          onChange={onFilterChange}
          onClear={onClearFilters}
        />
      )}

      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
    </Container>
  );
}
