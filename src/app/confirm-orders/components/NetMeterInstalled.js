"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Box, Alert } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { usePathname } from "next/navigation";
import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import Checkbox from "@/components/common/Checkbox";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import { Button } from "@/components/ui/button";
import orderService from "@/services/orderService";
import orderDocumentsService from "@/services/orderDocumentsService";
import mastersService from "@/services/mastersService";
import { toastSuccess, toastError } from "@/utils/toast";
import moment from "moment";

export default function NetMeterInstalledForm({ orderId, orderData, orderDocuments, onSuccess }) {
    const pathname = usePathname();
    const isReadOnly = pathname?.startsWith("/closed-orders");
    const [formData, setFormData] = useState({
        netmeter_serial_no: "",
        solarmeter_serial_no: "",
        generation: "",
        netmeter_installed_on: "",
        netmeter_installed_remarks: "",
        generate_service: false,
        service_visit_scheduled_on: "",
        service_assign_to: "",
    });
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [document, setDocument] = useState(null);
    const [existingDocument, setExistingDocument] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [successMsg, setSuccessMsg] = useState(null);
    const hasFetchedRef = useRef(false);

    const fetchUsers = useCallback(async () => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        try {
            const response = await mastersService.getList("user.model");
            setUsers(response?.result?.data || response?.data || []);
        } catch (err) {
            console.error("Failed to fetch users:", err);
            toastError(err?.response?.data?.message || err?.message || "Failed to load users");
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        if (orderData) {
            setFormData({
                netmeter_serial_no: orderData.netmeter_serial_no || "",
                solarmeter_serial_no: orderData.solarmeter_serial_no || "",
                generation: orderData.generation || "",
                netmeter_installed_on: orderData.netmeter_installed_on
                    ? moment(orderData.netmeter_installed_on).format("YYYY-MM-DD")
                    : "",
                netmeter_installed_remarks: orderData.netmeter_installed_remarks || "",
                generate_service: orderData.generate_service || false,
                service_visit_scheduled_on: orderData.service_visit_scheduled_on
                    ? moment(orderData.service_visit_scheduled_on).format("YYYY-MM-DD")
                    : "",
                service_assign_to: orderData.service_assign_to || "",
            });
        }
    }, [orderData]);

    useEffect(() => {
        if (users.length > 0 && orderData?.service_assign_to) {
            const user = users.find((u) => u.id == orderData.service_assign_to);
            setSelectedUser(user || null);
        }
    }, [users, orderData]);

    useEffect(() => {
        if (orderDocuments?.length > 0) {
            const doc = orderDocuments.find((d) => d.doc_type === "netmeter_installed_document");
            setExistingDocument(doc || null);
        }
    }, [orderDocuments]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const handleCheckboxChange = (e) => {
        const isChecked = !!e?.target?.checked;
        setFormData((prev) => ({
            ...prev,
            generate_service: isChecked,
            service_visit_scheduled_on: isChecked ? prev.service_visit_scheduled_on : "",
            service_assign_to: isChecked ? prev.service_assign_to : "",
        }));
        if (!isChecked) {
            setSelectedUser(null);
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.service_visit_scheduled_on;
                delete next.service_assign_to;
                return next;
            });
        }
    };

    const handleFileChange = (e) => {
        setDocument(e.target.files[0]);
        if (fieldErrors.document) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.document;
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
            if (!formData.netmeter_installed_on) newFieldErrors.netmeter_installed_on = "Required";
            if (formData.generate_service) {
                if (!formData.service_visit_scheduled_on) newFieldErrors.service_visit_scheduled_on = "Required when Generate Service is checked";
                if (!formData.service_assign_to) newFieldErrors.service_assign_to = "Required when Generate Service is checked";
            }
            if (Object.keys(newFieldErrors).length > 0) {
                setFieldErrors(newFieldErrors);
                return;
            }

            const updatedStages = {
                ...(orderData?.stages || {}),
                netmeter_installed: "completed",
                subsidy_claim: "pending",
            };
            const payload = {
                netmeter_installed: true,
                netmeter_serial_no: formData.netmeter_serial_no,
                solarmeter_serial_no: formData.solarmeter_serial_no,
                generation: formData.generation,
                netmeter_installed_on: formData.netmeter_installed_on,
                netmeter_installed_remarks: formData.netmeter_installed_remarks,
                generate_service: formData.generate_service,
                service_visit_scheduled_on: formData.service_visit_scheduled_on || null,
                service_assign_to: formData.service_assign_to || null,
                stages: updatedStages,
                netmeter_installed_completed_at: new Date().toISOString(),
                current_stage_key: "subsidy_claim",
            };
            if (orderData?.stages?.["netmeter_installed"] === "completed") {
                delete payload.stages;
                delete payload.current_stage_key;
            }
            await orderService.updateOrder(orderId, payload);

            if (document) {
                const docFormData = new FormData();
                docFormData.append("document", document);
                docFormData.append("order_id", orderId);
                docFormData.append("doc_type", "netmeter_installed_document");
                docFormData.append("remarks", "Net Meter Installed Document");
                if (existingDocument) {
                    await orderDocumentsService.deleteOrderDocument(existingDocument.id);
                }
                await orderDocumentsService.createOrderDocument(docFormData);
            }

            const msg = "Net Meter Installed stage completed successfully!";
            setSuccessMsg(msg);
            toastSuccess(msg);
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error("Failed to save net meter installed details:", err);
            const errMsg = err?.response?.data?.message || err?.message || "Failed to save data";
            setError(errMsg);
            toastError(errMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const isCompleted = orderData?.stages?.netmeter_installed === "completed";

    return (
        <Box component="form" onSubmit={handleSubmit} className="p-4 overflow-y-auto">
            <FormSection title="Net meter installed details">
                <FormGrid cols={2}>
                    <Input
                        name="netmeter_serial_no"
                        label="Netmeter Serial No"
                        value={formData.netmeter_serial_no}
                        onChange={handleInputChange}
                        fullWidth
                        disabled={isCompleted || isReadOnly}
                    />
                    <Input
                        name="solarmeter_serial_no"
                        label="Solarmeter Serial No"
                        value={formData.solarmeter_serial_no}
                        onChange={handleInputChange}
                        fullWidth
                        disabled={isCompleted || isReadOnly}
                    />
                    <Input
                        name="generation"
                        label="Generation"
                        value={formData.generation}
                        onChange={handleInputChange}
                        fullWidth
                        disabled={isCompleted || isReadOnly}
                    />
                    <DateField
                        name="netmeter_installed_on"
                        label="Netmeter Installed On"
                        value={formData.netmeter_installed_on}
                        onChange={handleInputChange}
                        fullWidth
                        disabled={isCompleted || isReadOnly}
                        error={!!fieldErrors.netmeter_installed_on}
                        helperText={fieldErrors.netmeter_installed_on}
                        required
                    />
                </FormGrid>

                <div className="mt-3">
                    <p className="text-sm font-medium text-muted-foreground mb-1.5">
                        {existingDocument ? "Replace Document" : "Upload Document"}
                    </p>
                    <div className="flex gap-2 items-center flex-wrap">
                        <label htmlFor="netmeter-installed-doc" className="inline-block">
                            <input
                                id="netmeter-installed-doc"
                                type="file"
                                className="hidden"
                                onChange={handleFileChange}
                                accept=".pdf,.jpg,.jpeg,.png"
                                disabled={isCompleted || isReadOnly}
                            />
                            <span className={`inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg border border-input bg-background text-sm font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground ${(isCompleted || isReadOnly) ? "pointer-events-none opacity-50" : ""}`}>
                                <VisibilityIcon sx={{ fontSize: 18 }} />
                                {document ? document.name : "Choose File"}
                            </span>
                        </label>
                        {existingDocument?.document_path && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                    try {
                                        const url = await orderDocumentsService.getDocumentUrl(existingDocument.id);
                                        if (url) window.open(url, "_blank");
                                    } catch (e) {
                                        console.error("Failed to get document URL", e);
                                    }
                                }}
                            >
                                <VisibilityIcon className="size-4 mr-1" />
                                View
                            </Button>
                        )}
                    </div>
                    {document && (
                        <p className="text-xs text-muted-foreground mt-1">New: {document.name}</p>
                    )}
                </div>

                <div className="mt-3">
                    <Input
                        name="netmeter_installed_remarks"
                        label="Remarks"
                        multiline
                        rows={3}
                        value={formData.netmeter_installed_remarks}
                        onChange={handleInputChange}
                        fullWidth
                        disabled={isCompleted || isReadOnly}
                    />
                </div>

                <div className="mt-3">
                    <Checkbox
                        name="generate_service"
                        label="Generate Service"
                        checked={formData.generate_service}
                        onChange={handleCheckboxChange}
                        disabled={isCompleted || isReadOnly}
                    />
                </div>

                {formData.generate_service && (
                    <FormGrid cols={2} className="mt-3">
                        <DateField
                            name="service_visit_scheduled_on"
                            label="Service Visit Scheduled On"
                            value={formData.service_visit_scheduled_on}
                            onChange={handleInputChange}
                            fullWidth
                            disabled={isCompleted || isReadOnly}
                            error={!!fieldErrors.service_visit_scheduled_on}
                            helperText={fieldErrors.service_visit_scheduled_on}
                            required
                        />
                        <AutocompleteField
                            name="service_assign_to"
                            label="Service Assign To"
                            options={users}
                            getOptionLabel={(option) => option.name || option.username || ""}
                            value={selectedUser}
                            onChange={(event, newValue) => {
                                setFormData((prev) => ({ ...prev, service_assign_to: newValue?.id || "" }));
                                setSelectedUser(newValue);
                                if (fieldErrors.service_assign_to) {
                                    setFieldErrors((prev) => {
                                        const next = { ...prev };
                                        delete next.service_assign_to;
                                        return next;
                                    });
                                }
                            }}
                            error={!!fieldErrors.service_assign_to}
                            helperText={fieldErrors.service_assign_to}
                            fullWidth
                            required
                            disabled={isCompleted || isReadOnly}
                        />
                    </FormGrid>
                )}
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
