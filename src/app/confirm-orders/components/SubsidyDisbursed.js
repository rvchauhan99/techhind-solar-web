"use client";

import { useState, useEffect } from "react";
import { Box, Alert } from "@mui/material";
import { usePathname } from "next/navigation";
import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import Checkbox from "@/components/common/Checkbox";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import { Button } from "@/components/ui/button";
import orderService from "@/services/orderService";
import { toastSuccess, toastError } from "@/utils/toast";
import moment from "moment";

export default function SubsidyDisbursed({ orderId, orderData, onSuccess }) {
    const pathname = usePathname();
    const isReadOnly = pathname?.startsWith("/closed-orders");
    const [formData, setFormData] = useState({
        subsidy_disbursed: true,
        disbursed_date: "",
        disbursed_amount: "",
        subsidy_disbursed_remarks: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [successMsg, setSuccessMsg] = useState(null);

    useEffect(() => {
        if (orderData) {
            setFormData({
                subsidy_disbursed: orderData.subsidy_disbursed !== undefined ? orderData.subsidy_disbursed : true,
                disbursed_date: orderData.disbursed_date ? moment(orderData.disbursed_date).format("YYYY-MM-DD") : "",
                disbursed_amount: orderData.disbursed_amount || "",
                subsidy_disbursed_remarks: orderData.subsidy_disbursed_remarks || "",
            });
        }
    }, [orderData]);

    const handleInputChange = (e) => {
        const { name } = e.target;
        const value = typeof e.target.checked === "boolean" ? e.target.checked : e.target.value;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isReadOnly) return;
        setSubmitting(true);
        setError(null);
        setFieldErrors({});
        setSuccessMsg(null);

        try {
            const newFieldErrors = {};
            if (!formData.disbursed_date) newFieldErrors.disbursed_date = "Required";
            if (!formData.disbursed_amount) newFieldErrors.disbursed_amount = "Required";

            if (Object.keys(newFieldErrors).length > 0) {
                setFieldErrors(newFieldErrors);
                toastError("Please fill in all required fields.");
                return;
            }

            const updatedStages = {
                ...(orderData?.stages || {}),
                subsidy_disbursed: "completed",
            };
            const payload = {
                subsidy_disbursed: formData.subsidy_disbursed,
                disbursed_date: formData.disbursed_date,
                disbursed_amount: Number(formData.disbursed_amount),
                subsidy_disbursed_remarks: formData.subsidy_disbursed_remarks,
                stages: updatedStages,
                current_stage_key: "order_completed",
                subsidy_disbursed_completed_at: new Date().toISOString(),
            };
            if (orderData?.stages?.["subsidy_disbursed"] === "completed") {
                delete payload.stages;
                delete payload.current_stage_key;
            }
            await orderService.updateOrder(orderId, payload);

            const msg = "Subsidy Disbursed stage completed successfully!";
            setSuccessMsg(msg);
            toastSuccess(msg);
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error("Failed to save subsidy disbursed details:", err);
            const errMsg = err?.response?.data?.message || err?.message || "Failed to save data";
            setError(errMsg);
            toastError(errMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const isCompleted = orderData?.stages?.subsidy_disbursed === "completed";

    return (
        <Box component="form" onSubmit={handleSubmit} className="p-2 sm:p-3 overflow-y-auto max-w-3xl">
            <FormSection title="Subsidy disbursed details">
                <div className="mb-2">
                    <Checkbox
                        name="subsidy_disbursed"
                        label="Subsidy Disbursed"
                        checked={formData.subsidy_disbursed}
                        onChange={handleInputChange}
                        disabled={true}
                    />
                </div>
                <FormGrid cols={2}>
                    <DateField
                        name="disbursed_date"
                        label="Disbursed Date"
                        value={formData.disbursed_date}
                        onChange={handleInputChange}
                        fullWidth
                        disabled={isCompleted || isReadOnly}
                        error={!!fieldErrors.disbursed_date}
                        helperText={fieldErrors.disbursed_date}
                        required
                    />
                    <Input
                        name="disbursed_amount"
                        label="Disbursed Amount"
                        type="number"
                        value={formData.disbursed_amount}
                        onChange={handleInputChange}
                        fullWidth
                        disabled={isCompleted || isReadOnly}
                        error={!!fieldErrors.disbursed_amount}
                        helperText={fieldErrors.disbursed_amount}
                        required
                    />
                </FormGrid>

                <div className="mt-2">
                    <Input
                        name="subsidy_disbursed_remarks"
                        label="Remarks"
                        multiline
                        rows={2}
                        value={formData.subsidy_disbursed_remarks}
                        onChange={handleInputChange}
                        fullWidth
                        disabled={isCompleted || isReadOnly}
                    />
                </div>
            </FormSection>

            <div className="mt-2 flex flex-col gap-2">
                {error && <Alert severity="error">{error}</Alert>}
                {successMsg && <Alert severity="success">{successMsg}</Alert>}
                <Button type="submit" size="sm" loading={submitting} disabled={isCompleted || isReadOnly}>
                    {isCompleted ? "Update" : "Save"}
                </Button>
            </div>
        </Box>
    );
}
