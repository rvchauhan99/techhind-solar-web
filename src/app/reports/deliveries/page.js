"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
  CircularProgress,
  Alert,
} from "@mui/material";
import deliveryReportService from "@/services/deliveryReportService";
import companyService from "@/services/companyService";
import OrderDetailsDrawer from "@/components/common/OrderDetailsDrawer";
import orderService from "@/services/orderService";
import { toastError } from "@/utils/toast";

const deliveryStatusColor = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "complete") return "success";
  if (s === "partial") return "warning";
  return "default";
};

export default function DeliveryReportPage() {
  const [filters, setFilters] = useState({
    start_date: "",
    end_date: "",
    warehouse_id: "",
    order_number: "",
  });
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const res = await companyService.listWarehouses();
        const data = res?.result ?? res?.data ?? res ?? [];
        setWarehouses(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load warehouses:", err);
      }
    };
    fetchWarehouses();
  }, []);

  const loadData = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit: meta.limit || 20,
      };
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.warehouse_id) params.warehouse_id = Number(filters.warehouse_id);
      if (filters.order_number) params.order_number = filters.order_number;

      const res = await deliveryReportService.getDeliveryReport(params);
      const result = res?.result || res || {};
      setRows(result.data || []);
      setMeta(result.meta || { page, limit: params.limit, total: 0, pages: 0 });
    } catch (err) {
      console.error("Failed to load delivery report:", err);
      const msg = err?.response?.data?.message || err?.message || "Failed to load delivery report";
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = () => {
    loadData(1);
  };

  const handlePageChange = (delta) => {
    const newPage = meta.page + delta;
    if (newPage < 1 || (meta.pages && newPage > meta.pages)) return;
    loadData(newPage);
  };

  const formatDateTime = (val) => {
    if (!val) return "-";
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return val;
    return d.toLocaleString();
  };

  const handleOpenDetails = (row) => {
    setSelectedOrder({
      id: row.order_id,
      order_number: row.order_number,
      customer_name: row.customer_name,
      planned_warehouse_name: row.warehouse_name,
      delivery_status: row.delivery_status,
      total_delivered_qty: row.total_delivered_qty,
      order_status: row.order_status,
      last_delivery_at: row.last_delivery_at,
    });
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedOrder(null);
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

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h6">Delivery Report</Typography>

      <Paper sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              label="Start Date"
              type="date"
              name="start_date"
              size="small"
              value={filters.start_date}
              onChange={handleFilterChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="End Date"
              type="date"
              name="end_date"
              size="small"
              value={filters.end_date}
              onChange={handleFilterChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Warehouse"
              name="warehouse_id"
              size="small"
              value={filters.warehouse_id}
              onChange={handleFilterChange}
              select
              SelectProps={{ native: true }}
              fullWidth
            >
              <option value="">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Order Number"
              name="order_number"
              size="small"
              value={filters.order_number}
              onChange={handleFilterChange}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={12} sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
            <Button variant="contained" onClick={handleApplyFilters}>
              Apply Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading && (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error">{error}</Alert>
      )}

      {!loading && !error && (
        <Paper sx={{ p: 1 }}>
          {rows.length === 0 ? (
            <Typography variant="body2" sx={{ p: 2 }}>
              No delivery data found for the selected criteria.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Order #</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Warehouse</TableCell>
                    <TableCell align="right">Delivered Qty</TableCell>
                    <TableCell align="right">Delivered Value</TableCell>
                    <TableCell>Last Delivery</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Order Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.order_id}>
                      <TableCell>{row.order_number}</TableCell>
                      <TableCell>{row.customer_name || "-"}</TableCell>
                      <TableCell>{row.warehouse_name || "-"}</TableCell>
                      <TableCell align="right">{row.total_delivered_qty}</TableCell>
                      <TableCell align="right">
                        {row.total_value != null ? Number(row.total_value).toFixed(2) : "-"}
                      </TableCell>
                      <TableCell>{formatDateTime(row.last_delivery_at)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            row.delivery_status === "complete"
                              ? "Delivery: Complete"
                              : row.delivery_status === "partial"
                                ? "Delivery: Partial"
                                : "Delivery: Pending"
                          }
                          color={deliveryStatusColor(row.delivery_status)}
                          sx={{ fontSize: "0.65rem", height: 18 }}
                        />
                      </TableCell>
                      <TableCell>{row.order_status || "-"}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => handleOpenDetails(row)}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
            <Typography variant="caption">
              Page {meta.page} of {meta.pages || 1} • Total {meta.total} orders
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button size="small" disabled={meta.page <= 1} onClick={() => handlePageChange(-1)}>
                Previous
              </Button>
              <Button
                size="small"
                disabled={meta.pages && meta.page >= meta.pages}
                onClick={() => handlePageChange(1)}
              >
                Next
              </Button>
            </Box>
          </Box>
        </Paper>
      )}
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

