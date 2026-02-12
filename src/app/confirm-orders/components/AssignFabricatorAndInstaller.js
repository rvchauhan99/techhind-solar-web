"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Box, Alert, Switch, FormControlLabel } from "@mui/material";
import { usePathname } from "next/navigation";
import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import { Button } from "@/components/ui/button";
import orderService from "@/services/orderService";
import mastersService from "@/services/mastersService";
import { toastSuccess, toastError } from "@/utils/toast";
import moment from "moment";

export default function AssignFabricatorAndInstaller({
    orderId,
    orderData,
    onSuccess,
    currentStage = "assign_fabricator_and_installer",
    nextStage = "fabrication",
    completedAtField = "assign_fabricator_installer_completed_at",
    successMessage = "Fabricator & Installer assignment saved successfully!"
}) {
    const pathname = usePathname();
    const isReadOnly = pathname?.startsWith("/closed-orders");
    const [formData, setFormData] = useState({
        fabricator_installer_are_same: true,
        fabricator_installer_id: "",
        fabricator_id: "",
        installer_id: "",
        fabrication_due_date: "",
        installation_due_date: "",
        fabrication_remarks: "",
    });
    const [users, setUsers] = useState([]);
    const [selectedFabricatorInstaller, setSelectedFabricatorInstaller] = useState(null);
    const [selectedFabricator, setSelectedFabricator] = useState(null);
    const [selectedInstaller, setSelectedInstaller] = useState(null);
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
                fabricator_installer_are_same: orderData.fabricator_installer_are_same ?? true,
                fabricator_installer_id: orderData.fabricator_installer_id || "",
                fabricator_id: orderData.fabricator_id || "",
                installer_id: orderData.installer_id || "",
                fabrication_due_date: orderData.fabrication_due_date
                    ? moment(orderData.fabrication_due_date).format("YYYY-MM-DD")
                    : "",
                installation_due_date: orderData.installation_due_date
                    ? moment(orderData.installation_due_date).format("YYYY-MM-DD")
                    : "",
                fabrication_remarks: orderData.fabrication_remarks || "",
            });
        }
    }, [orderData]);

    useEffect(() => {
        if (users.length > 0 && orderData) {
            if (orderData.fabricator_installer_id) {
                const user = users.find((u) => u.id == orderData.fabricator_installer_id);
                setSelectedFabricatorInstaller(user || null);
            }
            if (orderData.fabricator_id) {
                const user = users.find((u) => u.id == orderData.fabricator_id);
                setSelectedFabricator(user || null);
            }
            if (orderData.installer_id) {
                const user = users.find((u) => u.id == orderData.installer_id);
                setSelectedInstaller(user || null);
            }
        }
    }, [users, orderData]);

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

    const handleToggleChange = (e) => {
        const isChecked = e.target.checked;
        setFormData((prev) => ({
            ...prev,
            fabricator_installer_are_same: isChecked,
            fabricator_installer_id: isChecked ? prev.fabricator_installer_id : "",
            fabricator_id: !isChecked ? prev.fabricator_id : "",
            installer_id: !isChecked ? prev.installer_id : "",
        }));
        if (isChecked) {
            setSelectedFabricator(null);
            setSelectedInstaller(null);
        } else {
            setSelectedFabricatorInstaller(null);
        }
        setFieldErrors((prev) => {
            const next = { ...prev };
            delete next.fabricator_installer_id;
            delete next.fabricator_id;
            delete next.installer_id;
            return next;
        });
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
            if (formData.fabricator_installer_are_same) {
                if (!formData.fabricator_installer_id) newFieldErrors.fabricator_installer_id = "Required";
            } else {
                if (!formData.fabricator_id) newFieldErrors.fabricator_id = "Required";
                if (!formData.installer_id) newFieldErrors.installer_id = "Required";
            }
            if (!formData.fabrication_due_date) newFieldErrors.fabrication_due_date = "Required";
            if (!formData.installation_due_date) newFieldErrors.installation_due_date = "Required";

            if (Object.keys(newFieldErrors).length > 0) {
                setFieldErrors(newFieldErrors);
                return;
            }

            const updatedStages = {
                ...(orderData?.stages || {}),
                [currentStage]: "completed",
                [nextStage]: "pending",
            };
            const isSamePerson = formData.fabricator_installer_are_same;
            const sharedAssigneeId = formData.fabricator_installer_id || null;
            const payload = {
                fabricator_installer_are_same: isSamePerson,
                fabricator_installer_id: sharedAssigneeId,
                fabricator_id: isSamePerson ? sharedAssigneeId : (formData.fabricator_id || null),
                installer_id: isSamePerson ? sharedAssigneeId : (formData.installer_id || null),
                fabrication_due_date: formData.fabrication_due_date,
                installation_due_date: formData.installation_due_date,
                fabrication_remarks: formData.fabrication_remarks,
                stages: updatedStages,
                [completedAtField]: new Date().toISOString(),
                current_stage_key: nextStage,
            };
            if (orderData?.stages?.[currentStage] === "completed") {
                delete payload.stages;
                delete payload.current_stage_key;
            }
            await orderService.updateOrder(orderId, payload);

            setSuccessMsg(successMessage);
            toastSuccess(successMessage);
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error("Failed to save details:", err);
            const errMsg = err?.response?.data?.message || err?.message || "Failed to save data";
            setError(errMsg);
            toastError(errMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const isCompleted = orderData?.stages?.[currentStage] === "completed";

    return (
        <Box component="form" onSubmit={handleSubmit} className="p-4">
            <FormSection title="Assign Fabricator & Installer">
                <div className="mb-3">
                    <FormControlLabel
                        control={
                            <Switch
                                checked={formData.fabricator_installer_are_same}
                                onChange={handleToggleChange}
                                color="primary"
                                size="small"
                                disabled={isCompleted || isReadOnly}
                            />
                        }
                        label="Fabricator & Installer are the same person"
                        sx={{ "& .MuiFormControlLabel-label": { fontSize: "0.875rem" } }}
                    />
                </div>

                {formData.fabricator_installer_are_same ? (
                    <FormGrid cols={2}>
                        <AutocompleteField
                            name="fabricator_installer_id"
                            label="Fabricator/Installer"
                            options={users}
                            getOptionLabel={(option) => option.name || option.username || ""}
                            value={selectedFabricatorInstaller}
                            onChange={(event, newValue) => {
                                setFormData((prev) => ({ ...prev, fabricator_installer_id: newValue?.id || "" }));
                                setSelectedFabricatorInstaller(newValue);
                                if (fieldErrors.fabricator_installer_id) {
                                    setFieldErrors((prev) => {
                                        const next = { ...prev };
                                        delete next.fabricator_installer_id;
                                        return next;
                                    });
                                }
                            }}
                            error={!!fieldErrors.fabricator_installer_id}
                            helperText={fieldErrors.fabricator_installer_id}
                            fullWidth
                            required
                            disabled={isCompleted || isReadOnly}
                        />
                    </FormGrid>
                ) : (
                    <FormGrid cols={2}>
                        <AutocompleteField
                            name="fabricator_id"
                            label="Fabricator"
                            options={users}
                            getOptionLabel={(option) => option.name || option.username || ""}
                            value={selectedFabricator}
                            onChange={(event, newValue) => {
                                setFormData((prev) => ({ ...prev, fabricator_id: newValue?.id || "" }));
                                setSelectedFabricator(newValue);
                                if (fieldErrors.fabricator_id) {
                                    setFieldErrors((prev) => {
                                        const next = { ...prev };
                                        delete next.fabricator_id;
                                        return next;
                                    });
                                }
                            }}
                            error={!!fieldErrors.fabricator_id}
                            helperText={fieldErrors.fabricator_id}
                            fullWidth
                            required
                            disabled={isCompleted || isReadOnly}
                        />
                        <AutocompleteField
                            name="installer_id"
                            label="Installer"
                            options={users}
                            getOptionLabel={(option) => option.name || option.username || ""}
                            value={selectedInstaller}
                            onChange={(event, newValue) => {
                                setFormData((prev) => ({ ...prev, installer_id: newValue?.id || "" }));
                                setSelectedInstaller(newValue);
                                if (fieldErrors.installer_id) {
                                    setFieldErrors((prev) => {
                                        const next = { ...prev };
                                        delete next.installer_id;
                                        return next;
                                    });
                                }
                            }}
                            error={!!fieldErrors.installer_id}
                            helperText={fieldErrors.installer_id}
                            fullWidth
                            required
                            disabled={isCompleted || isReadOnly}
                        />
                    </FormGrid>
                )}

                <FormGrid cols={2} className="mt-3">
                    <DateField
                        name="fabrication_due_date"
                        label="Fabrication Due Date"
                        value={formData.fabrication_due_date}
                        onChange={handleInputChange}
                        fullWidth
                        disabled={isCompleted || isReadOnly}
                        error={!!fieldErrors.fabrication_due_date}
                        helperText={fieldErrors.fabrication_due_date}
                        required
                    />
                    <DateField
                        name="installation_due_date"
                        label="Installation Due Date"
                        value={formData.installation_due_date}
                        onChange={handleInputChange}
                        fullWidth
                        disabled={isCompleted || isReadOnly}
                        error={!!fieldErrors.installation_due_date}
                        helperText={fieldErrors.installation_due_date}
                        required
                    />
                </FormGrid>

                <div className="mt-3">
                    <Input
                        name="fabrication_remarks"
                        label="Remarks"
                        multiline
                        rows={3}
                        value={formData.fabrication_remarks}
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
