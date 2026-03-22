"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import moment from "moment";
import { Button as MuiButton, Tooltip } from "@mui/material";
import { IconExternalLink, IconSearch, IconX } from "@tabler/icons-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PaginatedTable from "@/components/common/PaginatedTable";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import OrderDetailsDrawer from "@/components/common/OrderDetailsDrawer";
import QuotationDetailsContent from "@/app/quotation/components/QuotationDetailsContent";
import InquiryDetailsContent from "@/components/common/InquiryDetailsContent";
import MarketingLeadDetailsContent from "@/components/common/MarketingLeadDetailsContent";
import { getGlobalSearch } from "@/services/globalSearchService";
import quotationService from "@/services/quotationService";
import inquiryService from "@/services/inquiryService";
import marketingLeadsService from "@/services/marketingLeadsService";
import orderService from "@/services/orderService";
import { toastError } from "@/utils/toast";
import { cn } from "@/lib/utils";

const SOURCE_BADGE = {
  marketing_lead: "bg-sky-100 text-sky-800",
  inquiry: "bg-violet-100 text-violet-800",
  order: "bg-emerald-100 text-emerald-800",
  quotation: "bg-amber-100 text-amber-800",
};

const SIDEBAR_ENTITY_TYPES = new Set(["quotation", "inquiry", "marketing_lead"]);

const GLOBAL_SEARCH_Q_KEY = "techhind_global_search_q";

function sidebarTitleForEntity(entityType) {
  if (entityType === "quotation") return "Quotation Details";
  if (entityType === "inquiry") return "Inquiry Details";
  if (entityType === "marketing_lead") return "Marketing lead";
  return "Details";
}

export default function GlobalSearchPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q");

  const [draft, setDraft] = useState("");
  const [submittedQ, setSubmittedQ] = useState("");

  useEffect(() => {
    const fromUrl = (urlQ ?? "").trim();
    if (fromUrl.length >= 2) {
      setDraft(fromUrl);
      setSubmittedQ(fromUrl);
      try {
        sessionStorage.setItem(GLOBAL_SEARCH_Q_KEY, fromUrl);
      } catch (_) {
        /* ignore */
      }
      return;
    }

    let stored = "";
    try {
      stored = (sessionStorage.getItem(GLOBAL_SEARCH_Q_KEY) ?? "").trim();
    } catch (_) {
      /* ignore */
    }
    if (stored.length >= 2) {
      setDraft(stored);
      setSubmittedQ(stored);
      router.replace(`${pathname}?${new URLSearchParams({ q: stored }).toString()}`);
      return;
    }

    setDraft(fromUrl);
    setSubmittedQ("");
  }, [urlQ, pathname, router]);

  const [selectedRow, setSelectedRow] = useState(null);
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [fullQuotation, setFullQuotation] = useState(null);
  const [fullInquiry, setFullInquiry] = useState(null);
  const [fullLead, setFullLead] = useState(null);

  const filterParams = useMemo(() => ({ submittedQ }), [submittedQ]);

  const closeDetails = useCallback(() => {
    setSelectedRow(null);
    setOrderDrawerOpen(false);
    setSidebarOpen(false);
    setLoadingDetail(false);
    setFullQuotation(null);
    setFullInquiry(null);
    setFullLead(null);
  }, []);

  const openDetails = useCallback(async (row) => {
    if (!row?.id) return;
    const { entityType } = row;
    if (
      entityType !== "order" &&
      entityType !== "quotation" &&
      entityType !== "inquiry" &&
      entityType !== "marketing_lead"
    ) {
      toast.error("This result type cannot be opened from search.");
      return;
    }

    setSelectedRow(row);
    setFullQuotation(null);
    setFullInquiry(null);
    setFullLead(null);

    if (entityType === "order") {
      setOrderDrawerOpen(true);
      setSidebarOpen(false);
      return;
    }

    setOrderDrawerOpen(false);
    setSidebarOpen(true);
    setLoadingDetail(true);

    try {
      if (entityType === "quotation") {
        const response = await quotationService.getQuotationById(row.id);
        const data = response?.result ?? response?.data ?? response;
        setFullQuotation(data ?? null);
      } else if (entityType === "inquiry") {
        const response = await inquiryService.getInquiryById(row.id);
        const result = response?.result || response?.data || response;
        setFullInquiry(Array.isArray(result) ? result[0] : result);
      } else if (entityType === "marketing_lead") {
        const response = await marketingLeadsService.getMarketingLeadById(row.id);
        const data = response?.result ?? response?.data ?? response;
        setFullLead(data ?? null);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to load details";
      toast.error(msg);
      setFullQuotation(null);
      setFullInquiry(null);
      setFullLead(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const handlePrintOrder = useCallback(async (resolvedOrder) => {
    try {
      const file = await orderService.downloadOrderPDF(resolvedOrder?.id);
      const blob = file?.blob || file;
      const filename =
        file?.filename ||
        `order-${resolvedOrder?.order_number || resolvedOrder?.id}.pdf`;
      if (!blob) throw new Error("PDF download failed");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to download order PDF";
      toastError(msg);
    }
  }, []);

  const openFullPage = useCallback(() => {
    const path = selectedRow?.detail_path;
    if (!path) return;
    closeDetails();
    router.push(path);
  }, [selectedRow, closeDetails, router]);

  const fetcher = useCallback(async () => {
    const q = (submittedQ || "").trim();
    if (q.length < 2) {
      return {
        data: [],
        meta: { total: 0, page: 1, pages: 0, limit: 25 },
      };
    }
    const res = await getGlobalSearch({
      q,
      per_module_limit: 25,
      max_total: 100,
    });
    const payload = res?.result ?? res;
    const items = Array.isArray(payload?.items) ? payload.items : [];
    return {
      data: items,
      meta: {
        total: items.length,
        page: 1,
        pages: 1,
        limit: Math.max(items.length, 25),
      },
    };
  }, [submittedQ]);

  const columns = useMemo(
    () => [
      {
        field: "pui",
        label: "PUI",
        sortable: true,
        stickyLeft: 0,
        minWidth: 105,
        maxWidth: 105,
        render: (row) => (
          <button
            type="button"
            className="text-primary w-full truncate hover:underline text-left font-medium"
            onClick={(e) => {
              e.stopPropagation();
              openDetails(row);
            }}
            title={row.pui}
          >
            {row.pui}
          </button>
        ),
      },
      {
        field: "entity_label",
        label: "Source",
        sortable: true,
        stickyLeft: 105,
        minWidth: 115,
        maxWidth: 115,
        stickyShadow: true,
        render: (row) => (
          <Badge
            variant="secondary"
            className={cn(
              "font-normal w-full justify-center",
              SOURCE_BADGE[row.entityType] || "bg-slate-100 text-slate-700"
            )}
          >
            {row.entity_label || row.entityType}
          </Badge>
        ),
      },
      {
        field: "status",
        label: "Status",
        sortable: true,
        render: (row) => row.status || "-",
      },
      {
        field: "customer_name",
        label: "Customer",
        sortable: true,
        render: (row) => row.customer_name || "-",
      },
      {
        field: "mobile_number",
        label: "Mobile",
        sortable: true,
        render: (row) => row.mobile_number || "-",
      },
      {
        field: "address",
        label: "Address",
        sortable: false,
        render: (row) => {
          if (!row.address) return <div className="max-w-[250px]">-</div>;
          return (
            <Tooltip title={row.address} placement="top" arrow>
              <div className="max-w-[250px] truncate cursor-help">
                {row.address}
              </div>
            </Tooltip>
          );
        },
      },
      {
        field: "consumer_no",
        label: "Consumer No.",
        sortable: true,
        render: (row) => row.consumer_no || "-",
      },
      {
        field: "application_no",
        label: "Application No.",
        sortable: true,
        render: (row) => row.application_no || "-",
      },
      {
        field: "guvnl_no",
        label: "GUVNL No.",
        sortable: true,
        render: (row) => row.guvnl_no || "-",
      },
      {
        field: "scheme",
        label: "Scheme",
        sortable: true,
        render: (row) => row.scheme || "-",
      },
      {
        field: "timeline",
        label: "Timeline / Dates",
        sortable: false,
        render: (row) => {
          const dates = [];
          if (row.inquiry_or_lead_date) dates.push({ label: "Inq/Lead", val: row.inquiry_or_lead_date });
          if (row.order_date) dates.push({ label: "Order", val: row.order_date });
          if (row.netmeter_installed_on) dates.push({ label: "Netmeter", val: row.netmeter_installed_on });
          
          if (dates.length === 0) return "-";

          return (
            <div className="flex flex-col gap-1 text-xs whitespace-nowrap min-w-[100px]">
              {dates.map((d, idx) => (
                 <div key={idx} className="flex items-center">
                   <span className="font-medium tracking-tight whitespace-nowrap">{moment(d.val).format("DD-MM-YYYY")}</span>
                 </div>
              ))}
            </div>
          );
        },
      },
    ],
    [openDetails]
  );

  const runSearch = useCallback(() => {
    const q = draft.trim();
    try {
      if (q.length >= 2) {
        sessionStorage.setItem(GLOBAL_SEARCH_Q_KEY, q);
      } else {
        sessionStorage.removeItem(GLOBAL_SEARCH_Q_KEY);
      }
    } catch (_) {
      /* ignore */
    }
    const next = new URLSearchParams(searchParams.toString());
    if (q.length >= 2) {
      next.set("q", q);
    } else {
      next.delete("q");
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [draft, pathname, router, searchParams]);

  const clearSearch = useCallback(() => {
    try {
      sessionStorage.removeItem(GLOBAL_SEARCH_Q_KEY);
    } catch (_) {
      /* ignore */
    }
    setDraft("");
    setSubmittedQ("");
    router.replace(pathname);
  }, [pathname, router]);

  const showSidebar =
    sidebarOpen && selectedRow && SIDEBAR_ENTITY_TYPES.has(selectedRow.entityType);

  const sidebarHeaderActions =
    selectedRow?.detail_path ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={openFullPage}
      >
        <IconExternalLink className="size-3.5 shrink-0" />
        Open full page
      </Button>
    ) : null;

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col p-2">
      {/* Premium Stylish Search Card */}
      <div className="mx-auto w-full max-w-4xl bg-card border border-border shadow-sm rounded-xl p-3 sm:px-4 sm:py-3 mb-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <IconSearch className="h-4 w-4 text-muted-foreground/60" />
            </div>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch();
              }}
              placeholder="Start typing to search globally..."
              className="h-9 sm:h-10 pl-9 pr-4 text-[13px] sm:text-sm bg-background/50 border-input shadow-inner focus-visible:ring-1 focus-visible:ring-primary/40 rounded-lg"
              aria-label="Global search"
            />
            {draft && (
              <button
                type="button"
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                onClick={() => setDraft("")}
                aria-label="Clear Input"
              >
                <IconX className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 sm:shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 sm:h-10 px-3 sm:px-4 flex-1 sm:flex-none gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={clearSearch}
            >
              <IconX className="h-3.5 w-3.5" />
              <span>Reset</span>
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-9 sm:h-10 px-4 sm:px-6 flex-1 sm:flex-none gap-2 shadow-sm font-medium"
              onClick={runSearch}
            >
              <IconSearch className="h-4 w-4" />
              <span>Search</span>
            </Button>
          </div>
        </div>
        <p className="mt-2 text-[10.5px] sm:text-[11px] text-muted-foreground text-center sm:text-left leading-snug">
          <span className="font-semibold text-foreground/70 mr-1">Searchable fields:</span>
          Customer Name, Mobile, Address, Lead / Inquiry / Order / Quotation Number, Consumer No., Application No., GUVNL No.
        </p>
      </div>

      {/* Maximized Table Area */}
      <div className="min-h-0 flex-1 flex flex-col mt-0.5">
        <PaginatedTable
          key={submittedQ || "__empty__"}
          columns={columns}
          fetcher={fetcher}
          filterParams={filterParams}
          showSearch={false}
          showPagination={false}
          initialLimit={100}
          moduleKey="global_search"
          height="calc(100dvh - 160px)"
          getRowKey={(row) => `${row.entityType}-${row.id}`}
          onRowClick={(row) => openDetails(row)}
        />
      </div>

      {orderDrawerOpen && selectedRow?.entityType === "order" ? (
        <OrderDetailsDrawer
          open={orderDrawerOpen}
          onClose={closeDetails}
          order={{ id: selectedRow.id }}
          onPrint={handlePrintOrder}
          showPrint
          extraActions={
            selectedRow?.detail_path ? (
              <MuiButton
                size="small"
                variant="outlined"
                onClick={openFullPage}
                startIcon={<IconExternalLink className="size-4" />}
              >
                Open full page
              </MuiButton>
            ) : null
          }
        />
      ) : null}

      {showSidebar ? (
        <DetailsSidebar
          open={sidebarOpen}
          onClose={closeDetails}
          title={sidebarTitleForEntity(selectedRow.entityType)}
          headerActions={sidebarHeaderActions}
        >
          {selectedRow.entityType === "quotation" ? (
            <QuotationDetailsContent
              quotation={fullQuotation}
              loading={loadingDetail}
            />
          ) : null}
          {selectedRow.entityType === "inquiry" ? (
            <InquiryDetailsContent inquiry={fullInquiry} loading={loadingDetail} />
          ) : null}
          {selectedRow.entityType === "marketing_lead" ? (
            <MarketingLeadDetailsContent lead={fullLead} loading={loadingDetail} />
          ) : null}
        </DetailsSidebar>
      ) : null}
    </div>
  );
}
