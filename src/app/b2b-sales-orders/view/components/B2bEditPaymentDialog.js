"use client";

import { useEffect, useState } from "react";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import Input from "@/components/common/Input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import { listBankAccounts } from "@/services/companyService";
import b2bOrderPaymentsService from "@/services/b2bOrderPaymentsService";
import { toastError, toastSuccess } from "@/utils/toast";

export default function B2bEditPaymentDialog({ open, payment, maxPaymentAmount, onClose, onSaved }) {
  const [formData, setFormData] = useState({});
  const [receiptFile, setReceiptFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [companyBankAccounts, setCompanyBankAccounts] = useState([]);

  useEffect(() => {
    if (!open || !payment) return;
    setFormData({
      date_of_payment: payment.date_of_payment ? String(payment.date_of_payment).slice(0, 10) : "",
      payment_amount: payment.payment_amount != null ? String(payment.payment_amount) : "",
      payment_mode_id: payment.payment_mode_id ? String(payment.payment_mode_id) : "",
      company_bank_account_id: payment.company_bank_account_id
        ? String(payment.company_bank_account_id)
        : "",
      transaction_cheque_date: payment.transaction_cheque_date
        ? String(payment.transaction_cheque_date).slice(0, 10)
        : "",
      transaction_cheque_number: payment.transaction_cheque_number || "",
      payment_remarks: payment.payment_remarks || "",
    });
    setReceiptFile(null);
    setFileInputKey(Date.now());
    setErrors({});
    listBankAccounts()
      .then((res) => {
        const accounts = Array.isArray(res?.result) ? res.result : Array.isArray(res?.data) ? res.data : [];
        setCompanyBankAccounts(accounts);
      })
      .catch(() => {});
  }, [open, payment]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleSave = async () => {
    if (!payment?.id) return;
    try {
      setLoading(true);
      setErrors({});
      const newErrors = {};
      const EPS = 1e-6;
      if (!formData.date_of_payment) newErrors.date_of_payment = "Required";
      const payAmount = parseFloat(String(formData.payment_amount || "").replace(/,/g, ""));
      if (!formData.payment_amount || !Number.isFinite(payAmount) || Math.abs(payAmount) < EPS) {
        newErrors.payment_amount = "Required non-zero amount";
      } else if (payAmount > 0 && maxPaymentAmount > 0 && payAmount > maxPaymentAmount + EPS) {
        newErrors.payment_amount = `Cannot exceed Rs. ${maxPaymentAmount.toLocaleString("en-IN")}`;
      }
      if (!formData.payment_mode_id) newErrors.payment_mode_id = "Required";
      if (!formData.company_bank_account_id) newErrors.company_bank_account_id = "Required";
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      const fd = new FormData();
      Object.keys(formData).forEach((k) => {
        if (formData[k] != null && formData[k] !== "") fd.append(k, formData[k]);
      });
      if (receiptFile) fd.append("receipt_cheque_file", receiptFile);
      await b2bOrderPaymentsService.updatePayment(payment.id, fd);
      toastSuccess("Payment updated");
      onSaved?.();
      onClose?.();
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to update payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit payment</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <DateField
            label="Date of Payment"
            required
            value={formData.date_of_payment}
            onChange={(e) => handleChange("date_of_payment", e.target.value)}
            error={!!errors.date_of_payment}
            helperText={errors.date_of_payment}
          />
          <Input
            label="Payment Amount"
            type="number"
            required
            value={formData.payment_amount}
            onChange={(e) => handleChange("payment_amount", e.target.value)}
            error={!!errors.payment_amount}
            helperText={errors.payment_amount}
          />
          <AutocompleteField
            name="payment_mode_id"
            label="Payment Mode"
            required
            asyncLoadOptions={(q) => getReferenceOptionsSearch("payment_mode.model", { q, limit: 20 })}
            referenceModel="payment_mode.model"
            getOptionLabel={(o) => o?.name ?? ""}
            value={formData.payment_mode_id ? { id: formData.payment_mode_id } : null}
            onChange={(e, v) => handleChange("payment_mode_id", v?.id ?? "")}
          />
          <AutocompleteField
            name="company_bank_account_id"
            label="Company Bank Account"
            required
            options={companyBankAccounts}
            getOptionLabel={(acc) => `${acc?.bank_name ?? ""} - ${acc?.bank_account_number ?? ""}`}
            value={
              companyBankAccounts.find((a) => String(a.id) === formData.company_bank_account_id) ||
              null
            }
            onChange={(e, v) =>
              handleChange("company_bank_account_id", v?.id != null ? String(v.id) : "")
            }
          />
          <DateField
            label="Transaction / Cheque Date"
            value={formData.transaction_cheque_date}
            onChange={(e) => handleChange("transaction_cheque_date", e.target.value)}
          />
          <Input
            label="Transaction / Cheque No."
            value={formData.transaction_cheque_number}
            onChange={(e) => handleChange("transaction_cheque_number", e.target.value)}
          />
          <div className="sm:col-span-2 flex items-end gap-2">
            <Button type="button" variant="outline" size="sm" asChild>
              <label className="cursor-pointer">
                Replace receipt
                <input
                  key={fileInputKey}
                  type="file"
                  hidden
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                />
              </label>
            </Button>
            {receiptFile && (
              <span className="text-xs text-slate-600 truncate">{receiptFile.name}</span>
            )}
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Payment Remarks"
              multiline
              rows={2}
              value={formData.payment_remarks}
              onChange={(e) => handleChange("payment_remarks", e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
