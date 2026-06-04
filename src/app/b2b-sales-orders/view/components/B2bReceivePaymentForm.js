"use client";

import { useEffect, useRef, useState } from "react";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import Input from "@/components/common/Input";
import { Button } from "@/components/ui/button";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import { listBankAccounts } from "@/services/companyService";
import b2bOrderPaymentsService from "@/services/b2bOrderPaymentsService";
import { toastError, toastSuccess } from "@/utils/toast";

export default function B2bReceivePaymentForm({
  orderId,
  onPaymentSaved,
  maxPaymentAmount = 0,
  totalReceivedAmount = 0,
  payableAmount = 0,
}) {
  const [formData, setFormData] = useState({
    b2b_sales_order_id: orderId,
    date_of_payment: "",
    payment_amount: "",
    payment_mode_id: "",
    company_bank_account_id: "",
    transaction_cheque_date: "",
    transaction_cheque_number: "",
    payment_remarks: "",
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [companyBankAccounts, setCompanyBankAccounts] = useState([]);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    setFormData((p) => ({ ...p, b2b_sales_order_id: orderId }));
  }, [orderId]);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    listBankAccounts()
      .then((res) => {
        const accounts = Array.isArray(res?.result) ? res.result : Array.isArray(res?.data) ? res.data : [];
        setCompanyBankAccounts(accounts);
        if (accounts.length === 1) {
          setFormData((prev) => ({ ...prev, company_bank_account_id: String(accounts[0].id) }));
        }
      })
      .catch(() => {});
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleSave = async () => {
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
        newErrors.payment_amount = `Cannot exceed outstanding Rs. ${maxPaymentAmount.toLocaleString("en-IN")}`;
      }
      if (!formData.payment_mode_id) newErrors.payment_mode_id = "Required";
      if (!formData.company_bank_account_id) newErrors.company_bank_account_id = "Required";
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      if (payAmount < 0) {
        const ok = window.confirm("Negative amount reduces recorded receipts. Continue?");
        if (!ok) return;
      }
      const fd = new FormData();
      Object.keys(formData).forEach((k) => {
        if (formData[k]) fd.append(k, formData[k]);
      });
      if (receiptFile) fd.append("receipt_cheque_file", receiptFile);
      await b2bOrderPaymentsService.createPayment(fd);
      toastSuccess("Payment saved successfully");
      const defaultAcc = companyBankAccounts.length === 1 ? String(companyBankAccounts[0].id) : "";
      setFormData({
        b2b_sales_order_id: orderId,
        date_of_payment: "",
        payment_amount: "",
        payment_mode_id: "",
        company_bank_account_id: defaultAcc,
        transaction_cheque_date: "",
        transaction_cheque_number: "",
        payment_remarks: "",
      });
      setReceiptFile(null);
      setFileInputKey(Date.now());
      onPaymentSaved?.();
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to save payment");
    } finally {
      setLoading(false);
    }
  };

  const canRecord = maxPaymentAmount > 0 || totalReceivedAmount > 0;

  return (
    <div className="p-2 space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <DateField
          label="Date of Payment"
          name="date_of_payment"
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
          helperText={errors.payment_amount || `Outstanding max Rs. ${maxPaymentAmount.toLocaleString("en-IN")}`}
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
          placeholder="Type to search..."
          error={!!errors.payment_mode_id}
        />
        <AutocompleteField
          name="company_bank_account_id"
          label="Company Bank Account"
          required
          options={companyBankAccounts}
          getOptionLabel={(acc) => `${acc?.bank_name ?? ""} - ${acc?.bank_account_number ?? ""}`}
          value={
            companyBankAccounts.find((a) => String(a.id) === formData.company_bank_account_id) || null
          }
          onChange={(e, v) => handleChange("company_bank_account_id", v?.id != null ? String(v.id) : "")}
          error={!!errors.company_bank_account_id}
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
        <div className="flex items-end gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <label className="cursor-pointer">
              Upload Receipt
              <input
                key={fileInputKey}
                type="file"
                hidden
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              />
            </label>
          </Button>
          {receiptFile && <span className="text-xs text-slate-600 truncate">{receiptFile.name}</span>}
        </div>
      </div>
      <Input
        label="Payment Remarks"
        multiline
        rows={2}
        value={formData.payment_remarks}
        onChange={(e) => handleChange("payment_remarks", e.target.value)}
      />
      <Button type="button" size="sm" onClick={handleSave} disabled={loading || !canRecord}>
        {loading ? "Saving…" : "Save"}
      </Button>
      <p className="text-[10px] text-slate-500">Order value Rs. {payableAmount.toLocaleString("en-IN")}</p>
    </div>
  );
}
