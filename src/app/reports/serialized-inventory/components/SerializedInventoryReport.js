"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  IconButton,
  Tooltip,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import serializedInventoryService from "@/services/serializedInventoryService";
import { toastError } from "@/utils/toast";
import { formatCurrency } from "@/utils/dataTableUtils";
import SerialLedgerDialog from "./SerialLedgerDialog";
import PaginationControls from "@/components/common/PaginationControls";

const SERIAL_STATUS_COLORS = {
  AVAILABLE: "success",
  RESERVED: "warning",
  ISSUED: "info",
  BLOCKED: "error",
};

export default function SerializedInventoryReport({ filters, onRefresh }) {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [selectedSerial, setSelectedSerial] = useState(null);
  const [ledgerDialogOpen, setLedgerDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [filters, page, limit]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit,
        ...filters,
        status: filters?.status && Array.isArray(filters.status) ? filters.status.join(",") : filters?.status,
      };

      const response = await serializedInventoryService.getSerializedInventoryReport(params);
      const result = response.result || response;
      setData(result.data || []);
      setSummary(result.summary || null);
      setTotal(result.meta?.total || 0);
    } catch (err) {
      console.error("Failed to load serialized inventory", err);
      setError(err.response?.data?.message || "Failed to load serialized inventory report");
    } finally {
      setLoading(false);
    }
  };

  const handleViewLedger = (serial) => {
    setSelectedSerial(serial);
    setLedgerDialogOpen(true);
  };

  const handleExport = async (format = "csv") => {
    try {
      const params = {
        ...filters,
        status: filters?.status && Array.isArray(filters.status) ? filters.status.join(",") : filters?.status,
      };
      await serializedInventoryService.exportReport(params, format);
    } catch (err) {
      console.error("Failed to export report", err);
      toastError(err?.response?.data?.message || "Failed to export report. Please try again.");
    }
  };

  const handlePageChange = (zeroBasedPage) => {
    setPage(zeroBasedPage + 1);
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1);
  };

  return (
    <Box>
      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item size={{ xs: 12, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Serials
                </Typography>
                <Typography variant="h4">{summary.total || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item size={{ xs: 12, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Available
                </Typography>
                <Typography variant="h4" color="success.main">
                  {summary.by_status?.AVAILABLE || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item size={{ xs: 12, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Reserved
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {summary.by_status?.RESERVED || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item size={{ xs: 12, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Issued
                </Typography>
                <Typography variant="h4" color="info.main">
                  {summary.by_status?.ISSUED || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Export Buttons */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<FileDownloadIcon />}
          onClick={() => handleExport("csv")}
          disabled={loading}
        >
          Export CSV
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={() => handleExport("excel")}
          disabled={loading}
        >
          Export Excel
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Table */}
      <TableContainer component={Paper}>
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && data.length === 0 && (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="body1" color="text.secondary">
              No serialized inventory found. Try adjusting your filters.
            </Typography>
          </Box>
        )}

        {!loading && data.length > 0 && (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Serial Number</strong></TableCell>
                  <TableCell><strong>Product Name</strong></TableCell>
                  <TableCell><strong>Product Type</strong></TableCell>
                  <TableCell><strong>HSN Code</strong></TableCell>
                  <TableCell><strong>Warehouse</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Unit Price</strong></TableCell>
                  <TableCell><strong>Inward Date</strong></TableCell>
                  <TableCell><strong>Outward Date</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((item, index) => (
                  <TableRow
                    key={item.id || index}
                    sx={{ "&:nth-of-type(odd)": { backgroundColor: "action.hover" } }}
                    hover
                  >
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: "medium",
                          color: "primary.main",
                          cursor: "pointer",
                          "&:hover": { textDecoration: "underline" },
                        }}
                        onClick={() => handleViewLedger(item)}
                      >
                        {item.serial_number || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.product_name || "-"}</TableCell>
                    <TableCell>{item.product_type || "-"}</TableCell>
                    <TableCell>{item.hsn_code || "-"}</TableCell>
                    <TableCell>{item.warehouse_name || "-"}</TableCell>
                    <TableCell>
                      <Chip
                        label={item.status || "UNKNOWN"}
                        size="small"
                        color={SERIAL_STATUS_COLORS[item.status] || "default"}
                      />
                    </TableCell>
                    <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell>
                      {item.inward_date ? new Date(item.inward_date).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>
                      {item.outward_date ? new Date(item.outward_date).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Ledger">
                        <IconButton
                          size="small"
                          onClick={() => handleViewLedger(item)}
                          color="primary"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <PaginationControls
              page={page - 1}
              rowsPerPage={limit}
              totalCount={total}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleLimitChange}
              rowsPerPageOptions={[20, 50, 100, 200]}
            />
          </>
        )}
      </TableContainer>

      {/* Ledger Dialog */}
      <SerialLedgerDialog
        open={ledgerDialogOpen}
        onClose={() => {
          setLedgerDialogOpen(false);
          setSelectedSerial(null);
        }}
        serialId={selectedSerial?.id}
        serialNumber={selectedSerial?.serial_number}
      />
    </Box>
  );
}
