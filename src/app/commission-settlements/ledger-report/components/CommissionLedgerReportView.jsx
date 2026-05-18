"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconBuildingBank,
  IconDownload,
  IconPrinter,
  IconChartBar,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PaginationControls from "@/components/common/PaginationControls";
import OrderDetailsDrawer from "@/components/common/OrderDetailsDrawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import commissionSettlementService from "@/services/commissionSettlementService";
import SettlementByUserSummary from "../../components/SettlementByUserSummary";
import { fmtMoney, payableAmount } from "../../utils/settlementMoney";
import { toast } from "sonner";

const INR = (v) =>
  Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const STATUS_STYLES = {
  unsettled: "bg-amber-50 text-amber-700 border-amber-200",
  in_settlement: "bg-sky-50 text-sky-700 border-sky-200",
  settled: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_LABELS = {
  unsettled: "Unsettled",
  in_settlement: "In settlement",
  settled: "Settled",
};

function KpiCard({ label, value, sub, highlight }) {
  return (
    <Card
      className={`rounded-lg border-slate-200 shadow-sm ${highlight ? "border-primary/30 bg-primary/5" : "bg-white"}`}
    >
      <CardContent className="flex flex-col gap-0.5 p-2">
        <span className="text-[10px] font-medium text-slate-500 leading-tight">{label}</span>
        <span className={`text-sm font-bold leading-tight ${highlight ? "text-primary" : "text-slate-900"}`}>
          <span className="text-[10px] font-normal text-slate-400">₹</span>
          {value}
        </span>
        {sub && <span className="text-[9px] text-slate-400">{sub}</span>}
      </CardContent>
    </Card>
  );
}

function stripParams(filters, page, limit) {
  const p = { page, limit };
  if (filters.beneficiary_user_id) p.beneficiary_user_id = filters.beneficiary_user_id;
  if (filters.date_from) p.date_from = filters.date_from;
  if (filters.date_to) p.date_to = filters.date_to;
  if (filters.role) p.role = filters.role;
  if (filters.settlement_status) p.settlement_status = filters.settlement_status;
  p.include_unsettled = filters.include_unsettled !== false;
  return p;
}

export default function CommissionLedgerReportView({ filters, refreshKey }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [settlementDetail, setSettlementDetail] = useState(null);
  const [settlementLoading, setSettlementLoading] = useState(false);

  const beneficiaryId = filters?.beneficiary_user_id;

  useEffect(() => {
    setPage(1);
  }, [refreshKey, filters]);

  const loadReport = useCallback(async () => {
    if (!beneficiaryId) {
      setReport(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await commissionSettlementService.getCommissionLedgerReport(
        stripParams(filters, page, limit)
      );
      setReport(res?.result ?? res);
    } catch (e) {
      setReport(null);
      setError(e?.response?.data?.message || e?.message || "Failed to load ledger");
    } finally {
      setLoading(false);
    }
  }, [beneficiaryId, filters, page, limit]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const summary = report?.summary;
  const rows = report?.data || [];
  const meta = report?.meta || { total: 0, page: 1, pages: 0, limit };
  const beneficiary = report?.beneficiary;

  const periodLabel = useMemo(() => {
    const from = report?.period?.date_from;
    const to = report?.period?.date_to;
    if (from && to) return `${from} — ${to}`;
    if (from) return `From ${from}`;
    if (to) return `Until ${to}`;
    return "All time";
  }, [report?.period]);

  const handleExport = async () => {
    if (!beneficiaryId) {
      toast.error("Select a beneficiary first");
      return;
    }
    try {
      const blob = await commissionSettlementService.downloadCommissionLedgerReportCsv(
        stripParams(filters, 1, 999999)
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `commission-ledger-${beneficiaryId}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Export failed");
    }
  };

  const handlePrint = () => window.print();

  const openSettlement = async (settlementId) => {
    if (!settlementId) return;
    setSettlementLoading(true);
    try {
      const res = await commissionSettlementService.getCommissionSettlementById(settlementId);
      setSettlementDetail(res?.result ?? res);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to load settlement");
    } finally {
      setSettlementLoading(false);
    }
  };

  if (!beneficiaryId) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center print:hidden">
        <IconBuildingBank size={32} className="mb-2 text-slate-300" />
        <p className="text-sm font-medium text-slate-600">Select a beneficiary to view ledger</p>
        <p className="mt-1 max-w-xs text-[11px] text-slate-400">
          Bank-statement view with credits, settlement debits, and running balance
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 print:space-y-1">
      {/* Account header */}
      <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm print:shadow-none print:border">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IconBuildingBank size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                {beneficiary?.name || "Beneficiary"}
              </h2>
              <p className="text-[10px] text-slate-500">{beneficiary?.email || ""}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Period: {periodLabel}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 print:hidden">
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-xs"
              onClick={handleExport}
              disabled={loading}
            >
              <IconDownload size={12} /> Export CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-xs"
              onClick={handlePrint}
              disabled={loading}
            >
              <IconPrinter size={12} /> Print
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-2 sm:grid-cols-3 md:grid-cols-6">
          <KpiCard label="Opening" value={INR(summary?.opening_balance)} />
          <KpiCard label="Credits" value={INR(summary?.total_credit)} />
          <KpiCard label="Debits" value={INR(summary?.total_debit)} />
          <KpiCard
            label="Closing balance"
            value={INR(summary?.closing_balance)}
            highlight
            sub="Payable outstanding"
          />
          <KpiCard label="Unsettled" value={INR(summary?.unsettled_amount)} sub="Accrued, not paid" />
          <KpiCard label="In settlement" value={INR(summary?.in_settlement_amount)} sub="Pending approval" />
        </div>
      </Card>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-600 print:hidden">
          {error}
        </p>
      )}

      {/* Statement table */}
      <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-2 py-1.5 whitespace-nowrap">Date</th>
                <th className="px-2 py-1.5 min-w-[200px]">Particulars</th>
                <th className="px-2 py-1.5">Ref</th>
                <th className="px-2 py-1.5 text-right">Debit</th>
                <th className="px-2 py-1.5 text-right">Credit</th>
                <th className="px-2 py-1.5 text-right">Balance</th>
                <th className="px-2 py-1.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-2 py-8 text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-2 py-8 text-center">
                    <IconChartBar size={20} className="mx-auto mb-1 text-slate-200" />
                    <p className="text-slate-400">No transactions in this period</p>
                    <p className="text-[10px] text-slate-300">Try widening the date range</p>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-2 py-1 whitespace-nowrap text-slate-600">
                      {row.txn_date
                        ? new Date(row.txn_date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-2 py-1 text-slate-800">
                      {row.order_id ? (
                        <button
                          type="button"
                          className="text-left hover:text-primary hover:underline"
                          onClick={() => {
                            setSelectedOrder({ id: row.order_id });
                            setDrawerOpen(true);
                          }}
                        >
                          {row.particulars}
                        </button>
                      ) : (
                        row.particulars
                      )}
                    </td>
                    <td className="px-2 py-1">
                      {row.settlement_id ? (
                        <button
                          type="button"
                          className="font-medium text-primary hover:underline"
                          onClick={() => openSettlement(row.settlement_id)}
                        >
                          {row.reference || "—"}
                        </button>
                      ) : (
                        <span className="text-slate-500">{row.reference || "—"}</span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-right font-semibold text-red-600 tabular-nums">
                      {row.debit ? `₹${fmtMoney(row.debit)}` : ""}
                    </td>
                    <td className="px-2 py-1 text-right font-semibold text-emerald-600 tabular-nums">
                      {row.credit ? `₹${fmtMoney(row.credit)}` : ""}
                    </td>
                    <td className="px-2 py-1 text-right font-semibold text-slate-800 tabular-nums">
                      ₹{fmtMoney(row.balance)}
                    </td>
                    <td className="px-2 py-1">
                      {row.settlement_status ? (
                        <span
                          className={`inline-block rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${
                            STATUS_STYLES[row.settlement_status] || "bg-slate-50 text-slate-500 border-slate-200"
                          }`}
                        >
                          {STATUS_LABELS[row.settlement_status] || row.settlement_status}
                        </span>
                      ) : row.txn_type === "debit" ? (
                        <span className="text-[9px] text-slate-400">Payout</span>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta.total > 0 && (
          <div className="border-t border-slate-100 px-2 py-1 print:hidden">
            <PaginationControls
              page={page - 1}
              rowsPerPage={limit}
              totalCount={meta.total}
              onPageChange={(z) => setPage(z + 1)}
              onRowsPerPageChange={(l) => {
                setLimit(l);
                setPage(1);
              }}
              rowsPerPageOptions={[25, 50, 100, 200]}
            />
          </div>
        )}
      </Card>

      <OrderDetailsDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        showPrint={false}
      />

      <Dialog open={!!settlementDetail} onOpenChange={(o) => !o && setSettlementDetail(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {settlementDetail?.settlement_number || "Settlement"}
            </DialogTitle>
          </DialogHeader>
          {settlementLoading ? (
            <p className="text-xs text-slate-500">Loading…</p>
          ) : settlementDetail ? (
            <div className="space-y-2 text-xs">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{settlementDetail.status}</Badge>
                <span className="text-slate-600">
                  Payable: ₹{fmtMoney(payableAmount(settlementDetail))}
                </span>
              </div>
              {settlementDetail.by_user?.length > 0 && (
                <SettlementByUserSummary byUser={settlementDetail.by_user} />
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
