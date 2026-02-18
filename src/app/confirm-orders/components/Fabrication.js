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
import { toastSuccess, toastError } from "@/utils/toast";
import moment from "moment";
import {
    FABRICATION_STRUCTURE_TYPES,
    FABRICATION_STRUCTURE_MATERIALS,
    FABRICATION_COATING_TYPES,
    FABRICATION_TILT_ANGLES,
    FABRICATION_HEIGHT_FROM_ROOF,
    FABRICATION_LABOUR_CATEGORIES,
    FABRICATION_IMAGE_KEYS,
} from "@/utils/fabricationInstallationOptions";
import { COMPACT_SECTION_HEADER_CLASS } from "@/utils/formConstants";

const DEFAULT_CHECKLIST = [
    { id: "1", label: "Structure erected as per design", checked: false },
    { id: "2", label: "Anchoring and fasteners verified", checked: false },
    { id: "3", label: "Coating and finish as per spec", checked: false },
];

function getDocumentUrlById(id) {
    return orderDocumentsService.getDocumentUrl(id);
}

export default function Fabrication({ orderId, orderData, onSuccess }) {
    const pathname = usePathname();
    const isReadOnly = pathname?.startsWith("/closed-orders");
    const isCompleted = orderData?.stages?.fabrication === "completed";
    const canComplete = orderData?.stages?.planner === "completed" && !isCompleted && !isReadOnly;

    const [formData, setFormData] = useState({
        fabrication_start_date: "",
        fabrication_end_date: "",
        structure_type: "",
        structure_material: "",
        coating_type: "",
        tilt_angle: "",
        height_from_roof: "",
        labour_category: "",
        labour_count: "",
        remarks: "",
    });
    const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);
    const [images, setImages] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [successMsg, setSuccessMsg] = useState(null);
    const [uploadingKey, setUploadingKey] = useState(null);

    const loadFabrication = useCallback(async () => {
        if (!orderId) return;
        setLoading(true);
        try {
            const data = await orderService.getFabricationByOrderId(orderId);
            if (data) {
                setFormData({
                    fabrication_start_date: data.fabrication_start_date
                        ? moment(data.fabrication_start_date).format("YYYY-MM-DD")
                        : "",
                    fabrication_end_date: data.fabrication_end_date
                        ? moment(data.fabrication_end_date).format("YYYY-MM-DD")
                        : "",
                    structure_type: data.structure_type || "",
                    structure_material: data.structure_material || "",
                    coating_type: data.coating_type || "",
                    tilt_angle: data.tilt_angle != null ? (FABRICATION_TILT_ANGLES.includes(`${data.tilt_angle}°`) ? `${data.tilt_angle}°` : String(data.tilt_angle)) : "",
                    height_from_roof: data.height_from_roof != null ? (FABRICATION_HEIGHT_FROM_ROOF.includes(`${data.height_from_roof} mm`) ? `${data.height_from_roof} mm` : String(data.height_from_roof)) : "",
                    labour_category: data.labour_category || "",
                    labour_count: data.labour_count != null ? String(data.labour_count) : "",
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
            console.error("Failed to load fabrication:", err);
            toastError(err?.response?.data?.message || err?.message || "Failed to load fabrication");
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    useEffect(() => {
        loadFabrication();
    }, [loadFabrication]);

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

    const handleImageUpload = async (key, file) => {
        if (!file || !orderId) return;
        setUploadingKey(key);
        try {
            const formData = new FormData();
            formData.append("document", file);
            formData.append("order_id", orderId);
            formData.append("doc_type", `fabrication_${key}`);
            formData.append("remarks", `Fabrication - ${key}`);
            const res = await orderDocumentsService.createOrderDocument(formData);
            const docId = res?.result?.id ?? res?.id;
            if (docId) {
                setImages((prev) => ({ ...prev, [key]: docId }));
                toastSuccess("Image uploaded");
            }
        } catch (err) {
            toastError(err?.response?.data?.message || err?.message || "Upload failed");
        } finally {
            setUploadingKey(null);
        }
    };

    const validate = () => {
        const errs = {};
        const requiredImages = FABRICATION_IMAGE_KEYS.filter((k) => k.required).map((k) => k.key);
        for (const key of requiredImages) {
            if (!images[key]) errs[`image_${key}`] = "Required";
        }
        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e, complete = false) => {
        e.preventDefault();
        if (isReadOnly) return;
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
            const payload = {
                ...formData,
                labour_count: formData.labour_count ? parseInt(formData.labour_count, 10) : null,
                tilt_angle: formData.tilt_angle ? parseFloat(String(formData.tilt_angle).replace(/[^\d.-]/g, "")) || null : null,
                height_from_roof: formData.height_from_roof ? parseFloat(String(formData.height_from_roof).replace(/[^\d.-]/g, "")) || null : null,
                checklist,
                images,
                complete,
            };
            await orderService.saveFabrication(orderId, payload);
            setSuccessMsg(complete ? "Fabrication stage completed successfully!" : "Fabrication saved.");
            toastSuccess(complete ? "Fabrication stage completed successfully!" : "Saved.");
            if (onSuccess) onSuccess();
        } catch (err) {
            const errMsg = err?.response?.data?.message || err?.message || "Failed to save";
            setError(errMsg);
            toastError(errMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const disabled = isCompleted || isReadOnly;

    if (loading) {
        return (
            <Box className="p-4">
                <Typography color="text.secondary">Loading fabrication…</Typography>
            </Box>
        );
    }

    return (
        <Box component="form" onSubmit={(e) => handleSubmit(e, false)} className="p-4">
            {orderData?.fabricator_id || orderData?.fabricator_installer_id ? (
                <FormSection title="Fabricator (from assignment)">
                    <Typography variant="body2" color="text.secondary">
                        Fabricator is assigned in the &quot;Assign Fabricator &amp; Installer&quot; stage.
                    </Typography>
                </FormSection>
            ) : null}

            <FormSection title="Fabrication execution">
                <FormGrid cols={2}>
                    <DateField
                        name="fabrication_start_date"
                        label="Fabrication Start Date"
                        value={formData.fabrication_start_date}
                        onChange={handleInputChange}
                        fullWidth
                        disabled={disabled}
                    />
                    <DateField
                        name="fabrication_end_date"
                        label="Fabrication End Date"
                        value={formData.fabrication_end_date}
                        onChange={handleInputChange}
                        fullWidth
                        disabled={disabled}
                    />
                    <AutocompleteField
                        name="structure_type"
                        label="Structure Type"
                        options={FABRICATION_STRUCTURE_TYPES}
                        getOptionLabel={(o) => (typeof o === "string" ? o : o?.label ?? "")}
                        value={formData.structure_type || null}
                        onChange={(e, newValue) => handleInputChange({ target: { name: "structure_type", value: newValue ?? "" } })}
                        fullWidth
                        disabled={disabled}
                    />
                    <AutocompleteField
                        name="structure_material"
                        label="Structure Material"
                        options={FABRICATION_STRUCTURE_MATERIALS}
                        getOptionLabel={(o) => (typeof o === "string" ? o : o?.label ?? "")}
                        value={formData.structure_material || null}
                        onChange={(e, newValue) => handleInputChange({ target: { name: "structure_material", value: newValue ?? "" } })}
                        fullWidth
                        disabled={disabled}
                    />
                    <AutocompleteField
                        name="coating_type"
                        label="Coating Type"
                        options={FABRICATION_COATING_TYPES}
                        getOptionLabel={(o) => (typeof o === "string" ? o : o?.label ?? "")}
                        value={formData.coating_type || null}
                        onChange={(e, newValue) => handleInputChange({ target: { name: "coating_type", value: newValue ?? "" } })}
                        fullWidth
                        disabled={disabled}
                    />
                    <AutocompleteField
                        name="tilt_angle"
                        label="Tilt Angle"
                        options={FABRICATION_TILT_ANGLES}
                        getOptionLabel={(o) => (typeof o === "string" ? o : o?.label ?? "")}
                        value={formData.tilt_angle || null}
                        onChange={(e, newValue) => handleInputChange({ target: { name: "tilt_angle", value: newValue ?? "" } })}
                        fullWidth
                        disabled={disabled}
                    />
                    <AutocompleteField
                        name="height_from_roof"
                        label="Height from Roof (mm)"
                        options={FABRICATION_HEIGHT_FROM_ROOF}
                        getOptionLabel={(o) => (typeof o === "string" ? o : o?.label ?? "")}
                        value={formData.height_from_roof || null}
                        onChange={(e, newValue) => handleInputChange({ target: { name: "height_from_roof", value: newValue ?? "" } })}
                        fullWidth
                        disabled={disabled}
                    />
                    <AutocompleteField
                        name="labour_category"
                        label="Labour Category"
                        options={FABRICATION_LABOUR_CATEGORIES}
                        getOptionLabel={(o) => (typeof o === "string" ? o : o?.label ?? "")}
                        value={formData.labour_category || null}
                        onChange={(e, newValue) => handleInputChange({ target: { name: "labour_category", value: newValue ?? "" } })}
                        fullWidth
                        disabled={disabled}
                    />
                    <Input
                        name="labour_count"
                        label="Labour Count"
                        type="number"
                        value={formData.labour_count}
                        onChange={handleInputChange}
                        fullWidth
                        disabled={disabled}
                    />
                </FormGrid>

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
                    {FABRICATION_IMAGE_KEYS.map(({ key, label, required }) => (
                        <Box key={key}>
                            <Typography variant="body2" className="mb-1">
                                {label}
                                {required && <span className="text-destructive ml-0.5">*</span>}
                            </Typography>
                            {images[key] ? (
                                <Box className="flex items-center gap-2">
                                    <BucketImage
                                        path={images[key]}
                                        getUrl={getDocumentUrlById}
                                        alt={label}
                                    />
                                    {!disabled && (
                                        <label className="text-xs text-muted-foreground cursor-pointer">
                                            Replace:{" "}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0];
                                                    if (f) handleImageUpload(key, f);
                                                    e.target.value = "";
                                                }}
                                            />
                                            <span className="underline">Choose file</span>
                                        </label>
                                    )}
                                </Box>
                            ) : (
                                !disabled && (
                                    <label className="inline-block">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            disabled={uploadingKey === key}
                                            onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (f) handleImageUpload(key, f);
                                                e.target.value = "";
                                            }}
                                        />
                                        <span className="inline-flex items-center h-9 px-2.5 rounded-lg border border-input bg-background text-sm cursor-pointer hover:bg-accent">
                                            {uploadingKey === key ? "Uploading…" : "Upload"}
                                        </span>
                                    </label>
                                )
                            )}
                            {fieldErrors[`image_${key}`] && (
                                <p className="text-xs text-destructive mt-0.5">{fieldErrors[`image_${key}`]}</p>
                            )}
                        </Box>
                    ))}
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
                            loading={submitting}
                            onClick={(e) => handleSubmit(e, true)}
                        >
                            Complete Fabrication
                        </Button>
                    )}
                </div>
                {!canComplete && orderData?.stages?.planner !== "completed" && !isCompleted && (
                    <Typography variant="caption" color="text.secondary">
                        Complete the Planner stage to unlock Fabrication.
                    </Typography>
                )}
            </div>
        </Box>
    );
}
