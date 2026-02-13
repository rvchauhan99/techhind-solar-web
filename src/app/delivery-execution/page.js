"use client";

import { useCallback, useEffect, useState } from "react";
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
  Tooltip,
  Typography,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DescriptionIcon from "@mui/icons-material/Description";
import GroupIcon from "@mui/icons-material/Group";
import AddIcon from "@mui/icons-material/Add";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { useRouter } from "next/navigation";
import OrderNumberLink from "@/components/common/OrderNumberLink";
import orderService from "@/services/orderService";
import { toastError } from "@/utils/toast";
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
  { key: "complete", title: "Completed", headerBg: "#16a34a", chipBg: "#15803d" },
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
  if (key === "complete") {
    return rows.sort(
      (a, b) => toDateTime(b.last_challan_date, 0) - toDateTime(a.last_challan_date, 0)
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

export default function DeliveryExecutionPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [assignTeamDrawerOpen, setAssignTeamDrawerOpen] = useState(false);
  const [assignTeamOrderId, setAssignTeamOrderId] = useState(null);
  const [assignTeamOrderData, setAssignTeamOrderData] = useState(null);
  const [assignTeamLoading, setAssignTeamLoading] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuOrder, setMenuOrder] = useState(null);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await orderService.getDeliveryExecutionOrders(buildFilterParams(appliedFilters));
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
  }, [appliedFilters]);

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
    setAppliedFilters(filters);
    setFilterDrawerOpen(false);
  };

  const resetFilters = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  };

  const activeFilterCount = Object.keys(buildFilterParams(appliedFilters)).length;

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.key] = [];
    return acc;
  }, {});

  orders.forEach((o) => {
    const key = o.kanban_status || "pending";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(o);
  });

  const handleCreateChallan = (orderId) => {
    router.push(`/delivery-challans/new?order_id=${orderId}`);
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

  const menuStatus = menuOrder?.kanban_status || menuOrder?.delivery_status || "pending";
  const showAssignTeam = menuStatus === "partial" || menuStatus === "complete";
  const showNewChallan = menuStatus === "pending" || menuStatus === "partial";

  return (
    <Box
      sx={{
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        height: "calc(100dvh)",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Typography variant="h6">Delivery Execution & Team Planning</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button size="small" variant="outlined" onClick={() => setFilterDrawerOpen(true)}>
            Filter {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
          </Button>
          {activeFilterCount > 0 && (
            <Button size="small" variant="text" onClick={resetFilters}>
              Clear
            </Button>
          )}
        </Box>
      </Box>

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
            gap: 2,
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
                  minWidth: 360,
                  maxWidth: 420,
                  flex: "1 0 360px",
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
                    px: 1.5,
                    py: 1,
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
                    p: 1.25,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
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
                        p: 1.25,
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.75,
                        borderLeft: "4px solid",
                        borderLeftColor:
                          col.key === "pending"
                            ? "#0ea5e9"
                            : col.key === "partial"
                              ? "#f59e0b"
                              : "#ef4444",
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
                        {col.key === "complete" && (
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
    </Box>
  );
}

