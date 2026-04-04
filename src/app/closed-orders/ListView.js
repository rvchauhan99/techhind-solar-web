"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Paper,
  Typography,
  Box,
  Grid,
  Chip,
  Tooltip,
} from "@mui/material";
import IconButton from "@mui/material/IconButton";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import EventIcon from "@mui/icons-material/Event";
import HelpIcon from "@mui/icons-material/Help";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import PaymentIcon from "@mui/icons-material/Payment";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CommentIcon from "@mui/icons-material/Comment";
import DescriptionIcon from "@mui/icons-material/Description";
import { useRouter } from "next/navigation";
import moment from "moment";
import PaginatedList from "@/components/common/PaginatedList";
import { OrderListFilterPanel, ORDER_LIST_FILTER_KEYS } from "@/components/common";
import { EMPTY_VALUES as ORDER_FILTER_EMPTY } from "@/components/common/OrderListFilterPanel";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import closedOrdersService from "@/services/closedOrdersService";
import orderService from "@/services/orderService";
import OrderDetailsDrawer from "@/components/common/OrderDetailsDrawer";
import OrderNumberLink from "@/components/common/OrderNumberLink";
import OrderIssuedSerialsDialog from "@/components/common/OrderIssuedSerialsDialog";
import { toastError } from "@/utils/toast";
import QuotationDetailsDrawer from "@/components/common/QuotationDetailsDrawer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IconBolt,
  IconCircleCheck,
  IconCurrencyRupee,
  IconTopologyRing3,
} from "@tabler/icons-react";

const DEFAULT_CLOSED_FILTERS = { ...ORDER_FILTER_EMPTY, current_stage_key: "order_completed" };

const STAGES = [
  { key: "estimate_generated", label: "Estimate Generated" },
  { key: "estimate_paid", label: "Estimate Paid" },
  { key: "planner", label: "Planner" },
  { key: "delivery", label: "Delivery" },
  { key: "assign_fabricator_and_installer", label: "Assign Fabricator & Installer" },
  { key: "fabrication", label: "Fabrication" },
  { key: "installation", label: "Installation" },
  { key: "netmeter_apply", label: "Netmeter Apply" },
  { key: "netmeter_installed", label: "Netmeter Installed" },
  { key: "subsidy_claim", label: "Subsidy Claim" },
  { key: "subsidy_disbursed", label: "Subsidy Disbursed" },
];

const isOrderFullyCompleted = (row) => {
  if (row.current_stage_key === "order_completed") return true;
  const stages = row.stages || {};
  return STAGES.every((s) => stages[s.key] === "completed");
};

export default function ListView() {
  const router = useRouter();
  const listingState = useListingQueryState({
    defaultLimit: 25,
    filterKeys: ORDER_LIST_FILTER_KEYS,
  });
  const { page, limit, q, filters, setPage, setLimit, setQ, setFilters, clearFilters } = listingState;
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [serialsDialogOpen, setSerialsDialogOpen] = useState(false);
  const [serialsDialogOrder, setSerialsDialogOrder] = useState(null);
  const [quotationDrawerOpen, setQuotationDrawerOpen] = useState(false);
  const [selectedQuotationOrder, setSelectedQuotationOrder] = useState(null);
  const [listMeta, setListMeta] = useState({ total: 0, summary: null, received: false });

  const handleListingMetaChange = useCallback((meta) => {
    const total = meta?.total ?? 0;
    const summary =
      meta?.summary ??
      (typeof meta?.total === "number"
        ? { total_orders: meta.total, by_stage: [] }
        : null);
    setListMeta({ total, summary, received: true });
  }, []);

  const fetchData = useCallback(async (params) => {
    const next = {
      ...params,
      current_stage_key: params.current_stage_key || "order_completed",
      includeSummary: "true",
    };
    const fromRaw = next.capacity_kw_from;
    const toRaw = next.capacity_kw_to;
    delete next.capacity_kw_from;
    delete next.capacity_kw_to;
    const fromStr = fromRaw != null ? String(fromRaw).trim() : "";
    if (fromStr !== "") {
      next.capacity_from = fromStr;
      next.capacity_to =
        toRaw != null && String(toRaw).trim() !== ""
          ? String(toRaw).trim()
          : fromStr;
    }
    return await closedOrdersService.getClosedOrders(next);
  }, []);

  const handleOpenDetails = useCallback((row) => {
    setSelectedOrder(row);
    setDetailsOpen(true);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setDetailsOpen(false);
    setSelectedOrder(null);
  }, []);

  const handlePrintOrder = useCallback(async (resolvedOrder) => {
    try {
      const file = await orderService.downloadOrderPDF(resolvedOrder?.id);
      const blob = file?.blob || file;
      const filename = file?.filename || `order-${resolvedOrder?.order_number || resolvedOrder?.id}.pdf`;
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
      const msg = err?.response?.data?.message || err?.message || "Failed to download order PDF";
      toastError(msg);
    }
  }, []);

  const handleOpenQuotationDrawer = useCallback((row) => {
    if (!row?.id) return;
    setSelectedQuotationOrder(row);
    setQuotationDrawerOpen(true);
  }, []);

  const getStageIcon = (status) => {
    if (status === "completed")
      return <CheckCircleIcon color="success" sx={{ fontSize: 18 }} />;
    if (status === "pending")
      return <EventIcon color="error" sx={{ fontSize: 18 }} />;
    if (status === "locked")
      return <CancelIcon color="error" sx={{ fontSize: 18 }} />;
    return <HelpIcon color="disabled" sx={{ fontSize: 18 }} />;
  };

  const renderOrderDetail = (label, value, isBold = true, color = "text.primary") => (
    <Box mb={0.4}>
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        sx={{ fontSize: "0.68rem", lineHeight: 1.1 }}
      >
        {label}:
      </Typography>
      <Typography
        variant="body2"
        color={color}
        fontWeight={isBold ? "bold" : "normal"}
        sx={{ fontSize: "0.78rem", lineHeight: 1.2, wordBreak: "break-word" }}
      >
        {value || "-"}
      </Typography>
    </Box>
  );

  const renderOrderItem = (row) => {
    const stages = row.stages || {};
    const fullyCompleted = isOrderFullyCompleted(row);
    const outstanding =
      Number(row.project_cost || 0) - Number(row.total_paid || 0);

    return (
      <Paper
        elevation={0}
        sx={{
          position: "relative",
          border: "1px solid #e0e0e0",
          borderTop: "3px solid #16a34a", // green bar for closed/completed
          borderRadius: "4px 4px 1px 1px",
          overflow: "hidden",
          transition: "0.2s",
          "&:hover": {
            borderColor: "#1976d2",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          },
        }}
      >
        {/* Header Row */}
        <Box
          sx={{
            bgcolor: "#fff",
            p: 0.6,
            px: 2,
            display: "flex",
            alignItems: "center",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <OrderNumberLink
            value={row.order_number || "-"}
            suffix={` : ${row.customer_name?.toUpperCase() || "-"}`}
            variant="subtitle2"
            sx={{ mr: 2, fontSize: "0.88rem" }}
            onClick={() => router.push(`/closed-orders/view?id=${row.id}`)}
          />
          <Chip
            label="Closed"
            size="small"
            sx={{
              bgcolor: "#16a34a",
              color: "#fff",
              height: 18,
              fontSize: "0.58rem",
              mr: 1,
              borderRadius: "3px",
            }}
          />
          <Chip
            label={row.solar_panel_name || "PANEL N/A"}
            size="small"
            sx={{
              bgcolor: "#1976d2",
              color: "#fff",
              height: 18,
              fontSize: "0.58rem",
              mr: 1,
              borderRadius: "3px",
            }}
          />
          <Chip
            label={row.inverter_name || "INVERTER N/A"}
            size="small"
            sx={{
              bgcolor: "#9c27b0",
              color: "#fff",
              height: 18,
              fontSize: "0.58rem",
              mr: 1,
              borderRadius: "3px",
            }}
          />
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", fontWeight: "bold", ml: 1, fontSize: "0.7rem" }}
          >
            {row.project_scheme_name}
          </Typography>
          <Box
            sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Tooltip title="Serialized inventory issued to this order">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation?.();
                  setSerialsDialogOrder({ order_number: row.order_number, customer_name: row.customer_name });
                  setSerialsDialogOpen(true);
                }}
              >
                <Inventory2Icon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <IconButton size="small" title="Add Payment" onClick={() => router.push(`/order/view?id=${row.id}&tab=2`)}>
              <PaymentIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton size="small" title="Upload" onClick={() => router.push(`/order/view?id=${row.id}&tab=5`)}>
              <UploadFileIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton size="small" title="Details" onClick={() => handleOpenDetails(row)}>
              <VisibilityIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton size="small" title="Remarks" onClick={() => router.push(`/order/view?id=${row.id}&tab=4`)}>
              <CommentIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton size="small" title="Quotation Details" onClick={() => handleOpenQuotationDrawer(row)}>
              <DescriptionIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Details Grid */}
        <Box sx={{ p: 2 }}>
          <Grid container spacing={1}>
            <Grid item size={3}>
              {renderOrderDetail(
                "Order Date",
                row.order_date ? moment(row.order_date).format("DD-MM-YYYY") : "-"
              )}
              {renderOrderDetail("Consumer No", row.consumer_no)}
              {renderOrderDetail("Capacity", row.capacity ? `${row.capacity} kW` : "-")}
              {renderOrderDetail("Application", row.application_no)}
              {renderOrderDetail(
                "Registration Date",
                row.date_of_registration_gov
                  ? moment(row.date_of_registration_gov).format("DD-MM-YYYY")
                  : "-"
              )}
              {renderOrderDetail("Tags", row.tags)}
            </Grid>
            <Grid item size={3}>
              {renderOrderDetail("Scheme", row.project_scheme_name)}
              {renderOrderDetail("Discom", row.discom_name)}
              {renderOrderDetail("Channel Partner", row.channel_partner_name)}
              {renderOrderDetail(
                "Handled By / Inquiry By",
                `${row.handled_by_name || "-"} / ${row.inquiry_by_name || "-"}`
              )}
              {renderOrderDetail(
                "Last Action",
                row.updated_at ? `${moment(row.updated_at).format("DD-MM-YYYY HH:mm:ss")} | Closed` : "-"
              )}
            </Grid>
            <Grid item size={3}>
              {renderOrderDetail("Mobile No", row.mobile_number)}
              {renderOrderDetail("Address", row.address)}
              {renderOrderDetail("Reference", row.reference_from)}
              {renderOrderDetail("Branch", row.branch_name)}
              {renderOrderDetail("Source", row.inquiry_source_name || "Individual")}
            </Grid>
            <Grid item size={3}>
              {renderOrderDetail("Payment Type", row.payment_type || "PDC Payment")}
              {renderOrderDetail(
                "Total Payable",
                `Rs. ${Number(row.project_cost || 0).toLocaleString()}`
              )}
              {renderOrderDetail(
                "Payment Received",
                `Rs. ${Number(row.total_paid || 0).toLocaleString()}`
              )}
              {renderOrderDetail(
                "Outstanding",
                `Rs. ${Number(outstanding || 0).toLocaleString()}`,
                true,
                outstanding > 0 ? "error.main" : "success.main"
              )}
            </Grid>
          </Grid>
        </Box>

        {/* Pipeline Footer */}
        <Box sx={{ bgcolor: "#f9f9f9", borderTop: "1px solid #f0f0f0", py: 0.6 }}>
          <Grid container sx={{ textAlign: "center" }}>
            {STAGES.map((stage, idx) => {
              const status = stages[stage.key] || (idx === 0 ? "pending" : "locked");
              const isActive = !fullyCompleted && row.current_stage_key === stage.key;
              const isLastStage = idx === STAGES.length - 1;
              return (
                <Grid item key={stage.key} sx={{ flex: 1, px: 0.1 }}>
                  <Tooltip title={stage.label}>
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        fontSize: "0.58rem",
                        color: "text.secondary",
                        mb: 0.1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {stage.label}
                    </Typography>
                  </Tooltip>
                  <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: 18 }}>
                    {fullyCompleted ? (
                      isLastStage ? (
                        <Chip
                          label="Completed"
                          size="small"
                          color="success"
                          sx={{ height: 14, fontSize: "0.5rem", px: 0, borderRadius: "2px" }}
                        />
                      ) : (
                        getStageIcon("completed")
                      )
                    ) : isActive ? (
                      <Chip
                        label="Current"
                        size="small"
                        color="warning"
                        sx={{ height: 14, fontSize: "0.5rem", px: 0, borderRadius: "2px" }}
                      />
                    ) : (
                      getStageIcon(status)
                    )}
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </Paper>
    );
  };

  const effectiveFilters = useMemo(
    () => ({ ...DEFAULT_CLOSED_FILTERS, ...filters }),
    [filters]
  );

  const stageOrderMap = useMemo(() => new Map(STAGES.map((s, i) => [s.key, i])), []);
  const sortedSummaryStages = useMemo(() => {
    const rows = listMeta.summary?.by_stage;
    if (!Array.isArray(rows)) return [];
    return [...rows].sort((a, b) => {
      const ia = stageOrderMap.has(a.current_stage_key)
        ? stageOrderMap.get(a.current_stage_key)
        : 999;
      const ib = stageOrderMap.has(b.current_stage_key)
        ? stageOrderMap.get(b.current_stage_key)
        : 999;
      return ia - ib;
    });
  }, [listMeta.summary, stageOrderMap]);

  const calculateHeight = () => `calc(100vh - 125px)`;

  return (
    <Box sx={{ width: "100%" }}>
      <div className="mb-2">
        <OrderListFilterPanel
          open={filterPanelOpen}
          onToggle={setFilterPanelOpen}
          values={effectiveFilters}
          onApply={(v) => {
            setFilters(v);
            setFilterPanelOpen(false);
          }}
          onClear={() => {
            setFilters({ ...DEFAULT_CLOSED_FILTERS, q: "" }, true, true);
            setFilterPanelOpen(false);
          }}
          defaultOpen={false}
          variant="closed"
        />
      </div>
      {listMeta.received && listMeta.summary && (
        <Card className="mb-2 overflow-hidden rounded-xl border border-slate-200 border-l-[3px] border-l-green-600 bg-white shadow-sm">
          <div className="flex flex-col gap-1.5 px-2.5 py-1.5 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border border-green-200/80 bg-gradient-to-r from-green-50/90 to-white px-2 py-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <IconCircleCheck size={14} className="shrink-0 text-green-600" aria-hidden />
                <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                  Filtered
                </span>
                <Badge className="h-5 min-h-5 border-0 bg-green-600 px-1.5 text-[10px] font-bold text-white hover:bg-green-600">
                  {listMeta.summary.total_orders}
                </Badge>
                <span className="text-[10px] font-semibold text-slate-600">closed</span>
              </div>
              {typeof listMeta.summary.total_capacity_kw === "number" && (
                <div className="flex items-center gap-1 rounded-lg border border-amber-200/70 bg-amber-50/50 px-2 py-0.5">
                  <IconBolt size={14} className="shrink-0 text-amber-600" aria-hidden />
                  <span className="text-[11px] font-bold tabular-nums text-slate-800">
                    {Number(listMeta.summary.total_capacity_kw || 0).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-tight text-slate-500">
                    kW
                  </span>
                </div>
              )}
              {typeof listMeta.summary.total_project_cost === "number" && (
                <div className="flex items-center gap-1 rounded-lg border border-emerald-200/80 bg-emerald-50/50 px-2 py-0.5">
                  <IconCurrencyRupee size={14} className="shrink-0 text-emerald-700" aria-hidden />
                  <span className="text-[11px] font-bold tabular-nums text-slate-800">
                    {Number(listMeta.summary.total_project_cost || 0).toLocaleString()}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-tight text-slate-500">
                    payable
                  </span>
                </div>
              )}
            </div>

            {sortedSummaryStages.length > 0 && (
              <>
                <div
                  className="hidden h-5 w-px shrink-0 bg-slate-200 sm:block"
                  aria-hidden
                />
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                  <div className="mr-0.5 hidden shrink-0 items-center gap-0.5 text-slate-400 sm:flex">
                    <IconTopologyRing3 size={12} aria-hidden />
                    <span className="text-[9px] font-bold uppercase tracking-tighter">
                      By stage
                    </span>
                  </div>
                  {sortedSummaryStages.map((row) => {
                    const label =
                      STAGES.find((s) => s.key === row.current_stage_key)?.label ||
                      row.current_stage_key ||
                      "-";
                    const shortLabel = `${label}: ${row.count} · ${Number(
                      row.total_capacity_kw || 0
                    ).toLocaleString(undefined, { maximumFractionDigits: 2 })} kW`;
                    return (
                      <span
                        key={row.current_stage_key || "unknown"}
                        className="inline-flex max-w-[min(100%,240px)] items-center truncate rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-tighter text-green-800"
                        title={shortLabel}
                      >
                        {shortLabel}
                      </span>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </Card>
      )}
      <PaginatedList
        fetcher={fetchData}
        renderItem={renderOrderItem}
        showSearch={false}
        defaultSortBy="order_date"
        defaultSortOrder="DESC"
        height={calculateHeight()}
        q={q}
        onQChange={setQ}
        filters={effectiveFilters}
        page={page}
        setPage={setPage}
        limit={limit}
        setLimit={setLimit}
        onMetaChange={handleListingMetaChange}
      />
      <OrderDetailsDrawer
        open={detailsOpen}
        onClose={handleCloseDetails}
        order={selectedOrder}
        onPrint={handlePrintOrder}
        showPrint
        showDeliverySnapshot
      />
      <OrderIssuedSerialsDialog
        open={serialsDialogOpen}
        onClose={() => {
          setSerialsDialogOpen(false);
          setSerialsDialogOrder(null);
        }}
        orderNumber={serialsDialogOrder?.order_number}
        customerName={serialsDialogOrder?.customer_name}
      />
      <QuotationDetailsDrawer
        open={quotationDrawerOpen}
        onClose={() => {
          setQuotationDrawerOpen(false);
          setSelectedQuotationOrder(null);
        }}
        orderId={selectedQuotationOrder?.id}
        quotationId={selectedQuotationOrder?.quotation_id}
      />
    </Box>
  );
}

