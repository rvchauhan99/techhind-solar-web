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
  Alert,
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
import { IconDownload } from "@tabler/icons-react";
import serializedInventoryService from "@/services/serializedInventoryService";
import { toastError } from "@/utils/toast";
import { DIALOG_FORM_LARGE } from "@/utils/formConstants";

export default function SerialLedgerDialog({ open, onClose, serialId, serialNumber }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && serialId) {
      loadLedgerData();
    } else {
      setData(null);
      setError(null);
    }
  }, [open, serialId]);

  const loadLedgerData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await serializedInventoryService.getSerialLedgerEntries(serialId);
      const result = response.result || response;
      setData(result);
    } catch (err) {
      console.error("Failed to load ledger data", err);
      const msg = err.response?.data?.message || "Failed to load ledger entries";
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!data || !data.ledger_entries) return;

    try {
      // Create CSV content
      const headers = [
        "Date & Time",
        "Transaction Type",
        "Movement Type",
        "Opening Qty",
        "Quantity",
        "Closing Qty",
        "Rate",
        "GST %",
        "Amount",
        "Performed By",
        "Remarks",
      ];

      const rows = data.ledger_entries.map((entry) => [
        new Date(entry.performed_at).toLocaleString(),
        entry.transaction_type || "",
        entry.movement_type || "",
        entry.opening_quantity || 0,
        entry.quantity || 0,
        entry.closing_quantity || 0,
        entry.rate || "",
        entry.gst_percent || "",
        entry.amount || "",
        entry.performed_by || "",
        entry.reason || "",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

      // Download CSV
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `serial-ledger-${serialNumber || serialId}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export ledger", err);
    }
  };

  const getMovementColor = (movementType) => {
    switch (movementType) {
      case "IN":
        return "success";
      case "OUT":
        return "error";
      case "ADJUST":
        return "warning";
      default:
        return "default";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={DIALOG_FORM_LARGE}>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Serial Ledger</DialogTitle>
          {data?.serial && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Serial: {data.serial.serial_number} | Product: {data.serial.product_name} | Warehouse: {data.serial.warehouse_name}
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading && (
            <div className="flex justify-center p-8">
              <Loader />
            </div>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && data && (
            <>
              {data.ledger_entries && data.ledger_entries.length > 0 ? (
                <TableContainer component={Paper} sx={{ mt: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Date & Time</strong></TableCell>
                        <TableCell><strong>Transaction</strong></TableCell>
                        <TableCell><strong>Movement</strong></TableCell>
                        <TableCell align="right"><strong>Opening</strong></TableCell>
                        <TableCell align="right"><strong>Quantity</strong></TableCell>
                        <TableCell align="right"><strong>Closing</strong></TableCell>
                        <TableCell align="right"><strong>Rate</strong></TableCell>
                        <TableCell align="right"><strong>GST %</strong></TableCell>
                        <TableCell align="right"><strong>Amount</strong></TableCell>
                        <TableCell><strong>Performed By</strong></TableCell>
                        <TableCell><strong>Remarks</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.ledger_entries.map((entry, index) => (
                        <TableRow key={entry.id || index} sx={{ "&:nth-of-type(odd)": { backgroundColor: "action.hover" } }}>
                          <TableCell>
                            {new Date(entry.performed_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Chip label={entry.transaction_type} size="small" color="primary" />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={entry.movement_type}
                              size="small"
                              color={getMovementColor(entry.movement_type)}
                            />
                          </TableCell>
                          <TableCell align="right">{entry.opening_quantity}</TableCell>
                          <TableCell align="right">{entry.quantity}</TableCell>
                          <TableCell align="right">{entry.closing_quantity}</TableCell>
                          <TableCell align="right">
                            {entry.rate ? `₹${parseFloat(entry.rate).toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell align="right">
                            {entry.gst_percent ? `${parseFloat(entry.gst_percent).toFixed(2)}%` : "-"}
                          </TableCell>
                          <TableCell align="right">
                            {entry.amount ? `₹${parseFloat(entry.amount).toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell>{entry.performed_by || "-"}</TableCell>
                          <TableCell>{entry.reason || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No ledger entries found for this serial number.
                </Alert>
              )}
            </>
          )}
        </div>

        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          {data && data.ledger_entries && data.ledger_entries.length > 0 && (
            <Button type="button" onClick={handleExport}>
              <IconDownload className="size-4 mr-1.5" />
              Export Ledger
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
