"use client";

import { useState, useEffect, useRef } from "react";
import {
    Box,
    Typography,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from "@mui/material";
import { usePathname } from "next/navigation";
import moment from "moment";
import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import Checkbox from "@/components/common/Checkbox";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import orderService from "@/services/orderService";
import { toastSuccess, toastError } from "@/utils/toast";
import { FIELD_HEIGHT_CLASS_SMALL, FIELD_TEXT_SMALL } from "@/utils/formConstants";

export default function EstimateGenerated({ orderId, orderData, onSuccess }) {
    const pathname = usePathname();
    const isReadOnlyRoute = pathname?.startsWith("/closed-orders");
    const estimateAmountRef = useRef(null);
    const [formData, setFormData] = useState({
        estimate_quotation_serial_no: "",
        estimate_amount: "",
        estimate_due_date: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [successMsg, setSuccessMsg] = useState(null);
    const [zeroAmountEstimate, setZeroAmountEstimate] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [submittingZeroAmount, setSubmittingZeroAmount] = useState(false);

    useEffect(() => {
        if (orderData) {
            setFormData({
                estimate_quotation_serial_no: orderData.estimate_quotation_serial_no || "",
                estimate_amount: orderData.estimate_amount || "",
                estimate_due_date: orderData.estimate_due_date ? moment(orderData.estimate_due_date).format("YYYY-MM-DD") : "",
            });
        }
    }, [orderData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) {
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    // Standard flow: when "Zero amount estimate" is not checked, user fills form and Save completes only Estimate Generated.
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isReadOnlyRoute) return;
        setSubmitting(true);
        setError(null);
        setFieldErrors({});
        setSuccessMsg(null);

        try {
            // Validate mandatory fields
            const estimateAmount = (estimateAmountRef.current?.value ?? "").trim();
            const newFieldErrors = {};
            if (!formData.estimate_quotation_serial_no) newFieldErrors.estimate_quotation_serial_no = "Required";
            if (!estimateAmount) newFieldErrors.estimate_amount = "Required";
            if (!formData.estimate_due_date) newFieldErrors.estimate_due_date = "Required";

            if (Object.keys(newFieldErrors).length > 0) {
                setFieldErrors(newFieldErrors);
                return;
            }
            // 1. Update order fields and stages
            const updatedStages = {
                ...(orderData?.stages || {}),
                estimate_generated: "completed",
                estimate_paid: "pending" // Unlock next stage
            };

            const payload = {
                ...formData,
                estimate_amount: estimateAmount || null,
                stages: updatedStages,
                estimate_completed_at: new Date().toISOString(),
                current_stage_key: "estimate_paid",
            };
            if (orderData?.stages?.["estimate_generated"] === "completed") {
                delete payload.stages;
                delete payload.current_stage_key;
            }
            await orderService.updateOrder(orderId, payload);

            const msg = "Estimate details saved successfully!";
            setSuccessMsg(msg);
            toastSuccess(msg);
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error("Failed to save estimate details:", err);
            const errMsg = err?.response?.data?.message || err?.message || "Failed to save data";
            setError(errMsg);
            toastError(errMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const isCompleted = orderData?.stages?.estimate_generated === "completed";
    const isZeroAmountOrder = orderData?.zero_amount_estimate === true;
    const isReadOnly = isReadOnlyRoute;

    const handleZeroAmountCheckboxChange = (e) => {
        const checked = !!e?.target?.checked;
        setZeroAmountEstimate(checked);
        if (checked) {
            setConfirmDialogOpen(true);
        }
    };

    const handleCloseConfirmDialog = () => {
        setConfirmDialogOpen(false);
        setZeroAmountEstimate(false);
    };

    const handleConfirmZeroAmount = async () => {
        if (isReadOnlyRoute) return;
        setSubmittingZeroAmount(true);
        setError(null);
        setSuccessMsg(null);
        try {
            const updatedStages = {
                ...(orderData?.stages || {}),
                estimate_generated: "completed",
                estimate_paid: "completed",
                planner: "pending",
            };
            const payload = {
                stages: updatedStages,
                current_stage_key: "planner",
                estimate_completed_at: new Date().toISOString(),
                estimate_paid_at: new Date().toISOString(),
                zero_amount_estimate: true,
                estimate_amount: 0,
            };
            await orderService.updateOrder(orderId, payload);
            const msg = "Estimate completed. Order moved to Planner.";
            setSuccessMsg(msg);
            toastSuccess(msg);
            setConfirmDialogOpen(false);
            setZeroAmountEstimate(false);
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error("Failed to complete zero-amount estimate:", err);
            const errMsg = err?.response?.data?.message || err?.message || "Failed to complete zero-amount estimate";
            setError(errMsg);
            toastError(errMsg);
        } finally {
            setSubmittingZeroAmount(false);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} className="p-4">
            <FormSection title="Estimate details">
                <FormGrid cols={3}>
                    <Input
                        name="estimate_quotation_serial_no"
                        label="Quotation/SerialNo"
                        value={formData.estimate_quotation_serial_no}
                        onChange={handleInputChange}
                        fullWidth
                        disabled={isCompleted || isReadOnly}
                        error={!!fieldErrors.estimate_quotation_serial_no}
                        helperText={fieldErrors.estimate_quotation_serial_no}
                        required
                    />
                    <div className="w-full max-w-full">
                        <Label htmlFor="estimate_amount" className="mb-1.5 block text-sm font-medium">Amount {isCompleted ? "" : "*"}</Label>
                        <input
                            ref={estimateAmountRef}
                            key={`estimate_amount-${orderId}-${orderData?.estimate_amount ?? ""}`}
                            type="number"
                            id="estimate_amount"
                            name="estimate_amount"
                            defaultValue={String(formData.estimate_amount ?? "")}
                            step="0.01"
                            inputMode="decimal"
                            disabled={isCompleted || isReadOnly}
                            className={`h-9 w-full min-w-0 rounded-lg border border-input bg-white px-2.5 py-1 text-base outline-none focus-visible:ring-[3px] focus-visible:ring-ring md:text-sm disabled:opacity-50 disabled:pointer-events-none ${FIELD_HEIGHT_CLASS_SMALL} ${FIELD_TEXT_SMALL} ${fieldErrors.estimate_amount ? "border-destructive" : ""}`}
                        />
                        {fieldErrors.estimate_amount && <p className="mt-1.5 text-xs text-destructive">{fieldErrors.estimate_amount}</p>}
                    </div>
                    <DateField
                        name="estimate_due_date"
                        label="Due Date"
                        value={formData.estimate_due_date}
                        onChange={handleInputChange}
                        fullWidth
                        disabled={isCompleted || isReadOnly}
                        error={!!fieldErrors.estimate_due_date}
                        helperText={fieldErrors.estimate_due_date}
                        required
                    />
                </FormGrid>

                <div className="mt-3">
                    <Checkbox
                        name="zero_amount_estimate"
                        label="Zero amount estimate"
                        checked={isCompleted && isZeroAmountOrder ? true : zeroAmountEstimate}
                        onChange={handleZeroAmountCheckboxChange}
                        disabled={isCompleted || isReadOnly}
                    />
                </div>

                {isCompleted && isZeroAmountOrder && (
                    <p className="mt-2 text-sm text-muted-foreground">
                        This order was completed as a zero-amount estimate and moved to Planner.
                    </p>
                )}
            </FormSection>

            <div className="mt-4 flex flex-col gap-2">
                {error && !confirmDialogOpen && (
                    <Alert severity="error" sx={{ mb: 0 }}>{error}</Alert>
                )}
                {successMsg && (
                    <Alert severity="success" sx={{ mb: 0 }}>{successMsg}</Alert>
                )}
                <div className="flex gap-2">
                    {!isCompleted ? (
                        <Button type="submit" size="sm" loading={submitting} disabled={isReadOnly}>
                            Save
                        </Button>
                    ) : (
                        <Button size="sm" variant="secondary" disabled>
                            Completed
                        </Button>
                    )}
                </div>
            </div>

            <Dialog open={confirmDialogOpen} onClose={handleCloseConfirmDialog}>
                <DialogTitle>Confirm zero amount estimate</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        Are you sure you want to proceed with a zero-amount estimate? The order will be moved directly to the Planner stage.
                    </Typography>
                    {error && confirmDialogOpen && (
                        <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
                    <Button variant="outline" size="sm" onClick={handleCloseConfirmDialog} disabled={submittingZeroAmount || isReadOnly}>
                        Cancel
                    </Button>
                    <Button size="sm" onClick={handleConfirmZeroAmount} disabled={submittingZeroAmount || isReadOnly} loading={submittingZeroAmount}>
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
