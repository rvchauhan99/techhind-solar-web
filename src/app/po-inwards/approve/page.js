"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import ApprovePOInwardView from "../components/ApprovePOInwardView";
import poInwardService from "@/services/poInwardService";
import {
  emptyImportCharges,
  emptyShippingFields,
  mergeImportCharges,
} from "@/constants/poInwardImportCharges";

function ApprovePOInwardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [loadingRecord, setLoadingRecord] = useState(true);
  const [inward, setInward] = useState(null);
  const [form, setForm] = useState({
    ...emptyShippingFields(),
    charges: emptyImportCharges(),
  });
  const [errors, setErrors] = useState({});
  const [pendingFiles, setPendingFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [attachmentLoadingIndex, setAttachmentLoadingIndex] = useState(null);
  const [serverError, setServerError] = useState(null);

  const toDateInput = (v) => {
    if (v == null || v === "") return "";
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return s;
  };

  const hydrateFromDetail = useCallback((detail) => {
    setInward(detail);
    const shipping = emptyShippingFields();
    Object.keys(shipping).forEach((k) => {
      const raw = detail?.[k];
      if (raw == null || raw === "") {
        shipping[k] = "";
      } else if (k === "etd" || k === "eta" || k === "bill_of_entry_date") {
        shipping[k] = toDateInput(raw);
      } else {
        shipping[k] = String(raw);
      }
    });
    setForm({
      ...shipping,
      charges: mergeImportCharges(detail?.charges),
    });
    setExistingAttachments(
      Array.isArray(detail?.attachments) ? detail.attachments : []
    );
    setPendingFiles([]);
    setErrors({});
  }, []);

  const loadInward = useCallback(async () => {
    if (!id) {
      setServerError("PO Inward ID is required");
      setLoadingRecord(false);
      return;
    }
    setLoadingRecord(true);
    setServerError(null);
    try {
      const response = await poInwardService.getPOInwardById(id);
      const detail = response?.result || response;
      if (!detail) {
        setServerError("PO Inward not found");
        return;
      }
      if (String(detail.status || "").toUpperCase() !== "DRAFT") {
        setServerError("Only DRAFT receipts can be approved from this page.");
        setInward(detail);
        return;
      }
      hydrateFromDetail(detail);
    } catch (error) {
      console.error("Load inward for approve:", error);
      setServerError(
        error.response?.data?.message || error.message || "Failed to load PO Inward"
      );
    } finally {
      setLoadingRecord(false);
    }
  }, [id, hydrateFromDetail]);

  useEffect(() => {
    loadInward();
  }, [loadInward]);

  const buildDetailsPayload = () => {
    const isImport = !!inward?.is_import;
    if (!isImport) return {};
    return {
      container_number: form.container_number || null,
      seal_number: form.seal_number || null,
      shipping_line: form.shipping_line || null,
      vessel: form.vessel || null,
      bill_of_lading: form.bill_of_lading || null,
      air_way_bill: form.air_way_bill || null,
      etd: form.etd || null,
      eta: form.eta || null,
      bill_of_entry_number: form.bill_of_entry_number || null,
      bill_of_entry_date: form.bill_of_entry_date || null,
      charges: (form.charges || []).map((c) => ({
        charge_type: c.charge_type,
        amount_inr: parseFloat(c.amount_inr) || 0,
        inventoriable: !!c.inventoriable,
        remarks: c.remarks || null,
      })),
    };
  };

  const validateImportBoe = () => {
    if (!inward?.is_import) return true;
    const errs = {};
    if (!String(form.bill_of_entry_number || "").trim()) {
      errs.bill_of_entry_number = "Bill of Entry number is required";
    }
    if (!form.bill_of_entry_date) {
      errs.bill_of_entry_date = "Bill of Entry date is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!id || !inward) return;
    setSaving(true);
    try {
      const payload = buildDetailsPayload();
      await poInwardService.updatePOInward(id, payload, pendingFiles);
      const refreshed = await poInwardService.getPOInwardById(id);
      hydrateFromDetail(refreshed?.result || refreshed);
      toast.success("Details saved (still DRAFT)");
    } catch (error) {
      console.error("Save approve details:", error);
      toast.error(
        error.response?.data?.message || error.message || "Failed to save details"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!id || !inward) return;
    if (inward.is_import && !validateImportBoe()) return;

    setApproving(true);
    try {
      if (inward.is_import) {
        await poInwardService.postPOInward(id, buildDetailsPayload(), pendingFiles);
        toast.success("Import PO Inward approved. Stock updated at landed cost.");
      } else {
        await poInwardService.approvePOInward(id, {}, pendingFiles);
        toast.success("PO Inward approved. Stock and inventory ledger updated.");
      }
      router.push("/po-inwards");
    } catch (error) {
      console.error("Approve inward:", error);
      toast.error(
        error.response?.data?.message || error.message || "Failed to approve PO Inward"
      );
    } finally {
      setApproving(false);
    }
  };

  const handleOpenAttachment = async (index) => {
    setAttachmentLoadingIndex(index);
    try {
      const response = await poInwardService.getAttachmentUrl(id, index);
      const url = response?.result?.url || response?.url;
      if (url) window.open(url, "_blank");
      else toast.error("Failed to get attachment URL");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to open attachment");
    } finally {
      setAttachmentLoadingIndex(null);
    }
  };

  const handleRemoveExisting = async (index) => {
    try {
      await poInwardService.deleteAttachment(id, index);
      const response = await poInwardService.getPOInwardById(id);
      const detail = response?.result || response;
      setExistingAttachments(
        Array.isArray(detail?.attachments) ? detail.attachments : []
      );
      setInward((prev) => (prev ? { ...prev, attachments: detail?.attachments } : prev));
      toast.success("Attachment removed");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to remove attachment");
    }
  };

  if (loadingRecord) {
    return (
      <AddEditPageShell title="Approve PO Inward" listHref="/po-inwards" listLabel="PO Inwards">
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loader />
        </div>
      </AddEditPageShell>
    );
  }

  if (serverError && !inward) {
    return (
      <AddEditPageShell title="Approve PO Inward" listHref="/po-inwards" listLabel="PO Inwards">
        <div role="alert" className="rounded-md bg-destructive/10 text-destructive text-sm p-3">
          {serverError}
        </div>
      </AddEditPageShell>
    );
  }

  if (serverError && inward) {
    return (
      <AddEditPageShell title="Approve PO Inward" listHref="/po-inwards" listLabel="PO Inwards">
        <div role="alert" className="rounded-md bg-destructive/10 text-destructive text-sm p-3 mb-2">
          {serverError}
        </div>
        <ButtonBack router={router} />
      </AddEditPageShell>
    );
  }

  return (
    <AddEditPageShell
      title={inward?.is_import ? "Approve Import PO Inward" : "Approve PO Inward"}
      listHref="/po-inwards"
      listLabel="PO Inwards"
    >
      <ApprovePOInwardView
        inward={inward}
        form={form}
        errors={errors}
        existingAttachments={existingAttachments}
        pendingFiles={pendingFiles}
        saving={saving}
        approving={approving}
        onFormChange={(next) => {
          setForm(next);
          if (errors.bill_of_entry_number || errors.bill_of_entry_date) {
            setErrors({});
          }
        }}
        onPendingFilesChange={setPendingFiles}
        onOpenAttachment={handleOpenAttachment}
        onRemoveExistingAttachment={handleRemoveExisting}
        onCancel={() => router.push("/po-inwards")}
        onSave={handleSave}
        onApprove={handleApprove}
        attachmentLoadingIndex={attachmentLoadingIndex}
      />
    </AddEditPageShell>
  );
}

function ButtonBack({ router }) {
  return (
    <button
      type="button"
      className="text-sm underline text-muted-foreground"
      onClick={() => router.push("/po-inwards")}
    >
      Back to list
    </button>
  );
}

function LoadingFallback() {
  return (
    <div className="flex justify-center items-center min-h-[100vh]">
      <Loader />
    </div>
  );
}

export default function ApprovePOInwardPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingFallback />}>
        <ApprovePOInwardContent />
      </Suspense>
    </ProtectedRoute>
  );
}
