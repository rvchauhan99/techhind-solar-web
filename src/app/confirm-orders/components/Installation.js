"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Box, Alert, Typography, TextField, IconButton, Divider, Chip, LinearProgress } from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import ClearIcon from "@mui/icons-material/Clear";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input as ShadcnInput } from "@/components/ui/input";
import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import Checkbox from "@/components/common/Checkbox";
import FormGrid from "@/components/common/FormGrid";
import { Button } from "@/components/ui/button";
import BucketImage from "@/components/common/BucketImage";
import BarcodeScanner from "@/components/common/BarcodeScanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import orderService from "@/services/orderService";
import orderDocumentsService from "@/services/orderDocumentsService";
import companyService from "@/services/companyService";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import { useAuth } from "@/hooks/useAuth";
import { toastSuccess, toastError, toastWarning, toastInfo } from "@/utils/toast";
import { splitSerialInput, fillSerialSlots } from "@/utils/serialInput";
import {
    previewInstallationReconciliation,
    scannedValueInvalidForInstallationSlot,
    slotIsCaptureAtDelivery,
} from "@/utils/installationSerialReconciliation";
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
import { COMPACT_SECTION_HEADER_CLASS, FIELD_HEIGHT_CLASS_SMALL, FIELD_TEXT_SMALL } from "@/utils/formConstants";

const DEFAULT_CHECKLIST = [
    { id: "1", label: "Inverter installed and wired", checked: false },
    { id: "2", label: "ACDB/DCDB installed and connected", checked: false },
    { id: "3", label: "Earthing verified", checked: false },
    { id: "4", label: "Panel serials recorded", checked: false },
];

/**
 * Per slot: known DC serial must be on challan multiset; capture slots (no DC serial) keep any value.
 * @returns {{ slots: string[], cleared: boolean }}
 */
function sanitizeSlotsAgainstChallan(pid, slots, deliveredSerialsMap) {
    const rows = deliveredSerialsMap[String(pid)] || deliveredSerialsMap[Number(pid)] || [];
    if (!rows.length) return { slots, cleared: false };
    let cleared = false;
    const next = slots.map((v, idx) => {
        const t = String(v || "").trim();
        if (!t) return "";
        if (scannedValueInvalidForInstallationSlot(t, rows, idx)) {
            cleared = true;
            return "";
        }
        return t;
    });
    return { slots: next, cleared };
}

function getDocumentUrlById(id) {
    return orderDocumentsService.getDocumentUrl(id);
}

export default function Installation({ orderId, orderData, onSuccess, amendMode = false, forceReadOnly = false }) {
    const pathname = usePathname();
    const { user } = useAuth();
    const isReadOnly = forceReadOnly || pathname?.startsWith("/closed-orders") || pathname?.startsWith("/cancelled-orders");
    const isStageCompleted = orderData?.stages?.installation === "completed";
    const installationApprovalStatus = String(orderData?.installation_approval_status || "").toLowerCase();
    const isApprovalPending = installationApprovalStatus === "pending_approval";
    const isApprovalRejected = installationApprovalStatus === "rejected";
    const isApprovalApproved = installationApprovalStatus === "approved";
    const isCompleted = isStageCompleted && !amendMode;
    const canComplete =
        orderData?.stages?.fabrication === "completed" &&
        !isStageCompleted &&
        !isReadOnly &&
        !isApprovalPending;

    const [canPerform, setCanPerform] = useState(false);
    const [permissionCheckLoading, setPermissionCheckLoading] = useState(true);
    const [approvalRequiredConfig, setApprovalRequiredConfig] = useState(false);
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
    const [deliveredSerialsMap, setDeliveredSerialsMap] = useState({}); // { product_id: [{serial_number, stock_serial_id, missing_at_delivery?}] }
    const [productNamesById, setProductNamesById] = useState({});
    const [installationScans, setInstallationScans] = useState({}); // { product_id: [serial1, serial2] }
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scanTarget, setScanTarget] = useState(null); // { product_id, index }
    const [gunScanByProduct, setGunScanByProduct] = useState({});
    const serialInputRefs = useRef({});
    const gunScanInputRefs = useRef({});
    const autoSaveTimerRef = useRef(null);
    const autoSavingRef = useRef(false);
    const [mismatchData, setMismatchData] = useState(null); // { mismatches, can_force_adjust }
    const [forceAdjustDialogOpen, setForceAdjustDialogOpen] = useState(false);
    const [forceAdjustReason, setForceAdjustReason] = useState("");
    /** Per-slot inventory validation in progress (Scenario A capture slots): key `${pid}:${idx}` */
    const [serialValidating, setSerialValidating] = useState({});
    /** Scenario C double-scan: slotKey → { serial, timestamp } — first-scan pending state */
    const [pendingForceSlots, setPendingForceSlots] = useState({});
    /** Context when Force Adjust dialog is opened from a specific slot (vs server SERIAL_MISMATCH path) */
    const [slotForceAdjustCtx, setSlotForceAdjustCtx] = useState(null); // { pid, idx, serial }
    /** Committed slot-level force-adjust intents: slotKey → { serial, reason } */
    const [slotForceAdjustIntent, setSlotForceAdjustIntent] = useState({});

    const loadInstallation = useCallback(async () => {
        if (!orderId) return;
        setLoading(true);
        try {
            const [data, deliveredSerials] = await Promise.all([
                orderService.getInstallationByOrderId(orderId),
                orderService.getDeliveredSerials(orderId)
            ]);

            const slotsMap = deliveredSerials?.serials ?? deliveredSerials ?? {};
            setDeliveredSerialsMap(slotsMap);
            setProductNamesById(deliveredSerials?.product_names ?? {});

            if (data) {
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
                const rawScans = data.installation_scans;
                const scans = {};
                if (rawScans && typeof rawScans === "object" && !Array.isArray(rawScans)) {
                    Object.entries(rawScans).forEach(([pid, arr]) => {
                        scans[String(pid)] = Array.isArray(arr) ? arr.map((s) => String(s ?? "")) : [];
                    });
                }
                setInstallationScans(scans);
            } else {
                setImages({});
                setChecklist(DEFAULT_CHECKLIST);
                setInstallationScans({});
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
    const [photoGallery, setPhotoGallery] = useState(null);
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

    const photoGalleryOpen = photoGallery != null;
    useEffect(() => {
        if (!photoGalleryOpen) return;
        const onKeyDown = (e) => {
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                setPhotoGallery((g) => {
                    if (!g || g.index <= 0) return g;
                    return { ...g, index: g.index - 1 };
                });
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                setPhotoGallery((g) => {
                    if (!g || g.index >= g.slides.length - 1) return g;
                    return { ...g, index: g.index + 1 };
                });
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [photoGalleryOpen]);

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

    useEffect(() => {
        let cancelled = false;
        const parseConfigRow = (rows) => {
            const row = Array.isArray(rows) ? rows[0] : null;
            const raw = row?.config_value ?? row?.value ?? row?.label ?? "";
            const parsed = String(raw).trim().toLowerCase();
            return parsed === "true" || parsed === "1" || parsed === "yes";
        };
        getReferenceOptionsSearch("platform_config.model", {
            config_key: "enable_installation_approval",
            is_active: true,
            limit: 1,
        })
            .then((rows) => {
                if (cancelled) return;
                if (Array.isArray(rows) && rows.length > 0) {
                    setApprovalRequiredConfig(parseConfigRow(rows));
                    return;
                }
                return getReferenceOptionsSearch("platform_config.model", {
                    config_key: "enableInstallationApproval",
                    is_active: true,
                    limit: 1,
                }).then((legacyRows) => {
                    if (cancelled) return;
                    setApprovalRequiredConfig(parseConfigRow(legacyRows));
                });
            })
            .catch(() => {
                if (!cancelled) setApprovalRequiredConfig(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

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
        (pid) =>
            (deliveredSerialsMap[pid] || deliveredSerialsMap[String(pid)] || []).length,
        [deliveredSerialsMap]
    );

    /** All delivered SERIAL slots must be filled before Complete Installation. */
    const allInstallationSerialsFilled = useMemo(() => {
        const entries = Object.entries(deliveredSerialsMap);
        if (entries.length === 0) return true;
        for (const [pid, serials] of entries) {
            const len = serials.length;
            const row = installationScans[pid] || installationScans[Number(pid)] || [];
            for (let i = 0; i < len; i++) {
                if (!String(row[i] ?? "").trim()) return false;
            }
        }
        return true;
    }, [deliveredSerialsMap, installationScans]);

    /** Live preview of Complete-time reconciliation (server remains authoritative). */
    const reconciliationPreview = useMemo(
        () => previewInstallationReconciliation(deliveredSerialsMap, installationScans),
        [deliveredSerialsMap, installationScans]
    );

    const clearScanFieldError = useCallback((pid) => {
        setFieldErrors((fe) => {
            const n = { ...fe };
            delete n[`scans_${pid}`];
            return n;
        });
    }, []);

    /** Single commit path: duplicate check, challan (Scenario B), inventory API (Scenario A capture). */
    const validateAndCommitSerial = useCallback(
        async (pid, idx, trimmedValue) => {
            const key = String(pid);
            const rows = deliveredSerialsMap[key] || deliveredSerialsMap[Number(pid)] || [];
            const len = getSerialSlotCount(pid);
            if (!len) return false;

            if (!trimmedValue) {
                setInstallationScans((prev) => {
                    const cur = Array.from({ length: len }, (_, i) =>
                        String((prev[key] ?? prev[Number(pid)] ?? [])[i] ?? "")
                    );
                    const next = [...cur];
                    next[idx] = "";
                    return { ...prev, [key]: next };
                });
                clearScanFieldError(pid);
                return false;
            }

            let dupRejected = false;
            setInstallationScans((prev) => {
                const cur = Array.from({ length: len }, (_, i) =>
                    String((prev[key] ?? prev[Number(pid)] ?? [])[i] ?? "")
                );
                const dupIdx = cur.findIndex(
                    (v, i) =>
                        i !== idx &&
                        String(v || "").trim() &&
                        String(v || "").trim().toLowerCase() === trimmedValue.toLowerCase()
                );
                if (dupIdx >= 0) {
                    dupRejected = true;
                    const next = [...cur];
                    next[idx] = "";
                    toastError("Duplicate serial — already entered for this product.");
                    return { ...prev, [key]: next };
                }
                return prev;
            });
            if (dupRejected) {
                clearScanFieldError(pid);
                return false;
            }

            const slot = rows[idx];
            const isCapture = slotIsCaptureAtDelivery(slot);

            if (!isCapture) {
                if (scannedValueInvalidForInstallationSlot(trimmedValue, rows, idx)) {
                    const slotKey = `${pid}:${idx}`;
                    setSerialValidating((p) => ({ ...p, [slotKey]: true }));
                    let validateResult = null;
                    try {
                        validateResult = await orderService.validateInstallationSerial(orderId, trimmedValue, pid);
                    } catch (err) {
                        const msg =
                            err?.response?.data?.message ||
                            err?.response?.data?.result?.message ||
                            err?.message ||
                            "Validation failed";
                        toastError(msg);
                        setPendingForceSlots((p) => {
                            if (!p[slotKey]) return p;
                            const n = { ...p };
                            delete n[slotKey];
                            return n;
                        });
                        setInstallationScans((prev) => {
                            const cur = Array.from({ length: len }, (_, i) =>
                                String((prev[key] ?? prev[Number(pid)] ?? [])[i] ?? "")
                            );
                            const next = [...cur];
                            next[idx] = "";
                            return { ...prev, [key]: next };
                        });
                        clearScanFieldError(pid);
                        return false;
                    } finally {
                        setSerialValidating((p) => {
                            const n = { ...p };
                            delete n[slotKey];
                            return n;
                        });
                    }
                    if (!validateResult?.valid) {
                        toastError(validateResult?.message || "Serial cannot be used on this order.");
                        setPendingForceSlots((p) => {
                            if (!p[slotKey]) return p;
                            const n = { ...p };
                            delete n[slotKey];
                            return n;
                        });
                        setInstallationScans((prev) => {
                            const cur = Array.from({ length: len }, (_, i) =>
                                String((prev[key] ?? prev[Number(pid)] ?? [])[i] ?? "")
                            );
                            const next = [...cur];
                            next[idx] = "";
                            return { ...prev, [key]: next };
                        });
                        clearScanFieldError(pid);
                        return false;
                    }

                    const pending = pendingForceSlots[slotKey];
                    const isDoubleScan =
                        pending &&
                        pending.serial.toLowerCase() === trimmedValue.toLowerCase() &&
                        Date.now() - pending.timestamp < 30000;

                    if (isDoubleScan) {
                        // Second scan of same invalid serial within 30s — open Force Adjust dialog
                        setPendingForceSlots((p) => {
                            const n = { ...p };
                            delete n[slotKey];
                            return n;
                        });
                        // Keep slot blank — will be committed on dialog confirm
                        setInstallationScans((prev) => {
                            const cur = Array.from({ length: len }, (_, i) =>
                                String((prev[key] ?? prev[Number(pid)] ?? [])[i] ?? "")
                            );
                            const next = [...cur];
                            next[idx] = "";
                            return { ...prev, [key]: next };
                        });
                        setSlotForceAdjustCtx({ pid, idx, serial: trimmedValue });
                        setForceAdjustDialogOpen(true);
                        clearScanFieldError(pid);
                        return false;
                    }

                    // First scan of invalid serial — store pending, clear slot, advise re-scan
                    setPendingForceSlots((p) => ({
                        ...p,
                        [slotKey]: { serial: trimmedValue, timestamp: Date.now() },
                    }));
                    toastError("Serial not on delivery challan — scan the same serial again to Force Adjust.");
                    setInstallationScans((prev) => {
                        const cur = Array.from({ length: len }, (_, i) =>
                            String((prev[key] ?? prev[Number(pid)] ?? [])[i] ?? "")
                        );
                        const next = [...cur];
                        next[idx] = "";
                        return { ...prev, [key]: next };
                    });
                    clearScanFieldError(pid);
                    return false;
                }
                // Valid DC serial for this challan — still enforce global serial uniqueness via API
                setPendingForceSlots((p) => {
                    const slotKey = `${pid}:${idx}`;
                    if (!p[slotKey]) return p;
                    const n = { ...p };
                    delete n[slotKey];
                    return n;
                });
                const knownSlotKey = `${pid}:${idx}`;
                setSerialValidating((p) => ({ ...p, [knownSlotKey]: true }));
                try {
                    const result = await orderService.validateInstallationSerial(orderId, trimmedValue, pid);
                    if (!result?.valid) {
                        toastError(result?.message || "Serial cannot be used on this order — cleared.");
                        setInstallationScans((prev) => {
                            const cur = Array.from({ length: len }, (_, i) =>
                                String((prev[key] ?? prev[Number(pid)] ?? [])[i] ?? "")
                            );
                            const next = [...cur];
                            next[idx] = "";
                            return { ...prev, [key]: next };
                        });
                        clearScanFieldError(pid);
                        return false;
                    }
                    if (result.warning) {
                        toastWarning(result.warning);
                    }
                    setInstallationScans((prev) => {
                        const cur = Array.from({ length: len }, (_, i) =>
                            String((prev[key] ?? prev[Number(pid)] ?? [])[i] ?? "")
                        );
                        const next = [...cur];
                        next[idx] = trimmedValue;
                        return { ...prev, [key]: next };
                    });
                    clearScanFieldError(pid);
                    return true;
                } catch (err) {
                    const msg =
                        err?.response?.data?.message ||
                        err?.response?.data?.result?.message ||
                        err?.message ||
                        "Validation failed";
                    toastError(msg);
                    setInstallationScans((prev) => {
                        const cur = Array.from({ length: len }, (_, i) =>
                            String((prev[key] ?? prev[Number(pid)] ?? [])[i] ?? "")
                        );
                        const next = [...cur];
                        next[idx] = "";
                        return { ...prev, [key]: next };
                    });
                    clearScanFieldError(pid);
                    return false;
                } finally {
                    setSerialValidating((p) => {
                        const n = { ...p };
                        delete n[knownSlotKey];
                        return n;
                    });
                }
            }

            const slotKey = `${pid}:${idx}`;
            setSerialValidating((p) => ({ ...p, [slotKey]: true }));
            try {
                const result = await orderService.validateInstallationSerial(orderId, trimmedValue, pid);
                if (!result?.valid) {
                    toastError(result?.message || "Serial not found in inventory — cleared.");
                    setInstallationScans((prev) => {
                        const cur = Array.from({ length: len }, (_, i) =>
                            String((prev[key] ?? prev[Number(pid)] ?? [])[i] ?? "")
                        );
                        const next = [...cur];
                        next[idx] = "";
                        return { ...prev, [key]: next };
                    });
                    clearScanFieldError(pid);
                    return false;
                }
                if (result.warning) {
                    toastWarning(result.warning);
                }
                setInstallationScans((prev) => {
                    const cur = Array.from({ length: len }, (_, i) =>
                        String((prev[key] ?? prev[Number(pid)] ?? [])[i] ?? "")
                    );
                    const next = [...cur];
                    next[idx] = trimmedValue;
                    return { ...prev, [key]: next };
                });
                clearScanFieldError(pid);
                return true;
            } catch (err) {
                const msg =
                    err?.response?.data?.message ||
                    err?.response?.data?.result?.message ||
                    err?.message ||
                    "Validation failed";
                toastError(msg);
                setInstallationScans((prev) => {
                    const cur = Array.from({ length: len }, (_, i) =>
                        String((prev[key] ?? prev[Number(pid)] ?? [])[i] ?? "")
                    );
                    const next = [...cur];
                    next[idx] = "";
                    return { ...prev, [key]: next };
                });
                clearScanFieldError(pid);
                return false;
            } finally {
                setSerialValidating((p) => {
                    const n = { ...p };
                    delete n[slotKey];
                    return n;
                });
            }
        },
        [deliveredSerialsMap, getSerialSlotCount, clearScanFieldError, orderId, pendingForceSlots]
    );

    /** Apply one or many serials from raw string into fixed slots for a product (gun, paste, pallet scan). */
    const applySerialsToProduct = useCallback(
        async (pid, startIndex, rawString) => {
            const tokens = splitSerialInput(rawString);
            if (!tokens.length) return;
            const len = getSerialSlotCount(pid);
            if (!len) return;

            let dupPartialMsg = "";
            let overflowCount = 0;
            let challanClearToast = false;

            if (tokens.length === 1) {
                await validateAndCommitSerial(pid, startIndex, tokens[0]);
                return;
            }

            setInstallationScans((prev) => {
                const slotsRaw = Array.from({ length: len }, (_, i) => String((prev[pid] || [])[i] ?? ""));

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
                const { slots: sanitizedMulti, cleared: clearedMulti } = sanitizeSlotsAgainstChallan(
                    pid,
                    nextSlots,
                    deliveredSerialsMap
                );
                if (clearedMulti) challanClearToast = true;
                clearScanFieldError(pid);
                return { ...prev, [pid]: sanitizedMulti };
            });

            if (challanClearToast) toastError("Serial not on delivery challan — cleared.");
            if (dupPartialMsg) toastError(dupPartialMsg);
            if (overflowCount)
                toastError(
                    `Cannot add ${overflowCount} serial(s): all slots filled or limit reached.`
                );
        },
        [getSerialSlotCount, clearScanFieldError, deliveredSerialsMap, validateAndCommitSerial]
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
        if (e.key === "Tab" && e.shiftKey) {
            if (idx > 0) {
                e.preventDefault();
                e.stopPropagation();
                serialInputRefs.current[pid]?.[idx - 1]?.focus();
            }
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        if (idx < serialCount - 1) {
            serialInputRefs.current[pid]?.[idx + 1]?.focus();
        } else {
            gunScanInputRefs.current[pid]?.focus();
        }
    };

    /** Trim, duplicate check, and commit on Tab/click away. Uses DOM value so blur is not stale vs last onChange. */
    const handleSerialSlotBlur = useCallback(
        async (pid, idx, e) => {
            const len = getSerialSlotCount(pid);
            if (!len) return;
            const trimmed =
                e?.currentTarget != null
                    ? String(e.currentTarget.value ?? "").trim()
                    : "";
            await validateAndCommitSerial(pid, idx, trimmed);
        },
        [getSerialSlotCount, validateAndCommitSerial]
    );

    const handleGunBlur = useCallback(
        async (pid, e) => {
            const raw = String(e?.currentTarget?.value ?? "").trim();
            setGunScanByProduct((p) => ({ ...p, [pid]: "" }));
            if (!raw) return;
            const len = getSerialSlotCount(pid);
            if (!len) return;
            const slotsRaw = Array.from({ length: len }, (_, i) =>
                String((installationScans[pid] || installationScans[String(pid)] || [])[i] ?? "")
            );
            const firstEmpty = slotsRaw.findIndex((v) => !String(v || "").trim());
            const idx = firstEmpty >= 0 ? firstEmpty : 0;
            await applySerialsToProduct(pid, idx, raw);
            clearScanFieldError(pid);
        },
        [getSerialSlotCount, installationScans, applySerialsToProduct, clearScanFieldError]
    );

    const handleGunKeyDown = async (e, pid) => {
        if (e.key === "Tab" && e.shiftKey) {
            const len = getSerialSlotCount(pid);
            if (len > 0) {
                e.preventDefault();
                e.stopPropagation();
                serialInputRefs.current[pid]?.[len - 1]?.focus();
            }
            return;
        }
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
        await applySerialsToProduct(pid, idx, buf);
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

    const handleScanResult = async (value) => {
        if (!scanTarget) return;
        const { product_id, index } = scanTarget;
        const tokens = splitSerialInput(value || "");
        if (!tokens.length) return;

        const len = getSerialSlotCount(product_id);
        if (!len) return;

        if (tokens.length === 1) {
            const trimmed = tokens[0];
            const accepted = await validateAndCommitSerial(product_id, index, trimmed);
            if (!accepted) {
                clearScanFieldError(product_id);
                return;
            }
            const key = String(product_id);
            const row = installationScans[key] || installationScans[Number(product_id)] || [];
            const simulated = Array.from({ length: len }, (_, i) => String(row[i] ?? ""));
            simulated[index] = trimmed;
            const nextEmpty = simulated.findIndex((v, i) => i > index && !String(v || "").trim());
            queueMicrotask(() => {
                if (nextEmpty === -1) {
                    setScannerOpen(false);
                    setScanTarget(null);
                } else {
                    setScanTarget({ product_id, index: nextEmpty });
                }
            });
            clearScanFieldError(product_id);
            return;
        }

        let dupPartialMsg = "";
        let overflowCount = 0;
        let challanClearToastMulti = false;
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
            const { slots: sanitizedMulti, cleared } = sanitizeSlotsAgainstChallan(
                product_id,
                nextSlots,
                deliveredSerialsMap
            );
            if (cleared) challanClearToastMulti = true;
            return { ...prev, [product_id]: sanitizedMulti };
        });
        if (dupPartialMsg) toastError(dupPartialMsg);
        if (overflowCount) {
            toastError(
                `Cannot add ${overflowCount} serial(s): all slots filled or limit reached.`
            );
        }
        if (challanClearToastMulti) toastError("Serial not on delivery challan — cleared.");
        clearScanFieldError(product_id);
        setScannerOpen(false);
        setScanTarget(null);
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

    const handleSubmit = async (e, complete = false, forceAdjust = false, _autoRetry = false) => {
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

        const pendingCount = Object.keys(pendingImages).length;
        if (complete && pendingCount > 0) {
            toastInfo(`Uploading ${pendingCount} photo${pendingCount > 1 ? "s" : ""} — please wait…`);
        }

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

            // Recheck all pending force-adjust intents right before submit.
            // This blocks stale cases where a serial became installed on another order after dialog confirmation.
            if (complete && Object.keys(slotForceAdjustIntent).length > 0) {
                for (const [slotKey, intent] of Object.entries(slotForceAdjustIntent)) {
                    const [pidRaw] = String(slotKey).split(":");
                    const pid = Number(pidRaw);
                    const serial = String(intent?.serial || "").trim();
                    if (!Number.isFinite(pid) || !serial) continue;
                    const result = await orderService.validateInstallationSerial(orderId, serial, pid);
                    if (!result?.valid) {
                        toastError(result?.message || `Serial '${serial}' cannot be used on this order.`);
                        setFieldErrors((prev) => ({
                            ...prev,
                            [`scans_${pid}`]: result?.message || "Invalid force-adjust serial.",
                        }));
                        setSubmitting(false);
                        return;
                    }
                }
            }

            // Merge slot-level force-adjust intents into the payload flags
            const hasSlotForceIntents = complete && Object.keys(slotForceAdjustIntent).length > 0;
            const effectiveForceAdjust = forceAdjust || hasSlotForceIntents;
            const effectiveForceAdjustReason = forceAdjust
                ? forceAdjustReason
                : hasSlotForceIntents
                  ? Object.values(slotForceAdjustIntent)
                        .map((v) => v.reason)
                        .filter(Boolean)
                        .join("; ") || forceAdjustReason
                  : forceAdjustReason;

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
                inverter_serial_no: null,
                panel_serial_numbers: null,
                earthing_resistance: formData.earthing_resistance ? parseFloat(formData.earthing_resistance) : null,
                initial_generation: formData.initial_generation ? parseFloat(formData.initial_generation) : null,
                remarks: formData.remarks || null,
                checklist,
                images: finalImages,
                complete,
                installation_scans: installationScans,
                force_adjust: effectiveForceAdjust,
                force_adjust_reason: effectiveForceAdjustReason,
            };
            await orderService.saveInstallation(orderId, payload);
            setImages(finalImages);
            const completeSuccessMsg = approvalRequiredConfig
                ? "Installation submitted for manager approval."
                : "Installation stage completed successfully!";
            setSuccessMsg(complete ? completeSuccessMsg : "Installation saved.");
            toastSuccess(complete ? completeSuccessMsg : "Saved.");
            setMismatchData(null);
            setForceAdjustDialogOpen(false);
            setForceAdjustReason("");
            if (complete) setSlotForceAdjustIntent({});
            if (onSuccess) onSuccess();
        } catch (err) {
            const data = err?.response?.data;
            if (data?.code === "SERIAL_MISMATCH" && data?.can_force_adjust && complete && !_autoRetry) {
                return handleSubmit(null, true, true, true);
            } else if (data?.code === "SERIAL_MISMATCH") {
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

    const disabled =
        isReadOnly ||
        (!isReadOnly && !canPerform) ||
        isApprovalPending ||
        isApprovalApproved ||
        (isCompleted && !isApprovalRejected);
    const requiredInstallationImageKeys = useMemo(
        () => INSTALLATION_IMAGE_KEYS.filter((k) => k.required),
        []
    );
    const optionalInstallationImageKeys = useMemo(
        () => INSTALLATION_IMAGE_KEYS.filter((k) => !k.required),
        []
    );

    const installationPhotoSlides = useMemo(() => {
        const out = [];
        for (const { key, label } of INSTALLATION_IMAGE_KEYS) {
            const hasPending = !!pendingImages[key];
            const hasSaved = !!images[key];
            if (!hasPending && !hasSaved) continue;
            if (hasPending) {
                const src = pendingPreviewUrls[key];
                if (!src) continue;
                out.push({ key, label, isPending: true, src });
            } else {
                out.push({ key, label, isPending: false, src: images[key] });
            }
        }
        return out;
    }, [pendingImages, images, pendingPreviewUrls]);

    const openInstallationPhotoGallery = useCallback(
        (slotKey) => {
            const idx = installationPhotoSlides.findIndex((s) => s.key === slotKey);
            if (idx < 0) return;
            setPhotoGallery({ slides: installationPhotoSlides, index: idx });
        },
        [installationPhotoSlides]
    );

    const renderInstallationPhotoField = useCallback(
        ({ key, label, required }) => {
            const hasPending = !!pendingImages[key];
            const hasSaved = !!images[key];
            const previewUrl = pendingPreviewUrls[key];
            return (
                <Box 
                    key={key} 
                    sx={{ 
                        border: 1, 
                        borderColor: fieldErrors[`image_${key}`] ? "error.main" : "divider", 
                        borderRadius: 2, 
                        p: 1.5, 
                        bgcolor: "background.paper",
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                        height: "100%",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                    }}
                >
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: "text.primary", display: "inline-block", mb: 0.5, lineHeight: 1.2 }}>
                            {label}
                            {required && <span className="text-destructive ml-0.5">*</span>}
                        </Typography>
                    </Box>
                    {(hasPending || hasSaved) ? (
                        <Box className="flex flex-col gap-1.5">
                            {hasPending && previewUrl ? (
                                <Box
                                    component="img"
                                    src={previewUrl}
                                    alt={label}
                                    sx={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}
                                />
                            ) : hasPending ? (
                                <Box sx={{ fontSize: "0.85rem", color: "text.secondary", height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover', borderRadius: 1.5 }}>Loading…</Box>
                            ) : hasSaved ? (
                                <BucketImage
                                    path={images[key]}
                                    getUrl={getDocumentUrlById}
                                    alt={label}
                                    sx={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}
                                />
                            ) : null}
                                <Box className="flex items-center justify-between mt-0.5 px-0.5">
                                    <button
                                        type="button"
                                        onClick={() => openInstallationPhotoGallery(key)}
                                        className="text-[0.7rem] text-primary font-medium hover:underline underline-offset-2 transition-colors cursor-pointer"
                                    >
                                        View Full
                                    </button>
                                    {!disabled && (
                                        <Box className="flex items-center gap-3">
                                            <label className="text-[0.7rem] text-muted-foreground cursor-pointer inline-flex items-center hover:text-foreground transition-colors">
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
                                                <span className="font-medium underline decoration-slate-300 underline-offset-2">Replace</span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => handleImageRemove(key)}
                                                className="text-[0.7rem] text-destructive font-medium hover:underline underline-offset-2 transition-colors cursor-pointer"
                                            >
                                                Remove
                                            </button>
                                        </Box>
                                    )}
                                </Box>
                        </Box>
                    ) : (
                        <Box sx={{ mt: 'auto' }}>
                            {!disabled && (
                                <label className="block w-full cursor-pointer group">
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
                                    <Box 
                                        sx={{ 
                                            display: "flex", 
                                            alignItems: "center", 
                                            justifyContent: "center", 
                                            height: 100,
                                            border: "1px dashed",
                                            borderColor: "var(--border)",
                                            borderRadius: 1.5,
                                            bgcolor: "slate.50",
                                            color: "text.secondary",
                                            transition: "all 0.2s",
                                            ".group:hover &": {
                                                borderColor: "primary.main",
                                                color: "primary.main",
                                                bgcolor: "primary.50"
                                            }
                                        }}
                                        className="touch-manipulation"
                                    >
                                        <Box sx={{ textAlign: "center" }}>
                                            <CloudUploadIcon sx={{ fontSize: 24, mb: 0.5, opacity: 0.6 }} />
                                            <Typography variant="caption" display="block" fontWeight={500}>Take photo</Typography>
                                            <Typography variant="caption" display="block" fontSize="0.65rem" opacity={0.7} mt="-2px">or upload file</Typography>
                                        </Box>
                                    </Box>
                                </label>
                            )}
                        </Box>
                    )}
                    {fieldErrors[`image_${key}`] && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block", fontWeight: 500 }}>
                            {fieldErrors[`image_${key}`]}
                        </Typography>
                    )}
                </Box>
            );
        },
        [pendingImages, images, pendingPreviewUrls, disabled, fieldErrors, openInstallationPhotoGallery]
    );

    useEffect(() => {
        if (amendMode || loading || submitting || isReadOnly || !canPerform || isCompleted || !orderId) {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
                autoSaveTimerRef.current = null;
            }
            return;
        }

        const anyProductFullyFilled = Object.entries(deliveredSerialsMap).some(([pid, serials]) => {
            if (!serials?.length) return false;
            const row = installationScans[String(pid)] ?? installationScans[Number(pid)] ?? [];
            return serials.every((_, i) => String(row[i] ?? "").trim());
        });

        if (!anyProductFullyFilled) {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
                autoSaveTimerRef.current = null;
            }
            return;
        }

        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(async () => {
            autoSaveTimerRef.current = null;
            if (amendMode || loading || submitting || isReadOnly || !canPerform || isCompleted || !orderId) return;
            if (autoSavingRef.current) return;
            autoSavingRef.current = true;
            try {
                const payload = {
                    installation_start_date: formData.installation_start_date || null,
                    installation_end_date: formData.installation_end_date || null,
                    inverter_installation_location: formData.inverter_installation_location || null,
                    earthing_type: formData.earthing_type || null,
                    wiring_type: formData.wiring_type || null,
                    acdb_dcdb_make: formData.acdb_dcdb_make || null,
                    panel_mounting_type: formData.panel_mounting_type || null,
                    netmeter_readiness_status: formData.netmeter_readiness_status || null,
                    total_panels_installed: formData.total_panels_installed
                        ? parseInt(formData.total_panels_installed, 10)
                        : null,
                    inverter_serial_no: null,
                    panel_serial_numbers: null,
                    earthing_resistance: formData.earthing_resistance ? parseFloat(formData.earthing_resistance) : null,
                    initial_generation: formData.initial_generation ? parseFloat(formData.initial_generation) : null,
                    remarks: formData.remarks || null,
                    checklist,
                    images,
                    complete: false,
                    installation_scans: installationScans,
                    force_adjust: false,
                    force_adjust_reason: "",
                };
                await orderService.saveInstallation(orderId, payload);
                toastSuccess("Serials auto-saved.");
            } catch {
                // Background save failed — user can use Save explicitly.
            } finally {
                autoSavingRef.current = false;
            }
        }, 1200);

        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
                autoSaveTimerRef.current = null;
            }
        };
    }, [
        installationScans,
        deliveredSerialsMap,
        loading,
        submitting,
        isReadOnly,
        canPerform,
        isCompleted,
        amendMode,
        orderId,
        formData,
        checklist,
        images,
    ]);

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
        <Box
            component="form"
            onSubmit={(e) => handleSubmit(e, false)}
            onKeyDown={preventEnterSubmit}
            className="flex min-h-0 w-full max-w-none min-w-0 flex-col p-1.5 pb-1"
        >
            <div className="w-full space-y-1">
                {Object.entries(deliveredSerialsMap).length > 0 && (
                    <Box sx={{ mb: 0.75, p: 0.5, border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "action.hover" }}>
                        <Typography variant="subtitle2" sx={{ mb: 0.35, fontWeight: 600, fontSize: "0.8125rem" }}>
                            Delivered serials (mandatory)
                        </Typography>
                        {Object.entries(deliveredSerialsMap).map(([pid, serials]) => {
                            const row = installationScans[pid] || [];
                            const filledCount = serials.reduce(
                                (n, _, i) => n + (String(row[i] || "").trim() ? 1 : 0),
                                0
                            );
                            const productPreview = reconciliationPreview.perProduct.find(
                                (p) => String(p.productId) === String(pid)
                            );
                            const productMismatch = reconciliationPreview.mismatches.find(
                                (m) => String(m.product_id) === String(pid)
                            );
                            const productLabel =
                                productNamesById[String(pid)] || productNamesById[pid];
                            const expectedLabel = (i) => {
                                const slot = serials[i];
                                if (slot?.missing_at_delivery || !slot?.serial_number) {
                                    return "Not at DC — scan unit (required)";
                                }
                                return "Scan or enter serial";
                            };
                            const isSerialBlockComplete = filledCount === serials.length && serials.length > 0;
                            return (
                                <Box key={pid} sx={{ mb: 0.75 }}>
                                    <Box
                                        sx={{
                                            p: { xs: 1.5, sm: 2 },
                                            borderRadius: 2,
                                            border: 1,
                                            borderColor: fieldErrors[`scans_${pid}`] ? "error.main" : "divider",
                                            bgcolor: "background.paper",
                                            boxShadow: "0 2px 8px -2px rgba(0,0,0,0.05)",
                                            transition: "border-color 0.2s"
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "flex-start",
                                                justifyContent: "space-between",
                                                gap: 1,
                                                flexWrap: "wrap",
                                            }}
                                        >
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1, minWidth: 0 }}>
                                                <QrCodeScannerIcon
                                                    sx={{ fontSize: 22 }}
                                                    color={isSerialBlockComplete ? "success" : "action"}
                                                />
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography variant="subtitle2" fontWeight={600} noWrap title={productLabel || `Product #${pid}`}>
                                                        {productLabel || `Product #${pid}`}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        Product #{pid}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Chip
                                                label={`${filledCount} / ${serials.length}`}
                                                size="small"
                                                color={isSerialBlockComplete ? "success" : "default"}
                                                icon={isSerialBlockComplete ? <CheckCircleIcon sx={{ fontSize: "16px !important" }} /> : undefined}
                                                sx={{ flexShrink: 0 }}
                                            />
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={serials.length > 0 ? (filledCount / serials.length) * 100 : 0}
                                            sx={{ mt: 0.75, borderRadius: 1, height: 4 }}
                                            color={isSerialBlockComplete ? "success" : "primary"}
                                        />
                                        {!productPreview?.blockingReason &&
                                        filledCount > 0 &&
                                        filledCount < serials.length &&
                                        serials.some((_, i) => {
                                            const t = String(
                                                (installationScans[pid]?.[i] ??
                                                    installationScans[Number(pid)]?.[i]) ??
                                                    ""
                                            ).trim();
                                            return t && scannedValueInvalidForInstallationSlot(t, serials, i);
                                        }) ? (
                                            <Alert severity="warning" sx={{ py: 0.25, mt: 0.5, alignItems: "center" }}>
                                                <Typography variant="caption" component="div">
                                                    Some entered serials are not on this delivery challan. Tab out of the field to
                                                    clear invalid entries.
                                                </Typography>
                                            </Alert>
                                        ) : null}
                                        {productPreview?.blockingReason === "count_mismatch" ? (
                                            <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: "block" }}>
                                                Serial slot count does not match delivery ({serials.length} required).
                                            </Typography>
                                        ) : null}
                                        {productPreview?.blockingReason === "empty_slots" ? (
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                                                Fill all serial slots to preview reconciliation with delivery.
                                            </Typography>
                                        ) : null}
                                        {productPreview?.blockingReason === "duplicate_in_product" ? (
                                            <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>
                                                Duplicate serial numbers in this product.
                                            </Typography>
                                        ) : null}
                                        {!productPreview?.blockingReason && productMismatch && reconciliationPreview.placeholderMismatch ? (
                                            <Alert severity="warning" sx={{ py: 0.25, mt: 0.5, alignItems: "center" }}>
                                                <Typography variant="caption" component="div">
                                                    Scanned serials do not match the placeholder delivery pattern. Complete will be
                                                    blocked until corrected. Force Adjust is not available for this case.
                                                </Typography>
                                            </Alert>
                                        ) : null}
                                        {!productPreview?.blockingReason && productMismatch && reconciliationPreview.canForceAdjust ? (
                                            <Alert severity="warning" sx={{ py: 0.25, mt: 0.5, alignItems: "center" }}>
                                                <Typography variant="caption" component="div">
                                                    Some scanned serials are not on the delivery challan. Complete Installation will
                                                    require <strong>Force Adjust</strong> with a reason.
                                                </Typography>
                                            </Alert>
                                        ) : null}
                                        {!productPreview?.blockingReason && !productMismatch && isSerialBlockComplete ? (
                                            <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: "block" }}>
                                                Matches delivery records.
                                            </Typography>
                                        ) : null}
                                    </Box>
                                    {fieldErrors[`scans_${pid}`] && (
                                        <Typography variant="caption" color="error" sx={{ mt: 0.25, display: "block", pl: 0.25 }}>
                                            {fieldErrors[`scans_${pid}`]}
                                        </Typography>
                                    )}
                                    <Box sx={{ pt: 0.75 }}>
                                        <Box className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={disabled}
                                                className="inline-flex shrink-0 w-full sm:w-auto touch-manipulation items-center justify-center gap-2 px-4 shadow-sm active:scale-[0.98] transition-transform min-h-[44px] sm:min-h-[36px] border-slate-300"
                                                onClick={() => openScannerForProduct(pid)}
                                            >
                                                <QrCodeScannerIcon sx={{ fontSize: 22 }} />
                                                <span className="font-medium text-[15px] sm:text-sm">Scan Barcode / QR</span>
                                            </Button>
                                            <Box className="w-full sm:min-w-[220px] flex-1">
                                                <Input
                                                    ref={(el) => {
                                                        gunScanInputRefs.current[pid] = el;
                                                    }}
                                                    name={`gun_scan_${pid}`}
                                                    label="Scan with gun"
                                                    placeholder="Scanner gun types here, then Enter"
                                                    value={gunScanByProduct[pid] ?? ""}
                                                    onChange={(e) =>
                                                        setGunScanByProduct((p) => ({ ...p, [pid]: e.target.value }))
                                                    }
                                                    onKeyDown={(e) => handleGunKeyDown(e, pid)}
                                                    onBlur={(e) => handleGunBlur(pid, e)}
                                                    disabled={disabled}
                                                    size="small"
                                                    fullWidth
                                                    className="[&_.MuiInputBase-root]:min-h-[44px] sm:[&_.MuiInputBase-root]:min-h-[36px]"
                                                />
                                            </Box>
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, lineHeight: 1.3 }}>
                                            Gun: type and press Enter or Tab away to fill slots (invalid serials are cleared).
                                        </Typography>
                                        <Divider sx={{ my: 0.75 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                or type manually
                                            </Typography>
                                        </Divider>
                                        <Box className="flex flex-wrap gap-1.5">
                                            {serials.map((_, idx) => {
                                                const value = installationScans[pid]?.[idx] ?? "";
                                                const trimmed = String(value || "").trim();
                                                const slotId = `inst-serial-${pid}-${idx}`;
                                                const slotValidatingKey = `${pid}:${idx}`;
                                                const slotBusy = !!serialValidating[slotValidatingKey];
                                                const slotPendingForce = !!pendingForceSlots[slotValidatingKey];
                                                const slotHasForceIntent = !!slotForceAdjustIntent[slotValidatingKey];
                                                return (
                                                    <div
                                                        key={idx}
                                                        className="min-w-[180px] max-w-full flex-1 basis-[220px]"
                                                    >
                                                        <Label
                                                            htmlFor={slotId}
                                                            className="mb-1.5 block text-sm font-medium text-slate-700"
                                                        >
                                                            Serial {idx + 1} of {serials.length}
                                                        </Label>
                                                        <div className="relative w-full">
                                                            <ShadcnInput
                                                                ref={(el) => {
                                                                    if (!serialInputRefs.current[pid]) {
                                                                        serialInputRefs.current[pid] = [];
                                                                    }
                                                                    serialInputRefs.current[pid][idx] = el;
                                                                }}
                                                                id={slotId}
                                                                value={value}
                                                                onChange={(e) =>
                                                                    handleInstallationSerialChange(
                                                                        pid,
                                                                        idx,
                                                                        e.target.value
                                                                    )
                                                                }
                                                                onKeyDown={(e) =>
                                                                    handleInstallationSerialKeyDown(
                                                                        pid,
                                                                        idx,
                                                                        serials.length,
                                                                        e
                                                                    )
                                                                }
                                                                onBlur={(e) => handleSerialSlotBlur(pid, idx, e)}
                                                                placeholder={expectedLabel(idx) || ""}
                                                                disabled={disabled || slotBusy}
                                                                autoComplete="off"
                                                                className={cn(
                                                                    FIELD_HEIGHT_CLASS_SMALL,
                                                                    FIELD_TEXT_SMALL,
                                                                    "rounded-md border-slate-300 pr-[4.5rem] shadow-none",
                                                                    trimmed &&
                                                                        (slotIsCaptureAtDelivery(serials[idx])
                                                                            ? undefined
                                                                            : scannedValueInvalidForInstallationSlot(
                                                                                    trimmed,
                                                                                    serials,
                                                                                    idx
                                                                                )
                                                                              ? "border-amber-600 ring-1 ring-amber-500/35 focus:border-amber-600 focus:ring-amber-500/40"
                                                                              : "border-green-600 ring-1 ring-green-500/30 focus:border-green-600 focus:ring-green-500/40")
                                                                )}
                                                            />
                                                            <div className="pointer-events-none absolute right-1 top-1/2 flex h-10 -translate-y-1/2 items-center gap-0">
                                                                {trimmed ? (
                                                                    <IconButton
                                                                        size="small"
                                                                        tabIndex={-1}
                                                                        disabled={disabled || slotBusy}
                                                                        className="pointer-events-auto"
                                                                        onClick={() =>
                                                                            handleInstallationSerialChange(
                                                                                pid,
                                                                                idx,
                                                                                ""
                                                                            )
                                                                        }
                                                                        aria-label="Clear serial"
                                                                        sx={{ p: 0.35 }}
                                                                    >
                                                                        <ClearIcon sx={{ fontSize: 18 }} />
                                                                    </IconButton>
                                                                ) : null}
                                                                <IconButton
                                                                    size="small"
                                                                    tabIndex={-1}
                                                                    disabled={disabled || slotBusy}
                                                                    className="pointer-events-auto"
                                                                    onClick={() => {
                                                                        setScanTarget({
                                                                            product_id: pid,
                                                                            index: idx,
                                                                        });
                                                                        setScannerOpen(true);
                                                                    }}
                                                                    aria-label="Scan this serial"
                                                                    sx={{ p: 0.35 }}
                                                                >
                                                                    <QrCodeScannerIcon sx={{ fontSize: 18 }} />
                                                                </IconButton>
                                                            </div>
                                                        </div>
                                                        {slotBusy ? (
                                                            <Typography
                                                                variant="caption"
                                                                color="text.secondary"
                                                                sx={{
                                                                    display: "block",
                                                                    mt: 0.25,
                                                                    fontSize: "0.6875rem",
                                                                    lineHeight: 1.2,
                                                                }}
                                                            >
                                                                Checking inventory…
                                                            </Typography>
                                                        ) : null}
                                                        {slotPendingForce ? (
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    display: "block",
                                                                    mt: 0.25,
                                                                    fontSize: "0.6875rem",
                                                                    lineHeight: 1.2,
                                                                    color: "warning.main",
                                                                    fontWeight: 600,
                                                                }}
                                                            >
                                                                Force Adjust pending — scan same serial again to confirm.
                                                            </Typography>
                                                        ) : null}
                                                        {slotHasForceIntent && trimmed ? (
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    display: "block",
                                                                    mt: 0.25,
                                                                    fontSize: "0.6875rem",
                                                                    lineHeight: 1.2,
                                                                    color: "warning.dark",
                                                                }}
                                                            >
                                                                Force Adjusted — will reconcile on Complete.
                                                            </Typography>
                                                        ) : null}
                                                        {trimmed ? (
                                                            slotIsCaptureAtDelivery(serials[idx]) ? (
                                                                <Typography
                                                                    variant="caption"
                                                                    color="text.secondary"
                                                                    sx={{
                                                                        display: "block",
                                                                        mt: 0.25,
                                                                        fontSize: "0.6875rem",
                                                                        lineHeight: 1.2,
                                                                    }}
                                                                >
                                                                    Will be captured on Complete.
                                                                </Typography>
                                                            ) : scannedValueInvalidForInstallationSlot(
                                                                  trimmed,
                                                                  serials,
                                                                  idx
                                                              ) ? (
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{
                                                                        display: "block",
                                                                        mt: 0.25,
                                                                        fontSize: "0.6875rem",
                                                                        lineHeight: 1.2,
                                                                        color: "warning.main",
                                                                    }}
                                                                >
                                                                    Not on delivery challan.
                                                                </Typography>
                                                            ) : (
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        gap: 0.25,
                                                                        mt: 0.25,
                                                                        fontSize: "0.6875rem",
                                                                        lineHeight: 1.2,
                                                                        color: "success.main",
                                                                    }}
                                                                >
                                                                    <CheckCircleIcon sx={{ fontSize: 14 }} />
                                                                    Confirmed.
                                                                </Typography>
                                                            )
                                                        ) : null}
                                                        {trimmed && !slotIsCaptureAtDelivery(serials[idx]) ? (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                disabled={disabled || slotBusy}
                                                                className="mt-0.5 h-6 px-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                                                                onClick={() => {
                                                                    setInstallationScans((prev) => {
                                                                        const k = String(pid);
                                                                        const cur = Array.from(
                                                                            { length: serials.length },
                                                                            (_, i) =>
                                                                                String(
                                                                                    (prev[k] ||
                                                                                        prev[Number(pid)] ||
                                                                                        [])[i] ?? ""
                                                                                )
                                                                        );
                                                                        cur[idx] = "";
                                                                        return { ...prev, [k]: cur };
                                                                    });
                                                                    toastSuccess("Serial removed.");
                                                                }}
                                                            >
                                                                <RemoveCircleOutlineIcon
                                                                    sx={{ fontSize: 14, mr: 0.35, verticalAlign: "middle" }}
                                                                />
                                                                Remove
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                );
                                            })}
                                        </Box>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                )}

                <div className={COMPACT_SECTION_HEADER_CLASS}>Required Photos</div>
                <Box className="mt-1 mb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {requiredInstallationImageKeys.map((config) => renderInstallationPhotoField(config))}
                </Box>

                <div className={COMPACT_SECTION_HEADER_CLASS}>Checklist</div>
                <Box className="mt-0.5 mb-3 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0">
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

                <details className="mt-1 mb-2 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden shadow-sm">
                    <summary className="cursor-pointer select-none list-none px-3 py-2.5 text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border-b border-slate-200 flex items-center justify-between transition-colors">
                        Optional Details
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'normal' }}>(Expand to fill optional data)</Typography>
                    </summary>
                    <div className="p-3 flex flex-col gap-4">
                        <Box>
                            <Typography variant="caption" className="mb-1.5 block font-semibold text-slate-700">Optional Photos</Typography>
                            <Box className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                {optionalInstallationImageKeys.map((config) => renderInstallationPhotoField(config))}
                            </Box>
                        </Box>
                        <Divider />
                        <FormGrid cols={4} className="gap-2">
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
                            name="remarks"
                            label="Remarks"
                            multiline
                            rows={2}
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
                            size="sm"
                            variant="default"
                            className="w-full sm:w-auto min-h-[44px] sm:min-h-9 px-6 touch-manipulation font-semibold text-[15px] sm:text-sm rounded-lg shadow-sm bg-blue-600 hover:bg-blue-700 text-white border-transparent transition-all active:scale-[0.98]"
                            loading={submitting}
                            disabled={disabled}
                        >
                            Save Progress
                        </Button>
                        {canComplete && (
                            <Button
                                type="button"
                                size="sm"
                                variant="default"
                                className="w-full sm:w-auto min-h-[44px] sm:min-h-9 px-6 touch-manipulation font-semibold text-[15px] sm:text-sm rounded-lg shadow hover:shadow-md bg-emerald-600 hover:bg-emerald-700 text-white border-transparent transition-all active:scale-[0.98]"
                                loading={submitting}
                                disabled={disabled || !allInstallationSerialsFilled}
                                onClick={(e) => handleSubmit(e, true)}
                            >
                                {approvalRequiredConfig ? "Submit for Approval" : "Complete Installation"}
                            </Button>
                        )}
                    </div>
                    <div className="text-center sm:text-right">
                        {canComplete && !allInstallationSerialsFilled && Object.keys(deliveredSerialsMap).length > 0 && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                                Enter every delivered serial to complete.
                            </Typography>
                        )}
                        {!canComplete && orderData?.stages?.fabrication !== "completed" && !isCompleted && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                                Complete Fabrication to unlock Installation.
                            </Typography>
                        )}
                        {isApprovalPending && (
                            <Typography variant="caption" color="warning.main" sx={{ display: "block", lineHeight: 1.2 }}>
                                Submitted for warehouse manager approval. Editing is locked until decision.
                            </Typography>
                        )}
                    </div>
                </Box>
                {error && <Alert severity="error" sx={{ py: 0, '& .MuiAlert-message': { py: 1 } }}>{error}</Alert>}
                {successMsg && <Alert severity="success" sx={{ py: 0, '& .MuiAlert-message': { py: 1 } }}>{successMsg}</Alert>}
                {isApprovalRejected && (
                    <Alert severity="warning" sx={{ py: 0, '& .MuiAlert-message': { py: 1 } }}>
                        Rejected by manager
                        {orderData?.installation_rejection_reason ? `: ${orderData.installation_rejection_reason}` : ""}.
                        Please correct and resubmit.
                    </Alert>
                )}
                {mismatchData && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                            Serial Mismatch Detected
                        </Typography>
                        {mismatchData.mismatches.map((m, i) => (
                            <div key={i} className="text-xs mt-1">
                                Product #{m.product_id}: Scanned {m.missing_serials.join(", ")} but expected {m.expected_serials.join(", ")}
                            </div>
                        ))}
                    </Alert>
                )}
            </div>
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
            <Dialog open={forceAdjustDialogOpen} onOpenChange={(open) => {
                if (!open) {
                    setForceAdjustDialogOpen(false);
                    if (slotForceAdjustCtx) setSlotForceAdjustCtx(null);
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Force Adjust Serials</DialogTitle>
                    </DialogHeader>
                    <Box sx={{ py: 2 }}>
                        {slotForceAdjustCtx && (
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                Serial <strong>{slotForceAdjustCtx.serial}</strong> is not on the delivery challan for this slot.
                                Confirming will record it as a Force Adjust — the originally delivered serial will be returned to stock and this serial will be issued when you Complete Installation.
                            </Typography>
                        )}
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
                        <Button variant="outline" onClick={() => {
                            setForceAdjustDialogOpen(false);
                            setSlotForceAdjustCtx(null);
                        }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={async () => {
                                if (!slotForceAdjustCtx) return;
                                const { pid, idx, serial } = slotForceAdjustCtx;
                                const slotKey = `${pid}:${idx}`;
                                const trimmed = String(serial || "").trim();
                                if (!trimmed) return;
                                setSerialValidating((p) => ({ ...p, [slotKey]: true }));
                                try {
                                    const result = await orderService.validateInstallationSerial(orderId, trimmed, pid);
                                    if (!result?.valid) {
                                        toastError(result?.message || "Serial cannot be used on this order.");
                                        setInstallationScans((prev) => {
                                            const key = String(pid);
                                            const len = getSerialSlotCount(pid);
                                            const cur = Array.from({ length: len }, (_, i) =>
                                                String((prev[key] ?? prev[Number(pid)] ?? [])[i] ?? "")
                                            );
                                            const next = [...cur];
                                            next[idx] = "";
                                            return { ...prev, [key]: next };
                                        });
                                        return;
                                    }
                                } catch (err) {
                                    const msg =
                                        err?.response?.data?.message ||
                                        err?.response?.data?.result?.message ||
                                        err?.message ||
                                        "Validation failed";
                                    toastError(msg);
                                    return;
                                } finally {
                                    setSerialValidating((p) => {
                                        const n = { ...p };
                                        delete n[slotKey];
                                        return n;
                                    });
                                }

                                const key = String(pid);
                                const len = getSerialSlotCount(pid);
                                setInstallationScans((prev) => {
                                    const cur = Array.from({ length: len }, (_, i) =>
                                        String((prev[key] ?? prev[Number(pid)] ?? [])[i] ?? "")
                                    );
                                    const next = [...cur];
                                    next[idx] = serial;
                                    return { ...prev, [key]: next };
                                });
                                setSlotForceAdjustIntent((prev) => ({
                                    ...prev,
                                    [slotKey]: { serial, reason: forceAdjustReason },
                                }));
                                toastSuccess("Force Adjust recorded — will apply on Complete Installation.");
                                setForceAdjustDialogOpen(false);
                                setSlotForceAdjustCtx(null);
                                setForceAdjustReason("");
                            }}
                            disabled={
                                !slotForceAdjustCtx ||
                                !forceAdjustReason ||
                                submitting ||
                                (slotForceAdjustCtx
                                    ? !!serialValidating[`${slotForceAdjustCtx.pid}:${slotForceAdjustCtx.idx}`]
                                    : false)
                            }
                            loading={
                                submitting ||
                                (slotForceAdjustCtx
                                    ? !!serialValidating[`${slotForceAdjustCtx.pid}:${slotForceAdjustCtx.idx}`]
                                    : false)
                            }
                        >
                            Confirm Force Adjust
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!photoGallery} onOpenChange={(open) => !open && setPhotoGallery(null)}>
                <DialogContent className="!fixed !inset-0 !left-0 !top-0 !flex !h-[100dvh] !max-h-[100dvh] !w-full !max-w-none !translate-x-0 !translate-y-0 !rounded-none border-none bg-black/95 p-0 gap-0 flex-col overflow-hidden text-white ring-0">
                    {(() => {
                        const slide = photoGallery?.slides?.[photoGallery.index];
                        const total = photoGallery?.slides?.length ?? 0;
                        const idx = photoGallery?.index ?? 0;
                        const canPrev = total > 0 && idx > 0;
                        const canNext = total > 0 && idx < total - 1;
                        return (
                            <>
                                <DialogHeader className="p-2 sm:p-3 shrink-0 flex-row items-center justify-between gap-2 border-b border-white/10 bg-black/60 space-y-0">
                                    <DialogTitle className="text-white text-xs sm:text-sm font-medium pr-2 line-clamp-2">
                                        {slide?.label}
                                        {total > 0 ? (
                                            <span className="text-white/60 font-normal ml-2 whitespace-nowrap">
                                                {idx + 1} / {total}
                                            </span>
                                        ) : null}
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="relative flex-1 min-h-0 w-full flex items-center justify-center px-10 sm:px-14 py-2">
                                    {canPrev && (
                                        <IconButton
                                            type="button"
                                            aria-label="Previous photo"
                                            onClick={() =>
                                                setPhotoGallery((g) =>
                                                    g && g.index > 0 ? { ...g, index: g.index - 1 } : g
                                                )
                                            }
                                            sx={{
                                                position: "absolute",
                                                left: 4,
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                                zIndex: 2,
                                                color: "#fff",
                                                bgcolor: "rgba(255,255,255,0.12)",
                                                "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                                            }}
                                            size="large"
                                        >
                                            <ChevronLeftIcon sx={{ fontSize: 32 }} />
                                        </IconButton>
                                    )}
                                    {canNext && (
                                        <IconButton
                                            type="button"
                                            aria-label="Next photo"
                                            onClick={() =>
                                                setPhotoGallery((g) =>
                                                    g && g.index < g.slides.length - 1
                                                        ? { ...g, index: g.index + 1 }
                                                        : g
                                                )
                                            }
                                            sx={{
                                                position: "absolute",
                                                right: 4,
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                                zIndex: 2,
                                                color: "#fff",
                                                bgcolor: "rgba(255,255,255,0.12)",
                                                "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                                            }}
                                            size="large"
                                        >
                                            <ChevronRightIcon sx={{ fontSize: 32 }} />
                                        </IconButton>
                                    )}
                                    <div className="relative w-full h-full max-h-full flex items-center justify-center">
                                        {slide?.isPending ? (
                                            <img
                                                src={slide.src}
                                                alt={slide.label}
                                                className="max-w-full max-h-full w-auto h-auto object-contain"
                                            />
                                        ) : slide?.src ? (
                                            <BucketImage
                                                path={slide.src}
                                                getUrl={getDocumentUrlById}
                                                alt={slide.label}
                                                sx={{
                                                    maxWidth: "100%",
                                                    maxHeight: "100%",
                                                    width: "auto",
                                                    height: "auto",
                                                    objectFit: "contain",
                                                    borderRadius: 0,
                                                }}
                                            />
                                        ) : null}
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </Box>
    );
}
