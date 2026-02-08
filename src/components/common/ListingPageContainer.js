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
  filterConfig,
  filterValues = {},
  onFilterChange,
  onClearFilters,
  children,
}) {
  return (
    <Container className="flex flex-col gap-2 py-2 h-full min-h-0 max-w-[1536px] mx-auto">
      <div className="flex flex-shrink-0 justify-between items-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex items-center gap-2">
          {onExportClick && exportButtonLabel && (
            <Button onClick={onExportClick} size="sm" variant="outline" className="gap-1.5" disabled={exportDisabled} loading={exportLoading}>
              <IconDownload className="size-4" />
              {exportButtonLabel}
            </Button>
          )}
          {onAddClick && addButtonLabel && (
            <Button onClick={onAddClick} size="sm" className="gap-1.5">
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
