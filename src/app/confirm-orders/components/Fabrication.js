"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Box, Alert, Typography } from "@mui/material";
import { usePathname } from "next/navigation";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import Checkbox from "@/components/common/Checkbox";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import { Button } from "@/components/ui/button";
import BucketImage from "@/components/common/BucketImage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import orderService from "@/services/orderService";
import orderDocumentsService from "@/services/orderDocumentsService";
import companyService from "@/services/companyService";
import { useAuth } from "@/hooks/useAuth";
import { toastSuccess, toastError } from "@/utils/toast";
import moment from "moment";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
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

export default function Fabrication({ orderId, orderData, onSuccess, splitLayout = false, amendMode = false }) {
    const pathname = usePathname();
    const { user } = useAuth();
    
    const requiredFabricationImageKeys = useMemo(
        () => FABRICATION_IMAGE_KEYS.filter((k) => k.required),
        []
    );
    const optionalFabricationImageKeys = useMemo(
        () => FABRICATION_IMAGE_KEYS.filter((k) => !k.required),
        []
    );
    const isReadOnly = pathname?.startsWith("/closed-orders") || pathname?.startsWith("/cancelled-orders");
    const isStageCompleted = orderData?.stages?.fabrication === "completed";
    const isCompleted = isStageCompleted && !amendMode;
    const canComplete = orderData?.stages?.planner === "completed" && !isStageCompleted && !isReadOnly;

    const [canPerform, setCanPerform] = useState(false);
    const [permissionCheckLoading, setPermissionCheckLoading] = useState(true);
    const today = moment().format("YYYY-MM-DD");
    const [formData, setFormData] = useState({
        fabrication_start_date: today,
        fabrication_end_date: today,
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
    const [pendingImages, setPendingImages] = useState({}); // { key: File } - selected but not yet uploaded
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [successMsg, setSuccessMsg] = useState(null);

    const loadFabrication = useCallback(async () => {
        if (!orderId) return;
        setLoading(true);
        try {
            const data = await orderService.getFabricationByOrderId(orderId);
            if (data) {
                const todayStr = moment().format("YYYY-MM-DD");
                setFormData({
                    fabrication_start_date: data.fabrication_start_date
                        ? moment(data.fabrication_start_date).format("YYYY-MM-DD")
                        : todayStr,
                    fabrication_end_date: data.fabrication_end_date
                        ? moment(data.fabrication_end_date).format("YYYY-MM-DD")
                        : todayStr,
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
                const todayStr = moment().format("YYYY-MM-DD");
                setFormData((prev) => ({
                    ...prev,
                    fabrication_start_date: todayStr,
                    fabrication_end_date: todayStr,
                }));
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

    const [pendingPreviewUrls, setPendingPreviewUrls] = useState({});
    const [photoPreview, setPhotoPreview] = useState(null);
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
        const assignedFabricatorId = orderData.fabricator_installer_are_same
            ? orderData.fabricator_installer_id
            : orderData.fabricator_id;
        const isAssignedFabricator = Number(assignedFabricatorId) === Number(user.id);
        const plannedWarehouseId = orderData.planned_warehouse_id;

        if (!plannedWarehouseId) {
            setCanPerform(!!isAssignedFabricator);
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
                setCanPerform(!!isManager || !!isAssignedFabricator);
            })
            .catch(() => {
                if (cancelled) return;
                setCanPerform(!!isAssignedFabricator);
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
        orderData?.fabricator_id,
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

    const renderFabricationPhotoField = ({ key, label, required }) => {
        const hasPending = !!pendingImages[key];
        const hasSaved = !!images[key];
        const previewUrl = pendingPreviewUrls[key];
        const errorMsg = fieldErrors[`image_${key}`];

        return (
            <Box key={key} className="flex flex-col h-full rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300">
                <Box className="flex items-center justify-between px-3 py-2.5 bg-slate-50 border-b border-slate-100 min-h-[48px]">
                    <Typography variant="body2" className="font-semibold text-slate-700 leading-tight">
                        {label} {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
                    </Typography>
                </Box>

                <Box className="flex-1 p-3 flex flex-col justify-center items-center bg-white min-h-[140px] relative group">
                    {(hasPending || hasSaved) ? (
                        <div className="relative w-full h-full flex flex-col items-center justify-center min-h-[120px]">
                            <div 
                                className="w-full h-full max-h-[140px] rounded-lg overflow-hidden border-2 border-slate-100 relative cursor-pointer block touch-manipulation shadow-sm group-hover:border-emerald-200 transition-colors"
                                onClick={() => {
                                    if (hasPending && previewUrl) {
                                        setPhotoPreview({ title: label, src: previewUrl, isPending: true });
                                    } else if (hasSaved && images[key]) {
                                        setPhotoPreview({ title: label, src: images[key], isPending: false });
                                    }
                                }}
                            >
                                {hasPending && previewUrl ? (
                                    <Box
                                        component="img"
                                        src={previewUrl}
                                        alt={label}
                                        sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    />
                                ) : hasPending ? (
                                    <Box className="flex items-center justify-center h-full w-full bg-slate-50 text-slate-400">
                                        <span className="text-sm">Loading...</span>
                                    </Box>
                                ) : hasSaved ? (
                                    <BucketImage
                                        path={images[key]}
                                        getUrl={getDocumentUrlById}
                                        alt={label}
                                        sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    />
                                ) : null}

                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg backdrop-blur-[1px]">
                                    <span className="text-white text-xs font-semibold px-2 py-1 bg-black/50 rounded-full border border-white/20 shadow-sm flex items-center gap-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-maximize-2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/></svg>
                                        View Full
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <label className={`w-full h-full min-h-[130px] flex flex-col items-center justify-center rounded-lg border-2 border-dashed ${errorMsg ? 'border-red-300 bg-red-50 hover:bg-red-100 hover:border-red-400 text-red-500' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-emerald-400 text-slate-500 hover:text-emerald-600'} cursor-pointer transition-all duration-200 ease-in-out group touch-manipulation`}>
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                disabled={disabled}
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleImageSelect(key, f);
                                    e.target.value = "";
                                }}
                            />
                            <CloudUploadIcon className="w-8 h-8 mb-2 opacity-50 group-hover:opacity-100 transition-opacity group-hover:scale-110 duration-300" />
                            <Typography variant="caption" className="font-medium text-center px-2">
                                Take photo <br/>or upload file
                            </Typography>
                        </label>
                    )}
                </Box>
                
                <Box className="px-3 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between min-h-[44px]">
                    {(hasPending || hasSaved) ? (
                        <>
                            <label className="text-xs font-semibold text-slate-500 hover:text-emerald-600 cursor-pointer flex items-center gap-1 min-w-[44px] min-h-[44px] touch-manipulation transition-colors uppercase tracking-wider">
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    disabled={disabled}
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleImageSelect(key, f);
                                        e.target.value = "";
                                    }}
                                />
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                                Replace
                            </label>
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={() => handleImageRemove(key)}
                                    className="text-xs font-semibold text-red-500 hover:text-red-700 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation transition-colors uppercase tracking-wider disabled:opacity-50"
                                >
                                    Remove
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="w-full text-center">
                            {errorMsg ? (
                                <Typography variant="caption" color="error.main" className="font-semibold flex items-center justify-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                                    {errorMsg}
                                </Typography>
                            ) : (
                                <span className="text-xs font-medium text-slate-400">Not Uploaded</span>
                            )}
                        </div>
                    )}
                </Box>
            </Box>
        );
    };

    const validate = () => {
        const errs = {};
        if (!formData.fabrication_start_date) errs.fabrication_start_date = "Start date is required";
        if (!formData.fabrication_end_date) errs.fabrication_end_date = "End date is required";
        const requiredImages = FABRICATION_IMAGE_KEYS.filter((k) => k.required).map((k) => k.key);
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
                "Only warehouse managers of the planned warehouse or the assigned fabricator can fill and complete Fabrication. Contact your administrator if you need access."
            );
            return;
        }
        if (complete && !canComplete) return;
        if (!validate()) return;

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
                const formDataUpload = new FormData();
                formDataUpload.append("document", file);
                formDataUpload.append("order_id", orderId);
                formDataUpload.append("doc_type", `fabrication_${key}`);
                formDataUpload.append("remarks", `Fabrication - ${key}`);
                try {
                    const res = await orderDocumentsService.createOrderDocument(formDataUpload);
                    const docId = res?.result?.id ?? res?.id ?? res?.data?.id;
                    if (!docId) {
                        throw new Error(`Image upload succeeded but no document ID returned for ${key}`);
                    }
                    finalImages[key] = docId;
                } catch (uploadErr) {
                    const msg = uploadErr?.response?.data?.message || uploadErr?.message || "Image upload failed";
                    toastError(`Failed to upload ${FABRICATION_IMAGE_KEYS.find((k) => k.key === key)?.label || key}. ${msg}`);
                    throw new Error(`Image upload failed: ${msg}`);
                }
            }
            setPendingImages({});

            const payload = {
                ...formData,
                labour_count: formData.labour_count ? parseInt(formData.labour_count, 10) : null,
                tilt_angle: formData.tilt_angle ? parseFloat(String(formData.tilt_angle).replace(/[^\d.-]/g, "")) || null : null,
                height_from_roof: formData.height_from_roof ? parseFloat(String(formData.height_from_roof).replace(/[^\d.-]/g, "")) || null : null,
                checklist,
                images: finalImages,
                complete,
            };
            await orderService.saveFabrication(orderId, payload);
            setImages(finalImages);
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

    const disabled = isCompleted || isReadOnly || (!isReadOnly && !canPerform);

    if (loading) {
        return (
            <Box className="p-4">
                <Typography color="text.secondary">Loading fabrication…</Typography>
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
                    Only warehouse managers of the planned warehouse or the assigned fabricator can fill and complete
                    Fabrication. You do not have permission to perform this action. Contact your administrator if you
                    need access.
                </Alert>
            </Box>
        );
    }

    const formId = `fabrication-form-${orderId}`;
    const formShellClass = splitLayout ? "relative flex flex-col h-full bg-slate-50 min-w-0" : "relative flex flex-col min-h-full bg-slate-50";

    const formBody = (
        <div className="flex-1 overflow-y-auto px-2 sm:px-4 pb-[100px] sm:pb-[80px]">
            <div className={splitLayout ? "py-3" : "py-4 max-w-5xl mx-auto"}>
                <FormSection title="Fabrication Execution" className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] mb-4 overflow-hidden border border-slate-200">
                    <Box className="p-3">
                        <FormGrid cols={2} className="gap-3 sm:gap-4 mb-4">
                            <DateField
                                name="fabrication_start_date"
                                label="Fabrication Start Date"
                                value={formData.fabrication_start_date}
                                onChange={handleInputChange}
                                fullWidth
                                required
                                error={!!fieldErrors.fabrication_start_date}
                                helperText={fieldErrors.fabrication_start_date}
                                disabled={disabled}
                            />
                            <DateField
                                name="fabrication_end_date"
                                label="Fabrication End Date"
                                value={formData.fabrication_end_date}
                                onChange={handleInputChange}
                                fullWidth
                                required
                                error={!!fieldErrors.fabrication_end_date}
                                helperText={fieldErrors.fabrication_end_date}
                                disabled={disabled}
                            />
                        </FormGrid>

                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: "slate.800" }}>Checklist</Typography>
                        <Box className="mt-0.5 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0 p-3 bg-slate-50 rounded-lg border border-slate-100">
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

                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: "slate.800" }}>Required Photos</Typography>
                        <Box className="mb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                            {requiredFabricationImageKeys.map((config) => renderFabricationPhotoField(config))}
                        </Box>
                    </Box>
                </FormSection>

                <FormSection title="" className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] mb-4 overflow-hidden border border-slate-200 px-0">
                    <details className="group">
                        <summary className="cursor-pointer select-none list-none px-4 py-3 text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border-b border-slate-200 flex items-center justify-between transition-colors">
                            <span className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings">
                                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
                                </svg>
                                Optional Details
                            </span>
                            <span className="text-xs font-normal text-slate-500 group-open:hidden transition-opacity">
                                Tap to expand
                            </span>
                        </summary>
                        <div className="p-3 sm:p-4 flex flex-col gap-5 border-t border-slate-100 bg-white">
                            {optionalFabricationImageKeys.length > 0 && (
                                <Box>
                                    <Typography variant="caption" className="mb-2 block font-semibold text-slate-700">Optional Photos</Typography>
                                    <Box className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                        {optionalFabricationImageKeys.map((config) => renderFabricationPhotoField(config))}
                                    </Box>
                                </Box>
                            )}

                            <FormGrid cols={2} className="gap-3 sm:gap-4">
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
                            <Input
                                name="remarks"
                                label="Remarks"
                                multiline
                                value={formData.remarks}
                                onChange={handleInputChange}
                                fullWidth
                                disabled={disabled}
                            />
                        </div>
                    </details>

                    <div className="bg-transparent flex flex-col gap-2 mt-2 px-0">
                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}>
                            <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                                <Button
                                    type="submit"
                                    form={formId}
                                    size="sm"
                                    variant="default"
                                    className="w-full sm:w-auto min-h-[44px] sm:min-h-9 px-6 touch-manipulation font-semibold text-[15px] sm:text-sm rounded-lg shadow-sm bg-blue-600 hover:bg-blue-700 text-white border-transparent transition-all active:scale-[0.98]"
                                    loading={submitting}
                                    disabled={disabled} 
                                >
                                    {isCompleted ? "Update Optional" : "Save Progress"}
                                </Button>
                                {canComplete && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="default"
                                        className="w-full sm:w-auto min-h-[44px] sm:min-h-9 px-6 touch-manipulation font-semibold text-[15px] sm:text-sm rounded-lg shadow hover:shadow-md bg-emerald-600 hover:bg-emerald-700 text-white border-transparent transition-all active:scale-[0.98]"
                                        loading={submitting}
                                        onClick={(e) => handleSubmit(e, true)}
                                        disabled={disabled}
                                    >
                                        Complete Fabrication
                                    </Button>
                                )}
                            </div>
                            <Box className="text-center sm:text-right">
                                {error && <Typography variant="caption" color="error.main" fontWeight={500} display="block" className="px-3 py-1 bg-red-50 rounded-md border border-red-100 mb-1">{error}</Typography>}
                                {successMsg && <Typography variant="caption" color="success.main" fontWeight={500} display="block" className="px-3 py-1 bg-green-50 rounded-md border border-green-100 mb-1">{successMsg}</Typography>}
                                {!canComplete && orderData?.stages?.planner !== "completed" && !isStageCompleted && !error && !successMsg && (
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        Complete Planner stage to unlock Fabrication
                                    </Typography>
                                )}
                                {!error && !successMsg && (canComplete || isStageCompleted) && (
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        <span className={isCompleted ? "text-green-600 font-medium flex items-center justify-end gap-1" : ""}>
                                            {isCompleted && <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                                            {isCompleted ? "Fabrication Completed" : "Audit-ready details"}
                                        </span>
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    </div>
                </FormSection>
            </div>
        </div>
    );

    return (
        <Box
            component="form"
            id={formId}
            onSubmit={(e) => handleSubmit(e, false)}
            onKeyDown={preventEnterSubmit}
            className={formShellClass}
        >
            {formBody}

            {/* Photo Preview Dialog */}
            <Dialog open={!!photoPreview} onOpenChange={(open) => !open && setPhotoPreview(null)}>
                <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-black/95 border-none">
                    <DialogHeader className="p-4 absolute top-0 w-full z-0 pointer-events-none bg-gradient-to-b from-black/80 to-transparent">
                        <DialogTitle className="text-white text-sm font-medium pr-8 pointer-events-auto">
                            {photoPreview?.title}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="relative w-full h-[60vh] sm:h-[80vh] flex items-center justify-center p-4 pt-14 pointer-events-none">
                        {photoPreview?.isPending ? (
                            <img 
                                src={photoPreview.src} 
                                alt={photoPreview.title}
                                className="max-w-full max-h-full object-contain pointer-events-auto"
                            />
                        ) : photoPreview?.src ? (
                            <Box className="pointer-events-auto w-full h-full">
                                <BucketImage
                                    path={photoPreview.src}
                                    getUrl={getDocumentUrlById}
                                    alt={photoPreview.title}
                                    sx={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 0 }}
                                />
                            </Box>
                        ) : null}
                    </div>
                </DialogContent>
            </Dialog>
        </Box>
    );
}
