"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  Box,
  Typography,
  Alert,
  LinearProgress,
  Grid,
  Chip,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/utils/dataTableUtils";
import {
  getB2bOrderPayableAmount,
  getB2bOrderReceivedAmount,
  getB2bOrderOutstandingAmount,
  canCollectB2bPayment,
} from "@/utils/b2bOrderPaymentSummary";
import b2bOrderPaymentsService from "@/services/b2bOrderPaymentsService";

const compactCellSx = { py: 0.35, px: 0.75, fontSize: "0.75rem" };

const paymentStatusColor = (status) => {
  if (status === "approved") return "success";
  if (status === "rejected") return "error";
  return "warning";
};

function mapPaymentsResponse(res) {
  const payload = res?.result ?? res?.data ?? res;
  const data = payload?.data ?? payload?.rows ?? payload;
  return Array.isArray(data) ? data : [];
}

export default function B2bOrderPaymentSummaryStrip({ order }) {
  const [paymentsExpanded, setPaymentsExpanded] = useState(false);
  const [recentPayments, setRecentPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsLoaded, setPaymentsLoaded] = useState(false);

  const payableAmount = useMemo(() => getB2bOrderPayableAmount(order), [order]);
  const totalReceived = useMemo(() => getB2bOrderReceivedAmount(order), [order]);
  const outstanding = useMemo(() => getB2bOrderOutstandingAmount(order), [order]);
  const openingBalance = Number(order?.opening_balance_collected ?? 0);
  const paymentsSum = Number(order?.payments_sum ?? 0);
  const canPay = canCollectB2bPayment(order);

  const paidPercentage = useMemo(() => {
    if (!payableAmount || payableAmount <= 0) return 0;
    return Math.min(100, Math.max(0, (totalReceived / payableAmount) * 100));
  }, [payableAmount, totalReceived]);

  const loadRecentPayments = useCallback(async () => {
    if (!order?.id || paymentsLoaded) return;
    setPaymentsLoading(true);
    try {
      const res = await b2bOrderPaymentsService.getPayments({
        b2b_sales_order_id: order.id,
        page: 1,
        limit: 5,
      });
      setRecentPayments(mapPaymentsResponse(res));
      setPaymentsLoaded(true);
    } catch {
      setRecentPayments([]);
      setPaymentsLoaded(true);
    } finally {
      setPaymentsLoading(false);
    }
  }, [order?.id, paymentsLoaded]);

  const togglePayments = () => {
    const next = !paymentsExpanded;
    setPaymentsExpanded(next);
    if (next && !paymentsLoaded) loadRecentPayments();
  };

  if (!order?.id) return null;

  return (
    <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: "divider" }}>
      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: "block", mb: 0.75 }}>
        Payment summary
      </Typography>

      <Grid container spacing={1}>
        <Grid item xs={4} sm={4}>
          <Typography variant="caption" color="text.secondary" display="block">
            Order value
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {formatCurrency(payableAmount)}
          </Typography>
        </Grid>
        <Grid item xs={4} sm={4}>
          <Typography variant="caption" color="text.secondary" display="block">
            Received
          </Typography>
          <Typography variant="body2" fontWeight={600} color="success.main">
            {formatCurrency(totalReceived)}
          </Typography>
          {openingBalance > 0 && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.2 }}>
              Opening {formatCurrency(openingBalance)}
              {paymentsSum > 0 ? ` + payments ${formatCurrency(paymentsSum)}` : ""}
            </Typography>
          )}
        </Grid>
        <Grid item xs={4} sm={4}>
          <Typography variant="caption" color="text.secondary" display="block">
            Outstanding
          </Typography>
          <Typography
            variant="body2"
            fontWeight={700}
            color={outstanding > 0 ? "error.main" : "success.main"}
          >
            {formatCurrency(outstanding)}
          </Typography>
        </Grid>
      </Grid>

      {payableAmount > 0 && (
        <Box sx={{ mt: 0.75 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.25 }}>
            <Typography variant="caption" color="text.secondary">
              Paid
            </Typography>
            <Typography variant="caption" fontWeight={600}>
              {paidPercentage.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={paidPercentage}
            sx={{ height: 4, borderRadius: 1 }}
          />
        </Box>
      )}

      {order.payment_terms && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
          Terms: {order.payment_terms}
        </Typography>
      )}

      {outstanding > 0 && (
        <Alert severity="warning" sx={{ mt: 0.75, py: 0.25, "& .MuiAlert-message": { py: 0.25, fontSize: "0.75rem" } }}>
          Outstanding {formatCurrency(outstanding)} — verify payment before dispatching material.
        </Alert>
      )}

      {outstanding === 0 && payableAmount > 0 && (
        <Alert severity="success" sx={{ mt: 0.75, py: 0.25, "& .MuiAlert-message": { py: 0.25, fontSize: "0.75rem" } }}>
          Order fully paid.
        </Alert>
      )}

      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.75, mt: 0.75 }}>
        {canPay && outstanding > 0 && (
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" asChild>
            <Link href={`/b2b-sales-orders/view?id=${order.id}&tab=2`}>Collect payment</Link>
          </Button>
        )}
        <Box
          component="button"
          type="button"
          onClick={togglePayments}
          aria-expanded={paymentsExpanded}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.25,
            border: 0,
            bgcolor: "transparent",
            cursor: "pointer",
            p: 0,
            color: "primary.main",
            fontSize: "0.75rem",
            fontWeight: 500,
          }}
        >
          Recent payments
          {paymentsExpanded ? (
            <ExpandLessIcon fontSize="small" sx={{ fontSize: "1rem" }} />
          ) : (
            <ExpandMoreIcon fontSize="small" sx={{ fontSize: "1rem" }} />
          )}
        </Box>
      </Box>

      <Collapse in={paymentsExpanded}>
        <Box sx={{ mt: 0.5 }}>
          {paymentsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
              <CircularProgress size={20} />
            </Box>
          ) : recentPayments.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              No payments recorded.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={compactCellSx}>Date</TableCell>
                    <TableCell sx={compactCellSx} align="right">
                      Amount
                    </TableCell>
                    <TableCell sx={compactCellSx}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell sx={compactCellSx}>{formatDate(p.date_of_payment)}</TableCell>
                      <TableCell sx={compactCellSx} align="right">
                        {formatCurrency(p.payment_amount)}
                      </TableCell>
                      <TableCell sx={compactCellSx}>
                        <Chip
                          label={p.status || "—"}
                          size="small"
                          color={paymentStatusColor(p.status)}
                          sx={{ height: 18, fontSize: "0.65rem" }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
