"use client";

import { useEffect, useState } from "react";
import { Alert, Tooltip } from "@mui/material";
import { IconCheck, IconX } from "@tabler/icons-react";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import orderService from "@/services/orderService";
import orderDocumentsService from "@/services/orderDocumentsService";
import documentAuditService from "@/services/documentAuditService";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import AutocompleteField from "@/components/common/AutocompleteField";
import { toastError, toastSuccess } from "@/utils/toast";
import { useAuth } from "@/hooks/useAuth";
import { isRoleAllowed } from "@/lib/platformRoleAccess";

const TEAMS = ["Liaison Team", "Technical Team", "Documentation Team", "Accounts Team", "Other"];
const QUERY_TYPES = [
  ["document_mismatch", "Document mismatch"],
  ["name_mismatch", "Name mismatch"],
  ["missing_document", "Missing document"],
  ["invalid_document", "Invalid document"],
  ["consumer_number", "Consumer number"],
  ["insufficient_load", "Insufficient load"],
  ["load_enhancement", "Load enhancement"],
  ["application_info", "Application info"],
  ["other", "Other"],
];

const normalizeDocType = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const statusVariant = (status) => {
  const s = String(status || "pending");
  if (s === "passed" || s === "closed" || s === "approved" || s === "available" || s === "attached") {
    return "success";
  }
  if (s === "failed" || s === "reopened" || s === "rejected" || s === "missing") return "destructive";
  if (s === "locked") return "accent";
  return "secondary";
};

const StatusBadge = ({ status }) => {
  const label = String(status || "pending").replaceAll("_", " ");
  return <Badge variant={statusVariant(status)}>{label}</Badge>;
};

export function PendingStageStrip({ order }) {
  if (!order) return null;
  const l = order.l_kyc_status || "pending";
  const t = order.t_kyc_status || "pending";
  const regLocked = l !== "passed" || t !== "passed";
  return (
    <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
      <span>L-KYC</span>
      <StatusBadge status={l} />
      <span>T-KYC</span>
      <StatusBadge status={t === "pending" && l !== "passed" ? "locked" : t} />
      <span>Registration</span>
      <StatusBadge status={regLocked ? "locked" : "available"} />
      {order.has_active_query ? <Badge variant="destructive">QUERY Active</Badge> : null}
    </div>
  );
}

const findDocByType = (docs, typeLabel) => {
  const wanted = normalizeDocType(typeLabel);
  return (docs || []).find((d) => normalizeDocType(d.doc_type || d.type) === wanted);
};

/** L-KYC always requires Verify (approved); attachment alone is not enough. */
const lkycDocStatusForBadge = (doc) => {
  if (!doc?.id) return "missing";
  const status = String(doc.validation_status || "").trim().toLowerCase();
  if (status === "rejected") return "rejected";
  if (status === "approved") return "approved";
  if (!status || status === "pending") return "pending";
  return status || "pending";
};

const STAGE_LABELS = { l_kyc: "L-KYC", t_kyc: "T-KYC", registration: "Registration" };

function FailAndRaiseQueryDialog({
  open,
  onOpenChange,
  orderId,
  stage,
  kycPayload = {},
  onSuccess,
}) {
  const [form, setForm] = useState({
    query_type: "other",
    description: "",
    priority: "normal",
    assign_team: "Liaison Team",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        query_type: "other",
        description: "",
        priority: "normal",
        assign_team: "Liaison Team",
      });
    }
  }, [open, stage]);

  const submit = async () => {
    const description = String(form.description || "").trim();
    if (!description) {
      toastError("Query description is required");
      return;
    }
    setBusy(true);
    try {
      const remarksKey = stage === "t_kyc" ? "t_kyc_remarks" : "l_kyc_remarks";
      await orderService.updateOrderKyc(orderId, {
        stage,
        action: "fail",
        ...kycPayload,
        [remarksKey]: description,
        query: {
          query_type: form.query_type,
          description,
          priority: form.priority,
          assign_team: form.assign_team,
          blocks_stage: stage,
        },
      });
      toastSuccess(`${STAGE_LABELS[stage] || stage} failed — query raised`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || "Fail & raise query failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fail & raise query</DialogTitle>
        </DialogHeader>
        <p className="mb-1 text-xs text-slate-500">
          Marks {STAGE_LABELS[stage] || stage} as Failed and opens a blocking query for that stage.
        </p>
        <div className="flex flex-col gap-2">
          <Select
            name="fail_query_type"
            label="Type"
            value={form.query_type}
            onChange={(e) => setForm({ ...form, query_type: e.target.value })}
          >
            {QUERY_TYPES.map(([value, label]) => (
              <MenuItem key={value} value={value}>{label}</MenuItem>
            ))}
          </Select>
          <Input
            required
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Select
            name="fail_priority"
            label="Priority"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="normal">Normal</MenuItem>
            <MenuItem value="high">High</MenuItem>
          </Select>
          <Select
            name="fail_assign_team"
            label="Assign team"
            value={form.assign_team}
            onChange={(e) => setForm({ ...form, assign_team: e.target.value })}
          >
            {TEAMS.map((team) => (
              <MenuItem key={team} value={team}>{team}</MenuItem>
            ))}
          </Select>
          <Input label="Blocks" value={STAGE_LABELS[stage] || stage} disabled />
        </div>
        <DialogFooter className="pt-3">
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={submit}>
            Fail & raise query
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Empty KYC name → seed from order party (customer_name); keep stored values when set. */
const seedLkycNameFromParty = (stored, order) => {
  const existing = String(stored || "").trim();
  if (existing) return existing;
  return String(order?.customer_name || "").trim();
};

const formatKycPassedAudit = ({ at, byName, byId }) => {
  if (!at && !byName && !byId) return null;
  const who = byName || (byId != null ? `User #${byId}` : "Unknown");
  const when = at ? new Date(at).toLocaleString() : "-";
  return `Passed by ${who} on ${when}`;
};

const isSanctionedLoadBelowCapacity = (sanctionedLoadKw, capacityKw) => {
  const load = Number(sanctionedLoadKw);
  const capacity = Number(capacityKw);
  if (!Number.isFinite(load) || !Number.isFinite(capacity)) return false;
  return !(load + 1e-9 >= capacity);
};

const buildLkycFormFromOrder = (order) => ({
  aadhaar_name: seedLkycNameFromParty(order?.aadhaar_name, order),
  electricity_bill_name: seedLkycNameFromParty(order?.electricity_bill_name, order),
  bank_account_holder_name: seedLkycNameFromParty(order?.bank_account_holder_name, order),
  name_match_result: order?.name_match_result || "",
  l_kyc_remarks: order?.l_kyc_remarks || "",
});

export function LkycPanel({
  order,
  orderId,
  onSaved,
  onPassed,
  docsRefreshKey = 0,
  canPerformKyc = true,
}) {
  const { user } = useAuth();
  const canAmend = isRoleAllowed(user?.role?.name || user?.role_name, "SuperAdmin");
  const passed = String(order?.l_kyc_status || "pending") === "passed";
  const [amendMode, setAmendMode] = useState(false);
  const editable = canPerformKyc && (!passed || (canAmend && amendMode));

  const [docs, setDocs] = useState([]);
  const [requiredTypes, setRequiredTypes] = useState([]);
  const [form, setForm] = useState(() => buildLkycFormFromOrder(order));
  const [busy, setBusy] = useState(false);
  const [failOpen, setFailOpen] = useState(false);
  const [rejectDialog, setRejectDialog] = useState({
    open: false,
    docId: null,
    reasonId: null,
    reasonLabel: "",
  });

  useEffect(() => {
    setForm(buildLkycFormFromOrder(order));
    setAmendMode(false);
  }, [
    order?.l_kyc_status,
    order?.aadhaar_name,
    order?.electricity_bill_name,
    order?.bank_account_holder_name,
    order?.customer_name,
    order?.name_match_result,
    order?.l_kyc_remarks,
  ]);

  useEffect(() => {
    let cancelled = false;
    orderDocumentsService.getOrderFormConfig()
      .then((res) => {
        const list = res?.result ?? res?.data ?? res;
        const rows = Array.isArray(list) ? list : [];
        if (!cancelled) {
          setRequiredTypes(rows.filter((row) => row?.required === true));
        }
      })
      .catch(() => {
        if (!cancelled) setRequiredTypes([]);
      });
    return () => { cancelled = true; };
  }, []);

  const loadDocs = () => {
    if (!orderId) {
      setDocs([]);
      return;
    }
    orderDocumentsService.getOrderDocuments({ order_id: orderId, limit: 100 }).then((res) => {
      const payload = res?.result ?? res?.data ?? res;
      const rows = Array.isArray(payload) ? payload : (payload?.data || []);
      setDocs(Array.isArray(rows) ? rows : []);
    }).catch(() => setDocs([]));
  };
  useEffect(() => { loadDocs(); }, [orderId, docsRefreshKey]);

  const unverifiedLabels = requiredTypes
    .filter((slot) => {
      const label = slot.label || slot.key;
      const doc = findDocByType(docs, label);
      return lkycDocStatusForBadge(doc) !== "approved";
    })
    .map((slot) => slot.label || slot.key);

  const closeRejectDialog = () => {
    setRejectDialog({ open: false, docId: null, reasonId: null, reasonLabel: "" });
  };

  const confirmReject = async () => {
    if (!rejectDialog.docId || !rejectDialog.reasonId) return;
    setBusy(true);
    try {
      await documentAuditService.rejectDocument(
        rejectDialog.docId,
        rejectDialog.reasonId,
        "L-KYC rejected"
      );
      toastSuccess("Document rejected");
      closeRejectDialog();
      loadDocs();
      onSaved?.();
    } catch (err) {
      toastError(err?.response?.data?.message || "Reject failed");
    } finally {
      setBusy(false);
    }
  };

  const save = async (action) => {
    if (action === "pass") {
      if (!String(form.aadhaar_name || "").trim()
        || !String(form.electricity_bill_name || "").trim()
        || !String(form.bank_account_holder_name || "").trim()) {
        toastError("Fill Aadhaar name, Electricity bill name, and Bank account holder before Pass");
        return;
      }
      if (String(form.name_match_result || "") !== "matched") {
        toastError("Name verification must be Matched before L-KYC can pass");
        return;
      }
      if (unverifiedLabels.length) {
        toastError(`Attach or verify required documents first: ${unverifiedLabels.join(", ")}`);
        return;
      }
    }
    setBusy(true);
    try {
      await orderService.updateOrderKyc(orderId, { stage: "l_kyc", action, ...form });
      toastSuccess(action === "pass" ? "L-KYC passed" : "L-KYC saved");
      setAmendMode(false);
      if (action === "pass") {
        await onPassed?.();
      } else {
        onSaved?.();
      }
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || "L-KYC update failed");
    } finally {
      setBusy(false);
    }
  };

  const viewDoc = async (docId) => {
    try {
      const url = await orderDocumentsService.getDocumentUrl(docId);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else toastError("Document URL not available");
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to open document");
    }
  };

  const lKycAudit = formatKycPassedAudit({
    at: order?.l_kyc_passed_at,
    byName: order?.l_kyc_passed_by_name,
    byId: order?.l_kyc_passed_by,
  });

  return (
    <div className="flex flex-col gap-1.5 p-1">
      <p className="text-xs text-slate-500">
        Document Master required types — View and Verify each; Pass when all approved and names matched.
      </p>
      {!canPerformKyc ? (
        <p className="text-xs text-amber-700">
          Only assigned KYC users can edit. You can view this stage.
        </p>
      ) : null}
      {passed ? (
        <div className="flex flex-col gap-0.5 text-xs text-slate-600">
          {!editable ? (
            <p>
              L-KYC Passed — read-only
              {!canPerformKyc
                ? "."
                : canAmend
                  ? ""
                  : ". Contact SuperAdmin to amend."}
            </p>
          ) : null}
          {lKycAudit ? <p className="text-slate-500">{lKycAudit}</p> : null}
        </div>
      ) : null}
      {requiredTypes.length === 0 ? (
        <p className="text-xs text-amber-700">No required order-form document types configured in Document Master.</p>
      ) : null}
      {requiredTypes.map((slot) => {
        const label = slot.label || slot.key;
        const doc = findDocByType(docs, label);
        const badge = lkycDocStatusForBadge(doc);
        const approved = badge === "approved";
        return (
          <div key={slot.id || label} className="flex flex-wrap items-center gap-1.5">
            <span className="min-w-[120px] text-xs font-medium text-slate-700">{label}</span>
            <StatusBadge status={badge} />
            {doc?.id ? (
              <div className="flex flex-nowrap items-center gap-0.5">
                <Tooltip title="View Document" arrow placement="top">
                  <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => viewDoc(doc.id)}>
                    View
                  </Button>
                </Tooltip>
                {editable && !approved ? (
                  <>
                    <Tooltip title="Verify" arrow placement="top">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="success"
                        disabled={busy}
                        onClick={async () => {
                          try {
                            await documentAuditService.approveDocument(doc.id, "L-KYC verified");
                            toastSuccess("Document verified");
                            loadDocs();
                            onSaved?.();
                          } catch (err) {
                            toastError(err?.response?.data?.message || "Verify failed");
                          }
                        }}
                      >
                        <IconCheck className="size-4" />
                      </Button>
                    </Tooltip>
                    <Tooltip title="Reject" arrow placement="top">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        disabled={busy}
                        className="border-destructive/40 text-destructive hover:bg-destructive/5"
                        onClick={() => setRejectDialog({
                          open: true,
                          docId: doc.id,
                          reasonId: null,
                          reasonLabel: "",
                        })}
                      >
                        <IconX className="size-4" />
                      </Button>
                    </Tooltip>
                  </>
                ) : null}
              </div>
            ) : (
              <span className="text-xs text-slate-500">Not uploaded</span>
            )}
          </div>
        );
      })}
      <div className="grid grid-cols-1 gap-1.5 md:grid-cols-3">
        <Input required disabled={!editable} label="Aadhaar name" value={form.aadhaar_name} onChange={(e) => setForm({ ...form, aadhaar_name: e.target.value })} />
        <Input required disabled={!editable} label="Electricity bill name" value={form.electricity_bill_name} onChange={(e) => setForm({ ...form, electricity_bill_name: e.target.value })} />
        <Input required disabled={!editable} label="Bank account holder" value={form.bank_account_holder_name} onChange={(e) => setForm({ ...form, bank_account_holder_name: e.target.value })} />
      </div>
      <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
        <Select
          name="name_match_result"
          label="Name result"
          required
          disabled={!editable}
          value={form.name_match_result}
          onChange={(e) => setForm({ ...form, name_match_result: e.target.value })}
        >
          <MenuItem value="matched">Matched</MenuItem>
          <MenuItem value="mismatch">Mismatch</MenuItem>
          <MenuItem value="requires_clarification">Requires clarification</MenuItem>
        </Select>
        <Input disabled={!editable} label="Remarks" value={form.l_kyc_remarks} onChange={(e) => setForm({ ...form, l_kyc_remarks: e.target.value })} />
      </div>
      <div className="flex flex-wrap gap-1">
        {editable ? (
          <>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => save("save")}>Save</Button>
            {!passed ? (
              <Button type="button" size="sm" variant="default" disabled={busy} onClick={() => save("pass")}>Pass L-KYC</Button>
            ) : null}
            <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => setFailOpen(true)}>Fail</Button>
            {passed && canAmend && canPerformKyc ? (
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setAmendMode(false)}>Cancel amend</Button>
            ) : null}
          </>
        ) : passed && canAmend && canPerformKyc ? (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setAmendMode(true)}>Amend L-KYC</Button>
        ) : null}
      </div>
      <FailAndRaiseQueryDialog
        open={failOpen}
        onOpenChange={setFailOpen}
        orderId={orderId}
        stage="l_kyc"
        kycPayload={form}
        onSuccess={onSaved}
      />
      <Dialog open={rejectDialog.open} onOpenChange={(open) => !open && closeRejectDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
          </DialogHeader>
          <AutocompleteField
            name="document_rejection_reason"
            label="Rejection Reason"
            asyncLoadOptions={(q) => getReferenceOptionsSearch("reason.model", {
              q,
              limit: 20,
              reason_type: "document_rejection",
              is_active: "true",
            })}
            referenceModel="reason.model"
            getOptionLabel={(o) => o?.reason ?? o?.label ?? o?.name ?? ""}
            value={
              rejectDialog.reasonId
                ? { id: rejectDialog.reasonId, reason: rejectDialog.reasonLabel }
                : null
            }
            onChange={(_e, value) => setRejectDialog((prev) => ({
              ...prev,
              reasonId: value?.id ?? null,
              reasonLabel: value?.reason ?? value?.label ?? value?.name ?? "",
            }))}
            placeholder="Search reason..."
          />
          <DialogFooter className="pt-3">
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={closeRejectDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy || !rejectDialog.reasonId}
              onClick={confirmReject}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function TkycPanel({ order, orderId, onSaved, onPassed, canPerformKyc = true }) {
  const { user } = useAuth();
  const canAmend = isRoleAllowed(user?.role?.name || user?.role_name, "SuperAdmin");
  const lPassed = String(order?.l_kyc_status || "pending") === "passed";
  const passed = String(order?.t_kyc_status || "pending") === "passed";
  const [amendMode, setAmendMode] = useState(false);
  const editable = canPerformKyc && (!passed || (canAmend && amendMode));
  const [form, setForm] = useState({
    sanctioned_load_kw: order?.sanctioned_load_kw ?? order?.demand_load ?? "",
    t_kyc_remarks: order?.t_kyc_remarks || "",
  });
  const [busy, setBusy] = useState(false);
  const [failOpen, setFailOpen] = useState(false);
  const [confirmInsufficientOpen, setConfirmInsufficientOpen] = useState(false);

  useEffect(() => {
    setForm({
      sanctioned_load_kw: order?.sanctioned_load_kw ?? order?.demand_load ?? "",
      t_kyc_remarks: order?.t_kyc_remarks || "",
    });
    setAmendMode(false);
  }, [order?.t_kyc_status, order?.sanctioned_load_kw, order?.demand_load, order?.t_kyc_remarks]);

  const save = async (action, { confirmInsufficientLoad = false } = {}) => {
    if (action === "pass" || action === "load_enhancement") {
      if (form.sanctioned_load_kw === "" || form.sanctioned_load_kw == null || Number.isNaN(Number(form.sanctioned_load_kw))) {
        toastError("Sanctioned load (kW) is required");
        return;
      }
    }
    if (action === "pass" && !confirmInsufficientLoad
      && isSanctionedLoadBelowCapacity(form.sanctioned_load_kw, order?.capacity)) {
      setConfirmInsufficientOpen(true);
      return;
    }
    if (action === "load_enhancement" && !String(form.t_kyc_remarks || "").trim()) {
      toastError("Load enhancement remarks are required");
      return;
    }
    setBusy(true);
    try {
      const payload = { stage: "t_kyc", action, ...form };
      if (action === "pass" && confirmInsufficientLoad) {
        payload.confirm_insufficient_load = true;
      }
      await orderService.updateOrderKyc(orderId, payload);
      toastSuccess(action === "pass" ? "T-KYC passed" : "T-KYC updated");
      setAmendMode(false);
      setConfirmInsufficientOpen(false);
      if (action === "pass") {
        await onPassed?.();
      } else {
        onSaved?.();
      }
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || "T-KYC update failed");
    } finally {
      setBusy(false);
    }
  };
  if (!lPassed) return <Alert severity="info">T-KYC is locked until L-KYC is Passed.</Alert>;
  const tKycAudit = formatKycPassedAudit({
    at: order?.t_kyc_passed_at,
    byName: order?.t_kyc_passed_by_name,
    byId: order?.t_kyc_passed_by,
  });
  return (
    <div className="flex max-w-lg flex-col gap-1.5 p-1">
      <p className="text-xs text-slate-500">
        Proposed capacity: {order?.capacity ?? "-"} kW. If sanctioned load is below this capacity, Pass asks for confirmation. Load enhancement remains available.
      </p>
      {!canPerformKyc ? (
        <p className="text-xs text-amber-700">
          Only assigned KYC users can edit. You can view this stage.
        </p>
      ) : null}
      {passed ? (
        <div className="flex flex-col gap-0.5 text-xs text-slate-600">
          {!editable ? (
            <p>
              T-KYC Passed — read-only
              {!canPerformKyc
                ? "."
                : canAmend
                  ? ""
                  : ". Contact SuperAdmin to amend."}
            </p>
          ) : null}
          {tKycAudit ? <p className="text-slate-500">{tKycAudit}</p> : null}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        <Input required disabled={!editable} label="Sanctioned load (kW)" type="number" value={form.sanctioned_load_kw} onChange={(e) => setForm({ ...form, sanctioned_load_kw: e.target.value })} />
        <Input disabled={!editable} label="Technical remarks" value={form.t_kyc_remarks} onChange={(e) => setForm({ ...form, t_kyc_remarks: e.target.value })} />
      </div>
      <div className="flex flex-wrap gap-1">
        {editable ? (
          <>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => save("save")}>Save</Button>
            {!passed ? (
              <>
                <Button type="button" size="sm" variant="default" disabled={busy} onClick={() => save("pass")}>Pass T-KYC</Button>
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => save("load_enhancement")}>Load enhancement</Button>
              </>
            ) : null}
            <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => setFailOpen(true)}>Fail</Button>
            {passed && canAmend && canPerformKyc ? (
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setAmendMode(false)}>Cancel amend</Button>
            ) : null}
          </>
        ) : passed && canAmend && canPerformKyc ? (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setAmendMode(true)}>Amend T-KYC</Button>
        ) : null}
      </div>
      <FailAndRaiseQueryDialog
        open={failOpen}
        onOpenChange={setFailOpen}
        orderId={orderId}
        stage="t_kyc"
        kycPayload={form}
        onSuccess={onSaved}
      />
      <AlertDialog open={confirmInsufficientOpen} onOpenChange={setConfirmInsufficientOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sanctioned load below proposed capacity</AlertDialogTitle>
            <AlertDialogDescription>
              Sanctioned load ({form.sanctioned_load_kw} kW) is below proposed capacity ({order?.capacity ?? "-"} kW).
              Pass T-KYC anyway? You can also use Load enhancement instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                save("pass", { confirmInsufficientLoad: true });
              }}
            >
              Pass anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function OrderQueryPanel({ orderId, onChanged, refreshKey = 0 }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({
    query_type: "other",
    description: "",
    priority: "normal",
    assign_team: "Liaison Team",
    blocks_stage: "l_kyc",
    remarks: "",
  });
  const [resolution, setResolution] = useState("");

  const load = () => {
    if (!orderId) {
      setRows([]);
      return;
    }
    orderService.listOrderQueries(orderId).then((res) => {
      const list = res?.result || res?.data || [];
      setRows(Array.isArray(list) ? list : []);
    }).catch(() => setRows([]));
  };
  useEffect(() => { load(); }, [orderId, refreshKey]);

  const raise = async () => {
    try {
      await orderService.createOrderQuery(orderId, form);
      toastSuccess("Query raised");
      setForm({ ...form, description: "" });
      load();
      onChanged?.();
    } catch (err) {
      toastError(err?.response?.data?.message || "Could not raise query");
    }
  };

  const act = async (id, action, extra = {}) => {
    try {
      await orderService.transitionOrderQuery(id, { action, ...extra });
      toastSuccess("Query updated");
      load();
      onChanged?.();
    } catch (err) {
      toastError(err?.response?.data?.message || "Query update failed");
    }
  };

  return (
    <div className="mt-1.5 border-t border-slate-200 pt-1.5">
      <p className="mb-1 text-xs font-semibold text-slate-800">Queries</p>
      <div className="grid grid-cols-1 gap-1.5 md:grid-cols-5">
        <Select name="query_type" label="Type" value={form.query_type} onChange={(e) => setForm({ ...form, query_type: e.target.value })}>
          {QUERY_TYPES.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
        </Select>
        <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Select name="priority" label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
          <MenuItem value="low">Low</MenuItem>
          <MenuItem value="normal">Normal</MenuItem>
          <MenuItem value="high">High</MenuItem>
        </Select>
        <Select name="assign_team" label="Assign team" value={form.assign_team} onChange={(e) => setForm({ ...form, assign_team: e.target.value })}>
          {TEAMS.map((team) => <MenuItem key={team} value={team}>{team}</MenuItem>)}
        </Select>
        <Select name="blocks_stage" label="Blocks" value={form.blocks_stage} onChange={(e) => setForm({ ...form, blocks_stage: e.target.value })}>
          <MenuItem value="l_kyc">L-KYC</MenuItem>
          <MenuItem value="t_kyc">T-KYC</MenuItem>
          <MenuItem value="registration">Registration</MenuItem>
        </Select>
      </div>
      <Button type="button" size="sm" variant="outline" className="mt-1.5" onClick={raise}>Raise Query</Button>
      {rows.map((row) => (
        <div key={row.id} className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={row.status} />
          <span className="text-xs text-slate-500">{row.query_type} · {row.assign_team || "unassigned"} · blocks {row.blocks_stage}</span>
          <span className="text-xs text-slate-800">{row.description}</span>
          {row.status !== "closed" && row.status !== "resolved" ? (
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => act(row.id, "start")}>Start</Button>
              <div className="min-w-[140px] max-w-[220px] flex-1">
                <Input label="Resolution" value={resolution} onChange={(e) => setResolution(e.target.value)} />
              </div>
              <Button type="button" size="sm" variant="default" onClick={() => act(row.id, "resolve", { resolution })}>Resolve</Button>
            </>
          ) : null}
          {row.status === "resolved" ? (
            <>
              <Button type="button" size="sm" variant="default" onClick={() => act(row.id, "close")}>Close</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => act(row.id, "reopen")}>Reopen</Button>
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}
