"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Box,
  Typography,
} from "@mui/material";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Loader from "@/components/common/Loader";
import serializedInventoryService from "@/services/serializedInventoryService";
import { DIALOG_FORM_LARGE } from "@/utils/formConstants";

const SERIAL_STATUS_COLORS = {
  AVAILABLE: "success",
  RESERVED: "warning",
  ISSUED: "info",
  BLOCKED: "error",
};

/** Dialog that shows serialized inventory issued to a customer order (reference_number = order_number, issued_against = customer_order). */
export default function OrderIssuedSerialsDialog({
  open,
  onClose,
  orderNumber,
  customerName,
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && orderNumber) {
      loadSerials();
    } else {
      setData([]);
      setTotal(0);
      setError(null);
    }
  }, [open, orderNumber]);

  const loadSerials = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await serializedInventoryService.getSerializedInventoryReport({
        reference_number: orderNumber,
        issued_against: "customer_order",
        page: 1,
        limit: 500,
      });
      const result = response.result || response;
      setData(result.data || []);
      setTotal(result.meta?.total ?? (result.data || []).length);
    } catch (err) {
      console.error("Failed to load issued serials", err);
      setError(err?.response?.data?.message || "Failed to load serialized inventory.");
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const title = orderNumber
    ? `Serialized inventory issued to Order ${orderNumber}${customerName ? ` (${customerName})` : ""}`
    : "Serialized inventory issued to order";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={DIALOG_FORM_LARGE}>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          {total > 0 && !loading && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {total} serial{total !== 1 ? "s" : ""} issued to this order
            </Typography>
          )}
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading && (
            <Box display="flex" justifyContent="center" p={3}>
              <Loader />
            </Box>
          )}

          {error && (
            <Typography color="error" sx={{ p: 2 }}>
              {error}
            </Typography>
          )}

          {!loading && !error && data.length === 0 && orderNumber && (
            <Typography color="text.secondary" sx={{ p: 3, textAlign: "center" }}>
              No serialized inventory found issued to this order.
            </Typography>
          )}

          {!loading && !error && data.length > 0 && (
            <TableContainer component={Paper} sx={{ mt: 1 }} variant="outlined">
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Serial Number</strong></TableCell>
                    <TableCell><strong>Product Name</strong></TableCell>
                    <TableCell><strong>Product Type</strong></TableCell>
                    <TableCell><strong>Warehouse</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Outward Date</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.map((item, index) => (
                    <TableRow
                      key={item.id || index}
                      sx={{ "&:nth-of-type(odd)": { backgroundColor: "action.hover" } }}
                    >
                      <TableCell>{item.serial_number || "—"}</TableCell>
                      <TableCell>{item.product_name || "—"}</TableCell>
                      <TableCell>{item.product_type || "—"}</TableCell>
                      <TableCell>{item.warehouse_name || "—"}</TableCell>
                      <TableCell>
                        <Chip
                          label={item.status || "—"}
                          size="small"
                          color={SERIAL_STATUS_COLORS[item.status] || "default"}
                        />
                      </TableCell>
                      <TableCell>
                        {item.outward_date
                          ? new Date(item.outward_date).toLocaleDateString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </div>

        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
