"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Box, Alert, Typography, TextField, IconButton, Divider, Collapse } from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import ClearIcon from "@mui/icons-material/Clear";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { usePathname } from "next/navigation";
import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import Checkbox from "@/components/common/Checkbox";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import { Button } from "@/components/ui/button";
import BucketImage from "@/components/common/BucketImage";
import BarcodeScanner from "@/components/common/BarcodeScanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import orderService from "@/services/orderService";
import orderDocumentsService from "@/services/orderDocumentsService";
import companyService from "@/services/companyService";
import { useAuth } from "@/hooks/useAuth";
import { toastSuccess, toastError } from "@/utils/toast";
import { splitSerialInput, fillSerialSlots } from "@/utils/serialInput";
import moment from "moment";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
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
    const isReadOnly = pathname?.startsWith("/closed-orders") || pathname?.startsWith("/cancelled-orders");
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

    // -- Serial Scanning Reconciliation State --
    const [deliveredSerialsMap, setDeliveredSerialsMap] = useState({}); // { product_id: [{serial_number, stock_serial_id}] }
    const [installationScans, setInstallationScans] = useState({}); // { product_id: [serial1, serial2] }
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scanTarget, setScanTarget] = useState(null); // { product_id, index }
    const [gunScanByProduct, setGunScanByProduct] = useState({});
    /** product_id -> true means expanded (default collapsed when key missing) */
    const [serialExpandByPid, setSerialExpandByPid] = useState({});
    const serialInputRefs = useRef({});
    const gunScanInputRefs = useRef({});
    const [mismatchData, setMismatchData] = useState(null); // { mismatches, can_force_adjust }
    const [forceAdjustDialogOpen, setForceAdjustDialogOpen] = useState(false);
    const [forceAdjustReason, setForceAdjustReason] = useState("");

    const loadInstallation = useCallback(async () => {
        if (!orderId) return;
        setLoading(true);
        try {
            const [data, deliveredSerials] = await Promise.all([
                orderService.getInstallationByOrderId(orderId),
                orderService.getDeliveredSerials(orderId)
            ]);

            setDeliveredSerialsMap(deliveredSerials || {});

            if (data) {
                // ... existing load logic ...
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

    const getSerialSlotCount = useCallback(
        (pid) => (deliveredSerialsMap[pid] || []).length,
        [deliveredSerialsMap]
    );

    const clearScanFieldError = useCallback((pid) => {
        setFieldErrors((fe) => {
            const n = { ...fe };
            delete n[`scans_${pid}`];
            return n;
        });
    }, []);

    /** Apply one or many serials from raw string into fixed slots for a product (gun, paste, pallet scan). */
    const applySerialsToProduct = useCallback(
        (pid, startIndex, rawString) => {
            const tokens = splitSerialInput(rawString);
            if (!tokens.length) return;
            const len = getSerialSlotCount(pid);
            if (!len) return;

            let dupToast = false;
            let dupPartialMsg = "";
            let overflowCount = 0;

            setInstallationScans((prev) => {
                const slotsRaw = Array.from({ length: len }, (_, i) => String((prev[pid] || [])[i] ?? ""));

                if (tokens.length === 1) {
                    const trimmed = tokens[0];
                    const dupIdx = slotsRaw.findIndex(
                        (v, i) =>
                            i !== startIndex &&
                            String(v || "").trim() &&
                            String(v || "").trim().toLowerCase() === trimmed.toLowerCase()
                    );
                    if (dupIdx >= 0) {
                        dupToast = true;
                        return prev;
                    }
                    const next = [...slotsRaw];
                    next[startIndex] = trimmed;
                    clearScanFieldError(pid);
                    return { ...prev, [pid]: next };
                }

                const { nextSlots, overflow, duplicates } = fillSerialSlots({
                    slots: slotsRaw,
                    startIndex,
                    incoming: tokens,
                    caseInsensitive: true,
                });
                if (duplicates.length) {
                    dupPartialMsg = `Duplicate serial(s) ignored: ${duplicates.slice(0, 3).join(", ")}${duplicates.length > 3 ? "…" : ""}`;
                }
                if (overflow.length) overflowCount = overflow.length;
                clearScanFieldError(pid);
                return { ...prev, [pid]: nextSlots };
            });

            if (dupToast) toastError("Serial number already entered for this product.");
            if (dupPartialMsg) toastError(dupPartialMsg);
            if (overflowCount)
                toastError(
                    `Cannot add ${overflowCount} serial(s): all slots filled or limit reached.`
                );
        },
        [getSerialSlotCount, clearScanFieldError]
    );

    const handleInstallationSerialChange = (pid, idx, value) => {
        const tokens = splitSerialInput(value);
        if (tokens.length <= 1) {
            const len = getSerialSlotCount(pid);
            if (!len) return;
            const trimmed = String(value || "").trim();
            if (trimmed) {
                setInstallationScans((prev) => {
                    const cur = Array.from({ length: len }, (_, i) => String((prev[pid] || [])[i] ?? ""));
                    const dupIdx = cur.findIndex(
                        (v, i) =>
                            i !== idx &&
                            String(v || "").trim() &&
                            String(v || "").trim().toLowerCase() === trimmed.toLowerCase()
                    );
                    if (dupIdx >= 0) {
                        toastError("Serial number already entered for this product.");
                        return prev;
                    }
                    cur[idx] = value;
                    return { ...prev, [pid]: cur };
                });
            } else {
                setInstallationScans((prev) => {
                    const cur = Array.from({ length: len }, (_, i) => String((prev[pid] || [])[i] ?? ""));
                    cur[idx] = value;
                    return { ...prev, [pid]: cur };
                });
            }
            clearScanFieldError(pid);
            return;
        }
        applySerialsToProduct(pid, idx, value);
    };

    const handleInstallationSerialKeyDown = (pid, idx, serialCount, e) => {
        if (e.key !== "Enter" && e.key !== "Tab") return;
        e.preventDefault();
        e.stopPropagation();
        if (idx < serialCount - 1) {
            serialInputRefs.current[pid]?.[idx + 1]?.focus();
        } else {
            gunScanInputRefs.current[pid]?.focus();
        }
    };

    const handleGunKeyDown = (e, pid) => {
        if (e.key !== "Enter" && e.key !== "Tab") return;
        e.preventDefault();
        e.stopPropagation();
        const buf = (gunScanByProduct[pid] || "").trim();
        if (!buf) {
            setTimeout(() => gunScanInputRefs.current[pid]?.focus(), 0);
            return;
        }
        const len = getSerialSlotCount(pid);
        const slotsRaw = Array.from({ length: len }, (_, i) =>
            String((installationScans[pid] || [])[i] ?? "")
        );
        const firstEmpty = slotsRaw.findIndex((v) => !String(v || "").trim());
        const idx = firstEmpty >= 0 ? firstEmpty : 0;
        applySerialsToProduct(pid, idx, buf);
        setGunScanByProduct((p) => ({ ...p, [pid]: "" }));
        setTimeout(() => gunScanInputRefs.current[pid]?.focus(), 0);
    };

    const openScannerForProduct = (pid) => {
        const len = getSerialSlotCount(pid);
        const slotsRaw = Array.from({ length: len }, (_, i) =>
            String((installationScans[pid] || [])[i] ?? "")
        );
        const firstEmpty = slotsRaw.findIndex((v) => !String(v || "").trim());
        setScanTarget({ product_id: pid, index: firstEmpty >= 0 ? firstEmpty : 0 });
        setScannerOpen(true);
    };

    const handleScanResult = (value) => {
        if (!scanTarget) return;
        const { product_id, index } = scanTarget;
        const tokens = splitSerialInput(value || "");
        if (!tokens.length) return;

        const len = getSerialSlotCount(product_id);
        if (!len) return;

        if (tokens.length === 1) {
            const trimmed = tokens[0];
            let dup = false;
            setInstallationScans((prev) => {
                const slotsRaw = Array.from({ length: len }, (_, i) =>
                    String((prev[product_id] || [])[i] ?? "")
                );
                const dupIdx = slotsRaw.findIndex(
                    (v, i) =>
                        i !== index &&
                        String(v || "").trim() &&
                        String(v || "").trim().toLowerCase() === trimmed.toLowerCase()
                );
                if (dupIdx >= 0) {
                    dup = true;
                    return prev;
                }
                const next = [...slotsRaw];
                next[index] = trimmed;
                const nextEmpty = next.findIndex((v, i) => i > index && !String(v || "").trim());
                queueMicrotask(() => {
                    if (nextEmpty === -1) {
                        setScannerOpen(false);
                        setScanTarget(null);
                    } else {
                        setScanTarget({ product_id, index: nextEmpty });
                    }
                });
                return { ...prev, [product_id]: next };
            });
            if (dup) {
                toastError("Serial number already entered for this product.");
                return;
            }
            clearScanFieldError(product_id);
            return;
        }

        let dupPartialMsg = "";
        let overflowCount = 0;
        setInstallationScans((prev) => {
            const slotsRaw = Array.from({ length: len }, (_, i) =>
                String((prev[product_id] || [])[i] ?? "")
            );
            const { nextSlots, overflow, duplicates } = fillSerialSlots({
                slots: slotsRaw,
                startIndex: index,
                incoming: tokens,
                caseInsensitive: true,
            });
            if (duplicates.length) {
                dupPartialMsg = `Duplicate serial(s) ignored: ${duplicates.slice(0, 3).join(", ")}${duplicates.length > 3 ? "…" : ""}`;
            }
            if (overflow.length) overflowCount = overflow.length;
            return { ...prev, [product_id]: nextSlots };
        });
        if (dupPartialMsg) toastError(dupPartialMsg);
        if (overflowCount) {
            toastError(
                `Cannot add ${overflowCount} serial(s): all slots filled or limit reached.`
            );
        }
        clearScanFieldError(product_id);
        setScannerOpen(false);
        setScanTarget(null);
    };

    const toggleSerialExpand = (pid) => {
        setSerialExpandByPid((p) => ({ ...p, [pid]: !p[pid] }));
    };

    const validate = () => {
        const errs = {};
        const requiredImages = INSTALLATION_IMAGE_KEYS.filter((k) => k.required).map((k) => k.key);
        for (const key of requiredImages) {
            if (!images[key] && !pendingImages[key]) errs[`image_${key}`] = "Required";
        }

        // Validate serial scans if completing
        Object.entries(deliveredSerialsMap).forEach(([pid, serials]) => {
            const len = serials.length;
            const padded = Array.from({ length: len }, (_, i) =>
                String((installationScans[pid] || [])[i] || "").trim()
            );
            const filled = padded.filter(Boolean);
            if (filled.length < len) {
                errs[`scans_${pid}`] = `All ${len} serials must be entered`;
                return;
            }
            const uniq = new Set(filled.map((s) => s.toLowerCase()));
            if (uniq.size !== filled.length) {
                errs[`scans_${pid}`] = "Duplicate serial numbers are not allowed.";
            }
        });

        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e, complete = false, forceAdjust = false) => {
        if (e) e.preventDefault();
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
            Object.keys(next).forEach((k) => (k.startsWith("image_") || k.startsWith("scans_")) && delete next[k]);
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
                installation_scans: installationScans,
                force_adjust: forceAdjust,
                force_adjust_reason: forceAdjustReason,
            };
            await orderService.saveInstallation(orderId, payload);
            setImages(finalImages);
            setSuccessMsg(complete ? "Installation stage completed successfully!" : "Installation saved.");
            toastSuccess(complete ? "Installation stage completed successfully!" : "Saved.");
            setMismatchData(null);
            setForceAdjustDialogOpen(false);
            setForceAdjustReason("");
            if (onSuccess) onSuccess();
        } catch (err) {
            const data = err?.response?.data;
            if (data?.code === "SERIAL_MISMATCH") {
                setMismatchData(data);
                toastError("Serial mismatch detected. Please review and adjust if necessary.");
            } else {
                const errMsg = data?.message || err?.message || "Failed to save";
                setError(errMsg);
                toastError(errMsg);
            }
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
        <Box component="form" onSubmit={(e) => handleSubmit(e, false)} onKeyDown={preventEnterSubmit} className="p-3 sm:p-4 max-w-4xl">
            {orderData?.installer_id || orderData?.fabricator_installer_id ? (
                <FormSection title="Installer (from assignment)">
                    <Typography variant="body2" color="text.secondary">
                        Installer is assigned in the &quot;Assign Fabricator &amp; Installer&quot; stage.
                    </Typography>
                </FormSection>
            ) : null}

            <FormSection title="Installation execution">
                {Object.entries(deliveredSerialsMap).length > 0 && (
                    <Box sx={{ mb: 2, p: 1.5, border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "action.hover" }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                            Delivered serials (mandatory)
                        </Typography>
                        {Object.entries(deliveredSerialsMap).map(([pid, serials]) => {
                            const row = installationScans[pid] || [];
                            const filledCount = serials.reduce(
                                (n, _, i) => n + (String(row[i] || "").trim() ? 1 : 0),
                                0
                            );
                            const expanded = !!serialExpandByPid[pid];
                            const expectedLabel = (i) => {
                                const sn = serials[i]?.serial_number;
                                return sn ? `Delivered: ${sn}` : undefined;
                            };
                            return (
                                <Box key={pid} sx={{ mb: 1.5 }}>
                                    <Box
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => !disabled && toggleSerialExpand(pid)}
                                        onKeyDown={(e) => {
                                            if (disabled) return;
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                toggleSerialExpand(pid);
                                            }
                                        }}
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            p: 1,
                                            borderRadius: 1,
                                            border: 1,
                                            borderColor: fieldErrors[`scans_${pid}`] ? "error.main" : "divider",
                                            bgcolor: "background.paper",
                                            cursor: disabled ? "default" : "pointer",
                                            minHeight: 40,
                                        }}
                                    >
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                                            <QrCodeScannerIcon
                                                fontSize="small"
                                                color={filledCount === serials.length ? "success" : "action"}
                                            />
                                            <Typography variant="body2" noWrap>
                                                Product #{pid} — {filledCount}/{serials.length} serials
                                            </Typography>
                                        </Box>
                                        {expanded ? (
                                            <ExpandLessIcon fontSize="small" color="action" />
                                        ) : (
                                            <ExpandMoreIcon fontSize="small" color="action" />
                                        )}
                                    </Box>
                                    {fieldErrors[`scans_${pid}`] && !expanded && (
                                        <Typography variant="caption" color="error" sx={{ mt: 0.25, display: "block", pl: 0.5 }}>
                                            {fieldErrors[`scans_${pid}`]}
                                        </Typography>
                                    )}
                                    <Collapse in={expanded} timeout="auto" unmountOnExit>
                                        <Box sx={{ pt: 1 }}>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={disabled}
                                                className="w-full mb-1.5 min-h-9 touch-manipulation flex items-center justify-center gap-1"
                                                onClick={() => openScannerForProduct(pid)}
                                            >
                                                <QrCodeScannerIcon sx={{ fontSize: 18 }} />
                                                Scan barcode / QR
                                            </Button>
                                            <TextField
                                                inputRef={(el) => {
                                                    gunScanInputRefs.current[pid] = el;
                                                }}
                                                size="small"
                                                fullWidth
                                                label="Scanner gun"
                                                placeholder="Point scanner here, then Enter"
                                                value={gunScanByProduct[pid] ?? ""}
                                                onChange={(e) =>
                                                    setGunScanByProduct((p) => ({ ...p, [pid]: e.target.value }))
                                                }
                                                onKeyDown={(e) => handleGunKeyDown(e, pid)}
                                                variant="outlined"
                                                disabled={disabled}
                                                sx={{ mb: 1 }}
                                                helperText="Hardware scanner types here; press Enter to fill next empty slot."
                                            />
                                            <Divider sx={{ my: 1 }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    or type per slot
                                                </Typography>
                                            </Divider>
                                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                                {serials.map((del, idx) => {
                                                    const value = installationScans[pid]?.[idx] ?? "";
                                                    return (
                                                        <TextField
                                                            key={idx}
                                                            size="small"
                                                            fullWidth
                                                            label={`Serial ${idx + 1} of ${serials.length}`}
                                                            placeholder={expectedLabel(idx)}
                                                            value={value}
                                                            onChange={(e) =>
                                                                handleInstallationSerialChange(pid, idx, e.target.value)
                                                            }
                                                            onKeyDown={(e) =>
                                                                handleInstallationSerialKeyDown(
                                                                    pid,
                                                                    idx,
                                                                    serials.length,
                                                                    e
                                                                )
                                                            }
                                                            inputRef={(el) => {
                                                                if (!serialInputRefs.current[pid]) {
                                                                    serialInputRefs.current[pid] = [];
                                                                }
                                                                serialInputRefs.current[pid][idx] = el;
                                                            }}
                                                            variant="outlined"
                                                            disabled={disabled}
                                                            InputProps={{
                                                                endAdornment: (
                                                                    <Box sx={{ display: "flex" }}>
                                                                        {String(value || "").trim() ? (
                                                                            <IconButton
                                                                                size="small"
                                                                                tabIndex={-1}
                                                                                edge="end"
                                                                                disabled={disabled}
                                                                                onClick={() =>
                                                                                    handleInstallationSerialChange(
                                                                                        pid,
                                                                                        idx,
                                                                                        ""
                                                                                    )
                                                                                }
                                                                                aria-label="Clear serial"
                                                                            >
                                                                                <ClearIcon fontSize="small" />
                                                                            </IconButton>
                                                                        ) : null}
                                                                        <IconButton
                                                                            size="small"
                                                                            tabIndex={-1}
                                                                            edge="end"
                                                                            disabled={disabled}
                                                                            onClick={() => {
                                                                                setScanTarget({
                                                                                    product_id: pid,
                                                                                    index: idx,
                                                                                });
                                                                                setScannerOpen(true);
                                                                            }}
                                                                            aria-label="Scan this serial"
                                                                        >
                                                                            <QrCodeScannerIcon fontSize="small" />
                                                                        </IconButton>
                                                                    </Box>
                                                                ),
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </Box>
                                            {fieldErrors[`scans_${pid}`] && (
                                                <Typography variant="caption" color="error" sx={{ mt: 0.75, display: "block" }}>
                                                    {fieldErrors[`scans_${pid}`]}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Collapse>
                                </Box>
                            );
                        })}
                    </Box>
                )}

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
                {mismatchData && (
                    <Alert
                        severity="warning"
                        action={
                            mismatchData.can_force_adjust && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    color="inherit"
                                    onClick={() => setForceAdjustDialogOpen(true)}
                                >
                                    Force Adjust
                                </Button>
                            )
                        }
                    >
                        <Typography variant="body2" fontWeight={600}>
                            Serial Mismatch Detected
                        </Typography>
                        {mismatchData.mismatches.map((m, i) => (
                            <div key={i}>
                                Product #{m.product_id}: Scanned {m.missing_serials.join(", ")} but expected {m.expected_serials.join(", ")}
                            </div>
                        ))}
                    </Alert>
                )}
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
            {/* ─── Barcode / QR Scanner modal ─────────────────────── */}
            <BarcodeScanner
                open={scannerOpen}
                onScan={handleScanResult}
                onClose={() => { setScannerOpen(false); setScanTarget(null); }}
                hint={
                    scanTarget
                        ? `Serial ${scanTarget.index + 1} of ${getSerialSlotCount(scanTarget.product_id)} — product #${scanTarget.product_id}`
                        : ""
                }
            />

            {/* ─── Force Adjust Dialog ─────────────────────── */}
            <Dialog open={forceAdjustDialogOpen} onOpenChange={setForceAdjustDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Force Adjust Serials</DialogTitle>
                    </DialogHeader>
                    <Box sx={{ py: 2 }}>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            You are about to force adjust the serial numbers for this installation. 
                            This will mark the scanned serials as ISSUED and return the originally delivered (but missing) serials to AVAILABLE stock.
                        </Typography>
                        <TextField
                            fullWidth
                            label="Reason for Force Adjust"
                            multiline
                            rows={3}
                            value={forceAdjustReason}
                            onChange={(e) => setForceAdjustReason(e.target.value)}
                            placeholder="e.g., Wrong serial delivered but correct item installed"
                            required
                        />
                    </Box>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setForceAdjustDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={() => handleSubmit(null, true, true)} 
                            disabled={!forceAdjustReason || submitting}
                            loading={submitting}
                        >
                            Confirm Force Adjust
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Box>
    );
}
