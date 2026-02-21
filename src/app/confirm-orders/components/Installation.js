"use client";

import { useState, useEffect, useCallback } from "react";
import { Box, Alert, Typography } from "@mui/material";
import { usePathname } from "next/navigation";
import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import Checkbox from "@/components/common/Checkbox";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import { Button } from "@/components/ui/button";
import BucketImage from "@/components/common/BucketImage";
import orderService from "@/services/orderService";
import orderDocumentsService from "@/services/orderDocumentsService";
import companyService from "@/services/companyService";
import { useAuth } from "@/hooks/useAuth";
import { toastSuccess, toastError } from "@/utils/toast";
import moment from "moment";
import {
    INSTALLATION_INVERTER_LOCATIONS,
    INSTALLATION_EARTHING_TYPES,
    INSTALLATION_WIRING_TYPES,
    INSTALLATION_ACDB_DCDB_MAKES,
    INSTALLATION_PANEL_MOUNTING_TYPES,
    INSTALLATION_NETMETER_READINESS,
    INSTALLATION_IMAGE_KEYS,
} from "@/utils/fabricationInstallationOptions";
import { COMPACT_SECTION_HEADER_CLASS } from "@/utils/formConstants";

const DEFAULT_CHECKLIST = [
    { id: "1", label: "Inverter installed and wired", checked: false },
    { id: "2", label: "ACDB/DCDB installed and connected", checked: false },
    { id: "3", label: "Earthing verified", checked: false },
    { id: "4", label: "Panel serials recorded", checked: false },
];

function getDocumentUrlById(id) {
    return orderDocumentsService.getDocumentUrl(id);
}

export default function Installation({ orderId, orderData, onSuccess }) {
    const pathname = usePathname();
    const { user } = useAuth();
    const isReadOnly = pathname?.startsWith("/closed-orders");
    const isCompleted = orderData?.stages?.installation === "completed";
    const canComplete = orderData?.stages?.fabrication === "completed" && !isCompleted && !isReadOnly;

    const [canPerform, setCanPerform] = useState(false);
    const [permissionCheckLoading, setPermissionCheckLoading] = useState(true);
    const [formData, setFormData] = useState({
        installation_start_date: "",
        installation_end_date: "",
        inverter_installation_location: "",
        earthing_type: "",
        wiring_type: "",
        acdb_dcdb_make: "",
        panel_mounting_type: "",
        netmeter_readiness_status: "",
        total_panels_installed: "",
        inverter_serial_no: "",
        panel_serial_numbers_text: "",
        earthing_resistance: "",
        initial_generation: "",
        remarks: "",
    });
    const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);
    const [images, setImages] = useState({});
    const [pendingImages, setPendingImages] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [successMsg, setSuccessMsg] = useState(null);

    const loadInstallation = useCallback(async () => {
        if (!orderId) return;
        setLoading(true);
        try {
            const data = await orderService.getInstallationByOrderId(orderId);
            if (data) {
                const panelSerials = data.panel_serial_numbers;
                const panelText = Array.isArray(panelSerials)
                    ? panelSerials.join("\n")
                    : typeof panelSerials === "string"
                        ? panelSerials
                        : "";
                setFormData({
                    installation_start_date: data.installation_start_date
                        ? moment(data.installation_start_date).format("YYYY-MM-DD")
                        : "",
                    installation_end_date: data.installation_end_date
                        ? moment(data.installation_end_date).format("YYYY-MM-DD")
                        : "",
                    inverter_installation_location: data.inverter_installation_location || "",
                    earthing_type: data.earthing_type || "",
                    wiring_type: data.wiring_type || "",
                    acdb_dcdb_make: data.acdb_dcdb_make || "",
                    panel_mounting_type: data.panel_mounting_type || "",
                    netmeter_readiness_status: data.netmeter_readiness_status || "",
                    total_panels_installed: data.total_panels_installed != null ? String(data.total_panels_installed) : "",
                    inverter_serial_no: data.inverter_serial_no || "",
                    panel_serial_numbers_text: panelText,
                    earthing_resistance: data.earthing_resistance != null ? String(data.earthing_resistance) : "",
                    initial_generation: data.initial_generation != null ? String(data.initial_generation) : "",
                    remarks: data.remarks || "",
                });
                setChecklist(
                    Array.isArray(data.checklist) && data.checklist.length > 0
                        ? data.checklist
                        : DEFAULT_CHECKLIST
                );
                setImages(data.images && typeof data.images === "object" ? { ...data.images } : {});
            } else {
                setImages({});
                setChecklist(DEFAULT_CHECKLIST);
            }
        } catch (err) {
            console.error("Failed to load installation:", err);
            toastError(err?.response?.data?.message || err?.message || "Failed to load installation");
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    useEffect(() => {
        loadInstallation();
    }, [loadInstallation]);

    const [pendingPreviewUrls, setPendingPreviewUrls] = useState({});
    useEffect(() => {
        const next = {};
        Object.entries(pendingImages).forEach(([k, f]) => {
            if (f) next[k] = URL.createObjectURL(f);
        });
        setPendingPreviewUrls((prev) => {
            Object.values(prev).forEach((u) => typeof u === "string" && URL.revokeObjectURL(u));
            return next;
        });
        return () => Object.values(next).forEach((u) => URL.revokeObjectURL(u));
    }, [pendingImages]);

    useEffect(() => {
        if (!orderData?.id || !user?.id) {
            setPermissionCheckLoading(false);
            setCanPerform(false);
            return;
        }
        const assignedInstallerId = orderData.fabricator_installer_are_same
            ? orderData.fabricator_installer_id
            : orderData.installer_id;
        const isAssignedInstaller = Number(assignedInstallerId) === Number(user.id);
        const plannedWarehouseId = orderData.planned_warehouse_id;

        if (!plannedWarehouseId) {
            setCanPerform(!!isAssignedInstaller);
            setPermissionCheckLoading(false);
            return;
        }

        let cancelled = false;
        setPermissionCheckLoading(true);
        companyService
            .getWarehouseManagers(plannedWarehouseId)
            .then((res) => {
                if (cancelled) return;
                const data = res?.result ?? res ?? {};
                const managers = Array.isArray(data) ? data : (data?.data && Array.isArray(data.data) ? data.data : []);
                const isManager = managers.some((m) => Number(m.id) === Number(user.id));
                setCanPerform(!!isManager || !!isAssignedInstaller);
            })
            .catch(() => {
                if (cancelled) return;
                setCanPerform(!!isAssignedInstaller);
            })
            .finally(() => {
                if (!cancelled) setPermissionCheckLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [
        orderData?.id,
        orderData?.planned_warehouse_id,
        orderData?.installer_id,
        orderData?.fabricator_installer_id,
        orderData?.fabricator_installer_are_same,
        user?.id,
    ]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    };

    const handleChecklistChange = (id, checked) => {
        setChecklist((prev) =>
            prev.map((item) => (item.id === id ? { ...item, checked } : item))
        );
    };

    const handleImageSelect = (key, file) => {
        if (!file) return;
        setPendingImages((prev) => ({ ...prev, [key]: file }));
        setFieldErrors((prev) => {
            const next = { ...prev };
            if (next[`image_${key}`]) delete next[`image_${key}`];
            return next;
        });
    };

    const handleImageRemove = (key) => {
        setPendingImages((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
        setImages((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const validate = () => {
        const errs = {};
        const requiredImages = INSTALLATION_IMAGE_KEYS.filter((k) => k.required).map((k) => k.key);
        for (const key of requiredImages) {
            if (!images[key] && !pendingImages[key]) errs[`image_${key}`] = "Required";
        }
        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e, complete = false) => {
        e.preventDefault();
        if (isReadOnly) return;
        if (!canPerform) {
            toastError(
                "Only warehouse managers of the planned warehouse or the assigned installer can fill and complete Installation. Contact your administrator if you need access."
            );
            return;
        }
        if (complete && !canComplete) return;
        if (complete && !validate()) return;

        setSubmitting(true);
        setError(null);
        setFieldErrors((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((k) => k.startsWith("image_") && delete next[k]);
            return next;
        });
        setSuccessMsg(null);

        try {
            let finalImages = { ...images };
            for (const [key, file] of Object.entries(pendingImages)) {
                const fd = new FormData();
                fd.append("document", file);
                fd.append("order_id", orderId);
                fd.append("doc_type", `installation_${key}`);
                fd.append("remarks", `Installation - ${key}`);
                try {
                    const res = await orderDocumentsService.createOrderDocument(fd);
                    const docId = res?.result?.id ?? res?.id ?? res?.data?.id;
                    if (!docId) {
                        throw new Error(`Image upload succeeded but no document ID returned for ${key}`);
                    }
                    finalImages[key] = docId;
                } catch (uploadErr) {
                    const msg = uploadErr?.response?.data?.message || uploadErr?.message || "Image upload failed";
                    toastError(`Failed to upload ${INSTALLATION_IMAGE_KEYS.find((k) => k.key === key)?.label || key}. ${msg}`);
                    throw new Error(`Image upload failed: ${msg}`);
                }
            }
            setPendingImages({});

            const panelText = formData.panel_serial_numbers_text?.trim() || "";
            const panelSerials = panelText
                ? panelText.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
                : null;
            const payload = {
                installation_start_date: formData.installation_start_date || null,
                installation_end_date: formData.installation_end_date || null,
                inverter_installation_location: formData.inverter_installation_location || null,
                earthing_type: formData.earthing_type || null,
                wiring_type: formData.wiring_type || null,
                acdb_dcdb_make: formData.acdb_dcdb_make || null,
                panel_mounting_type: formData.panel_mounting_type || null,
                netmeter_readiness_status: formData.netmeter_readiness_status || null,
                total_panels_installed: formData.total_panels_installed ? parseInt(formData.total_panels_installed, 10) : null,
                inverter_serial_no: formData.inverter_serial_no || null,
                panel_serial_numbers: panelSerials,
                earthing_resistance: formData.earthing_resistance ? parseFloat(formData.earthing_resistance) : null,
                initial_generation: formData.initial_generation ? parseFloat(formData.initial_generation) : null,
                remarks: formData.remarks || null,
                checklist,
                images: finalImages,
                complete,
            };
            await orderService.saveInstallation(orderId, payload);
            setImages(finalImages);
            setSuccessMsg(complete ? "Installation stage completed successfully!" : "Installation saved.");
            toastSuccess(complete ? "Installation stage completed successfully!" : "Saved.");
            if (onSuccess) onSuccess();
        } catch (err) {
            const errMsg = err?.response?.data?.message || err?.message || "Failed to save";
            setError(errMsg);
            toastError(errMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const disabled = isCompleted || isReadOnly || (!isReadOnly && !canPerform);

    if (loading) {
        return (
            <Box className="p-4">
                <Typography color="text.secondary">Loading installation…</Typography>
            </Box>
        );
    }

    if (permissionCheckLoading) {
        return (
            <Box className="p-4">
                <Typography color="text.secondary">Checking permissions…</Typography>
            </Box>
        );
    }

    if (!isReadOnly && !canPerform) {
        return (
            <Box className="p-4">
                <Alert severity="warning" sx={{ mt: 1 }}>
                    Only warehouse managers of the planned warehouse or the assigned installer can fill and complete
                    Installation. You do not have permission to perform this action. Contact your administrator if you
                    need access.
                </Alert>
            </Box>
        );
    }

    return (
        <Box component="form" onSubmit={(e) => handleSubmit(e, false)} className="p-3 sm:p-4 max-w-4xl">
            {orderData?.installer_id || orderData?.fabricator_installer_id ? (
                <FormSection title="Installer (from assignment)">
                    <Typography variant="body2" color="text.secondary">
                        Installer is assigned in the &quot;Assign Fabricator &amp; Installer&quot; stage.
                    </Typography>
                </FormSection>
            ) : null}

            <FormSection title="Installation execution">
                <FormGrid cols={2}>
                    <DateField
                        name="installation_start_date"
                        label="Installation Start Date"
                        value={formData.installation_start_date}
                        onChange={handleInputChange}
                        fullWidth
                        disabled={disabled}
                    />
                    <DateField
                        name="installation_end_date"
                        label="Installation End Date"
                        value={formData.installation_end_date}
                        onChange={handleInputChange}
                        fullWidth
                        disabled={disabled}
                    />
                    <AutocompleteField
                        name="inverter_installation_location"
                        label="Inverter Installation Location"
                        options={INSTALLATION_INVERTER_LOCATIONS}
                        getOptionLabel={(o) => (typeof o === "string" ? o : o?.label ?? "")}
                        value={formData.inverter_installation_location || null}
                        onChange={(e, newValue) => handleInputChange({ target: { name: "inverter_installation_location", value: newValue ?? "" } })}
                        fullWidth
                        disabled={disabled}
                    />
                    <AutocompleteField
                        name="earthing_type"
                        label="Earthing Type"
                        options={INSTALLATION_EARTHING_TYPES}
                        getOptionLabel={(o) => (typeof o === "string" ? o : o?.label ?? "")}
                        value={formData.earthing_type || null}
                        onChange={(e, newValue) => handleInputChange({ target: { name: "earthing_type", value: newValue ?? "" } })}
                        fullWidth
                        disabled={disabled}
                    />
                    <AutocompleteField
                        name="wiring_type"
                        label="Wiring Type"
                        options={INSTALLATION_WIRING_TYPES}
                        getOptionLabel={(o) => (typeof o === "string" ? o : o?.label ?? "")}
                        value={formData.wiring_type || null}
                        onChange={(e, newValue) => handleInputChange({ target: { name: "wiring_type", value: newValue ?? "" } })}
                        fullWidth
                        disabled={disabled}
                    />
                    <AutocompleteField
                        name="acdb_dcdb_make"
                        label="ACDB / DCDB Make"
                        options={INSTALLATION_ACDB_DCDB_MAKES}
                        getOptionLabel={(o) => (typeof o === "string" ? o : o?.label ?? "")}
                        value={formData.acdb_dcdb_make || null}
                        onChange={(e, newValue) => handleInputChange({ target: { name: "acdb_dcdb_make", value: newValue ?? "" } })}
                        fullWidth
                        disabled={disabled}
                    />
                    <AutocompleteField
                        name="panel_mounting_type"
                        label="Panel Mounting Type"
                        options={INSTALLATION_PANEL_MOUNTING_TYPES}
                        getOptionLabel={(o) => (typeof o === "string" ? o : o?.label ?? "")}
                        value={formData.panel_mounting_type || null}
                        onChange={(e, newValue) => handleInputChange({ target: { name: "panel_mounting_type", value: newValue ?? "" } })}
                        fullWidth
                        disabled={disabled}
                    />
                    <AutocompleteField
                        name="netmeter_readiness_status"
                        label="Netmeter Readiness Status"
                        options={INSTALLATION_NETMETER_READINESS}
                        getOptionLabel={(o) => (typeof o === "string" ? o : o?.label ?? "")}
                        value={formData.netmeter_readiness_status || null}
                        onChange={(e, newValue) => handleInputChange({ target: { name: "netmeter_readiness_status", value: newValue ?? "" } })}
                        fullWidth
                        disabled={disabled}
                    />
                    <Input
                        name="total_panels_installed"
                        label="Total Panels Installed"
                        type="number"
                        value={formData.total_panels_installed}
                        onChange={handleInputChange}
                        fullWidth
                        disabled={disabled}
                    />
                    <Input
                        name="inverter_serial_no"
                        label="Inverter Serial No"
                        value={formData.inverter_serial_no}
                        onChange={handleInputChange}
                        fullWidth
                        disabled={disabled}
                    />
                    <Input
                        name="earthing_resistance"
                        label="Earthing Resistance"
                        value={formData.earthing_resistance}
                        onChange={handleInputChange}
                        fullWidth
                        disabled={disabled}
                    />
                    <Input
                        name="initial_generation"
                        label="Initial Generation"
                        value={formData.initial_generation}
                        onChange={handleInputChange}
                        fullWidth
                        disabled={disabled}
                    />
                </FormGrid>

                <Input
                    name="panel_serial_numbers_text"
                    label="Panel Serial Numbers (one per line or comma-separated)"
                    multiline
                    rows={3}
                    value={formData.panel_serial_numbers_text}
                    onChange={handleInputChange}
                    fullWidth
                    disabled={disabled}
                />

                <div className={COMPACT_SECTION_HEADER_CLASS}>Checklist</div>
                <Box className="mt-1 mb-2">
                    {checklist.map((item) => (
                        <Checkbox
                            key={item.id}
                            name={`check_${item.id}`}
                            label={item.label}
                            checked={!!item.checked}
                            onChange={(e) => handleChecklistChange(item.id, e.target.checked)}
                            disabled={disabled}
                        />
                    ))}
                </Box>

                <div className={COMPACT_SECTION_HEADER_CLASS}>Photos</div>
                <Box className="mt-1 mb-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {INSTALLATION_IMAGE_KEYS.map(({ key, label, required }) => {
                        const hasPending = !!pendingImages[key];
                        const hasSaved = !!images[key];
                        const previewUrl = pendingPreviewUrls[key];
                        return (
                            <Box key={key}>
                                <Typography variant="body2" className="mb-1">
                                    {label}
                                    {required && <span className="text-destructive ml-0.5">*</span>}
                                </Typography>
                                {(hasPending || hasSaved) ? (
                                    <Box className="flex items-center gap-2 flex-wrap">
                                        {hasPending && previewUrl ? (
                                            <Box
                                                component="img"
                                                src={previewUrl}
                                                alt={label}
                                                sx={{ width: 120, height: 120, objectFit: "cover", borderRadius: 1, border: "1px solid", borderColor: "divider" }}
                                            />
                                        ) : hasPending ? (
                                            <Box component="span" sx={{ fontSize: "0.85rem", color: "text.secondary" }}>Loading…</Box>
                                        ) : hasSaved ? (
                                            <BucketImage
                                                path={images[key]}
                                                getUrl={getDocumentUrlById}
                                                alt={label}
                                                sx={{ width: 120, height: 120, objectFit: "cover", borderRadius: 1, border: "1px solid", borderColor: "divider" }}
                                            />
                                        ) : null}
                                        {!disabled && (
                                            <>
                                                <label className="text-xs text-muted-foreground cursor-pointer inline-flex items-center min-h-[44px]">
                                                    Replace:{" "}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        capture="environment"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const f = e.target.files?.[0];
                                                            if (f) handleImageSelect(key, f);
                                                            e.target.value = "";
                                                        }}
                                                    />
                                                    <span className="underline">Take photo or choose file</span>
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => handleImageRemove(key)}
                                                    className="text-xs text-destructive underline cursor-pointer"
                                                >
                                                    Remove
                                                </button>
                                            </>
                                        )}
                                    </Box>
                                ) : (
                                    !disabled && (
                                        <label className="inline-block">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0];
                                                    if (f) handleImageSelect(key, f);
                                                    e.target.value = "";
                                                }}
                                            />
                                            <span className="inline-flex items-center min-h-[44px] px-4 rounded-lg border border-input bg-background text-sm cursor-pointer hover:bg-accent touch-manipulation">
                                                Take photo or upload
                                            </span>
                                        </label>
                                    )
                                )}
                                {fieldErrors[`image_${key}`] && (
                                    <p className="text-xs text-destructive mt-0.5">{fieldErrors[`image_${key}`]}</p>
                                )}
                            </Box>
                        );
                    })}
                </Box>

                <Input
                    name="remarks"
                    label="Remarks"
                    multiline
                    rows={3}
                    value={formData.remarks}
                    onChange={handleInputChange}
                    fullWidth
                    disabled={disabled}
                />
            </FormSection>

            <div className="mt-4 flex flex-col gap-2">
                {error && <Alert severity="error">{error}</Alert>}
                {successMsg && <Alert severity="success">{successMsg}</Alert>}
                <div className="flex gap-2 flex-wrap">
                    <Button
                        type="submit"
                        size="sm"
                        className="min-h-[44px] touch-manipulation"
                        loading={submitting}
                        disabled={disabled}
                    >
                        Save
                    </Button>
                    {canComplete && (
                        <Button
                            type="button"
                            size="sm"
                            variant="default"
                            className="min-h-[44px] touch-manipulation"
                            loading={submitting}
                            onClick={(e) => handleSubmit(e, true)}
                        >
                            Complete Installation
                        </Button>
                    )}
                </div>
                {!canComplete && orderData?.stages?.fabrication !== "completed" && !isCompleted && (
                    <Typography variant="caption" color="text.secondary">
                        Complete the Fabrication stage to unlock Installation.
                    </Typography>
                )}
            </div>
        </Box>
    );
}
