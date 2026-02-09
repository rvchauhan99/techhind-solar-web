"use client";

import { useState, useEffect, useRef } from "react";
import { Box, Alert } from "@mui/material";
import { usePathname } from "next/navigation";
import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import Checkbox from "@/components/common/Checkbox";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import orderService from "@/services/orderService";
import moment from "moment";
import { FIELD_HEIGHT_CLASS_SMALL, FIELD_TEXT_SMALL } from "@/utils/formConstants";

export default function SubsidyDisbursed({ orderId, orderData, onSuccess }) {
    const pathname = usePathname();
    const isReadOnly = pathname?.startsWith("/closed-orders");
    const disbursedAmountRef = useRef(null);
    const [formData, setFormData] = useState({
        subsidy_disbursed: false,
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
                subsidy_disbursed: orderData.subsidy_disbursed || false,
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
            if (Object.keys(newFieldErrors).length > 0) {
                setFieldErrors(newFieldErrors);
                return;
            }

            const updatedStages = {
                ...(orderData?.stages || {}),
                subsidy_disbursed: "completed",
            };
            const disbursedAmount = (disbursedAmountRef.current?.value ?? "").trim();
            const payload = {
                subsidy_disbursed: formData.subsidy_disbursed,
                disbursed_date: formData.disbursed_date,
                disbursed_amount: disbursedAmount || null,
                subsidy_disbursed_remarks: formData.subsidy_disbursed_remarks,
                stages: updatedStages,
                current_stage_key: "",
                subsidy_disbursed_completed_at: new Date().toISOString(),
            };
            if (orderData?.stages?.["subsidy_disbursed"] === "completed") {
                delete payload.stages;
                delete payload.current_stage_key;
            }
            await orderService.updateOrder(orderId, payload);

            setSuccessMsg("Subsidy Disbursed stage completed successfully!");
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error("Failed to save subsidy disbursed details:", err);
            setError(err.message || "Failed to save data");
        } finally {
            setSubmitting(false);
        }
    };

    const isCompleted = orderData?.stages?.subsidy_disbursed === "completed";

    return (
        <Box component="form" onSubmit={handleSubmit} className="p-4 overflow-y-auto">
            <FormSection title="Subsidy disbursed details">
                <FormGrid cols={3}>
                    <Checkbox
                        name="subsidy_disbursed"
                        label="Subsidy Disbursed"
                        checked={formData.subsidy_disbursed}
                        onChange={handleInputChange}
                        disabled={isCompleted || isReadOnly}
                    />
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
                    <div className="w-full max-w-full">
                        <Label htmlFor="disbursed_amount" className="mb-1.5 block text-sm font-medium">Disbursed Amount</Label>
                        <input
                            ref={disbursedAmountRef}
                            key={`disbursed_amount-${orderId}-${orderData?.disbursed_amount ?? ""}`}
                            type="number"
                            id="disbursed_amount"
                            name="disbursed_amount"
                            defaultValue={String(formData.disbursed_amount ?? "")}
                            step="0.01"
                            inputMode="decimal"
                            disabled={isCompleted || isReadOnly}
                            className={`h-9 w-full min-w-0 rounded-lg border border-input bg-white px-2.5 py-1 text-base outline-none focus-visible:ring-[3px] focus-visible:ring-ring md:text-sm ${FIELD_HEIGHT_CLASS_SMALL} ${FIELD_TEXT_SMALL}`}
                        />
                    </div>
                </FormGrid>

                <div className="mt-3">
                    <Input
                        name="subsidy_disbursed_remarks"
                        label="Remarks"
                        multiline
                        rows={3}
                        value={formData.subsidy_disbursed_remarks}
                        onChange={handleInputChange}
                        fullWidth
                        disabled={isCompleted || isReadOnly}
                    />
                </div>
            </FormSection>

            <div className="mt-4 flex flex-col gap-2">
                {error && <Alert severity="error">{error}</Alert>}
                {successMsg && <Alert severity="success">{successMsg}</Alert>}
                <Button type="submit" size="sm" loading={submitting} disabled={isCompleted || isReadOnly}>
                    {isCompleted ? "Update" : "Save"}
                </Button>
            </div>
        </Box>
    );
}
