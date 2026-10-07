"use client";

import { useEffect, useState } from "react";
import { Alert } from "@mui/material";
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
import orderService from "@/services/orderService";
import orderDocumentsService from "@/services/orderDocumentsService";
import documentAuditService from "@/services/documentAuditService";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import AutocompleteField from "@/components/common/AutocompleteField";
import { toastError, toastSuccess } from "@/utils/toast";
import { useAuth } from "@/hooks/useAuth";
import { isRoleAllowed } from "@/lib/platformRoleAccess";

/** Labels + legacy store codes (same aliases as API orderPendingKyc.js). */
const REQUIRED_GROUPS = [
  {
    label: "Aadhaar",
    types: ["Aadhar Card", "Aadhaar Card", "aadhar_card", "aadhaar_card", "aadhar card", "aadhaar card"],
  },
  {
    label: "Electricity Bill",
    types: ["Electricity Bill", "electricity_bill", "electricity bill"],
  },
  {
    label: "Cancelled Cheque",
    types: ["Cancelled Cheque", "cancelled_cheque", "cancelled cheque"],
  },
];

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

const parseApprovalRequired = (value) => {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (["true", "yes", "y"].includes(s)) return true;
    if (["false", "no", "n"].includes(s)) return false;
  }
  return Boolean(value);
};

/** Document Master approval_required for any alias in types[]; default false if no master row. */
const groupRequiresApproval = (types, documentTypes = []) => {
  const wanted = new Set((types || []).map(normalizeDocType));
  for (const row of documentTypes || []) {
    const key = normalizeDocType(row?.type || row?.label || row?.key);
    if (!key || !wanted.has(key)) continue;
    if (parseApprovalRequired(row?.approval_required)) return true;
  }
  return false;
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

const findDoc = (docs, types) => {
  const wanted = new Set(types.map(normalizeDocType));
  return docs.find((d) => wanted.has(normalizeDocType(d.doc_type || d.type)));
};

const docStatusForBadge = (doc, needsApproval) => {
  if (!doc?.id) return "missing";
  const status = String(doc.validation_status || "").trim().toLowerCase();
  if (status === "rejected") return "rejected";
  if (status === "approved") return "approved";
  if (!needsApproval) return "attached";
  if (!status || status === "pending") return "pending";
  return status;
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

export function LkycPanel({
  order,
  orderId,
  onSaved,
  onPassed,
  docsRefreshKey = 0,
  orderDocumentTypes = [],
}) {
  const { user } = useAuth();
  const canAmend = isRoleAllowed(user?.role?.name || user?.role_name, "SuperAdmin");
  const passed = String(order?.l_kyc_status || "pending") === "passed";
  const [amendMode, setAmendMode] = useState(false);
  const editable = !passed || (canAmend && amendMode);

  const [docs, setDocs] = useState([]);
  const [form, setForm] = useState({
    aadhaar_name: order?.aadhaar_name || "",
    electricity_bill_name: order?.electricity_bill_name || "",
    bank_account_holder_name: order?.bank_account_holder_name || "",
    name_match_result: order?.name_match_result || "",
    l_kyc_remarks: order?.l_kyc_remarks || "",
  });
  const [reason, setReason] = useState(null);
  const [busy, setBusy] = useState(false);
  const [failOpen, setFailOpen] = useState(false);

  useEffect(() => {
    setForm({
      aadhaar_name: order?.aadhaar_name || "",
      electricity_bill_name: order?.electricity_bill_name || "",
      bank_account_holder_name: order?.bank_account_holder_name || "",
      name_match_result: order?.name_match_result || "",
      l_kyc_remarks: order?.l_kyc_remarks || "",
    });
    setAmendMode(false);
  }, [
    order?.l_kyc_status,
    order?.aadhaar_name,
    order?.electricity_bill_name,
    order?.bank_account_holder_name,
    order?.name_match_result,
    order?.l_kyc_remarks,
  ]);

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

  return (
    <div className="flex flex-col gap-2 p-1">
      <p className="text-xs text-slate-500">
        Required: Aadhaar, Electricity Bill, Cancelled Cheque attached (approved when Document Master requires approval), and names matched.
      </p>
      {passed && !editable ? (
        <p className="text-xs text-slate-600">
          L-KYC Passed — read-only{canAmend ? "" : ". Contact SuperAdmin to amend."}
        </p>
      ) : null}
      {REQUIRED_GROUPS.map((group) => {
        const doc = findDoc(docs, group.types);
        const needsApproval = groupRequiresApproval(group.types, orderDocumentTypes);
        const badge = docStatusForBadge(doc, needsApproval);
        return (
          <div key={group.label} className="flex flex-wrap items-end gap-2">
            <span className="min-w-[140px] pb-2 text-sm text-slate-700">{group.label}</span>
            <span className="pb-2"><StatusBadge status={badge} /></span>
            {doc?.id ? (
              needsApproval && editable ? (
                <>
                  <Button type="button" size="sm" variant="outline" disabled={busy} onClick={async () => {
                    try {
                      await documentAuditService.approveDocument(doc.id, "L-KYC verified");
                      toastSuccess("Document approved");
                      loadDocs();
                      onSaved?.();
                    } catch (err) {
                      toastError(err?.response?.data?.message || "Approve failed");
                    }
                  }}>Verify</Button>
                  <div className="min-w-[180px] flex-1">
                    <AutocompleteField
                      name={`reject-${group.label}`}
                      label="Reject reason"
                      asyncLoadOptions={(q) => getReferenceOptionsSearch("reason.model", { q, limit: 20, reason_type: "document_rejection", is_active: "true" })}
                      getOptionLabel={(o) => o?.reason || o?.name || ""}
                      value={reason}
                      onChange={(_e, value) => setReason(value)}
                    />
                  </div>
                  <Button type="button" size="sm" variant="destructive" disabled={busy || !reason?.id} onClick={async () => {
                    try {
                      await documentAuditService.rejectDocument(doc.id, reason.id, "L-KYC rejected");
                      toastSuccess("Document rejected");
                      loadDocs();
                      onSaved?.();
                    } catch (err) {
                      toastError(err?.response?.data?.message || "Reject failed");
                    }
                  }}>Reject</Button>
                </>
              ) : needsApproval ? null : (
                <span className="pb-2 text-xs text-slate-500">No approval required</span>
              )
            ) : <span className="pb-2 text-xs text-slate-500">Not uploaded</span>}
          </div>
        );
      })}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <Input required disabled={!editable} label="Aadhaar name" value={form.aadhaar_name} onChange={(e) => setForm({ ...form, aadhaar_name: e.target.value })} />
        <Input required disabled={!editable} label="Electricity bill name" value={form.electricity_bill_name} onChange={(e) => setForm({ ...form, electricity_bill_name: e.target.value })} />
        <Input required disabled={!editable} label="Bank account holder" value={form.bank_account_holder_name} onChange={(e) => setForm({ ...form, bank_account_holder_name: e.target.value })} />
      </div>
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
      <div className="flex flex-wrap gap-2">
        {editable ? (
          <>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => save("save")}>Save</Button>
            {!passed ? (
              <Button type="button" size="sm" variant="default" disabled={busy} onClick={() => save("pass")}>Pass L-KYC</Button>
            ) : null}
            <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => setFailOpen(true)}>Fail</Button>
            {passed && canAmend ? (
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setAmendMode(false)}>Cancel amend</Button>
            ) : null}
          </>
        ) : passed && canAmend ? (
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
    </div>
  );
}

export function TkycPanel({ order, orderId, onSaved, onPassed }) {
  const { user } = useAuth();
  const canAmend = isRoleAllowed(user?.role?.name || user?.role_name, "SuperAdmin");
  const lPassed = String(order?.l_kyc_status || "pending") === "passed";
  const passed = String(order?.t_kyc_status || "pending") === "passed";
  const [amendMode, setAmendMode] = useState(false);
  const editable = !passed || (canAmend && amendMode);
  const [form, setForm] = useState({
    sanctioned_load_kw: order?.sanctioned_load_kw ?? order?.demand_load ?? "",
    t_kyc_remarks: order?.t_kyc_remarks || "",
  });
  const [busy, setBusy] = useState(false);
  const [failOpen, setFailOpen] = useState(false);

  useEffect(() => {
    setForm({
      sanctioned_load_kw: order?.sanctioned_load_kw ?? order?.demand_load ?? "",
      t_kyc_remarks: order?.t_kyc_remarks || "",
    });
    setAmendMode(false);
  }, [order?.t_kyc_status, order?.sanctioned_load_kw, order?.demand_load, order?.t_kyc_remarks]);

  const save = async (action) => {
    if (action === "pass" || action === "load_enhancement") {
      if (form.sanctioned_load_kw === "" || form.sanctioned_load_kw == null || Number.isNaN(Number(form.sanctioned_load_kw))) {
        toastError("Sanctioned load (kW) is required");
        return;
      }
    }
    if (action === "load_enhancement" && !String(form.t_kyc_remarks || "").trim()) {
      toastError("Load enhancement remarks are required");
      return;
    }
    setBusy(true);
    try {
      await orderService.updateOrderKyc(orderId, { stage: "t_kyc", action, ...form });
      toastSuccess(action === "pass" ? "T-KYC passed" : "T-KYC updated");
      setAmendMode(false);
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
  return (
    <div className="flex max-w-lg flex-col gap-2 p-1">
      <p className="text-xs text-slate-500">Proposed capacity: {order?.capacity ?? "-"} kW. Pass only when sanctioned load is at least this capacity.</p>
      {passed && !editable ? (
        <p className="text-xs text-slate-600">
          T-KYC Passed — read-only{canAmend ? "" : ". Contact SuperAdmin to amend."}
        </p>
      ) : null}
      <Input required disabled={!editable} label="Sanctioned load (kW)" type="number" value={form.sanctioned_load_kw} onChange={(e) => setForm({ ...form, sanctioned_load_kw: e.target.value })} />
      <Input disabled={!editable} label="Technical remarks" value={form.t_kyc_remarks} onChange={(e) => setForm({ ...form, t_kyc_remarks: e.target.value })} />
      <div className="flex flex-wrap gap-2">
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
            {passed && canAmend ? (
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setAmendMode(false)}>Cancel amend</Button>
            ) : null}
          </>
        ) : passed && canAmend ? (
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
    <div className="mt-2 border-t border-slate-200 pt-2">
      <p className="mb-1 text-sm font-semibold text-slate-800">Queries</p>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
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
      <Button type="button" size="sm" variant="outline" className="mt-2" onClick={raise}>Raise Query</Button>
      {rows.map((row) => (
        <div key={row.id} className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={row.status} />
          <span className="text-xs text-slate-500">{row.query_type} · {row.assign_team || "unassigned"} · blocks {row.blocks_stage}</span>
          <span className="text-sm text-slate-800">{row.description}</span>
          {row.status !== "closed" && row.status !== "resolved" ? (
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => act(row.id, "start")}>Start</Button>
              <div className="min-w-[160px] flex-1">
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
