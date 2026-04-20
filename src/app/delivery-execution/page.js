"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Typography,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DescriptionIcon from "@mui/icons-material/Description";
import GroupIcon from "@mui/icons-material/Group";
import AddIcon from "@mui/icons-material/Add";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button as UIButton } from "@/components/ui/button";
import { IconFilter } from "@tabler/icons-react";
import OrderListQuickSearch from "@/components/common/OrderListQuickSearch";
import OrderNumberLink from "@/components/common/OrderNumberLink";
import orderService from "@/services/orderService";
import { toastError, toastSuccess } from "@/utils/toast";
import OrderDetailsDrawer from "@/components/common/OrderDetailsDrawer";
import AssignFabricatorAndInstaller from "@/app/confirm-orders/components/AssignFabricatorAndInstaller";
import {
  compactAddress,
  formatCurrency,
  formatDate,
  formatKw,
  getPrimaryPhone,
} from "@/utils/orderFormatters";

const COLUMNS = [
  { key: "pending", title: "Pending", headerBg: "#dc2626", chipBg: "#b91c1c" },
  { key: "partial", title: "Partial Delivered", headerBg: "#eab308", chipBg: "#ca8a04" },
  {
    key: "team_assignment_pending",
    title: "Team Assignment Pending",
    headerBg: "#7c3aed",
    chipBg: "#6d28d9",
  },
];

const deliveryStatusColor = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "complete") return "success";
  if (s === "partial") return "warning";
  return "default";
};

const priorityColor = (priority) => {
  const p = String(priority || "").toLowerCase();
  if (p.includes("high")) return "error";
  if (p.includes("medium")) return "warning";
  if (p.includes("low")) return "success";
  return "default";
};

const toDateTime = (value, fallback) => {
  const ts = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(ts) ? ts : fallback;
};

const sortOrdersForColumn = (list, key) => {
  const rows = [...(list || [])];
  if (key === "team_assignment_pending") {
    return rows.sort(
      (a, b) =>
        toDateTime(b.last_challan_date, toDateTime(b.planned_delivery_date, 0)) -
        toDateTime(a.last_challan_date, toDateTime(a.planned_delivery_date, 0))
    );
  }
  return rows.sort(
    (a, b) =>
      toDateTime(a.planned_delivery_date, Number.MAX_SAFE_INTEGER) -
      toDateTime(b.planned_delivery_date, Number.MAX_SAFE_INTEGER)
  );
};

const initialFilters = {
  order_number: "",
  customer_name: "",
  contact_number: "",
  address: "",
  consumer_no: "",
  reference_from: "",
  payment_type: "",
  planned_priority: "",
  delivery_status: "all",
  planned_delivery_date_from: "",
  planned_delivery_date_to: "",
};

const buildFilterParams = (filters) =>
  Object.fromEntries(
    Object.entries(filters || {}).filter(([, value]) => {
      if (value == null) return false;
      const str = String(value).trim();
      return str !== "" && str.toLowerCase() !== "all";
    })
  );

const isTeamAssignmentPending = (order) => {
  const stageKey = String(order?.current_stage_key || "").toLowerCase();
  const deliveryStatus = String(order?.delivery_status || "").toLowerCase();
  return stageKey === "assign_fabricator_and_installer" && deliveryStatus === "complete";
};

export default function DeliveryExecutionPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [appliedDrawerFilters, setAppliedDrawerFilters] = useState(initialFilters);
  const [quickSearch, setQuickSearch] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef(null);
  const searchFeedbackRef = useRef(null);
  const [assignTeamDrawerOpen, setAssignTeamDrawerOpen] = useState(false);
  const [assignTeamOrderId, setAssignTeamOrderId] = useState(null);
  const [assignTeamOrderData, setAssignTeamOrderData] = useState(null);
  const [assignTeamLoading, setAssignTeamLoading] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuOrder, setMenuOrder] = useState(null);
  const [forceCompleteDialogOpen, setForceCompleteDialogOpen] = useState(false);
  const [forceCompleteOrder, setForceCompleteOrder] = useState(null);
  const [forceCompleteLoading, setForceCompleteLoading] = useState(false);
  const router = useRouter();

  const handleQuickSearchChange = useCallback((val) => {
    setQuickSearch(val);
    setIsSearching(true);
    if (searchFeedbackRef.current) clearTimeout(searchFeedbackRef.current);
    searchFeedbackRef.current = setTimeout(() => setIsSearching(false), 500);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setAppliedQ(val.trim()), 350);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const sharedParams = appliedQ
        ? { q: appliedQ }
        : buildFilterParams(appliedDrawerFilters);
      const res = await orderService.getDeliveryExecutionOrders(sharedParams);
      const data = res?.result || res || [];
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load delivery execution orders:", err);
      const msg =
        err?.response?.data?.message || err?.message || "Failed to load delivery execution orders";
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  }, [appliedDrawerFilters, appliedQ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!assignTeamDrawerOpen || !assignTeamOrderId) {
      setAssignTeamOrderData(null);
      return;
    }
    const loadOrder = async () => {
      try {
        setAssignTeamLoading(true);
        const data = await orderService.getOrderById(assignTeamOrderId);
        const item = data?.result ?? data;
        setAssignTeamOrderData(item || null);
      } catch (err) {
        console.error("Failed to load order for assign team:", err);
        toastError(err?.response?.data?.message || err?.message || "Failed to load order");
      } finally {
        setAssignTeamLoading(false);
      }
    };
    loadOrder();
  }, [assignTeamDrawerOpen, assignTeamOrderId]);

  const handleOpenAssignTeam = (order) => {
    setAssignTeamOrderId(order?.id ?? null);
    setAssignTeamDrawerOpen(true);
  };

  const handleCloseAssignTeam = () => {
    setAssignTeamDrawerOpen(false);
    setAssignTeamOrderId(null);
    setAssignTeamOrderData(null);
  };

  const handleAssignTeamSuccess = () => {
    fetchData();
    if (selectedOrder?.id === assignTeamOrderId) {
      setSelectedOrder(null);
      setDetailsOpen(false);
    }
    handleCloseAssignTeam();
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    setAppliedDrawerFilters(filters);
    setQuickSearch("");
    setAppliedQ("");
    setFilterDrawerOpen(false);
  };

  const resetFilters = () => {
    setFilters(initialFilters);
    setAppliedDrawerFilters(initialFilters);
    setQuickSearch("");
    setAppliedQ("");
  };

  const activeFilterCount = appliedQ
    ? 1
    : Object.keys(buildFilterParams(appliedDrawerFilters)).length;

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.key] = [];
    return acc;
  }, {});

  orders.forEach((o) => {
    if (isTeamAssignmentPending(o)) {
      grouped.team_assignment_pending.push(o);
      return;
    }
    const key = o.kanban_status || "pending";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(o);
  });

  const handleCreateChallan = (orderId) => {
    router.push(
      `/delivery-challans/new?order_id=${orderId}&returnTo=${encodeURIComponent("/delivery-execution")}`
    );
  };

  const handleOpenDetails = (order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
  };

  const handlePrintOrder = async (resolvedOrder) => {
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
  };

  const handleMenuOpen = (event, order) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuOrder(order);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuOrder(null);
  };

  const handleMenuOrderDetails = () => {
    if (menuOrder) handleOpenDetails(menuOrder);
    handleMenuClose();
  };

  const handleMenuViewChallans = () => {
    if (menuOrder?.id) router.push(`/delivery-execution/view?id=${menuOrder.id}`);
    handleMenuClose();
  };

  const handleMenuAssignTeam = () => {
    if (menuOrder) handleOpenAssignTeam(menuOrder);
    handleMenuClose();
  };

  const handleMenuNewChallan = () => {
    if (menuOrder?.id) handleCreateChallan(menuOrder.id);
    handleMenuClose();
  };

  const handleMenuForceCompleteDelivery = () => {
    if (menuOrder) {
      setForceCompleteOrder(menuOrder);
      setForceCompleteDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleForceCompleteCancel = () => {
    if (forceCompleteLoading) return;
    setForceCompleteDialogOpen(false);
    setForceCompleteOrder(null);
  };

  const handleForceCompleteConfirm = async () => {
    if (!forceCompleteOrder?.id) return;
    try {
      setForceCompleteLoading(true);
      await orderService.forceCompleteDelivery(forceCompleteOrder.id);
      toastSuccess("Delivery marked as complete");
      setForceCompleteDialogOpen(false);
      setForceCompleteOrder(null);
      await fetchData();
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to mark delivery as complete";
      toastError(msg);
    } finally {
      setForceCompleteLoading(false);
    }
  };

  const menuStatus = menuOrder?.kanban_status || menuOrder?.delivery_status || "pending";
  const showAssignTeam = isTeamAssignmentPending(menuOrder) || menuStatus === "partial";
  const showNewChallan = menuStatus === "pending" || menuStatus === "partial";
  const showForceComplete = menuStatus === "partial";

  return (
    <Box
      sx={{
        p: 1.25,
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        height: "calc(100dvh)",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <Card className="rounded-xl shadow-sm border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row items-center gap-1.5 px-2 py-1.5">
          <h1 className="text-base font-bold text-slate-900 whitespace-nowrap shrink-0">
            Delivery Execution & Team Planning
          </h1>
          <OrderListQuickSearch
            value={quickSearch}
            onValueChange={handleQuickSearchChange}
            isSearching={isSearching}
            className="flex-1 min-w-[180px] max-w-[340px] w-full sm:w-80"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <UIButton
              size="sm"
              variant="outline"
              onClick={() => setFilterDrawerOpen(true)}
              className="h-8 text-xs gap-1.5 px-2.5"
            >
              <IconFilter size={14} />
              Filters
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] h-4 px-1 leading-none bg-green-100 text-green-700 border-green-200"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </UIButton>
            {activeFilterCount > 0 && (
              <UIButton size="sm" variant="ghost" onClick={resetFilters} className="h-8 text-xs px-2">
                Clear
              </UIButton>
            )}
          </div>
        </div>
      </Card>

      {loading && (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && orders.length === 0 && (
        <Alert severity="info">No delivery execution orders assigned to your warehouses.</Alert>
      )}

      {!loading && !error && orders.length > 0 && (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            gap: 1.25,
            overflowX: "auto",
            overflowY: "hidden",
            pb: 1,
            alignItems: "stretch",
          }}
        >
          {COLUMNS.map((col) => {
            const list = sortOrdersForColumn(grouped[col.key] || [], col.key);
            const totalCapacity = list.reduce((sum, row) => sum + (Number(row.capacity) || 0), 0);

            return (
              <Paper
                key={col.key}
                sx={{
                  minWidth: 340,
                  maxWidth: 400,
                  flex: "1 0 340px",
                  height: "100%",
                  bgcolor: "#f8fafc",
                  border: "1px solid",
                  borderColor: "divider",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Box
                  sx={{
                    bgcolor: col.headerBg,
                    color: "#fff",
                    px: 1.25,
                    py: 0.85,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {col.title}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="caption" sx={{ opacity: 0.95 }}>
                      {formatKw(totalCapacity)} kW
                    </Typography>
                    <Chip
                      size="small"
                      label={list.length}
                      sx={{
                        height: 20,
                        bgcolor: col.chipBg,
                        color: "#fff",
                        fontWeight: 700,
                        "& .MuiChip-label": { px: 1 },
                      }}
                    />
                  </Box>
                </Box>

                <Box
                  sx={{
                    p: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.75,
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                  }}
                >
                  {list.length === 0 && (
                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        No records in {col.title.toLowerCase()}.
                      </Typography>
                    </Paper>
                  )}

                  {list.map((o) => (
                    <Paper
                      key={o.id}
                      variant="outlined"
                      sx={{
                        p: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.6,
                        borderLeft: "4px solid",
                        borderLeftColor:
                          col.key === "pending"
                            ? "#0ea5e9"
                            : col.key === "partial"
                              ? "#f59e0b"
                              : "#7c3aed",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                        <OrderNumberLink value={o.order_number || "-"} onClick={() => handleOpenDetails(o)} />
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Chip
                            size="small"
                            label={o.planned_priority || "No Priority"}
                            color={priorityColor(o.planned_priority)}
                            sx={{ height: 20, fontSize: "0.68rem" }}
                          />
                          <Chip
                            size="small"
                            label={
                              o.delivery_status === "complete"
                                ? "Complete"
                                : o.delivery_status === "partial"
                                  ? "Partial"
                                  : "Pending"
                            }
                            color={deliveryStatusColor(o.delivery_status)}
                            sx={{ height: 20, fontSize: "0.68rem" }}
                          />
                          <Tooltip title="More actions">
                            <IconButton
                              size="small"
                              sx={{ flex: "0 0 auto", p: 0.25 }}
                              onClick={(e) => handleMenuOpen(e, o)}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>

                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }} title={o.customer_name || "-"}>
                          {o.customer_name || "-"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Contact: {getPrimaryPhone(o)}
                          {o.company_name ? ` • ${o.company_name}` : ""}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }} title={compactAddress(o)}>
                          Address: {compactAddress(o)}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          Order Date: {formatDate(o.order_date)}
                          {o.consumer_no ? ` • Consumer: ${o.consumer_no}` : ""}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Project: {formatCurrency(o.project_cost)} • Paid: {formatCurrency(o.total_paid)}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ display: "block", color: o.outstanding_balance > 0 ? "error.main" : "success.main", fontWeight: 600 }}
                        >
                          Outstanding: {formatCurrency(o.outstanding_balance)}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block" }}
                          title={
                            [o.solar_panel_name, o.inverter_name].filter(Boolean).join(" · ") || undefined
                          }
                        >
                          Panel: {o.solar_panel_name || "—"} · Inverter: {o.inverter_name || "—"}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          Delivery Date: {formatDate(o.planned_delivery_date)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          Warehouse: {o.planned_warehouse_name || "-"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          Shipped {o.total_shipped || 0} / {o.total_required || 0} (Pending {o.total_pending || 0})
                        </Typography>
                        {col.key === "team_assignment_pending" && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                            Last Challan: {formatDate(o.last_challan_date)} • Count: {o.challan_count || 0}
                          </Typography>
                        )}
                      </Box>
                    </Paper>
                  ))}
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}

      <Drawer anchor="left" open={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)}>
        <Box sx={{ width: { xs: 320, sm: 420 }, p: 2, display: "flex", flexDirection: "column", gap: 1.25 }}>
          <Typography variant="h6">Filters</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
            Apply filters to narrow down delivery orders.
          </Typography>

          <TextField
            size="small"
            label="Order No"
            name="order_number"
            value={filters.order_number ?? ""}
            onChange={handleFilterChange}
          />
          <TextField
            size="small"
            label="Customer Name"
            name="customer_name"
            value={filters.customer_name ?? ""}
            onChange={handleFilterChange}
          />
          <TextField
            size="small"
            label="Contact Number"
            name="contact_number"
            value={filters.contact_number ?? ""}
            onChange={handleFilterChange}
            placeholder="Mobile or phone"
          />
          <TextField
            size="small"
            label="Address"
            name="address"
            value={filters.address ?? ""}
            onChange={handleFilterChange}
            placeholder="Address, landmark, taluka, district, pin"
          />
          <TextField
            size="small"
            label="Consumer No"
            name="consumer_no"
            value={filters.consumer_no ?? ""}
            onChange={handleFilterChange}
          />
          <TextField
            size="small"
            label="Reference"
            name="reference_from"
            value={filters.reference_from ?? ""}
            onChange={handleFilterChange}
          />
          <TextField
            size="small"
            label="Payment Type"
            name="payment_type"
            value={filters.payment_type ?? ""}
            onChange={handleFilterChange}
          />
          <TextField
            size="small"
            label="Priority"
            name="planned_priority"
            value={filters.planned_priority ?? ""}
            onChange={handleFilterChange}
          />
          <TextField
            size="small"
            select
            label="Delivery Status"
            name="delivery_status"
            value={filters.delivery_status ?? "all"}
            onChange={handleFilterChange}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="partial">Partial</MenuItem>
            <MenuItem value="complete">Complete</MenuItem>
          </TextField>
          <TextField
            size="small"
            label="Planned Delivery From"
            name="planned_delivery_date_from"
            type="date"
            value={filters.planned_delivery_date_from ?? ""}
            onChange={handleFilterChange}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small"
            label="Planned Delivery To"
            name="planned_delivery_date_to"
            type="date"
            value={filters.planned_delivery_date_to ?? ""}
            onChange={handleFilterChange}
            InputLabelProps={{ shrink: true }}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
            <Button size="small" variant="contained" onClick={applyFilters}>
              Apply
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                resetFilters();
                setFilterDrawerOpen(false);
              }}
            >
              Reset
            </Button>
            <Button size="small" variant="text" onClick={() => setFilterDrawerOpen(false)}>
              Cancel
            </Button>
          </Box>
        </Box>
      </Drawer>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={handleMenuOrderDetails}>
          <ListItemIcon>
            <DescriptionIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Order Details" />
        </MenuItem>
        <MenuItem onClick={handleMenuViewChallans}>
          <ListItemIcon>
            <ReceiptLongIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="View Challans" />
        </MenuItem>
        {showAssignTeam && (
          <MenuItem onClick={handleMenuAssignTeam}>
            <ListItemIcon>
              <GroupIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Assign Team" />
          </MenuItem>
        )}
        {showNewChallan && (
          <MenuItem onClick={handleMenuNewChallan}>
            <ListItemIcon>
              <AddIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="New Challan" />
          </MenuItem>
        )}
        {showForceComplete && (
          <MenuItem onClick={handleMenuForceCompleteDelivery}>
            <ListItemIcon>
              <DoneAllIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Force Delivery Complete" />
          </MenuItem>
        )}
      </Menu>

      <Drawer anchor="right" open={assignTeamDrawerOpen} onClose={handleCloseAssignTeam}>
        <Box sx={{ width: { xs: 340, sm: 480 }, p: 0, display: "flex", flexDirection: "column", height: "100%" }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="h6">Assign Team</Typography>
            <Typography variant="caption" color="text.secondary">
              Assign fabricator and installer for this order.
            </Typography>
          </Box>
          <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
            {assignTeamLoading ? (
              <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
                <CircularProgress size={24} />
              </Box>
            ) : assignTeamOrderData && assignTeamOrderId ? (
              <AssignFabricatorAndInstaller
                orderId={assignTeamOrderId}
                orderData={assignTeamOrderData}
                onSuccess={handleAssignTeamSuccess}
              />
            ) : null}
          </Box>
        </Box>
      </Drawer>

      <OrderDetailsDrawer
        open={detailsOpen}
        onClose={handleCloseDetails}
        order={selectedOrder}
        onPrint={handlePrintOrder}
        showPrint
        showDeliverySnapshot
      />

      <Dialog
        open={forceCompleteDialogOpen}
        onClose={forceCompleteLoading ? undefined : handleForceCompleteCancel}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>Force Delivery Complete?</DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <Typography variant="body2">
            Remaining pending items for this order will be treated as not required and the delivery
            will be marked as completed. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 1.5 }}>
          <Button
            size="small"
            onClick={handleForceCompleteCancel}
            disabled={forceCompleteLoading}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            color="success"
            onClick={handleForceCompleteConfirm}
            disabled={forceCompleteLoading}
          >
            {forceCompleteLoading ? (
              <CircularProgress size={16} sx={{ color: "inherit" }} />
            ) : (
              "Confirm"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

