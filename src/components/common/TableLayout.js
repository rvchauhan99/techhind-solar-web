"use client";

import { useState } from "react";
import Container from "@/components/container";
import { Button } from "@/components/ui/button";
import { IconPlus, IconDownload } from "@tabler/icons-react";
import PaginatedTable from "./PaginatedTable";
import PaginationControls from "./PaginationControls";

const DEFAULT_PAGE_OPTIONS = [20, 50, 100, 200];

/**
 * TableLayout - Standardized wrapper for table pages.
 * Provides page header (title + Add button + optional Export), PaginatedTable with external PaginationControls.
 */
export default function TableLayout({
  title,
  addButtonLabel,
  onAddClick,
  exportButtonLabel,
  onExportClick,
  exportDisabled = false,
  exportLoading = false,
  columns,
  fetcher,
  showSearch = true,
  moduleKey = null,
  height = null,
  initialLimit = 20,
  rowsPerPageOptions = DEFAULT_PAGE_OPTIONS,
  ...otherPaginatedTableProps
}) {
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(initialLimit);
  const [totalCount, setTotalCount] = useState(0);

  const calculatedHeight = height || "calc(100vh - 200px)";

  return (
    <Container className="flex flex-col py-2 h-full min-h-0 max-w-[1536px] mx-auto gap-2">
      <div className="flex justify-between items-center flex-shrink-0">
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

      <div className="flex-1 min-h-0 flex flex-col">
        <PaginatedTable
          columns={columns}
          fetcher={fetcher}
          showSearch={showSearch}
          moduleKey={moduleKey}
          height={calculatedHeight}
          initialLimit={initialLimit}
          showPagination={false}
          onTotalChange={setTotalCount}
          page={page + 1}
          limit={limit}
          onPageChange={(zeroBased) => setPage(zeroBased)}
          onRowsPerPageChange={(newLimit) => {
            setLimit(newLimit);
            setPage(0);
          }}
          {...otherPaginatedTableProps}
        />
        <PaginationControls
          page={page}
          rowsPerPage={limit}
          totalCount={totalCount}
          onPageChange={setPage}
          onRowsPerPageChange={(newLimit) => {
            setLimit(newLimit);
            setPage(0);
          }}
          rowsPerPageOptions={rowsPerPageOptions}
        />
      </div>
    </Container>
  );
}
