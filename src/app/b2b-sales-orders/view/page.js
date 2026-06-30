"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  IconArrowLeft,
  IconPencil,
  IconCircleCheck,
  IconX,
  IconFileTypePdf,
  IconCurrencyRupee,
  IconHistory,
  IconFileDescription,
  IconBuilding,
  IconCalendar,
  IconCreditCard,
  IconInfoCircle,
} from "@tabler/icons-react";

import ProtectedRoute from "@/components/common/ProtectedRoute";
import Loader from "@/components/common/Loader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import B2bSalesOrderDetailsContent, {
  renderB2bSalesOrderStatusBadge,
} from "@/app/b2b-sales-orders/components/B2bSalesOrderDetailsContent";
import {
  getB2bSalesOrderById,
  confirmB2bSalesOrder,
  cancelB2bSalesOrder,
  downloadB2bSalesOrderPDF,
} from "@/services/b2bSalesOrderService";
import { formatDate, formatCurrency } from "@/utils/dataTableUtils";
import {
  getB2bOrderPayableAmount,
  getB2bOrderReceivedAmount,
  getB2bOrderOutstandingAmount,
  getB2bOrderOutstandingDisplay,
  canCollectB2bPayment,
} from "@/utils/b2bOrderPaymentSummary";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { RBAC_CONFIG_KEYS } from "@/lib/platformRoleAccess";
import { getB2bOrderCancelEligibility } from "@/utils/b2bOrderCancelEligibility";
import B2bCancelOrderDialog from "@/app/b2b-sales-orders/components/B2bCancelOrderDialog";
import B2bReceivePaymentForm from "./components/B2bReceivePaymentForm";
import B2bPreviousPaymentsTable from "./components/B2bPreviousPaymentsTable";

export default function B2bSalesOrderViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");
  const tabParam = searchParams.get("tab");

  const { modulePermissions, currentModuleId } = useAuth();
  const currentPerm = useMemo(() => {
    return modulePermissions?.[currentModuleId] || {
      can_create: false,
      can_read: false,
      can_update: false,
      can_delete: false,
    };
  }, [modulePermissions, currentModuleId]);

  const canCancelConfirmed = useRoleAccess(RBAC_CONFIG_KEYS.B2B_SALES_ORDER_CANCEL_CONFIRMED);

  const getTabFromParam = useCallback((param) => {
    if (param === "3" || param === "previous") return "previous";
    if (param === "2" || param === "receive") return "receive";
    return "details";
  }, []);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(getTabFromParam(tabParam));
  const [paymentsRefreshKey, setPaymentsRefreshKey] = useState(0);

  const [confirmOrderDialogOpen, setConfirmOrderDialogOpen] = useState(false);
  const [confirmingOrder, setConfirmingOrder] = useState(false);
  const [cancelOrderDialogOpen, setCancelOrderDialogOpen] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const cancelEligibility = useMemo(
    () =>
      getB2bOrderCancelEligibility(order, {
        canUpdate: currentPerm.can_update,
        canCancelConfirmed,
      }),
    [order, currentPerm.can_update, canCancelConfirmed]
  );

  useEffect(() => {
    setTab(getTabFromParam(tabParam));
  }, [tabParam, getTabFromParam]);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await getB2bSalesOrderById(orderId);
      const data = res?.result ?? res?.data ?? res;
      setOrder(data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const payableAmount = useMemo(() => getB2bOrderPayableAmount(order), [order]);
  const totalReceived = useMemo(() => getB2bOrderReceivedAmount(order), [order]);
  const outstanding = useMemo(() => getB2bOrderOutstandingAmount(order), [order]);
  const outstandingDisplay = useMemo(() => getB2bOrderOutstandingDisplay(order), [order]);
  const maxPaymentAmount = Math.max(0, outstanding);
  const canPay = canCollectB2bPayment(order);

  const paidPercentage = useMemo(() => {
    if (!payableAmount || payableAmount <= 0) return 0;
    return Math.min(100, Math.max(0, (totalReceived / payableAmount) * 100));
  }, [payableAmount, totalReceived]);

  const handlePaymentSaved = () => {
    setPaymentsRefreshKey((k) => k + 1);
    loadOrder();
  };

  const handleTabChange = (newTab) => {
    setTab(newTab);
    const params = new URLSearchParams(window.location.search);
    let val = "1";
    if (newTab === "receive") val = "2";
    else if (newTab === "previous") val = "3";
    params.set("tab", val);
    router.replace(`${window.location.pathname}?${params.toString()}`);
  };

  const handleConfirmOrder = async () => {
    setConfirmingOrder(true);
    try {
      await confirmB2bSalesOrder(orderId);
      toast.success("Order confirmed successfully");
      setConfirmOrderDialogOpen(false);
      loadOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to confirm order");
    } finally {
      setConfirmingOrder(false);
    }
  };

  const handleCancelOrder = async (payload = {}) => {
    setCancellingOrder(true);
    try {
      await cancelB2bSalesOrder(orderId, payload);
      toast.success("Order cancelled successfully");
      setCancelOrderDialogOpen(false);
      loadOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel order");
    } finally {
      setCancellingOrder(false);
    }
  };

  const handlePdfDownload = async () => {
    setDownloadingPdf(true);
    try {
      const { blob, filename } = await downloadB2bSalesOrderPDF(orderId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to download PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (!orderId) {
    return (
      <ProtectedRoute>
        <div className="p-4 text-sm text-slate-600">Missing order id.</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-slate-50/50 p-4 lg:p-6 space-y-4">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push("/b2b-sales-orders")}
              className="gap-1.5 hover:bg-slate-100"
            >
              <IconArrowLeft className="size-4" />
              Back
            </Button>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                B2B Order {order?.order_no || orderId}
              </h1>
              {order?.status && renderB2bSalesOrderStatusBadge(order.status)}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {currentPerm.can_update && order?.status === "DRAFT" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  asChild
                >
                  <Link href={`/b2b-sales-orders/edit?id=${orderId}`}>
                    <IconPencil className="size-4" />
                    Edit
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  className="gap-1.5 bg-[#00823b] hover:bg-[#00823b]/90 text-white border-0"
                  onClick={() => setConfirmOrderDialogOpen(true)}
                >
                  <IconCircleCheck className="size-4" />
                  Confirm Order
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-destructive border-destructive hover:bg-destructive/10"
                  onClick={() => setCancelOrderDialogOpen(true)}
                >
                  <IconX className="size-4" />
                  Cancel Order
                </Button>
              </>
            )}
            {cancelEligibility.canCancel && order?.status !== "DRAFT" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive border-destructive hover:bg-destructive/10"
                onClick={() => setCancelOrderDialogOpen(true)}
              >
                <IconX className="size-4" />
                {cancelEligibility.buttonLabel}
              </Button>
            )}
            {order && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handlePdfDownload}
                disabled={downloadingPdf}
              >
                <IconFileTypePdf className="size-4" />
                {downloadingPdf ? "Downloading..." : "PDF"}
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center min-h-[300px]">
            <Loader />
          </div>
        ) : !order ? (
          <Card className="p-8 text-center text-slate-500">
            Order not found.
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left Content Area (Tabs) */}
            <div className="lg:col-span-2 space-y-4">
              <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid grid-cols-3 bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <TabsTrigger
                    value="details"
                    className="flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <IconFileDescription className="size-4" />
                    Order Details
                  </TabsTrigger>
                  <TabsTrigger
                    value="receive"
                    className="flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    disabled={!canPay}
                  >
                    <IconCurrencyRupee className="size-4" />
                    Receive Payment
                  </TabsTrigger>
                  <TabsTrigger
                    value="previous"
                    className="flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <IconHistory className="size-4" />
                    Previous Payments
                  </TabsTrigger>
                </TabsList>

                <div className="mt-4 bg-white border border-slate-200 rounded-lg p-4 md:p-6 shadow-sm min-h-[400px]">
                  <TabsContent value="details" className="m-0 focus-visible:outline-none">
                    <B2bSalesOrderDetailsContent
                      order={order}
                      loading={false}
                      readOnly={true}
                    />
                  </TabsContent>
                  <TabsContent value="receive" className="m-0 focus-visible:outline-none">
                    {canPay ? (
                      <B2bReceivePaymentForm
                        orderId={orderId}
                        onPaymentSaved={handlePaymentSaved}
                        maxPaymentAmount={maxPaymentAmount}
                        totalReceivedAmount={totalReceived}
                        payableAmount={payableAmount}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-8 text-slate-500">
                        <IconInfoCircle className="size-8 text-slate-400 mb-2" />
                        <p className="text-sm font-medium">Payment collection not available.</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {order?.status === "DRAFT" && !order?.allow_payment_for_draft
                            ? "Please confirm the order first to collect payments."
                            : "Payments cannot be collected for this order status."}
                        </p>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="previous" className="m-0 focus-visible:outline-none">
                    <B2bPreviousPaymentsTable
                      orderId={orderId}
                      refreshKey={paymentsRefreshKey}
                      canUpdate={currentPerm.can_update}
                      canDelete={currentPerm.can_delete}
                      maxPaymentAmount={maxPaymentAmount}
                      onPaymentsChanged={handlePaymentSaved}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            {/* Right Sidebar (Financial Summary Card) */}
            <div className="space-y-4">
              <Card className="shadow-sm border-slate-200 overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-200 pb-3">
                  <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <IconCreditCard className="size-4 text-[#1b365d]" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-5 pt-4">
                  {/* Financial amounts */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Total Order Value</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(payableAmount)}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Amount Received</span>
                      <span className="font-semibold text-emerald-600">{formatCurrency(totalReceived)}</span>
                    </div>

                    {Number(order?.opening_balance_collected) > 0 && (
                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>Opening balance (go-live)</span>
                        <span>{formatCurrency(order.opening_balance_collected)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-xs border-t pt-2">
                      <span className="text-slate-600 font-medium">Outstanding Balance</span>
                      <span className={`font-bold ${outstanding > 0 ? "text-red-600" : "text-emerald-700"}`}>
                        {formatCurrency(outstanding)}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 font-medium">Payment Progress</span>
                      <span className="text-slate-800 font-bold">{paidPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${paidPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Client details / order metadata */}
                  <div className="space-y-3 pt-4 border-t border-slate-100 text-xs">
                    <div className="flex items-start gap-2">
                      <IconBuilding className="size-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-slate-400 text-[10px] uppercase font-semibold">Client</div>
                        <div className="font-semibold text-slate-800 leading-tight">
                          {order.client?.client_name || "-"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <IconCalendar className="size-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-slate-400 text-[10px] uppercase font-semibold">Order Date</div>
                        <div className="text-slate-800 font-medium">{formatDate(order.order_date)}</div>
                      </div>
                    </div>

                    {order.payment_terms && (
                      <div className="flex items-start gap-2">
                        <IconInfoCircle className="size-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-slate-400 text-[10px] uppercase font-semibold">Payment Terms</div>
                          <div className="text-slate-800 font-medium">{order.payment_terms}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Contextual CTA */}
                  {canPay && outstanding > 0 ? (
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => handleTabChange("receive")}
                      className="w-full mt-2 bg-[#1b365d] hover:bg-[#1b365d]/90 text-white font-medium shadow-sm transition-colors py-2 h-9"
                    >
                      <IconCurrencyRupee className="size-4 mr-1.5" />
                      Collect Payment
                    </Button>
                  ) : outstandingDisplay.type === "fully_paid" ? (
                    <div className="w-full text-center py-2 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-md border border-emerald-200">
                      ✓ Order Fully Paid
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Confirmation Dialogs */}
        <AlertDialog open={confirmOrderDialogOpen} onOpenChange={setConfirmOrderDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Order?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to confirm this order? The planned warehouse must be set. The order status will change to Confirmed, enabling payment collection.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={confirmingOrder}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirmOrder();
                }}
                disabled={confirmingOrder}
                className="bg-[#00823b] hover:bg-[#00823b]/90 text-white"
              >
                {confirmingOrder ? "Confirming..." : "Confirm Order"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <B2bCancelOrderDialog
          open={cancelOrderDialogOpen}
          onOpenChange={setCancelOrderDialogOpen}
          order={order}
          eligibility={cancelEligibility}
          onConfirm={handleCancelOrder}
          loading={cancellingOrder}
        />
      </div>
    </ProtectedRoute>
  );
}
