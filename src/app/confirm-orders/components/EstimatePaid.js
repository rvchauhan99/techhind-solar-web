"use client";

import { useState, useEffect } from "react";
import { Box, Alert } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { usePathname } from "next/navigation";
import moment from "moment";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import DateField from "@/components/common/DateField";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import { Button } from "@/components/ui/button";
import orderService from "@/services/orderService";
import orderDocumentsService from "@/services/orderDocumentsService";
import { toastSuccess, toastError } from "@/utils/toast";

export default function EstimatePaid({ orderId, orderData, orderDocuments, onSuccess }) {
    const pathname = usePathname();
    const isReadOnly = pathname?.startsWith("/closed-orders");
    const [formData, setFormData] = useState({
        estimate_quotation_serial_no: "",
        estimate_amount: "",
        estimate_due_date: "",
        estimate_paid_by: "",
    });
    const [file, setFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    useEffect(() => {
        if (orderData) {
            setFormData({
                estimate_quotation_serial_no: orderData.estimate_quotation_serial_no || "",
                estimate_amount: orderData.estimate_amount || "",
                estimate_due_date: orderData.estimate_due_date ? moment(orderData.estimate_due_date).format("YYYY-MM-DD") : "",
                estimate_paid_by: orderData.estimate_paid_by || "",
            });
        }
    }, [orderData]);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleMarkAsPaid = async (e) => {
        e.preventDefault();
        if (isReadOnly) return;
        setError(null);
        setSuccessMsg(null);

        const isAlreadyCompleted = orderData?.stages?.["estimate_paid"] === "completed";
        if (!isAlreadyCompleted && (!formData.estimate_paid_by || formData.estimate_paid_by.trim() === "")) {
            setError("Please select Paid By (Customer or Company)");
            return;
        }

        setSubmitting(true);
        try {
            const updatedStages = {
                ...(orderData?.stages || {}),
                estimate_paid: "completed",
                planner: "pending",
            };

            const payload = {
                stages: updatedStages,
                estimate_paid_at: new Date().toISOString(),
                estimate_paid_by: formData.estimate_paid_by?.trim() || null,
                current_stage_key: "planner",
            };
            if (isAlreadyCompleted) {
                delete payload.stages;
                delete payload.current_stage_key;
            }
            await orderService.updateOrder(orderId, payload);

            if (file) {
                const docFormData = new FormData();
                docFormData.append("document", file);
                docFormData.append("order_id", orderId);
                docFormData.append("doc_type", "estimation_paid_receipt");
                docFormData.append("remarks", "Estimate Paid Receipt");
                await orderDocumentsService.createOrderDocument(docFormData);
            }

            const msg = "Order marked as paid successfully!";
            setSuccessMsg(msg);
            toastSuccess(msg);
            setFile(null);
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error("Failed to mark order as paid:", err);
            const errMsg = err?.response?.data?.message || err?.message || "Failed to update status";
            setError(errMsg);
            toastError(errMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const isCompleted = orderData?.stages?.estimate_paid === "completed";
    const receiptDoc = orderDocuments?.find(d => d.doc_type === "estimation_paid_receipt");

    return (
        <Box component="form" onSubmit={handleMarkAsPaid} className="p-4">
            <FormSection title="Estimate paid details">
                <FormGrid cols={3}>
                    <Input
                        name="estimate_quotation_serial_no"
                        label="Quotation/SerialNo"
                        value={formData.estimate_quotation_serial_no}
                        fullWidth
                        disabled
                    />
                    <Input
                        name="estimate_amount"
                        label="Amount"
                        type="number"
                        value={formData.estimate_amount}
                        fullWidth
                        disabled
                    />
                    <DateField
                        name="estimate_due_date"
                        label="Due Date"
                        value={formData.estimate_due_date}
                        fullWidth
                        disabled
                    />
                    <Select
                        name="estimate_paid_by"
                        label="Paid By"
                        value={formData.estimate_paid_by}
                        onChange={(e) => setFormData((prev) => ({ ...prev, estimate_paid_by: e.target.value }))}
                        disabled={isCompleted || isReadOnly}
                        placeholder="-- Select --"
                        fullWidth
                    >
                        <MenuItem value="customer">Customer</MenuItem>
                        <MenuItem value="company">Company</MenuItem>
                    </Select>
                </FormGrid>

                <div className="mt-3">
                    <p className="text-sm font-medium text-muted-foreground mb-1.5">Estimate Paid Receipt</p>
                    <div className="flex gap-2 items-center flex-wrap">
                        <label htmlFor="estimate-paid-receipt-file" className="inline-block">
                            <input
                                id="estimate-paid-receipt-file"
                                type="file"
                                className="hidden"
                                onChange={handleFileChange}
                                disabled={isCompleted || isReadOnly}
                            />
                            <span className={`inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg border border-input bg-background text-sm font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground ${isCompleted ? "pointer-events-none opacity-50" : ""}`}>
                                <CheckCircleIcon sx={{ fontSize: 18 }} />
                                {file ? file.name : "Choose File"}
                            </span>
                        </label>
                        {receiptDoc?.document_path && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                    try {
                                        const url = await orderDocumentsService.getDocumentUrl(receiptDoc.id);
                                        if (url) window.open(url, "_blank");
                                    } catch (e) {
                                        console.error("Failed to get document URL", e);
                                    }
                                }}
                            >
                                View
                            </Button>
                        )}
                    </div>
                </div>
            </FormSection>

            <div className="mt-4 flex flex-col gap-2">
                {error && <Alert severity="error">{error}</Alert>}
                {successMsg && <Alert severity="success">{successMsg}</Alert>}
                <div className="flex gap-2">
                    <Button
                        type="submit"
                        size="sm"
                        loading={submitting}
                        disabled={isCompleted || isReadOnly}
                    >
                        {isCompleted ? "Paid" : "Mark As Paid"}
                    </Button>
                </div>
            </div>
        </Box>
    );
}
