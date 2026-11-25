"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { IconUserPlus, IconUserOff, IconExternalLink, IconPencil, IconTrash, IconPlus, IconMail } from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import FormField from "@/components/common/FormField";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import AutocompleteField from "@/components/common/AutocompleteField";
import HtmlTemplateField from "@/components/common/HtmlTemplateField";
import StatusBadge from "@/components/common/StatusBadge";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import { listBranches } from "@/services/companyService";
import AttendanceCalendar from "@/app/hrms/attendance/components/AttendanceCalendar";

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function Field({ label, value }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground">{value || "—"}</div>
    </div>
  );
}

function QuickStat({ label, value }) {
  return (
    <div className="min-w-[120px] flex-1 rounded-md border border-border bg-muted/30 px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="truncate text-sm font-semibold text-foreground">{value || "—"}</div>
    </div>
  );
}

const CATEGORY_LABELS = {
  aadhar_card: "Aadhar Card",
  pan_card: "PAN Card",
  bank_detail: "Bank Detail",
  salary_slip: "Salary Slip",
  relieving_letter: "Relieving Letter",
  other: "Other",
};

export default function HrmsEmployeeDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [emp, setEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [quotas, setQuotas] = useState([]);
  const [activateOpen, setActivateOpen] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activateForm, setActivateForm] = useState({ name: "", email: "", mobile_number: "", role_id: "", branch_ids: [] });
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [quotaForm, setQuotaForm] = useState({ leave_type_id: "", leave_type_label: "", quarterly_leave: "0" });
  const [savingQuota, setSavingQuota] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [docCategory, setDocCategory] = useState("aadhar_card");
  const [docFile, setDocFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [docDeleteTarget, setDocDeleteTarget] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(false);
  const [letters, setLetters] = useState([]);
  const [letterTypes, setLetterTypes] = useState([]);
  const [letterType, setLetterType] = useState("welcome_letter");
  const [letterTerms, setLetterTerms] = useState("");
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [savingTerms, setSavingTerms] = useState(false);
  const [sendingLetterId, setSendingLetterId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, qRes, docRes, lettersRes, metaRes] = await Promise.all([
        hrmsService.getEmployee(id),
        hrmsService.listEmployeeLeaveQuotas(id).catch(() => null),
        hrmsService.listEmployeeDocuments(id).catch(() => null),
        hrmsService.listEmployeeLetters(id).catch(() => null),
        hrmsService.getLetterTemplateMeta().catch(() => null),
      ]);
      setEmp(unwrap(empRes));
      setQuotas(unwrap(qRes)?.data || []);
      setDocuments(unwrap(docRes)?.data || []);
      setLetters(unwrap(lettersRes)?.data || []);
      const types = unwrap(metaRes)?.types || [];
      setLetterTypes(types);
      setLetterType((prev) => (types.some((t) => t.value === prev) ? prev : types[0]?.value || "welcome_letter"));
    } catch (err) {
      toastErrorFromApi(err, "Failed to load employee");
      router.push("/hrms/employees");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { if (id) load(); }, [id, load]);

  useEffect(() => {
    listBranches()
      .catch(() => null)
      .then((branchRes) => {
        const bp = unwrap(branchRes);
        setBranches(bp?.data || (Array.isArray(bp) ? bp : []));
      });
  }, []);

  const toggleBranch = (bid) => {
    setActivateForm((f) => {
      const set = new Set((f.branch_ids || []).map(Number));
      if (set.has(Number(bid))) set.delete(Number(bid)); else set.add(Number(bid));
      return { ...f, branch_ids: Array.from(set) };
    });
  };

  const doActivate = async () => {
    if (!activateForm.name.trim() || !activateForm.email.trim()) {
      toastErrorFromApi({ message: "Name and email are required to activate" }, "Missing details");
      return;
    }
    setActivating(true);
    try {
      await hrmsService.activateEmployee(id, {
        name: activateForm.name.trim(),
        email: activateForm.email.trim(),
        mobile_number: activateForm.mobile_number || null,
        role_id: activateForm.role_id ? Number(activateForm.role_id) : null,
        branch_ids: (activateForm.branch_ids || []).map(Number),
      });
      toastSuccess("Employee activated");
      setActivateOpen(false);
      await load();
    } catch (err) {
      toastErrorFromApi(err, "Activation failed");
    } finally {
      setActivating(false);
    }
  };

  const doDeactivate = async () => {
    setDeactivating(true);
    try {
      await hrmsService.deactivateEmployee(id, {});
      toastSuccess("Employee deactivated");
      setDeactivateOpen(false);
      await load();
    } catch (err) {
      toastErrorFromApi(err, "Deactivate failed");
    } finally {
      setDeactivating(false);
    }
  };

  const saveQuota = async (e) => {
    e.preventDefault();
    if (!quotaForm.leave_type_id) return;
    setSavingQuota(true);
    try {
      await hrmsService.upsertEmployeeLeaveQuota(id, {
        leave_type_id: Number(quotaForm.leave_type_id),
        quarterly_leave: Number(quotaForm.quarterly_leave) || 0,
      });
      toastSuccess("Quota saved");
      setQuotaForm({ leave_type_id: "", leave_type_label: "", quarterly_leave: "0" });
      const qRes = await hrmsService.listEmployeeLeaveQuotas(id);
      setQuotas(unwrap(qRes)?.data || []);
    } catch (err) {
      toastErrorFromApi(err, "Save quota failed");
    } finally {
      setSavingQuota(false);
    }
  };

  const deleteQuota = async (quotaId) => {
    try {
      await hrmsService.deleteEmployeeLeaveQuota(id, quotaId);
      toastSuccess("Quota deleted");
      const qRes = await hrmsService.listEmployeeLeaveQuotas(id);
      setQuotas(unwrap(qRes)?.data || []);
    } catch (err) {
      toastErrorFromApi(err, "Delete quota failed");
    }
  };

  const uploadDoc = async (e) => {
    e.preventDefault();
    if (!docFile) {
      toastErrorFromApi({ message: "Choose a file first" }, "No file selected");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("document", docFile);
      fd.append("category", docCategory);
      await hrmsService.uploadEmployeeDocument(id, fd);
      toastSuccess("Document uploaded");
      setDocFile(null);
      const docRes = await hrmsService.listEmployeeDocuments(id);
      setDocuments(unwrap(docRes)?.data || []);
    } catch (err) {
      toastErrorFromApi(err, "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const downloadDoc = async (doc) => {
    try {
      const res = await hrmsService.getEmployeeDocumentUrl(id, doc.id);
      const url = unwrap(res)?.url;
      if (url) window.open(url, "_blank", "noopener");
    } catch (err) {
      toastErrorFromApi(err, "Could not open document");
    }
  };

  const deleteDoc = async () => {
    if (!docDeleteTarget) return;
    setDeletingDoc(true);
    try {
      await hrmsService.deleteEmployeeDocument(id, docDeleteTarget.id);
      toastSuccess("Document deleted");
      setDocDeleteTarget(null);
      const docRes = await hrmsService.listEmployeeDocuments(id);
      setDocuments(unwrap(docRes)?.data || []);
    } catch (err) {
      toastErrorFromApi(err, "Delete failed");
    } finally {
      setDeletingDoc(false);
    }
  };

  const refreshLetters = async () => {
    const lettersRes = await hrmsService.listEmployeeLetters(id);
    setLetters(unwrap(lettersRes)?.data || []);
  };

  const loadTermsForType = async (type) => {
    try {
      const res = await hrmsService.getEmployeeLetterContents(id, type);
      setLetterTerms(unwrap(res)?.content || "");
    } catch {
      setLetterTerms("");
    }
  };

  const saveLetterTerms = async () => {
    setSavingTerms(true);
    try {
      await hrmsService.upsertEmployeeLetterContents(id, letterType, { content: letterTerms });
      toastSuccess("Letter terms saved");
    } catch (err) {
      toastErrorFromApi(err, "Save terms failed");
    } finally {
      setSavingTerms(false);
    }
  };

  const generateLetter = async () => {
    setGeneratingLetter(true);
    try {
      if (letterType === "offer_letter" || letterType === "offer_letter_trainee") {
        if (String(letterTerms || "").trim()) {
          await hrmsService.upsertEmployeeLetterContents(id, letterType, { content: letterTerms });
        }
      }
      await hrmsService.generateEmployeeLetter(id, { letter_type: letterType });
      toastSuccess("Letter generated");
      await refreshLetters();
    } catch (err) {
      toastErrorFromApi(err, "Generate failed");
    } finally {
      setGeneratingLetter(false);
    }
  };

  const openLetterPdf = async (letter) => {
    try {
      const res = await hrmsService.getEmployeeLetterPdfUrl(id, letter.id);
      const url = unwrap(res)?.url;
      if (url) window.open(url, "_blank", "noopener");
    } catch (err) {
      toastErrorFromApi(err, "Could not open PDF");
    }
  };

  const sendLetter = async (letter) => {
    setSendingLetterId(letter.id);
    try {
      await hrmsService.sendEmployeeLetter(id, letter.id);
      toastSuccess("Letter emailed");
      await refreshLetters();
    } catch (err) {
      toastErrorFromApi(err, "Send failed");
    } finally {
      setSendingLetterId(null);
    }
  };

  const uploadSignedLetter = async (letter, file) => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append("document", file);
      await hrmsService.uploadEmployeeLetterSigned(id, letter.id, fd);
      toastSuccess("Signed document uploaded");
      await refreshLetters();
    } catch (err) {
      toastErrorFromApi(err, "Signed upload failed");
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="size-14 animate-pulse rounded-full bg-muted" />
            <div className="space-y-2">
              <div className="h-5 w-48 animate-pulse rounded bg-muted" />
              <div className="h-3 w-64 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-md bg-muted/60" />
            ))}
          </div>
          <div className="h-10 w-full animate-pulse rounded-md bg-muted/60" />
          <div className="h-40 w-full animate-pulse rounded-md bg-muted/40" />
        </div>
      </ProtectedRoute>
    );
  }
  if (!emp) return null;

  const u = emp.user || {};
  const isActive = emp.status === "active";
  const isPending = emp.status === "pending";

  return (
    <ProtectedRoute>
      <div className="p-4 space-y-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#1b365d]/10 text-lg font-semibold text-[#1b365d]">
                {initials(u.name)}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-[#1b365d]">{u.name || emp.emp_code}</h1>
                  <StatusBadge status={emp.status} />
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {emp.emp_code} · {emp.department?.title || "No department"} ·{" "}
                  {emp.designation?.title || "No designation"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => router.push(`/hrms/employees/${id}/edit`)}>
                <IconPencil className="h-4 w-4" /> Edit
              </Button>
              {emp.user_id && (
                <Button size="sm" variant="outline" onClick={() => router.push(`/user-master/${emp.user_id}`)}>
                  <IconExternalLink className="h-4 w-4" /> Open User
                </Button>
              )}
              {isPending && (
                <Button
                  size="sm"
                  onClick={() => {
                    setActivateForm({
                      name: u.name || "",
                      email: u.email || "",
                      mobile_number: u.mobile_number || "",
                      role_id: u.role_id ? String(u.role_id) : "",
                      branch_ids: [],
                    });
                    setActivateOpen(true);
                  }}
                >
                  <IconUserPlus className="h-4 w-4" /> Activate
                </Button>
              )}
              {isActive && (
                <Button size="sm" variant="destructive" onClick={() => setDeactivateOpen(true)}>
                  <IconUserOff className="h-4 w-4" /> Deactivate
                </Button>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <QuickStat label="Joined" value={emp.joining_date} />
            <QuickStat label="Department" value={emp.department?.title} />
            <QuickStat label="Designation" value={emp.designation?.title} />
            <QuickStat label="Reports to" value={emp.managerEmployee?.user?.name} />
            <QuickStat label="Gross / month" value={emp.current_gross_salary} />
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="quotas">Leave Quotas</TabsTrigger>
            <TabsTrigger value="annexure">Annexure</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="letters">Letters</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-4 space-y-3">
                <div className="text-sm font-semibold">Employment</div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Emp Code" value={emp.emp_code} />
                  <Field label="Type" value={emp.employee_type === 2 ? "Intern" : "Full-time"} />
                  <Field label="Joining Date" value={emp.joining_date} />
                  <Field label="Probation (months)" value={emp.probation_months} />
                  <Field label="Resignation Date" value={emp.resignation_date} />
                  <Field label="Gross Salary" value={emp.current_gross_salary} />
                  <Field label="Salary Effective" value={emp.salary_effective_month} />
                  <Field label="Reports To" value={emp.managerEmployee?.user?.name} />
                </div>
              </Card>
              <Card className="p-4 space-y-3">
                <div className="text-sm font-semibold">Contact & Personal</div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Work Email" value={u.email} />
                  <Field label="Mobile" value={u.mobile_number} />
                  <Field label="Personal Email" value={emp.personal_email} />
                  <Field label="Personal Mobile" value={emp.personal_mobile} />
                  <Field label="Gender" value={emp.gender} />
                  <Field label="Blood Group" value={u.blood_group} />
                  <Field label="DOB" value={u.brith_date} />
                  <Field label="Address" value={u.address} />
                </div>
              </Card>
              <Card className="p-4 space-y-3">
                <div className="text-sm font-semibold">Statutory & Identity</div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="UAN" value={emp.uan_no} />
                  <Field label="PF No" value={emp.pf_no} />
                  <Field label="ESIC" value={emp.esic} />
                  <Field label="Employee ESIC" value={emp.employee_esic} />
                  <Field label="Aadhar" value={emp.aadhar_no} />
                  <Field label="PAN" value={emp.pan_no} />
                  <Field label="SC Applicable" value={emp.sc_applicable ? "Yes" : "No"} />
                  <Field label="Rules Exemption" value={emp.rules_exemption ? "Yes" : "No"} />
                </div>
              </Card>
              <Card className="p-4 space-y-3">
                <div className="text-sm font-semibold">Bank & Emergency</div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Bank" value={emp.bank_name} />
                  <Field label="A/C Holder" value={emp.ac_holder_name} />
                  <Field label="A/C Number" value={emp.ac_number} />
                  <Field label="IFSC" value={emp.ifsc_code} />
                  <Field label="Emergency Name" value={emp.emergency_name} />
                  <Field label="Emergency Mobile" value={emp.emergency_mobile} />
                  <Field label="Relation" value={emp.emergency_relation} />
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="quotas">
            <Card className="p-4 space-y-4">
              <div className="text-sm font-semibold">Leave Quotas</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2">Leave Type</th>
                      <th className="py-2">Quarterly Entitlement</th>
                      <th className="py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotas.length === 0 && (
                      <tr><td colSpan={3} className="py-3 text-muted-foreground">No quotas yet.</td></tr>
                    )}
                    {quotas.map((q) => (
                      <tr key={q.id} className="border-b border-border/60">
                        <td className="py-2">{q.leaveType?.title || q.leave_type?.title || q.leave_type_id}</td>
                        <td className="py-2">{q.quarterly_leave}</td>
                        <td className="py-2 text-right">
                          <Button variant="ghost" size="sm" onClick={() => deleteQuota(q.id)}>
                            <IconTrash className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <form onSubmit={saveQuota} className="flex flex-wrap items-end gap-2">
                <div className="min-w-[200px]">
                  <AutocompleteField
                    label="Leave Type"
                    name="leave_type_id"
                    placeholder="Type to search…"
                    asyncLoadOptions={(q) => hrmsService.searchHrmsLeaveTypes(q)}
                    resolveOptionById={(tid) => hrmsService.resolveHrmsLeaveType(tid)}
                    getOptionLabel={(o) => o?.label ?? o?.title ?? ""}
                    value={
                      quotaForm.leave_type_id
                        ? { id: quotaForm.leave_type_id, value: quotaForm.leave_type_id, label: quotaForm.leave_type_label || "" }
                        : null
                    }
                    onChange={(_e, opt) =>
                      setQuotaForm((f) => ({
                        ...f,
                        leave_type_id: opt?.id != null ? String(opt.id) : "",
                        leave_type_label: opt?.label ?? opt?.title ?? "",
                      }))
                    }
                  />
                </div>
                <div className="w-40">
                  <Input label="Quarterly" name="quarterly_leave" type="number" value={quotaForm.quarterly_leave} onChange={(e) => setQuotaForm((f) => ({ ...f, quarterly_leave: e.target.value }))} />
                </div>
                <Button type="submit" size="sm" loading={savingQuota}><IconPlus className="h-4 w-4" /> Save Quota</Button>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="annexure">
            <Card className="p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Salary Annexure (CTC)</div>
                <div className="text-xs text-muted-foreground">
                  Current gross: {emp.current_gross_salary || "—"} · Effective {emp.salary_effective_month || "—"}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => router.push(`/hrms/employees/${id}/annexure`)}>
                <IconExternalLink className="h-4 w-4" /> Open Annexure
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="attendance">
            <Card className="space-y-3 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">Attendance calendar</div>
                  <div className="text-xs text-muted-foreground">
                    Month grid for this employee (Present / Late / Absent / Leave / Holiday).
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => router.push("/hrms/attendance")}>
                  <IconExternalLink className="h-4 w-4" /> Open Attendance
                </Button>
              </div>
              <AttendanceCalendar
                year={String(new Date().getFullYear())}
                month={String(new Date().getMonth() + 1)}
                employeeId={emp?.id || id}
                compact
              />
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card className="p-4 space-y-4">
              <div className="text-sm font-semibold">Documents</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2">Category</th>
                      <th className="py-2">File</th>
                      <th className="py-2">Size</th>
                      <th className="py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.length === 0 && (
                      <tr><td colSpan={4} className="py-3 text-muted-foreground">No documents uploaded.</td></tr>
                    )}
                    {documents.map((d) => (
                      <tr key={d.id} className="border-b border-border/60">
                        <td className="py-2"><Badge variant="secondary">{CATEGORY_LABELS[d.category] || d.category}</Badge></td>
                        <td className="py-2">{d.file_name || d.title || "—"}</td>
                        <td className="py-2">{d.file_size ? `${Math.round(d.file_size / 1024)} KB` : "—"}</td>
                        <td className="py-2 text-right">
                          <Button variant="ghost" size="sm" onClick={() => downloadDoc(d)}>
                            <IconExternalLink className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDocDeleteTarget(d)}>
                            <IconTrash className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <form onSubmit={uploadDoc} className="flex flex-wrap items-end gap-2">
                <div className="min-w-[200px]">
                  <Select label="Category" name="doc_category" value={docCategory} onChange={(e) => setDocCategory(e.target.value)}>
                    {Object.entries(CATEGORY_LABELS).map(([v, l]) => (<MenuItem key={v} value={v}>{l}</MenuItem>))}
                  </Select>
                </div>
                <div className="min-w-[220px]">
                  <label className="mb-1.5 block text-sm font-medium">File</label>
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setDocFile(e.target.files?.[0] || null)} className="block w-full text-sm" />
                </div>
                <Button type="submit" size="sm" loading={uploading}><IconPlus className="h-4 w-4" /> Upload</Button>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="letters">
            <Card className="p-4 space-y-4">
              <div>
                <div className="text-sm font-semibold">Letters</div>
                <div className="text-xs text-muted-foreground">
                  Generate from active templates, open PDF, email, or upload a signed copy.
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[220px]">
                  <Select
                    label="Letter type"
                    name="letter_type"
                    value={letterType}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLetterType(v);
                      loadTermsForType(v);
                    }}
                  >
                    {(letterTypes.length
                      ? letterTypes
                      : [{ value: "welcome_letter", label: "Welcome Letter" }]
                    ).map((t) => (
                      <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                    ))}
                  </Select>
                </div>
                <Button size="sm" loading={generatingLetter} onClick={generateLetter}>
                  <IconPlus className="h-4 w-4" /> Generate
                </Button>
              </div>
              {(letterType === "offer_letter" || letterType === "offer_letter_trainee") && (
                <div className="space-y-2">
                  <HtmlTemplateField
                    name="letter_terms"
                    label="Offer terms ({terms})"
                    value={letterTerms}
                    onChange={(e) => setLetterTerms(e.target.value)}
                    placeholders={{ "{terms}": "Terms block inserted into offer template" }}
                    minRows={6}
                  />
                  <Button size="sm" variant="outline" loading={savingTerms} onClick={saveLetterTerms}>
                    Save terms
                  </Button>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2">Type</th>
                      <th className="py-2">Title</th>
                      <th className="py-2">Email</th>
                      <th className="py-2">Signed</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {letters.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-3 text-muted-foreground">No letters generated yet.</td>
                      </tr>
                    )}
                    {letters.map((letter) => (
                      <tr key={letter.id} className="border-b border-border/60">
                        <td className="py-2">{letter.letter_type_label || letter.letter_type}</td>
                        <td className="py-2">{letter.title}</td>
                        <td className="py-2">
                          <Badge variant={letter.email_sent_status === "Yes" ? "default" : "secondary"}>
                            {letter.email_sent_status || "No"}
                          </Badge>
                        </td>
                        <td className="py-2">{letter.signed_document_key ? "Yes" : "—"}</td>
                        <td className="py-2 text-right space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => openLetterPdf(letter)} title="Open PDF">
                            <IconExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={sendingLetterId === letter.id}
                            onClick={() => sendLetter(letter)}
                            title="Send email"
                          >
                            <IconMail className="h-4 w-4" />
                          </Button>
                          <label className="inline-flex cursor-pointer items-center">
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                e.target.value = "";
                                uploadSignedLetter(letter, f);
                              }}
                            />
                            <span className="inline-flex h-8 items-center rounded-md px-2 text-xs text-muted-foreground hover:bg-muted">
                              Signed
                            </span>
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
          <DialogContent>
            <DialogTitle>Activate Employee — provision login</DialogTitle>
            <div className="space-y-3 py-2">
              <FormField><Input label="Name" name="act_name" value={activateForm.name} onChange={(e) => setActivateForm((f) => ({ ...f, name: e.target.value }))} required /></FormField>
              <FormField><Input label="Login Email" name="act_email" type="email" value={activateForm.email} onChange={(e) => setActivateForm((f) => ({ ...f, email: e.target.value }))} required /></FormField>
              <FormField><Input label="Mobile" name="act_mobile" value={activateForm.mobile_number} onChange={(e) => setActivateForm((f) => ({ ...f, mobile_number: e.target.value }))} /></FormField>
              <FormField>
                <AutocompleteField
                  label="Role"
                  name="act_role"
                  placeholder="Type to search… (default User role)"
                  asyncLoadOptions={(q) => hrmsService.searchHrmsRoles(q)}
                  resolveOptionById={(rid) => hrmsService.resolveHrmsRole(rid)}
                  getOptionLabel={(o) => o?.label ?? o?.name ?? ""}
                  value={activateForm.role_id || null}
                  onChange={(_e, opt) =>
                    setActivateForm((f) => ({ ...f, role_id: opt?.id != null ? String(opt.id) : "" }))
                  }
                />
              </FormField>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Branches</div>
                <div className="flex flex-wrap gap-2">
                  {branches.map((b) => (
                    <label key={b.id} className="flex items-center gap-1.5 rounded border border-border px-2 py-1 text-sm">
                      <input type="checkbox" checked={(activateForm.branch_ids || []).map(Number).includes(Number(b.id))} onChange={() => toggleBranch(b.id)} />
                      {b.name || b.branch_name || `Branch ${b.id}`}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setActivateOpen(false)} disabled={activating}>Cancel</Button>
              <Button size="sm" loading={activating} onClick={doActivate}>Activate</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate employee</AlertDialogTitle>
              <AlertDialogDescription>
                Deactivate {u.name || emp.emp_code}? Their login will be blocked.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deactivating}>Cancel</AlertDialogCancel>
              <AlertDialogAction size="sm" variant="destructive" loading={deactivating} onClick={doDeactivate}>
                Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!docDeleteTarget} onOpenChange={(open) => !open && setDocDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete document</AlertDialogTitle>
              <AlertDialogDescription>
                Delete &quot;{docDeleteTarget?.file_name || docDeleteTarget?.title}&quot;? This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingDoc}>Cancel</AlertDialogCancel>
              <AlertDialogAction size="sm" variant="destructive" loading={deletingDoc} onClick={deleteDoc}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  );
}




