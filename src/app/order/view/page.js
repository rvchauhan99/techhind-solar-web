"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useListReturnNavigation } from "@/hooks/useListReturnNavigation";
import {
    Box,
    Typography,
    CircularProgress,
    Alert,
    Grid,
    Paper,
    Chip,
    Divider,
    Button,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Card,
    CardContent,
    CardHeader,
    Avatar,
    Stack,
} from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import PersonIcon from "@mui/icons-material/Person";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PaymentIcon from "@mui/icons-material/Payment";
import BusinessIcon from "@mui/icons-material/Business";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import orderService from "@/services/orderService";
import orderDocumentsService from "@/services/orderDocumentsService";
import orderPaymentsService from "@/services/orderPaymentsService";
import mastersService from "@/services/mastersService";
import companyService from "@/services/companyService";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaymentProofViewButton from "@/components/common/PaymentProofViewButton";
import { toastSuccess, toastError } from "@/utils/toast";
import {
    getOrderOutstandingAmount,
    getOrderReceivedAmount,
    getOrderProjectCostAmount,
    getOrderCommittedAmount,
    getOrderCommittedOutstandingAmount,
    getOrderAllowOverpayment,
} from "@/utils/orderPaymentSummary";
import { getOrderCancelEligibility } from "@/utils/orderCancelEligibility";
import { getFullOrderAddress, getPrimaryPhone, formatRupeesInteger } from "@/utils/orderFormatters";
import moment from "moment";
import QuotationDetailsDrawer from "@/components/common/QuotationDetailsDrawer";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { RBAC_CONFIG_KEYS } from "@/lib/platformRoleAccess";
import { PendingStageStrip, LkycPanel, TkycPanel, OrderQueryPanel } from "./OrderPendingWorkflow";
import { fetchPendingOrderKycEnabled } from "@/utils/pendingOrderKycConfig";
import { Button as UiButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LEGACY_ORDER_DOC_TYPE_LABELS = {
    electricity_bill: "Electricity Bill",
    house_tax_bill: "House Tax Bill",
    aadhar_card: "Aadhar Card",
    passport_photo: "Passport Size Picture",
    pan_card: "PAN Card or Driving Licence",
    cancelled_cheque: "Cancelled Cheque",
    customer_sign: "Customer Sign",
    registration_letter: "Registration Letter",
    payment_receipt: "Payment Receipt",
};

const resolveOrderDocTypeLabel = (docType, masterTypes = []) => {
    if (!docType) return "";
    const str = String(docType);
    const found = Array.isArray(masterTypes) ? masterTypes.find((t) => t?.type === str) : null;
    if (found?.type) return found.type;
    return LEGACY_ORDER_DOC_TYPE_LABELS[str] || str;
};

const getValidationStatusMeta = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "approved") return { label: "Approved", variant: "success" };
    if (s === "rejected") return { label: "Rejected", variant: "destructive" };
    if (s === "pending") return { label: "Pending", variant: "accent" };
    return { label: "-", variant: "secondary" };
};

const ORDER_TABS = [
    { value: 6, label: "L-KYC" },
    { value: 7, label: "T-KYC" },
    { value: 0, label: "Registration" },
    { value: 1, label: "Documents" },
    { value: 2, label: "Receive Payment" },
    { value: 3, label: "Previous Payments" },
    { value: 4, label: "Remarks" },
    { value: 5, label: "Upload Documents" },
];

function RegistrationForm({ orderData, orderId, orderDocumentTypes = [], locked = false }) {
    const router = useRouter();
  const { goToList } = useListReturnNavigation("/order");
    const [formData, setFormData] = useState({
        discom_id: "",
        division_id: "",
        sub_division_id: "",
        date_of_registration_gov: "",
        application_no: "",
        feasibility_date: "",
        pm_application_status: "not_applied",
    });
    const [registrationLetter, setRegistrationLetter] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (orderData) {
            setFormData({
                discom_id: orderData.discom_id || "",
                division_id: orderData.division_id || "",
                sub_division_id: orderData.sub_division_id || "",
                date_of_registration_gov: orderData.date_of_registration_gov ? moment(orderData.date_of_registration_gov).format("YYYY-MM-DD") : "",
                application_no: orderData.application_no || "",
                feasibility_date: orderData.feasibility_date ? moment(orderData.feasibility_date).format("YYYY-MM-DD") : "",
                pm_application_status: orderData.pm_application_status || "not_applied",
            });
        }
    }, [orderData]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
        setSuccess(false);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setRegistrationLetter(file);
        setSuccess(false);
    };

    const handleSave = async () => {
        if (loading || locked) return;
        try {
            setLoading(true);
            setErrors({});
            setSuccess(false);

            // Validate required fields
            const newErrors = {};
            if (!formData.discom_id) newErrors.discom_id = "Discom is required";
            if (!formData.division_id) newErrors.division_id = "Division is required";
            if (!formData.sub_division_id) newErrors.sub_division_id = "Sub Division is required";
            if (!formData.date_of_registration_gov) newErrors.date_of_registration_gov = "Date of Registration is required";
            if (!formData.application_no) newErrors.application_no = "Application No is required";
            if (!formData.feasibility_date) newErrors.feasibility_date = "Date of Feasibility is required";

            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                setLoading(false);
                return;
            }

            // Update order with registration details and change status to confirmed
            await orderService.updateOrderKyc(orderId, {
                stage: "registration",
                pm_application_status: formData.pm_application_status || "not_applied",
            });
            await orderService.updateOrder(orderId, { ...formData, status: 'confirmed' });

            // Upload registration letter if provided
            if (registrationLetter) {
                const registrationType = (orderDocumentTypes || []).find((t) => t?.type === "Registration Letter");
                if (!registrationType) {
                    const msg = "Please add 'Registration Letter' in Masters → Order Document Type, then upload again.";
                    setErrors({ submit: msg });
                    toastError(msg);
                    return;
                }
                const formDataUpload = new FormData();
                formDataUpload.append('document', registrationLetter);
                formDataUpload.append('order_id', orderId);
                formDataUpload.append('doc_type', registrationType.type);
                formDataUpload.append('remarks', 'Registration Letter');

                await orderDocumentsService.createOrderDocument(formDataUpload);
            }

            setSuccess(true);
            toastSuccess("Registration details saved successfully");
            goToList();
        } catch (err) {
            console.error("Failed to save registration details:", err);
            const msg = err?.response?.data?.message || err?.message || "Failed to save registration details";
            setErrors({ submit: msg });
            toastError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box p={1}>
            {locked ? (
                <Alert severity="warning" sx={{ mb: 1 }}>
                    Registration is locked until L-KYC and T-KYC are both Passed.
                </Alert>
            ) : null}
            <Grid container spacing={1}>
                <Grid size={4}>
                    <AutocompleteField
                        name="discom_id"
                        label="Discom"
                        required
                        asyncLoadOptions={(q) => getReferenceOptionsSearch("discom.model", { q, limit: 20 })}
                        referenceModel="discom.model"
                        getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
                        value={formData.discom_id ? { id: formData.discom_id } : null}
                        onChange={(e, newValue) => handleChange("discom_id", newValue?.id ?? "")}
                        placeholder="Type to search..."
                        error={!!errors.discom_id}
                        helperText={errors.discom_id}
                    />
                </Grid>

                <Grid size={4}>
                    <AutocompleteField
                        name="division_id"
                        label="Division"
                        required
                        asyncLoadOptions={(q) => getReferenceOptionsSearch("division.model", { q, limit: 20 })}
                        referenceModel="division.model"
                        getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
                        value={formData.division_id ? { id: formData.division_id } : null}
                        onChange={(e, newValue) => handleChange("division_id", newValue?.id ?? "")}
                        placeholder="Type to search..."
                        error={!!errors.division_id}
                        helperText={errors.division_id}
                    />
                </Grid>

                <Grid size={4}>
                    <AutocompleteField
                        name="sub_division_id"
                        label="Sub Division"
                        required
                        asyncLoadOptions={(q) => getReferenceOptionsSearch("sub_division.model", { q, limit: 20 })}
                        referenceModel="sub_division.model"
                        getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
                        value={formData.sub_division_id ? { id: formData.sub_division_id } : null}
                        onChange={(e, newValue) => handleChange("sub_division_id", newValue?.id ?? "")}
                        placeholder="Type to search..."
                        error={!!errors.sub_division_id}
                        helperText={errors.sub_division_id}
                    />
                </Grid>

                <Grid size={4}>
                    <DateField
                        fullWidth
                        label="Date of Registration"
                        required
                        name="date_of_registration_gov"
                        value={formData.date_of_registration_gov}
                        onChange={(e) => handleChange("date_of_registration_gov", e.target.value)}
                        error={!!errors.date_of_registration_gov}
                        helperText={errors.date_of_registration_gov}
                    />
                </Grid>

                <Grid size={4}>
                    <Input
                        fullWidth
                        label="Application No"
                        name="application_no"
                        required
                        value={formData.application_no}
                        onChange={(e) => handleChange('application_no', e.target.value)}
                        error={!!errors.application_no}
                        helperText={errors.application_no}
                    />
                </Grid>

                <Grid size={4}>
                    <DateField
                        fullWidth
                        label="Date of Feasibility"
                        name="feasibility_date"
                        required
                        value={formData.feasibility_date}
                        onChange={(e) => handleChange("feasibility_date", e.target.value)}
                        error={!!errors.feasibility_date}
                        helperText={errors.feasibility_date}
                    />
                </Grid>

                <Grid size={4}>
                    <Select
                        name="pm_application_status"
                        label="PM application status"
                        value={formData.pm_application_status || "not_applied"}
                        onChange={(e) => handleChange("pm_application_status", e.target.value)}
                        disabled={locked}
                    >
                        <MenuItem value="not_applied">Not applied</MenuItem>
                        <MenuItem value="submitted">Application submitted</MenuItem>
                        <MenuItem value="under_process">Under process</MenuItem>
                        <MenuItem value="feasibility_completed">Feasibility completed</MenuItem>
                        <MenuItem value="approved">Approved</MenuItem>
                        <MenuItem value="rejected">Rejected</MenuItem>
                    </Select>
                </Grid>

                <Grid size={12}>
                    <p className="mb-1 text-xs text-slate-500">Upload Registration Letter</p>
                    <div className="flex flex-wrap items-center gap-2">
                        <UiButton type="button" size="sm" variant="outline" asChild>
                            <label className="cursor-pointer">
                                Choose File
                                <input
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleFileChange}
                                />
                            </label>
                        </UiButton>
                        {registrationLetter ? (
                            <span className="text-xs text-slate-500">{registrationLetter.name}</span>
                        ) : null}
                    </div>
                </Grid>

                {errors.submit && (
                    <Grid size={12}>
                        <Alert severity="error">{errors.submit}</Alert>
                    </Grid>
                )}

                {success && (
                    <Grid size={12}>
                        <Alert severity="success">Registration details saved successfully!</Alert>
                    </Grid>
                )}

                <Grid size={12}>
                    <UiButton
                        type="button"
                        size="sm"
                        onClick={handleSave}
                        disabled={loading || locked}
                        loading={loading}
                    >
                        Save
                    </UiButton>
                </Grid>
            </Grid>
        </Box>
    );
}

function ReceivePaymentForm({
    orderId,
    onPaymentSaved,
    orderDocumentTypes = [],
    maxPaymentAmount = 0,
    totalReceivedAmount = 0,
    totalCommittedAmount = 0,
    projectCostAmount = 0,
    allowOverpayment = false,
}) {
    const [formData, setFormData] = useState({
        order_id: orderId,
        date_of_payment: "",
        payment_amount: "",
        payment_mode_id: "",
        company_bank_account_id: "",
        transaction_cheque_date: "",
        transaction_cheque_number: "",
        payment_remarks: "",
    });
    const [receiptFile, setReceiptFile] = useState(null);
    const [fileInputKey, setFileInputKey] = useState(Date.now()); // Key to reset file input
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState(false);

    const [companyBankAccounts, setCompanyBankAccounts] = useState([]);

    const hasLoadedRef = useRef(false);

    useEffect(() => {
        if (hasLoadedRef.current) return;
        hasLoadedRef.current = true;

        const fetchMasterData = async () => {
            try {
                const bankAccountsRes = await companyService.listBankAccounts();
                const accounts = Array.isArray(bankAccountsRes?.result) ? bankAccountsRes.result : (Array.isArray(bankAccountsRes?.data) ? bankAccountsRes.data : []);
                setCompanyBankAccounts(accounts);
                if (accounts.length === 1) {
                    setFormData((prev) => ({ ...prev, company_bank_account_id: String(accounts[0].id) }));
                }
            } catch (err) {
                console.error("Failed to fetch master data:", err);
            }
        };
        fetchMasterData();
    }, []);

    // Auto-select when company bank accounts load and there is exactly one
    useEffect(() => {
        if (companyBankAccounts.length === 1 && !formData.company_bank_account_id) {
            setFormData((prev) => ({ ...prev, company_bank_account_id: String(companyBankAccounts[0].id) }));
        }
    }, [companyBankAccounts]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
        setSuccess(false);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setReceiptFile(file);
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            setErrors({});

            // Validate required fields
            const newErrors = {};
            const EPS = 1e-6;
            if (!formData.date_of_payment) newErrors.date_of_payment = "Date of Payment is required";
            const payAmount = parseFloat(String(formData.payment_amount || "").replace(/,/g, ""));
            const nextCommitted = totalCommittedAmount + payAmount;
            if (!formData.payment_amount || !Number.isFinite(payAmount) || Math.abs(payAmount) < EPS) {
                newErrors.payment_amount = "Payment Amount is required and must be non-zero";
            } else if (nextCommitted < -EPS) {
                newErrors.payment_amount =
                    "Adjustment cannot exceed recorded receipts (total cannot go below zero).";
            } else if (!allowOverpayment && payAmount > 0 && maxPaymentAmount >= 0 && payAmount > maxPaymentAmount + EPS) {
                newErrors.payment_amount =
                    `Approved + pending cannot exceed order value (max Rs. ${maxPaymentAmount.toLocaleString("en-IN")} additional).`;
            } else if (!allowOverpayment && nextCommitted > projectCostAmount + EPS) {
                const cap = Math.round((projectCostAmount - totalCommittedAmount) * 100) / 100;
                newErrors.payment_amount =
                    `Approved + pending cannot exceed order value (max Rs. ${cap.toLocaleString("en-IN")} additional).`;
            }
            if (!formData.payment_mode_id) newErrors.payment_mode_id = "Payment Mode is required";
            if (!formData.company_bank_account_id) newErrors.company_bank_account_id = "Company Bank Account is required";

            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                setLoading(false);
                return;
            }

            if (payAmount < 0) {
                const ok = window.confirm(
                    "Negative amount is a reversal/adjustment: it reduces recorded receipts for this order. Save anyway?"
                );
                if (!ok) {
                    setLoading(false);
                    return;
                }
            }

            if (allowOverpayment && payAmount > 0 && nextCommitted > projectCostAmount + EPS) {
                const overBy = Math.round((nextCommitted - projectCostAmount) * 100) / 100;
                const ok = window.confirm(
                    `This payment would push approved + pending receipts above the order amount by Rs. ${overBy.toLocaleString("en-IN")}. Save anyway?`
                );
                if (!ok) {
                    setLoading(false);
                    return;
                }
            }

            const formDataUpload = new FormData();
            Object.keys(formData).forEach(key => {
                if (formData[key]) formDataUpload.append(key, formData[key]);
            });

            if (receiptFile) {
                formDataUpload.append('receipt_cheque_file', receiptFile);
            }

            await orderPaymentsService.createPayment(formDataUpload);

            // Also save receipt to order_documents if file exists
            if (receiptFile) {
                try {
                    const receiptType = (orderDocumentTypes || []).find((t) => t?.type === "Payment Receipt");
                    if (!receiptType) {
                        toastError("Please add 'Payment Receipt' in Masters → Order Document Type to save receipt in Documents.");
                        return;
                    }
                    const docFormData = new FormData();
                    docFormData.append('document', receiptFile);
                    docFormData.append('order_id', orderId);
                    docFormData.append('doc_type', receiptType.type);
                    docFormData.append('remarks', `Payment Receipt - ${formData.date_of_payment}`);
                    await orderDocumentsService.createOrderDocument(docFormData);
                } catch (docErr) {
                    console.error("Failed to save receipt to order_documents:", docErr);
                    // Don't fail the whole operation if document save fails
                }
            }

            setSuccess(true);
            toastSuccess("Payment saved successfully");
            const defaultCompanyAccount = companyBankAccounts.length === 1 ? String(companyBankAccounts[0].id) : "";
            setFormData({
                order_id: orderId,
                date_of_payment: "",
                payment_amount: "",
                payment_mode_id: "",
                company_bank_account_id: defaultCompanyAccount,
                transaction_cheque_date: "",
                transaction_cheque_number: "",
                payment_remarks: "",
            });
            setReceiptFile(null);
            setFileInputKey(Date.now());

            if (onPaymentSaved) {
                onPaymentSaved();
            }

            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error("Failed to save payment:", err);
            const msg = err?.response?.data?.message || err?.message || "Failed to save payment";
            setErrors({ submit: msg });
            toastError(msg);
        } finally {
            setLoading(false);
        }
    };

    const canRecordPayment = allowOverpayment || maxPaymentAmount > 0 || totalReceivedAmount > 0 || totalCommittedAmount > 0;
    const minPaymentAmount = -totalCommittedAmount;
    const maxPaymentField = allowOverpayment
        ? null
        : Math.max(0, projectCostAmount - totalCommittedAmount);

    return (
        <Box p={1}>
            <Grid container spacing={1}>
                <Grid size={3}>
                    <DateField
                        fullWidth
                        label="Date of Payment"
                        name="date_of_payment"
                        required
                        value={formData.date_of_payment}
                        onChange={(e) => handleChange("date_of_payment", e.target.value)}
                        error={!!errors.date_of_payment}
                        helperText={errors.date_of_payment}
                    />
                </Grid>

                <Grid size={3}>
                    <Input
                        fullWidth
                        label="Payment Amount"
                        type="number"
                        name="payment_amount"
                        required
                        value={formData.payment_amount}
                        onChange={(e) => handleChange('payment_amount', e.target.value)}
                        error={!!errors.payment_amount}
                        helperText={
                            errors.payment_amount
                            || (canRecordPayment
                                ? (allowOverpayment
                                    ? `Min Rs. ${minPaymentAmount.toLocaleString("en-IN")} (overpayment allowed; use negative to reverse)`
                                    : `Range Rs. ${minPaymentAmount.toLocaleString("en-IN")} to Rs. ${Number(maxPaymentField || 0).toLocaleString("en-IN")} (use negative to reverse)`)
                                : "No receipts to adjust and no outstanding")
                        }
                        inputProps={
                            canRecordPayment
                                ? {
                                    min: minPaymentAmount,
                                    ...(maxPaymentField != null ? { max: maxPaymentField } : {}),
                                    step: "any",
                                }
                                : { min: 0, max: 0, step: "any" }
                        }
                    />
                </Grid>

                <Grid size={3}>
                    <AutocompleteField
                        name="payment_mode_id"
                        label="Payment Mode"
                        required
                        asyncLoadOptions={(q) => getReferenceOptionsSearch("payment_mode.model", { q, limit: 20 })}
                        referenceModel="payment_mode.model"
                        getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
                        value={formData.payment_mode_id ? { id: formData.payment_mode_id } : null}
                        onChange={(e, newValue) => handleChange("payment_mode_id", newValue?.id ?? "")}
                        placeholder="Type to search..."
                        error={!!errors.payment_mode_id}
                        helperText={errors.payment_mode_id}
                    />
                </Grid>

                <Grid size={3}>
                    <AutocompleteField
                        name="company_bank_account_id"
                        label="Company Bank Account"
                        required
                        options={companyBankAccounts}
                        getOptionLabel={(acc) => `${acc?.bank_name ?? ""} - ${acc?.bank_account_number ?? ""}${acc?.bank_account_name ? ` (${acc.bank_account_name})` : ""}`}
                        value={companyBankAccounts.find((acc) => String(acc.id) === formData.company_bank_account_id) || (formData.company_bank_account_id ? { id: formData.company_bank_account_id } : null)}
                        onChange={(e, newValue) => handleChange("company_bank_account_id", newValue?.id != null ? String(newValue.id) : "")}
                        placeholder="Type to search..."
                        error={!!errors.company_bank_account_id}
                        helperText={errors.company_bank_account_id}
                    />
                </Grid>

                <Grid size={3}>
                    <DateField
                        fullWidth
                        label="Transaction / Cheque Date"
                        name="transaction_cheque_date"
                        value={formData.transaction_cheque_date}
                        onChange={(e) => handleChange("transaction_cheque_date", e.target.value)}
                    />
                </Grid>

                <Grid size={3}>
                    <Input
                        fullWidth
                        label="Transaction / Cheque No."
                        name="transaction_cheque_number"
                        value={formData.transaction_cheque_number}
                        onChange={(e) => handleChange('transaction_cheque_number', e.target.value)}
                    />
                </Grid>

                <Grid size={3}>
                    <p className="mb-1 text-xs text-slate-500">Upload Receipt / Cheque</p>
                    <div className="flex flex-wrap items-center gap-2">
                        <UiButton type="button" size="sm" variant="outline" asChild>
                            <label className="cursor-pointer">
                                Choose File
                                <input
                                    key={fileInputKey}
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleFileChange}
                                />
                            </label>
                        </UiButton>
                        {receiptFile ? <span className="text-xs text-slate-500">{receiptFile.name}</span> : null}
                    </div>
                </Grid>

                <Grid size={12}>
                    <Input
                        fullWidth
                        label="Payment Remarks"
                        name="payment_remarks"
                        multiline
                        rows={2}
                        value={formData.payment_remarks}
                        onChange={(e) => handleChange('payment_remarks', e.target.value)}
                    />
                </Grid>
                {errors.submit && (
                    <Grid size={12}>
                        <Alert severity="error">{errors.submit}</Alert>
                    </Grid>
                )}

                {success && (
                    <Grid size={12}>
                        <Alert severity="success">Payment saved successfully!</Alert>
                    </Grid>
                )}

                <Grid size={12}>
                    <UiButton
                        type="button"
                        size="sm"
                        onClick={handleSave}
                        disabled={loading || !canRecordPayment}
                        loading={loading}
                    >
                        Save
                    </UiButton>
                </Grid>

            </Grid>
        </Box>
    );
}
const calculatedTableHeight = () => {
    return `calc(100vh - 153px)`;
};
function PreviousPaymentsTable({ orderId }) {
    const fetchPayments = async (params) => {
        const result = await orderPaymentsService.getPayments({
            ...params,
            order_id: orderId,
        });
        return result;
    };

    const handlePrintReceipt = async (id) => {
        try {
            const { blob, filename } = await orderPaymentsService.downloadReceiptPDF(id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to download payment receipt:", err);
            const msg = err?.response?.data?.message || err?.message || "Failed to download payment receipt";
            toastError(msg);
        }
    };

    const paymentsColumns = [
        {
            id: "date_of_payment",
            label: "Date",
            field: "date_of_payment",
            sortable: true,
            render: (row) => moment(row.date_of_payment).format("DD-MM-YYYY"),
        },
        {
            id: "payment_amount",
            label: "Amount",
            field: "payment_amount",
            render: (row) => {
                const n = Number(row.payment_amount);
                const isRev = Number.isFinite(n) && n < 0;
                return (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                        <Typography component="span" variant="body2" color={isRev ? "warning.main" : "inherit"}>
                            ₹{n.toLocaleString("en-IN")}
                        </Typography>
                        {isRev && <Badge variant="accent">REV</Badge>}
                    </Box>
                );
            },
        },
        {
            id: "payment_mode_name",
            label: "Payment Mode",
            field: "payment_mode_name",
            render: (row) => row.payment_mode_name || "-",
        },
        {
            id: "company_bank",
            label: "Company Bank Account",
            field: "company_bank_name",
            render: (row) =>
                row.company_bank_name && row.company_bank_account_number
                    ? `${row.company_bank_name} - ${row.company_bank_account_number}`
                    : "-",
        },
        {
            id: "transaction_cheque_number",
            label: "Transaction/Cheque No.",
            field: "transaction_cheque_number",
            render: (row) => row.transaction_cheque_number || "-",
        },
        {
            id: "payment_remarks",
            label: "Remarks",
            field: "payment_remarks",
            render: (row) => {
                const hasReceive = !!row.payment_remarks;
                const hasApprove = row.status === "approved" && !!row.approval_remarks;
                const hasReject = row.status === "rejected" && !!row.rejection_reason;

                if (!hasReceive && !hasApprove && !hasReject) {
                    return "-";
                }

                return (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                        {hasReceive && (
                            <Tooltip title={row.payment_remarks}>
                                <span style={{ fontSize: "0.7rem", lineHeight: 1.2 }}>
                                    <strong>Receive:</strong> {row.payment_remarks}
                                </span>
                            </Tooltip>
                        )}
                        {hasApprove && (
                            <Tooltip title={row.approval_remarks}>
                                <span style={{ fontSize: "0.7rem", lineHeight: 1.2 }}>
                                    <strong>Approve:</strong> {row.approval_remarks}
                                </span>
                            </Tooltip>
                        )}
                        {hasReject && (
                            <Tooltip title={row.rejection_reason}>
                                <span style={{ fontSize: "0.7rem", lineHeight: 1.2 }}>
                                    <strong>Reject:</strong> {row.rejection_reason}
                                </span>
                            </Tooltip>
                        )}
                    </Box>
                );
            },
        },
        {
            id: "status",
            label: "Status",
            field: "status",
            render: (row) => {
                const label = row.status === "approved"
                    ? "Approved"
                    : row.status === "rejected"
                        ? "Rejected"
                        : "Pending";
                const variant =
                    row.status === "approved" ? "success" : row.status === "rejected" ? "destructive" : "accent";
                return <Badge variant={variant}>{label}</Badge>;
            },
        },
        {
            id: "attachment",
            label: "Attachment",
            field: "receipt_cheque_file",
            isActionColumn: true,
            render: (row) => (
                <PaymentProofViewButton
                    paymentId={row.id}
                    hasFile={!!row.receipt_cheque_file}
                    fetchUrl={orderPaymentsService.getReceiptUrl}
                    label="View"
                />
            ),
        },
        {
            id: "actions",
            label: "Actions",
            field: "actions",
            isActionColumn: true,
            render: (row) => {
                const isApproved = row.status === "approved";
                return (
                    <div className="flex flex-wrap gap-1">
                        {isApproved && (
                            <UiButton
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handlePrintReceipt(row.id)}
                            >
                                Print Receipt
                            </UiButton>
                        )}
                    </div>
                );
            },
        },
    ];

    return (
        <PaginatedTable
            columns={paymentsColumns}
            fetcher={fetchPayments}
            initialPage={1}
            initialLimit={10}
            showSearch={true}
            height={calculatedTableHeight()}
            getRowKey={(row) => row.id}
        />
    );
}

function RemarksForm({ orderData, orderId }) {
    const [remarks, setRemarks] = useState(orderData?.order_remarks || "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (orderData?.order_remarks) {
            setRemarks(orderData.order_remarks);
        }
    }, [orderData]);

    const handleSave = async () => {
        try {
            setLoading(true);
            setError(null);
            await orderService.updateOrder(orderId, { order_remarks: remarks });
            setSuccess(true);
            toastSuccess("Remarks saved successfully");
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error("Failed to save remarks:", err);
            const msg = err?.response?.data?.message || err?.message || "Failed to save remarks";
            setError(msg);
            toastError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box p={1}>
            <Grid container spacing={1}>
                <Grid size={12}>
                    <Input
                        fullWidth
                        label="Order Remarks"
                        multiline
                        rows={4}
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Enter any remarks or notes about this order..."
                    />
                </Grid>

                {error && (
                    <Grid size={12}>
                        <Alert severity="error">{error}</Alert>
                    </Grid>
                )}

                {success && (
                    <Grid size={12}>
                        <Alert severity="success">Remarks saved successfully!</Alert>
                    </Grid>
                )}

                <Grid size={12}>
                    <UiButton type="button" size="sm" onClick={handleSave} disabled={loading} loading={loading}>
                        Save Remarks
                    </UiButton>
                </Grid>
            </Grid>
        </Box>
    );
}

function UploadDocumentsForm({
    orderId,
    orderData = null,
    orderDocumentTypes = [],
    loadingDocumentTypes = false,
}) {
    const [formData, setFormData] = useState({
        doc_type: "",
        remarks: "",
    });
    const [documentFile, setDocumentFile] = useState(null);
    const [fileInputKey, setFileInputKey] = useState(Date.now()); // Key to reset file input
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState(false);
    const isPdcPaymentType = orderData?.pdc_validation_required === true;

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setDocumentFile(file);
        }
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            setErrors({});

            // Validate
            const newErrors = {};
            if (!formData.doc_type) newErrors.doc_type = "Document Type is required";
            if (!documentFile) newErrors.document = "Document File is required";

            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                setLoading(false);
                return;
            }

            const selectedDocType = String(formData.doc_type || "").trim();

            const normalizedDocType = selectedDocType.toLowerCase() === "pdc" ? "PDC" : selectedDocType;

            const uploadFormData = new FormData();
            uploadFormData.append('document', documentFile);
            uploadFormData.append('order_id', orderId);
            uploadFormData.append('doc_type', normalizedDocType);
            uploadFormData.append('remarks', formData.remarks);

            await orderDocumentsService.createOrderDocument(uploadFormData);
            if (isPdcPaymentType && normalizedDocType === "PDC") {
                await orderService.updateOrder(orderId, {
                    pdc_validation_status: "pending",
                    pdc_validated_at: null,
                    pdc_validated_by: null,
                });
            }

            setSuccess(true);
            toastSuccess("Document uploaded successfully");
            setFormData({ doc_type: "", remarks: "" });
            setDocumentFile(null);
            setFileInputKey(Date.now());
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error("Failed to upload document:", err);
            const msg = err?.response?.data?.message || err?.message || "Failed to upload document";
            setErrors({ submit: msg });
            toastError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box p={1}>
            <Grid container spacing={1}>
                <Grid size={6}>
                    <AutocompleteField
                        name="doc_type"
                        label="Document Type"
                        required
                        options={orderDocumentTypes}
                        getOptionLabel={(t) => t?.type ?? ""}
                        value={
                            formData.doc_type
                                ? (orderDocumentTypes || []).find((t) => t?.type === formData.doc_type) || { type: formData.doc_type }
                                : null
                        }
                        onChange={(e, newValue) => handleChange("doc_type", newValue?.type ?? "")}
                        placeholder="Type to search..."
                        disabled={loading || loadingDocumentTypes}
                        error={!!errors.doc_type}
                        helperText={errors.doc_type}
                    />
                </Grid>

                <Grid size={6}>
                    <p className="mb-1 text-xs text-slate-500">Document File *</p>
                    <div className="flex flex-wrap items-center gap-2">
                        <UiButton type="button" size="sm" variant="outline" asChild>
                            <label className="cursor-pointer">
                                Choose File
                                <input key={fileInputKey} type="file" className="hidden" onChange={handleFileChange} />
                            </label>
                        </UiButton>
                        {documentFile ? <span className="text-xs text-slate-500">{documentFile.name}</span> : null}
                    </div>
                    {errors.document ? <p className="mt-1 text-xs text-red-600">{errors.document}</p> : null}
                </Grid>

                <Grid size={12}>
                    <Input
                        fullWidth
                        label="Remarks"
                        multiline
                        rows={3}
                        value={formData.remarks}
                        onChange={(e) => handleChange('remarks', e.target.value)}
                    />
                </Grid>

                {errors.submit && (
                    <Grid size={12}>
                        <Alert severity="error">{errors.submit}</Alert>
                    </Grid>
                )}

                {success && (
                    <Grid size={12}>
                        <Alert severity="success">Document uploaded successfully!</Alert>
                    </Grid>
                )}

                <Grid size={12}>
                    <UiButton type="button" size="sm" onClick={handleSubmit} disabled={loading} loading={loading}>
                        Upload Document
                    </UiButton>
                </Grid>
            </Grid>
        </Box>
    );
}



const InfoRow = ({ label, value, icon, valueColor = "text.primary" }) => (
    <Box display="flex" alignItems="flex-start" mb={1.5} gap={1.5}>
        {icon && <Box sx={{ color: 'text.secondary', mt: 0.2 }}>{icon}</Box>}
        <Box flex={1}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500, mb: 0.5 }}>{label}</Typography>
            <Typography variant="body2" fontWeight="500" color={valueColor} sx={{ wordBreak: 'break-word' }}>{value}</Typography>
        </Box>
    </Box>
);

export default function OrderViewPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<CircularProgress />}>
                <OrderViewPageContent />
            </Suspense>
        </ProtectedRoute>
    );
}

function OrderViewPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const canAmendOrder = useRoleAccess(RBAC_CONFIG_KEYS.ORDER_AMEND);
    const orderId = searchParams.get("id");
    const tabParam = searchParams.get("tab");
    const hasExplicitTab = tabParam != null && tabParam !== "";
    const explicitTab = hasExplicitTab ? parseInt(tabParam, 10) : null;
    const [kycEnabled, setKycEnabled] = useState(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [orderData, setOrderData] = useState(null);
    const [tabValue, setTabValue] = useState(Number.isFinite(explicitTab) ? explicitTab : 0);
    const [visitedTabs, setVisitedTabs] = useState(new Set([Number.isFinite(explicitTab) ? explicitTab : 0]));
    const [paymentsDocumentsRefreshKey, setPaymentsDocumentsRefreshKey] = useState(0);
    const [orderDocumentTypes, setOrderDocumentTypes] = useState([]);
    const [loadingOrderDocumentTypes, setLoadingOrderDocumentTypes] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [cancelReasonId, setCancelReasonId] = useState("");
    const [cancelRemarks, setCancelRemarks] = useState("");
    const [cancelReasonOptions, setCancelReasonOptions] = useState([]);
    const [cancelReasonLoading, setCancelReasonLoading] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [quotationDrawerOpen, setQuotationDrawerOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetchPendingOrderKycEnabled().then((enabled) => {
            if (cancelled) return;
            setKycEnabled(enabled);
            if (enabled && !hasExplicitTab) {
                setTabValue(6);
                setVisitedTabs((prev) => new Set([...prev, 6]));
            }
            if (!enabled && (explicitTab === 6 || explicitTab === 7)) {
                setTabValue(0);
                setVisitedTabs((prev) => new Set([...prev, 0]));
            }
        });
        return () => {
            cancelled = true;
        };
    }, [hasExplicitTab, explicitTab]);

    const getVisibleTabs = () => {
        const allTabs = kycEnabled ? [6, 7, 0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5];
        switch (explicitTab) {
            case 0:
                return [0, 1];
            case 2:
            case 3:
                return [1, 2, 3];
            case 4:
                return [4];
            case 5:
                return [1, 5];
            default:
                return allTabs;
        }
    };
    const visibleTabs = getVisibleTabs();
    const totalReceivedAmount = getOrderReceivedAmount(orderData);
    const outstandingAmount = getOrderOutstandingAmount(orderData);
    const totalCommittedAmount = getOrderCommittedAmount(orderData);
    const committedOutstandingAmount = getOrderCommittedOutstandingAmount(orderData);
    const allowOverpayment = getOrderAllowOverpayment(orderData);
    const maxPaymentAmount = allowOverpayment
        ? Number.POSITIVE_INFINITY
        : Math.max(0, committedOutstandingAmount);
    const projectCostAmount = getOrderProjectCostAmount(orderData);
    const pendingCommittedAmount = Math.max(0, totalCommittedAmount - totalReceivedAmount);

    useEffect(() => {
        if (!orderId) {
            setError("Order ID is required");
            setLoading(false);
            return;
        }

        const fetchOrder = async () => {
            try {
                setLoading(true);
                const orderResponse = await orderService.getOrderById(orderId);
                setOrderData(orderResponse?.result || orderResponse);
                setError(null);
            } catch (err) {
                console.error("Failed to fetch order:", err);
                const msg = err?.response?.data?.message || err?.message || "Failed to load order data";
                setError(msg);
                toastError(msg);
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [orderId]);

    useEffect(() => {
        let active = true;
        const fetchDocTypes = async () => {
            setLoadingOrderDocumentTypes(true);
            try {
                const response = await mastersService.getList("order_document_type", { page: 1, limit: 1000 });
                const data = response?.result?.data || response?.data || response?.result || response || [];
                const arr = Array.isArray(data) ? data : [];
                if (active) setOrderDocumentTypes(arr);
            } catch (err) {
                console.error("Failed to fetch order document types:", err);
                if (active) setOrderDocumentTypes([]);
            } finally {
                if (active) setLoadingOrderDocumentTypes(false);
            }
        };
        fetchDocTypes();
        return () => {
            active = false;
        };
    }, []);

    const handleTabChange = (newValue) => {
        const next = Number(newValue);
        setTabValue(next);
        setVisitedTabs((prev) => new Set([...prev, next]));
    };

    const refreshPaymentTotal = async () => {
        if (!orderId) return;
        try {
            const orderResponse = await orderService.getOrderById(orderId);
            setOrderData(orderResponse?.result || orderResponse);
        } catch (err) {
            console.error("Failed to refresh payment total:", err);
        }
    };

    const handlePaymentSaved = () => {
        refreshPaymentTotal();
        setPaymentsDocumentsRefreshKey((k) => k + 1);
    };
    const reloadOrder = async () => {
        const orderResponse = await orderService.getOrderById(orderId);
        setOrderData(orderResponse?.result || orderResponse);
        setPaymentsDocumentsRefreshKey((k) => k + 1);
    };
    const registrationLocked = kycEnabled && ((orderData?.l_kyc_status || "pending") !== "passed" || (orderData?.t_kyc_status || "pending") !== "passed");
    const fetchDocuments = async (params) => {
        const result = await orderDocumentsService.getOrderDocuments({
            ...params,
            order_id: orderId,
        });
        return result;
    };

    const documentsColumns = [
        {
            id: "created_at",
            label: "Uploaded On",
            field: "created_at",
            sortable: true,
            render: (row) => moment(row.created_at).format("DD-MM-YYYY"),
        },
        {
            id: "doc_type",
            label: "Document Type",
            field: "doc_type",
            sortable: true,
            render: (row) => {
                return resolveOrderDocTypeLabel(row.doc_type, orderDocumentTypes);
            },
        },
        {
            id: "remarks",
            label: "Document No / Remarks",
            field: "remarks",
            render: (row) => row.remarks || "-",
        },
        {
            id: "uploaded_by",
            label: "Uploaded By",
            render: (row) => row?.updated_by_name || "System",
        },
        {
            id: "validation_status",
            label: "Validation Status",
            field: "validation_status",
            render: (row) => {
                const meta = getValidationStatusMeta(row?.validation_status);
                if (meta.label === "-") return "-";
                return <Badge variant={meta.variant}>{meta.label}</Badge>;
            },
        },
        {
            id: "actions",
            label: "Actions",
            render: (row) => (
                <div className="flex flex-wrap gap-1">
                    <UiButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                            try {
                                const url = await orderDocumentsService.getDocumentUrl(row.id);
                                if (url) window.open(url, "_blank");
                            } catch (e) {
                                console.error("Failed to get document URL", e);
                            }
                        }}
                    >
                        View Document
                    </UiButton>
                    <UiButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                            try {
                                const { blob, filename } = await orderDocumentsService.downloadOrderDocument(row.id);
                                if (!blob) throw new Error("Download payload missing");
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download =
                                    filename ||
                                    row?.document_name ||
                                    resolveOrderDocTypeLabel(row.doc_type, orderDocumentTypes) ||
                                    `order-document-${row.id}`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                window.URL.revokeObjectURL(url);
                            } catch (e) {
                                console.error("Failed to download document", e);
                                toastError("Failed to download document");
                            }
                        }}
                    >
                        Download
                    </UiButton>
                </div>
            ),
        },
    ];
    const calculateInquiryDetailsHeight = () => {
        return `calc(100vh - 85px)`;
    };

    const cancelEligibility = getOrderCancelEligibility(orderData);

    const handleOpenCancelDialog = async () => {
        setCancelReasonId("");
        setCancelRemarks("");
        setCancelDialogOpen(true);
        try {
            setCancelReasonLoading(true);
            const options = await mastersService.getReferenceOptionsSearch("reason.model", {
                reason_type: "order_cancellation",
                is_active: true,
            });
            setCancelReasonOptions(Array.isArray(options) ? options : []);
        } catch (err) {
            console.error("Failed to load cancellation reasons:", err);
            toastError("Failed to load cancellation reasons");
        } finally {
            setCancelReasonLoading(false);
        }
    };

    const handleConfirmCancel = async () => {
        if (!orderId) return;
        if (!cancelReasonId) {
            toastError("Please select a cancellation reason");
            return;
        }
        try {
            setCancelling(true);
            const selectedReason = cancelReasonOptions.find((o) => o.id == cancelReasonId);
            await orderService.cancelOrder(orderId, {
                cancellation_reason_id: cancelReasonId,
                cancellation_reason: selectedReason?.label || selectedReason?.reason || "",
                cancellation_remarks: cancelRemarks?.trim() || undefined,
            });
            toastSuccess("Order cancelled successfully");
            setCancelDialogOpen(false);
            goToList();
        } catch (err) {
            console.error("Failed to cancel order:", err);
            const msg = err?.response?.data?.message || err?.message || "Failed to cancel order";
            toastError(msg);
        } finally {
            setCancelling(false);
        }
    };

    return (
        <ProtectedRoute>
            <Box>
                {error && (
                    <Box p={2}>
                        <Alert severity="error">{error}</Alert>
                    </Box>
                )}
                
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5 mb-2">
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
                            Pending Order - {orderData?.order_number || "N/A"}
                        </h1>
                        <p className="text-[11px] text-slate-500 truncate">
                            {orderData?.customer_name || "N/A"} · {orderData?.branch_name || "N/A"}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <UiButton
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setQuotationDrawerOpen(true)}
                        >
                            Quotation
                        </UiButton>
                        {canAmendOrder && (
                            <UiButton
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => router.push(`/order/amend?id=${orderId}`)}
                            >
                                Amend (BA)
                            </UiButton>
                        )}
                        {cancelEligibility.canCancel && (
                            <UiButton
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={handleOpenCancelDialog}
                            >
                                Cancel Order
                            </UiButton>
                        )}
                    </div>
                </div>
                
                <Grid container spacing={3}>
                    {/* Left Sidebar */}
                    <Grid size={3}>
                        <Box sx={{ height: calculateInquiryDetailsHeight(), overflowY: "auto", pr: 1, '&::-webkit-scrollbar': { width: '6px' }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '10px' } }}>
                            <Stack spacing={2.5}>
                                {/* Customer Details */}
                                <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                                    <CardHeader 
                                        title="Customer Details" 
                                        titleTypographyProps={{ variant: 'subtitle2', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}
                                        sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid', borderColor: 'grey.200', py: 1.5 }}
                                        avatar={<Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}><PersonIcon fontSize="small" /></Avatar>}
                                    />
                                    <CardContent sx={{ p: 2.5, pb: "20px !important" }}>
                                        <InfoRow label="Order No" value={orderData?.order_number || "N/A"} />
                                        <InfoRow label="Name" value={orderData?.customer_name || "N/A"} />
                                        <InfoRow label="Contact No" value={getPrimaryPhone(orderData || {})} icon={<PhoneIcon fontSize="small" />} />
                                        <InfoRow label="Address" value={getFullOrderAddress(orderData || {})} icon={<LocationOnIcon fontSize="small" />} />
                                        <InfoRow label="Reference" value={orderData?.reference_from || "N/A"} />
                                        <InfoRow label="Channel Partner" value={orderData?.channel_partner_name || "N/A"} />
                                        <InfoRow label="Handled By" value={orderData?.handled_by_name || "N/A"} />
                                        <InfoRow label="Branch" value={orderData?.branch_name || "N/A"} icon={<BusinessIcon fontSize="small" />} />
                                    </CardContent>
                                </Card>

                                {/* Project Details */}
                                <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                                    <CardHeader 
                                        title="Project Details" 
                                        titleTypographyProps={{ variant: 'subtitle2', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}
                                        sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid', borderColor: 'grey.200', py: 1.5 }}
                                        avatar={<Avatar sx={{ bgcolor: 'secondary.light', width: 32, height: 32 }}><AssignmentIcon fontSize="small" /></Avatar>}
                                    />
                                    <CardContent sx={{ p: 2.5, pb: "20px !important" }}>
                                        <InfoRow label="Order Date" value={orderData?.order_date ? moment(orderData.order_date).format("DD-MM-YYYY") : "N/A"} />
                                        <InfoRow label="Consumer No" value={orderData?.consumer_no || "N/A"} />
                                        <Box display="flex" gap={2} mb={2} p={1.5} sx={{ bgcolor: 'grey.50', borderRadius: 2 }}>
                                            <Box flex={1}>
                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500, mb: 0.5 }}>Capacity</Typography>
                                                <Typography variant="body2" fontWeight="700" color="primary">{orderData?.capacity || "N/A"}</Typography>
                                            </Box>
                                            <Box flex={1}>
                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500, mb: 0.5 }}>Order Type</Typography>
                                                <Chip label={orderData?.order_type_name || "New"} color="success" size="small" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 'bold' }} />
                                            </Box>
                                        </Box>
                                        <InfoRow label="Scheme" value={orderData?.project_scheme_name || "N/A"} />
                                        <InfoRow label="Application" value={orderData?.application_no || "N/A"} />
                                        <InfoRow label="Registration Date" value={orderData?.date_of_registration_gov ? moment(orderData.date_of_registration_gov).format("DD-MM-YYYY") : "N/A"} />
                                        <InfoRow label="Discom" value={orderData?.discom_name || "N/A"} />
                                    </CardContent>
                                </Card>

                                {/* Scope (BOM) */}
                                {orderData?.bom_snapshot?.length > 0 && (
                                    <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                                        <CardHeader 
                                            title="Scope (BOM)" 
                                            titleTypographyProps={{ variant: 'subtitle2', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}
                                            sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid', borderColor: 'grey.200', py: 1.5 }}
                                        />
                                        <CardContent sx={{ p: 0, pb: "0 !important" }}>
                                            <Box sx={{ overflowX: "auto" }}>
                                                <table style={{ width: "100%", fontSize: "0.8rem", borderCollapse: "collapse" }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: "2px solid #e2e8f0", backgroundColor: "#f1f5f9" }}>
                                                            <th style={{ textAlign: "left", padding: "10px 12px", color: "#64748b", fontWeight: 600 }}>#</th>
                                                            <th style={{ textAlign: "left", padding: "10px 12px", color: "#64748b", fontWeight: 600 }}>Product</th>
                                                            <th style={{ textAlign: "left", padding: "10px 12px", color: "#64748b", fontWeight: 600 }}>Type</th>
                                                            <th style={{ textAlign: "left", padding: "10px 12px", color: "#64748b", fontWeight: 600 }}>Make</th>
                                                            <th style={{ textAlign: "left", padding: "10px 12px", color: "#64748b", fontWeight: 600 }}>Qty</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {orderData.bom_snapshot.map((line, idx) => {
                                                            const p = line.product_snapshot || line;
                                                            return (
                                                                <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                                    <td style={{ padding: "10px 12px", color: "#64748b" }}>{idx + 1}</td>
                                                                    <td style={{ padding: "10px 12px", fontWeight: 500 }}>{p?.product_name ?? "-"}</td>
                                                                    <td style={{ padding: "10px 12px" }}>{p?.product_type_name ?? "-"}</td>
                                                                    <td style={{ padding: "10px 12px" }}>{p?.product_make_name ?? "-"}</td>
                                                                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "#0f172a" }}>{line.quantity ?? "-"}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Payment Details */}
                                <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                                    <CardHeader 
                                        title="Payment Details" 
                                        titleTypographyProps={{ variant: 'subtitle2', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}
                                        sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid', borderColor: 'grey.200', py: 1.5 }}
                                        avatar={<Avatar sx={{ bgcolor: 'success.light', width: 32, height: 32 }}><PaymentIcon fontSize="small" /></Avatar>}
                                    />
                                    <CardContent sx={{ p: 2.5, pb: "20px !important" }}>
                                        <InfoRow label="Payment Mode" value={orderData?.payment_type || orderData?.loan_type_name || "N/A"} />
                                        
                                        <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid', borderColor: 'grey.200' }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="body2" color="text.secondary">Total Payable</Typography>
                                                <Typography variant="body2" fontWeight="700">₹{formatRupeesInteger(orderData?.project_cost)}</Typography>
                                            </Box>
                                            <Box display="flex" justifyContent="space-between" mb={1.5}>
                                                <Typography variant="body2" color="text.secondary">Received</Typography>
                                                <Typography variant="body2" fontWeight="700" color="success.main">₹{formatRupeesInteger(totalReceivedAmount)}</Typography>
                                            </Box>
                                            <Divider sx={{ mb: 1.5 }} />
                                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                                <Typography variant="body2" fontWeight="600" color="text.secondary">Outstanding</Typography>
                                                <Typography variant="h6" fontWeight="800" color="error.main">
                                                    ₹{formatRupeesInteger(Math.max(0, outstandingAmount))}
                                                </Typography>
                                            </Box>
                                            {outstandingAmount < 0 && (
                                                <Typography variant="caption" color="warning.main" display="block" mt={1}>
                                                    Over-recorded by ₹{formatRupeesInteger(Math.abs(outstandingAmount))}
                                                </Typography>
                                            )}
                                            {committedOutstandingAmount < 0 && (
                                                <Typography variant="caption" color="warning.main" display="block" mt={1}>
                                                    Pending + approved payments exceed order by ₹{formatRupeesInteger(Math.abs(committedOutstandingAmount))}
                                                </Typography>
                                            )}
                                            {pendingCommittedAmount > 0 && committedOutstandingAmount >= 0 && (
                                                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                                                    Pending (awaiting approval): ₹{formatRupeesInteger(pendingCommittedAmount)}
                                                </Typography>
                                            )}
                                        </Box>
                                    </CardContent>
                                </Card>

                                {/* Third-Party Audit */}
                                <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                                    <CardHeader 
                                        title="Third-Party Audit" 
                                        titleTypographyProps={{ variant: 'subtitle2', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}
                                        sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid', borderColor: 'grey.200', py: 1.5 }}
                                    />
                                    <CardContent sx={{ p: 2.5, pb: "20px !important" }}>
                                        <InfoRow label="Audited" value={orderData?.third_party_audited ? "Yes" : "No"} />
                                        <InfoRow label="Auditor" value={orderData?.third_party_auditor_name || "—"} />
                                        <InfoRow label="Audited At" value={orderData?.third_party_audit_at ? moment(orderData.third_party_audit_at).format("DD-MM-YYYY HH:mm") : "—"} />
                                    </CardContent>
                                </Card>
                            </Stack>
                        </Box>
                    </Grid>

                    {/* Right Content Area */}
                    <Grid size={9}>
                        <Paper elevation={0} sx={{ height: calculateInquiryDetailsHeight(), overflowY: "auto", borderRadius: 3, border: '1px solid', borderColor: 'grey.200', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                            {kycEnabled && (
                            <Box sx={{ px: 1, pt: 1, pb: 0.5 }}>
                                <PendingStageStrip order={orderData} />
                            </Box>
                            )}
                            <Tabs value={String(tabValue)} onValueChange={handleTabChange} className="w-full">
                                <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b border-slate-200 bg-transparent px-1 py-1">
                                    {ORDER_TABS.filter((tab) => visibleTabs.includes(tab.value)).map((tab) => (
                                        <TabsTrigger key={tab.value} value={String(tab.value)}>
                                            {tab.label}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>

                                <TabsContent value="6" keepMounted className="mt-1 p-1">
                                    {visitedTabs.has(6) && (
                                        <LkycPanel
                                            order={orderData}
                                            orderId={orderId}
                                            onSaved={reloadOrder}
                                            onPassed={async () => {
                                                await reloadOrder();
                                                handleTabChange(7);
                                            }}
                                            docsRefreshKey={`${tabValue}-${paymentsDocumentsRefreshKey}`}
                                            orderDocumentTypes={orderDocumentTypes}
                                        />
                                    )}
                                </TabsContent>
                                <TabsContent value="7" keepMounted className="mt-1 p-1">
                                    {visitedTabs.has(7) && (
                                        <TkycPanel
                                            order={orderData}
                                            orderId={orderId}
                                            onSaved={reloadOrder}
                                            onPassed={async () => {
                                                await reloadOrder();
                                                handleTabChange(0);
                                            }}
                                        />
                                    )}
                                </TabsContent>
                                <TabsContent value="0" keepMounted className="mt-1 p-1">
                                    {visitedTabs.has(0) && (
                                        <RegistrationForm
                                            orderData={orderData}
                                            orderId={orderId}
                                            orderDocumentTypes={orderDocumentTypes}
                                            locked={registrationLocked}
                                        />
                                    )}
                                </TabsContent>
                                <TabsContent value="1" keepMounted className="mt-1 p-1">
                                    {visitedTabs.has(1) && (
                                        <PaginatedTable
                                            key={`documents-${paymentsDocumentsRefreshKey}`}
                                            columns={documentsColumns}
                                            fetcher={fetchDocuments}
                                            initialPage={1}
                                            initialLimit={10}
                                            showSearch={true}
                                            height={calculatedTableHeight()}
                                            getRowKey={(row) => row.id}
                                        />
                                    )}
                                </TabsContent>
                                <TabsContent value="2" keepMounted className="mt-1 p-1">
                                    {visitedTabs.has(2) && (
                                        <ReceivePaymentForm
                                            orderId={orderId}
                                            onPaymentSaved={handlePaymentSaved}
                                            orderDocumentTypes={orderDocumentTypes}
                                            maxPaymentAmount={Number.isFinite(maxPaymentAmount) ? maxPaymentAmount : 0}
                                            totalReceivedAmount={totalReceivedAmount}
                                            totalCommittedAmount={totalCommittedAmount}
                                            projectCostAmount={projectCostAmount}
                                            allowOverpayment={allowOverpayment}
                                        />
                                    )}
                                </TabsContent>
                                <TabsContent value="3" keepMounted className="mt-1 p-1">
                                    {visitedTabs.has(3) && <PreviousPaymentsTable key={`payments-${paymentsDocumentsRefreshKey}`} orderId={orderId} />}
                                </TabsContent>
                                <TabsContent value="4" keepMounted className="mt-1 p-1">
                                    {visitedTabs.has(4) && <RemarksForm orderData={orderData} orderId={orderId} />}
                                </TabsContent>
                                <TabsContent value="5" keepMounted className="mt-1 p-1">
                                    {visitedTabs.has(5) && (
                                        <UploadDocumentsForm
                                            orderId={orderId}
                                            orderData={orderData}
                                            orderDocumentTypes={orderDocumentTypes}
                                            loadingDocumentTypes={loadingOrderDocumentTypes}
                                        />
                                    )}
                                </TabsContent>
                            </Tabs>
                            {kycEnabled && (
                            <Box sx={{ px: 1, pb: 1 }}>
                                <OrderQueryPanel
                                  orderId={orderId}
                                  onChanged={reloadOrder}
                                  refreshKey={`${orderData?.l_kyc_status}-${orderData?.t_kyc_status}-${orderData?.has_active_query}`}
                                />
                            </Box>
                            )}
                        </Paper>
                    </Grid>
                </Grid>

                <Dialog open={cancelDialogOpen} onClose={() => !cancelling && setCancelDialogOpen(false)} maxWidth="xs" fullWidth>
                    <DialogTitle>Cancel Order</DialogTitle>
                    <DialogContent dividers>
                        <Typography variant="body2" mb={2}>
                            Are you sure you want to cancel this order? This action cannot be undone.
                        </Typography>
                        <AutocompleteField
                            options={cancelReasonOptions}
                            loading={cancelReasonLoading}
                            value={cancelReasonOptions.find((o) => o.id == cancelReasonId) || null}
                            onChange={(e, v) => setCancelReasonId(v?.id || "")}
                            getOptionLabel={(o) => o?.label || o?.reason || ""}
                            placeholder="Select Cancellation Reason"
                            label="Reason"
                            name="cancellation_reason_id"
                            required
                            fullWidth
                        />
                        <Box mt={2}>
                            <Input
                                fullWidth
                                label="Remarks (optional)"
                                name="cancellation_remarks"
                                value={cancelRemarks}
                                onChange={(e) => setCancelRemarks(e.target.value)}
                                multiline
                                rows={3}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setCancelDialogOpen(false)} disabled={cancelling} size="small">
                            Close
                        </Button>
                        <Button
                            onClick={handleConfirmCancel}
                            color="error"
                            variant="contained"
                            size="small"
                            disabled={cancelling || !cancelReasonId}
                        >
                            {cancelling ? "Cancelling..." : "Confirm Cancel"}
                        </Button>
                    </DialogActions>
                </Dialog>
                <QuotationDetailsDrawer
                    open={quotationDrawerOpen}
                    onClose={() => setQuotationDrawerOpen(false)}
                    orderId={orderId}
                    quotationId={orderData?.quotation_id}
                />
            </Box>
        </ProtectedRoute >
    );
}
