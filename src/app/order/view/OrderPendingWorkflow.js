"use client";

import { useEffect, useState } from "react";
import { Alert } from "@mui/material";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import orderService from "@/services/orderService";
import orderDocumentsService from "@/services/orderDocumentsService";
import documentAuditService from "@/services/documentAuditService";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import AutocompleteField from "@/components/common/AutocompleteField";
import { toastError, toastSuccess } from "@/utils/toast";

const REQUIRED_GROUPS = [
  { label: "Aadhaar", types: ["Aadhar Card", "Aadhaar Card"] },
  { label: "Electricity Bill", types: ["Electricity Bill"] },
  { label: "Cancelled Cheque", types: ["Cancelled Cheque"] },
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

const statusVariant = (status) => {
  const s = String(status || "pending");
  if (s === "passed" || s === "closed" || s === "approved" || s === "available") return "success";
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

const findDoc = (docs, types) =>
  docs.find((d) => types.some((t) => String(d.doc_type || "").toLowerCase() === t.toLowerCase()));

export function LkycPanel({ order, orderId, onSaved }) {
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

  const loadDocs = () => {
    orderDocumentsService.getOrderDocuments({ order_id: orderId, limit: 100 }).then((res) => {
      const payload = res?.result ?? res?.data ?? res;
      const rows = Array.isArray(payload) ? payload : (payload?.data || []);
      setDocs(Array.isArray(rows) ? rows : []);
    }).catch(() => setDocs([]));
  };
  useEffect(() => { loadDocs(); }, [orderId]);

  const save = async (action) => {
    setBusy(true);
    try {
      await orderService.updateOrderKyc(orderId, { stage: "l_kyc", action, ...form });
      toastSuccess(action === "pass" ? "L-KYC passed" : action === "fail" ? "L-KYC failed" : "L-KYC saved");
      onSaved?.();
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || "L-KYC update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-1">
      <p className="text-xs text-slate-500">
        Required: Aadhaar, Electricity Bill, Cancelled Cheque approved, and names matched.
      </p>
      {REQUIRED_GROUPS.map((group) => {
        const doc = findDoc(docs, group.types);
        return (
          <div key={group.label} className="flex flex-wrap items-end gap-2">
            <span className="min-w-[140px] pb-2 text-sm text-slate-700">{group.label}</span>
            <span className="pb-2"><StatusBadge status={doc?.validation_status || "missing"} /></span>
            {doc?.id ? (
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
            ) : <span className="pb-2 text-xs text-slate-500">Not uploaded</span>}
          </div>
        );
      })}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <Input label="Aadhaar name" value={form.aadhaar_name} onChange={(e) => setForm({ ...form, aadhaar_name: e.target.value })} />
        <Input label="Electricity bill name" value={form.electricity_bill_name} onChange={(e) => setForm({ ...form, electricity_bill_name: e.target.value })} />
        <Input label="Bank account holder" value={form.bank_account_holder_name} onChange={(e) => setForm({ ...form, bank_account_holder_name: e.target.value })} />
      </div>
      <Select
        name="name_match_result"
        label="Name result"
        value={form.name_match_result}
        onChange={(e) => setForm({ ...form, name_match_result: e.target.value })}
      >
        <MenuItem value="matched">Matched</MenuItem>
        <MenuItem value="mismatch">Mismatch</MenuItem>
        <MenuItem value="requires_clarification">Requires clarification</MenuItem>
      </Select>
      <Input label="Remarks" value={form.l_kyc_remarks} onChange={(e) => setForm({ ...form, l_kyc_remarks: e.target.value })} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => save("save")}>Save</Button>
        <Button type="button" size="sm" variant="default" disabled={busy} onClick={() => save("pass")}>Pass L-KYC</Button>
        <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => save("fail")}>Fail</Button>
      </div>
    </div>
  );
}

export function TkycPanel({ order, orderId, onSaved }) {
  const locked = (order?.l_kyc_status || "pending") !== "passed";
  const [form, setForm] = useState({
    sanctioned_load_kw: order?.sanctioned_load_kw ?? order?.demand_load ?? "",
    t_kyc_remarks: order?.t_kyc_remarks || "",
  });
  const [busy, setBusy] = useState(false);
  const save = async (action) => {
    setBusy(true);
    try {
      await orderService.updateOrderKyc(orderId, { stage: "t_kyc", action, ...form });
      toastSuccess("T-KYC updated");
      onSaved?.();
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || "T-KYC update failed");
    } finally {
      setBusy(false);
    }
  };
  if (locked) return <Alert severity="info">T-KYC is locked until L-KYC is Passed.</Alert>;
  return (
    <div className="flex max-w-lg flex-col gap-2 p-1">
      <p className="text-xs text-slate-500">Proposed capacity: {order?.capacity ?? "-"} kW. Pass only when sanctioned load is at least this capacity.</p>
      <Input label="Sanctioned load (kW)" type="number" value={form.sanctioned_load_kw} onChange={(e) => setForm({ ...form, sanctioned_load_kw: e.target.value })} />
      <Input label="Technical remarks" value={form.t_kyc_remarks} onChange={(e) => setForm({ ...form, t_kyc_remarks: e.target.value })} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => save("save")}>Save</Button>
        <Button type="button" size="sm" variant="default" disabled={busy} onClick={() => save("pass")}>Pass T-KYC</Button>
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => save("load_enhancement")}>Load enhancement</Button>
        <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => save("fail")}>Fail</Button>
      </div>
    </div>
  );
}

export function OrderQueryPanel({ orderId, onChanged }) {
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
    orderService.listOrderQueries(orderId).then((res) => {
      const list = res?.result || res?.data || [];
      setRows(Array.isArray(list) ? list : []);
    }).catch(() => setRows([]));
  };
  useEffect(() => { load(); }, [orderId]);

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
