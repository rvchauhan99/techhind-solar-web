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
import { toastSuccess, toastError } from "@/utils/toast";
import moment from "moment";
import { FIELD_HEIGHT_CLASS_SMALL, FIELD_TEXT_SMALL } from "@/utils/formConstants";

export default function SubsidyClaim({ orderId, orderData, onSuccess }) {
    const pathname = usePathname();
    const isReadOnly = pathname?.startsWith("/closed-orders");
    const claimAmountRef = useRef(null);
    const [formData, setFormData] = useState({
        subsidy_claim: false,
        claim_date: "",
        claim_no: "",
        claim_amount: "",
        subsidy_claim_remarks: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [successMsg, setSuccessMsg] = useState(null);

    useEffect(() => {
        if (orderData) {
            setFormData({
                subsidy_claim: orderData.subsidy_claim || false,
                claim_date: orderData.claim_date ? moment(orderData.claim_date).format("YYYY-MM-DD") : "",
                claim_no: orderData.claim_no || "",
                claim_amount: orderData.claim_amount || "",
                subsidy_claim_remarks: orderData.subsidy_claim_remarks || "",
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
            if (!formData.claim_date) newFieldErrors.claim_date = "Required";
            if (Object.keys(newFieldErrors).length > 0) {
                setFieldErrors(newFieldErrors);
                return;
            }

            const updatedStages = {
                ...(orderData?.stages || {}),
                subsidy_claim: "completed",
                subsidy_disbursed: "pending",
            };
            const claimAmount = (claimAmountRef.current?.value ?? "").trim();
            const payload = {
                subsidy_claim: formData.subsidy_claim,
                claim_date: formData.claim_date,
                claim_no: formData.claim_no,
                claim_amount: claimAmount || null,
                subsidy_claim_remarks: formData.subsidy_claim_remarks,
                stages: updatedStages,
                subsidy_claim_completed_at: new Date().toISOString(),
                current_stage_key: "subsidy_disbursed",
            };
            if (orderData?.stages?.["subsidy_claim"] === "completed") {
                delete payload.stages;
                delete payload.current_stage_key;
            }
            await orderService.updateOrder(orderId, payload);

            const msg = "Subsidy Claim stage completed successfully!";
            setSuccessMsg(msg);
            toastSuccess(msg);
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error("Failed to save subsidy claim details:", err);
            const errMsg = err?.response?.data?.message || err?.message || "Failed to save data";
            setError(errMsg);
            toastError(errMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const isCompleted = orderData?.stages?.subsidy_claim === "completed";

    return (
        <Box component="form" onSubmit={handleSubmit} className="p-4 overflow-y-auto">
            <FormSection title="Subsidy claim details">
                <FormGrid cols={3}>
                    <Checkbox
                        name="subsidy_claim"
                        label="Subsidy Claim"
                        checked={formData.subsidy_claim}
                        onChange={handleInputChange}
                        disabled={isCompleted || isReadOnly}
                    />
                    <DateField
                        name="claim_date"
                        label="Claim Date"
                        value={formData.claim_date}
                        onChange={handleInputChange}
                        fullWidth
                        disabled={isCompleted || isReadOnly}
                        error={!!fieldErrors.claim_date}
                        helperText={fieldErrors.claim_date}
                        required
                    />
                    <Input
                        name="claim_no"
                        label="Claim No"
                        value={formData.claim_no}
                        onChange={handleInputChange}
                        fullWidth
                        disabled={isCompleted || isReadOnly}
                    />
                    <div className="w-full max-w-full">
                        <Label htmlFor="claim_amount" className="mb-1.5 block text-sm font-medium">Claim Amount</Label>
                        <input
                            ref={claimAmountRef}
                            key={`claim_amount-${orderId}-${orderData?.claim_amount ?? ""}`}
                            type="number"
                            id="claim_amount"
                            name="claim_amount"
                            defaultValue={String(formData.claim_amount ?? "")}
                            step="0.01"
                            inputMode="decimal"
                            disabled={isCompleted || isReadOnly}
                            className={`h-9 w-full min-w-0 rounded-lg border border-input bg-white px-2.5 py-1 text-base outline-none focus-visible:ring-[3px] focus-visible:ring-ring md:text-sm ${FIELD_HEIGHT_CLASS_SMALL} ${FIELD_TEXT_SMALL}`}
                        />
                    </div>
                </FormGrid>

                <div className="mt-3">
                    <Input
                        name="subsidy_claim_remarks"
                        label="Remarks"
                        multiline
                        rows={3}
                        value={formData.subsidy_claim_remarks}
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
