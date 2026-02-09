"use client";

import { useState, useEffect } from "react";
import {
    Box,
    Grid,
    Alert,
    TextField,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import LoadingButton from "@/components/common/LoadingButton";
import orderService from "@/services/orderService";
import orderDocumentsService from "@/services/orderDocumentsService";
import { toastSuccess, toastError } from "@/utils/toast";
import moment from "moment";

export default function NetMeterApplyForm({ orderId, orderData, orderDocuments, onSuccess, readOnly = false }) {
    const [formData, setFormData] = useState({
        netmeter_applied_on: "",
        netmeter_apply_remarks: "",
    });
    const [document, setDocument] = useState(null);
    const [existingDocument, setExistingDocument] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [successMsg, setSuccessMsg] = useState(null);

    // Load existing data
    useEffect(() => {
        if (orderData) {
            setFormData({
                netmeter_applied_on: orderData.netmeter_applied_on
                    ? moment(orderData.netmeter_applied_on).format("YYYY-MM-DD")
                    : "",
                netmeter_apply_remarks: orderData.netmeter_apply_remarks || "",
            });
        }
    }, [orderData]);

    // Fetch existing document
    useEffect(() => {
        if (orderDocuments && orderDocuments.length > 0) {
            const doc = orderDocuments.find((d) => d.doc_type === "netmeter_apply_document");
            setExistingDocument(doc || null);
        }
    }, [orderDocuments]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) {
            setFieldErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleFileChange = (e) => {
        setDocument(e.target.files[0]);
        if (fieldErrors.document) {
            setFieldErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors.document;
                return newErrors;
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (readOnly) return;
        setSubmitting(true);
        setError(null);
        setFieldErrors({});
        setSuccessMsg(null);

        try {
            // Validate mandatory fields
            const newFieldErrors = {};

            if (!formData.netmeter_applied_on) {
                newFieldErrors.netmeter_applied_on = "Required";
            }

            if (!document && !existingDocument) {
                newFieldErrors.document = "Document is required";
            }

            if (Object.keys(newFieldErrors).length > 0) {
                setFieldErrors(newFieldErrors);
                return;
            }

            // Update order with stage completion
            const updatedStages = {
                ...(orderData?.stages || {}),
                netmeter_apply: "completed",
                netmeter_installed: "pending",
            };

            const payload = {
                netmeter_applied: true, // Always set to true on save
                netmeter_applied_on: formData.netmeter_applied_on,
                netmeter_apply_remarks: formData.netmeter_apply_remarks,
                stages: updatedStages,
                current_stage_key: "netmeter_installed",
                netmeter_apply_completed_at: new Date().toISOString(),
            };

            if (orderData?.stages?.["netmeter_apply"] === "completed") {
                delete payload.stages;
                delete payload.current_stage_key;
            }
            await orderService.updateOrder(orderId, payload);

            // Upload or replace document if provided
            if (document) {
                const docFormData = new FormData();
                docFormData.append("document", document);
                docFormData.append("order_id", orderId);
                docFormData.append("doc_type", "netmeter_apply_document");
                docFormData.append("remarks", "Net Meter Apply Document");

                // If existing document, delete it first
                if (existingDocument) {
                    await orderDocumentsService.deleteOrderDocument(existingDocument.id);
                }

                await orderDocumentsService.createOrderDocument(docFormData);
            }

            const msg = "Net Meter Apply stage completed successfully!";
            setSuccessMsg(msg);
            toastSuccess(msg);
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error("Failed to save net meter apply details:", err);
            const errMsg = err?.response?.data?.message || err?.message || "Failed to save data";
            setError(errMsg);
            toastError(errMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const isCompleted = orderData?.stages?.netmeter_apply === "completed";
    const isReadOnly = readOnly;

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ height: "calc(100vh - 380px)", overflowY: "auto", p: 2 }}>
            <Grid container spacing={3}>
                {/* Netmeter Applied On */}
                <Grid item size={6}>
                    <DateField
                        name="netmeter_applied_on"
                        label="Net Meter Applied On"
                        value={formData.netmeter_applied_on}
                        onChange={handleInputChange}
                        fullWidth
                        disabled={isCompleted || isReadOnly}
                        error={!!fieldErrors.netmeter_applied_on}
                        helperText={fieldErrors.netmeter_applied_on}
                        required
                    />
                </Grid>

                {/* Document Upload */}
                <Grid item size={3}>
                    <Input
                        type="file"
                        label={existingDocument ? "Replace Document" : "Upload Document"}
                        onChange={handleFileChange}
                        fullWidth
                        required={!existingDocument}
                        disabled={isCompleted || isReadOnly}
                        error={!!fieldErrors.document}
                        helperText={
                            fieldErrors.document ||
                            (document
                                ? `New: ${document.name}`
                                : existingDocument
                                    ? "Document uploaded"
                                    : "No file chosen")
                        }
                        inputProps={{ accept: ".pdf,.jpg,.jpeg,.png" }}
                    />

                </Grid>
                {existingDocument && (
                    <Grid item size={3}>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<VisibilityIcon />}
                            onClick={async () => {
                                try {
                                    const url = await orderDocumentsService.getDocumentUrl(existingDocument.id);
                                    if (url) window.open(url, "_blank");
                                } catch (e) {
                                    console.error("Failed to get document URL", e);
                                }
                            }}
                        >
                            View
                        </Button>
                    </Grid>
                )}
                {/* Remarks */}
                <Grid item size={12}>
                    <Input
                        name="netmeter_apply_remarks"
                        label="Remarks"
                        multiline
                        rows={3}
                        value={formData.netmeter_apply_remarks}
                        onChange={handleInputChange}
                        fullWidth
                        size="small"
                        disabled={isCompleted || isReadOnly}
                    />
                </Grid>

                {/* Error/Success Messages */}
                <Grid item size={12}>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    {successMsg && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            {successMsg}
                        </Alert>
                    )}

                    {/* Submit Button */}
                    <LoadingButton
                        type="submit"
                        loading={submitting}
                        disabled={isCompleted || isReadOnly}
                    >
                        {isCompleted ? "Update" : "Save"}
                    </LoadingButton>
                </Grid>
            </Grid>
        </Box>
    );
}
