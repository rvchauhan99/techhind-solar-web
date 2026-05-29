"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Box, Alert, Switch, FormControlLabel, Typography, CircularProgress } from "@mui/material";
import Grid from "@mui/material/Grid";
import { usePathname } from "next/navigation";
import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import { Button } from "@/components/ui/button";
import orderService from "@/services/orderService";
import companyService from "@/services/companyService";
import { getReferenceOptionsSearch, getReferenceOptionById } from "@/services/mastersService";
import { useAuth } from "@/hooks/useAuth";
import { toastSuccess, toastError } from "@/utils/toast";
import moment from "moment";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { COMPACT_FORM_SPACING } from "@/utils/formConstants";

const WORK_ROLE_LABELS = {
    fabricator: "Fabricator",
    installer: "Installer",
    fabricator_installer: "Fabricator & installer",
};

const WORK_TYPE_LABELS = {
    fabrication_only: "Fabrication only",
    installation_only: "Installation only",
    fabrication_and_installation: "Fabrication + installation",
};

function fmtMoney(v) {
    if (v == null || v === "") return "-";
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(2) : "-";
}

/** Prefer calculated when stored payable is missing or zero but calculated is positive. */
function resolvePayableFromStored(storedPayable, calculatedAmount) {
    const calc = Number(calculatedAmount);
    const hasCalc = Number.isFinite(calc);
    const stored =
        storedPayable == null || storedPayable === "" ? NaN : Number(storedPayable);
    const hasStored = Number.isFinite(stored);
    if (hasStored && stored > 0) return stored;
    if (hasCalc) return calc;
    if (hasStored) return stored;
    return null;
}

function payableForSubmit(line) {
    const calc = Number(line.calculated_amount);
    const raw = line.payable;
    if (raw === "" || raw == null) {
        return Number.isFinite(calc) ? calc : null;
    }
    const n = Number(raw);
    return Number.isFinite(n) ? n : Number.isFinite(calc) ? calc : null;
}

function buildCommissionLinesFromOrder(orderData) {
    if (!orderData?.assign_fabricator_installer_completed_at) return [];
    const same = orderData.fabricator_installer_are_same;
    if (same && orderData.fabricator_installer_id) {
        return [
            {
                role: "fabricator_installer",
                user_id: orderData.fabricator_installer_id,
                per_kw: orderData.fabricator_installer_commission_per_kw,
                calculated_amount: orderData.fabricator_installer_commission_calculated_amount,
                payable: resolvePayableFromStored(
                    orderData.fabricator_installer_commission_payable_amount,
                    orderData.fabricator_installer_commission_calculated_amount
                ),
                work_type: "fabrication_and_installation",
                rate_row_id: orderData.fabricator_installer_commission_rate_id,
            },
        ];
    }
    const lines = [];
    if (orderData.fabricator_id) {
        lines.push({
            role: "fabricator",
            user_id: orderData.fabricator_id,
            per_kw: orderData.fabricator_commission_per_kw,
            calculated_amount: orderData.fabricator_commission_calculated_amount,
            payable: resolvePayableFromStored(
                orderData.fabricator_commission_payable_amount,
                orderData.fabricator_commission_calculated_amount
            ),
            work_type: "fabrication_only",
            rate_row_id: orderData.fabricator_commission_rate_id,
        });
    }
    if (orderData.installer_id) {
        lines.push({
            role: "installer",
            user_id: orderData.installer_id,
            per_kw: orderData.installer_commission_per_kw,
            calculated_amount: orderData.installer_commission_calculated_amount,
            payable: resolvePayableFromStored(
                orderData.installer_commission_payable_amount,
                orderData.installer_commission_calculated_amount
            ),
            work_type: "installation_only",
            rate_row_id: orderData.installer_commission_rate_id,
        });
    }
    return lines;
}

export default function AssignFabricatorAndInstaller({
    orderId,
    orderData,
    onSuccess,
    amendMode = false,
    currentStage = "assign_fabricator_and_installer",
    nextStage = "fabrication",
    completedAtField = "assign_fabricator_installer_completed_at",
    successMessage = "Fabricator & Installer assignment saved successfully!"
}) {
    const pathname = usePathname();
    const { user } = useAuth();
    const isReadOnly = pathname?.startsWith("/closed-orders") || pathname?.startsWith("/cancelled-orders");
    const [canAssign, setCanAssign] = useState(false);
    const [managerCheckLoading, setManagerCheckLoading] = useState(true);
    const [managerCheckError, setManagerCheckError] = useState(null);
    const [formData, setFormData] = useState({
        fabricator_installer_are_same: true,
        fabricator_installer_id: "",
        fabricator_id: "",
        installer_id: "",
        fabrication_due_date: "",
        installation_due_date: "",
        fabrication_remarks: "",
    });
    const [selectedFabricatorInstaller, setSelectedFabricatorInstaller] = useState(null);
    const [selectedFabricator, setSelectedFabricator] = useState(null);
    const [selectedInstaller, setSelectedInstaller] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [successMsg, setSuccessMsg] = useState(null);
    const [commissionLines, setCommissionLines] = useState([]);
    const [commissionLoading, setCommissionLoading] = useState(false);
    const [commissionError, setCommissionError] = useState(null);
    const previewTimerRef = useRef(null);
    const [payableEditedByRole, setPayableEditedByRole] = useState({});
    const payableEditedByRoleRef = useRef(payableEditedByRole);
    payableEditedByRoleRef.current = payableEditedByRole;

    const assigneeContextKey = useMemo(
        () =>
            [
                formData.fabricator_installer_are_same ? "1" : "0",
                formData.fabricator_installer_id,
                formData.fabricator_id,
                formData.installer_id,
            ].join("|"),
        [
            formData.fabricator_installer_are_same,
            formData.fabricator_installer_id,
            formData.fabricator_id,
            formData.installer_id,
        ]
    );

    const clearPayableEdits = useCallback(() => {
        setPayableEditedByRole({});
    }, []);

    const loadUserOptions = useCallback(async (inputValue) => {
        const list = await getReferenceOptionsSearch("user.model", {
            q: inputValue || "",
            limit: 20,
            status: "active",
        });
        return Array.isArray(list) ? list : [];
    }, []);

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
            if (orderData.fabricator_installer_id) {
                setSelectedFabricatorInstaller((prev) =>
                    prev?.id === orderData.fabricator_installer_id
                        ? prev
                        : { id: orderData.fabricator_installer_id, name: "", username: "" }
                );
            } else {
                setSelectedFabricatorInstaller(null);
            }
            if (orderData.fabricator_id) {
                setSelectedFabricator((prev) =>
                    prev?.id === orderData.fabricator_id
                        ? prev
                        : { id: orderData.fabricator_id, name: "", username: "" }
                );
            } else {
                setSelectedFabricator(null);
            }
            if (orderData.installer_id) {
                setSelectedInstaller((prev) =>
                    prev?.id === orderData.installer_id
                        ? prev
                        : { id: orderData.installer_id, name: "", username: "" }
                );
            } else {
                setSelectedInstaller(null);
            }
        }
        const stored = buildCommissionLinesFromOrder(orderData);
        if (stored.length) setCommissionLines(stored);
    }, [orderData]);

    const assigneeNameForLine = useCallback(
        (line) => {
            if (line.role === "fabricator_installer") {
                return (
                    selectedFabricatorInstaller?.name ||
                    selectedFabricatorInstaller?.username ||
                    `User #${line.user_id}`
                );
            }
            if (line.role === "fabricator") {
                return selectedFabricator?.name || selectedFabricator?.username || `User #${line.user_id}`;
            }
            return selectedInstaller?.name || selectedInstaller?.username || `User #${line.user_id}`;
        },
        [selectedFabricatorInstaller, selectedFabricator, selectedInstaller]
    );

    const canPreviewCommission = useCallback(() => {
        if (formData.fabricator_installer_are_same) {
            return !!formData.fabricator_installer_id;
        }
        return !!formData.fabricator_id && !!formData.installer_id;
    }, [
        formData.fabricator_installer_are_same,
        formData.fabricator_installer_id,
        formData.fabricator_id,
        formData.installer_id,
    ]);

    useEffect(() => {
        if (!orderId || !canPreviewCommission()) {
            setCommissionLines([]);
            setCommissionError(null);
            return undefined;
        }
        if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
        previewTimerRef.current = setTimeout(async () => {
            setCommissionLoading(true);
            setCommissionError(null);
            try {
                const res = await orderService.previewWorkCommission(orderId, {
                    fabricator_installer_are_same: formData.fabricator_installer_are_same,
                    fabricator_installer_id: formData.fabricator_installer_id || undefined,
                    fabricator_id: formData.fabricator_id || undefined,
                    installer_id: formData.installer_id || undefined,
                });
                const lines = res?.lines || [];
                setCommissionLines((prev) => {
                    const prevByRole = {};
                    prev.forEach((p) => {
                        prevByRole[p.role] = p;
                    });
                    return lines.map((l) => {
                        const calc = Number(l.calculated_amount);
                        const calcVal = Number.isFinite(calc) ? calc : 0;
                        if (payableEditedByRoleRef.current[l.role]) {
                            const prevLine = prevByRole[l.role];
                            const prevPay = prevLine?.payable;
                            return {
                                ...l,
                                payable:
                                    prevPay != null && prevPay !== ""
                                        ? prevPay
                                        : calcVal,
                            };
                        }
                        return { ...l, payable: calcVal };
                    });
                });
            } catch (err) {
                setCommissionError(
                    err?.response?.data?.message || err?.message || "Could not load commission preview"
                );
                setCommissionLines([]);
            } finally {
                setCommissionLoading(false);
            }
        }, 400);
        return () => {
            if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
        };
    }, [
        orderId,
        orderData?.capacity,
        formData.fabricator_installer_are_same,
        formData.fabricator_installer_id,
        formData.fabricator_id,
        formData.installer_id,
        canPreviewCommission,
    ]);

    useEffect(() => {
        clearPayableEdits();
    }, [assigneeContextKey, clearPayableEdits]);

    const handlePayableChange = (role, value) => {
        setPayableEditedByRole((prev) => ({ ...prev, [role]: true }));
        setCommissionLines((prev) =>
            prev.map((line) => (line.role === role ? { ...line, payable: value } : line))
        );
    };

    const resetPayableToCalculated = (role) => {
        setPayableEditedByRole((prev) => {
            const next = { ...prev };
            delete next[role];
            return next;
        });
        setCommissionLines((prev) =>
            prev.map((line) => {
                if (line.role !== role) return line;
                const calc = Number(line.calculated_amount);
                return {
                    ...line,
                    payable: Number.isFinite(calc) ? calc : "",
                };
            })
        );
    };

    // Resolve user display names when we have IDs but no name (e.g. after stage completed, coming back to view)
    useEffect(() => {
        const resolveUser = async (id, setter) => {
            if (!id) return;
            try {
                const user = await getReferenceOptionById("user.model", id);
                if (user) {
                    setter((prev) => {
                        const merged = { ...(prev || {}), id: Number(id), ...user };
                        return merged;
                    });
                }
            } catch (e) {
                console.warn("Could not resolve user", id, e);
            }
        };
        if (formData.fabricator_installer_are_same && formData.fabricator_installer_id) {
            if (!selectedFabricatorInstaller?.name && !selectedFabricatorInstaller?.username) {
                resolveUser(formData.fabricator_installer_id, setSelectedFabricatorInstaller);
            }
        } else {
            if (formData.fabricator_id && (!selectedFabricator?.name && !selectedFabricator?.username)) {
                resolveUser(formData.fabricator_id, setSelectedFabricator);
            }
            if (formData.installer_id && (!selectedInstaller?.name && !selectedInstaller?.username)) {
                resolveUser(formData.installer_id, setSelectedInstaller);
            }
        }
    }, [
        formData.fabricator_installer_are_same,
        formData.fabricator_installer_id,
        formData.fabricator_id,
        formData.installer_id,
        selectedFabricatorInstaller?.id,
        selectedFabricator?.id,
        selectedInstaller?.id,
    ]);

    useEffect(() => {
        if (!orderData?.id || !user?.id) {
            setManagerCheckLoading(false);
            setCanAssign(false);
            if (orderData?.id && !user?.id) {
                setManagerCheckError("Unable to verify user. Please sign in again.");
            } else {
                setManagerCheckError(null);
            }
            return;
        }
        const plannedWarehouseId = orderData.planned_warehouse_id;
        const plannerCompleted = orderData.stages?.planner === "completed";
        if (!plannedWarehouseId || !plannerCompleted) {
            setManagerCheckLoading(false);
            setCanAssign(false);
            setManagerCheckError(
                "A planned warehouse must be set in the Planner step before you can assign fabricator and installer."
            );
            return;
        }
        let cancelled = false;
        setManagerCheckLoading(true);
        setManagerCheckError(null);
        companyService
            .getWarehouseManagers(plannedWarehouseId)
            .then((res) => {
                if (cancelled) return;
                const data = res?.result ?? res ?? {};
                const managers = Array.isArray(data) ? data : (data?.data && Array.isArray(data.data) ? data.data : []);
                const isManager = managers.some((m) => Number(m.id) === Number(user.id));
                setCanAssign(!!isManager);
                if (!isManager) {
                    setManagerCheckError(
                        "Only warehouse managers of the planned warehouse (selected in the Planner step) can assign fabricator and installer. You are not assigned as a manager for this order's warehouse. Please contact your administrator if you need access."
                    );
                }
            })
            .catch((err) => {
                if (cancelled) return;
                setCanAssign(false);
                setManagerCheckError(
                    err?.response?.data?.message ||
                        err?.message ||
                        "Unable to verify permissions. Please try again or contact your administrator."
                );
            })
            .finally(() => {
                if (!cancelled) setManagerCheckLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [orderData?.id, orderData?.planned_warehouse_id, orderData?.stages?.planner, user?.id]);

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
        clearPayableEdits();
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
        if (!canAssign && !amendMode) {
            toastError(
                "Only warehouse managers of the planned warehouse can perform this assignment. Please contact your administrator if you need access."
            );
            return;
        }
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

            for (const line of commissionLines) {
                const p = line.payable;
                if (p === "" || p == null) continue;
                const n = Number(p);
                if (!Number.isFinite(n) || n < 0) {
                    newFieldErrors[`payable_${line.role}`] = "Payable must be zero or greater";
                }
            }

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

            for (const line of commissionLines) {
                const prefix =
                    line.role === "fabricator_installer"
                        ? "fabricator_installer_commission"
                        : line.role === "fabricator"
                          ? "fabricator_commission"
                          : "installer_commission";
                const payable = payableForSubmit(line);
                payload[`${prefix}_per_kw`] = line.per_kw;
                payload[`${prefix}_calculated_amount`] = line.calculated_amount;
                payload[`${prefix}_payable_amount`] = payable;
                payload[`${prefix}_rate_id`] = line.rate_row_id ?? null;
            }

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

    const isStageCompleted = orderData?.stages?.[currentStage] === "completed";
    const isCompleted = isStageCompleted && !amendMode;

    const renderCommissionLineCard = (line) => {
        const capacity = orderData?.capacity ?? "-";
        const typeLabel =
            WORK_TYPE_LABELS[line.work_type] || WORK_ROLE_LABELS[line.role] || line.role;
        const isPayableEdited = !!payableEditedByRole[line.role];
        return (
            <Box
                sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    p: 1,
                    height: "100%",
                }}
            >
                <Typography variant="body2" fontWeight={600} sx={{ mb: 0.25 }}>
                    {assigneeNameForLine(line)}{" "}
                    <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        fontWeight={400}
                    >
                        · {typeLabel}
                    </Typography>
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                    {capacity} kW × {fmtMoney(line.per_kw)} /kW = ₹{fmtMoney(line.calculated_amount)}
                </Typography>
                {isCompleted || isReadOnly ? (
                    <Typography variant="body2">
                        Payable: ₹{fmtMoney(line.payable ?? line.calculated_amount)}
                    </Typography>
                ) : (
                    <>
                        <Input
                            name={`payable_${line.role}`}
                            type="number"
                            size="small"
                            label="Payable (₹)"
                            value={line.payable ?? ""}
                            onChange={(e) => handlePayableChange(line.role, e.target.value)}
                            error={!!fieldErrors[`payable_${line.role}`]}
                            helperText={
                                fieldErrors[`payable_${line.role}`] ||
                                "Same as calculated unless you change it"
                            }
                            inputProps={{ min: 0, step: "any" }}
                            fullWidth
                        />
                        {isPayableEdited && (
                            <Button
                                type="button"
                                variant="link"
                                size="sm"
                                className="mt-0.5 h-auto px-0 py-0 text-xs"
                                onClick={() => resetPayableToCalculated(line.role)}
                            >
                                Reset to calculated
                            </Button>
                        )}
                    </>
                )}
            </Box>
        );
    };

    if (managerCheckLoading) {
        return (
            <Box className="p-4">
                <p className="text-sm text-muted-foreground">Checking permissions…</p>
            </Box>
        );
    }

    if (!isReadOnly && !canAssign && !amendMode) {
        return (
            <Box className="p-4">
                <Alert severity="warning" sx={{ mt: 1 }}>
                    {managerCheckError ||
                        "Only warehouse managers of the planned warehouse (selected in the Planner step) can assign fabricator and installer. You are not assigned as a manager for this order's warehouse. Please contact your administrator if you need access."}
                </Alert>
            </Box>
        );
    }

    return (
        <Box component="form" onSubmit={handleSubmit} onKeyDown={preventEnterSubmit} className="p-4">
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
                            asyncLoadOptions={loadUserOptions}
                            referenceModel="user.model"
                            getOptionLabel={(option) => option?.name || option?.username || option?.label || (option?.id ? `User #${option.id}` : "")}
                            value={selectedFabricatorInstaller}
                            onChange={(event, newValue) => {
                                clearPayableEdits();
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
                            asyncLoadOptions={loadUserOptions}
                            referenceModel="user.model"
                            getOptionLabel={(option) => option?.name || option?.username || option?.label || (option?.id ? `User #${option.id}` : "")}
                            value={selectedFabricator}
                            onChange={(event, newValue) => {
                                clearPayableEdits();
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
                            asyncLoadOptions={loadUserOptions}
                            referenceModel="user.model"
                            getOptionLabel={(option) => option?.name || option?.username || option?.label || (option?.id ? `User #${option.id}` : "")}
                            value={selectedInstaller}
                            onChange={(event, newValue) => {
                                clearPayableEdits();
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

            {(canPreviewCommission() || commissionLines.length > 0) && (
                <FormSection
                    title={
                        <span className="inline-flex items-center gap-2">
                            Work commission
                            {commissionLoading && <CircularProgress size={14} />}
                        </span>
                    }
                    className="mt-3"
                >
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                        Capacity {orderData?.capacity ?? "-"} kW (commission master rates). Posted to Pending
                        commission when net meter is installed.
                    </Typography>
                    {commissionError && (
                        <Alert severity="warning" sx={{ mb: 1 }}>
                            {commissionError}
                        </Alert>
                    )}
                    {!commissionLoading && commissionLines.length > 0 && (
                        <Grid container spacing={COMPACT_FORM_SPACING}>
                            {commissionLines.map((line) => (
                                <Grid
                                    key={line.role}
                                    size={{
                                        xs: 12,
                                        sm: commissionLines.length > 1 ? 6 : 12,
                                        md: commissionLines.length > 1 ? 6 : 8,
                                    }}
                                >
                                    {renderCommissionLineCard(line)}
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </FormSection>
            )}

            <div className="mt-4 flex flex-col gap-2">
                {error && <Alert severity="error">{error}</Alert>}
                {successMsg && <Alert severity="success">{successMsg}</Alert>}
                <Button
                    type="submit"
                    size="sm"
                    className="w-auto self-start"
                    loading={submitting}
                    disabled={isCompleted || isReadOnly}
                >
                    {isStageCompleted ? "Update" : "Save"}
                </Button>
            </div>
        </Box>
    );
}
