"use client";

import { useEffect, useState, useMemo } from "react";
import orderDocumentsService from "@/services/orderDocumentsService";

/** Fallback matching today's hardcoded Document Uploads section. */
export const LEGACY_ORDER_FORM_DOCUMENTS = [
  {
    id: null,
    key: "electricity_bill",
    label: "Electricity Bill",
    required: true,
    accept: "image/*,application/pdf",
    allow_multiple: false,
  },
  {
    id: null,
    key: "house_tax_bill",
    label: "House Tax Bill",
    required: false,
    accept: "image/*,application/pdf",
    allow_multiple: false,
  },
  {
    id: null,
    key: "aadhar_card",
    label: "Aadhar Card",
    required: true,
    accept: "image/*,application/pdf",
    allow_multiple: false,
  },
  {
    id: null,
    key: "passport_photo",
    label: "Passport Photo",
    required: true,
    accept: "image/*",
    allow_multiple: false,
  },
  {
    id: null,
    key: "pan_card",
    label: "PAN Card",
    required: false,
    accept: "image/*,application/pdf",
    allow_multiple: false,
  },
  {
    id: null,
    key: "cancelled_cheque",
    label: "Cancelled Cheque",
    required: true,
    accept: "image/*,application/pdf",
    allow_multiple: false,
  },
  {
    id: null,
    key: "customer_sign",
    label: "Customer Sign",
    required: true,
    accept: "image/*",
    allow_multiple: false,
  },
];

export const normalizeDocToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

/** Snake keys historically stored as order_documents.doc_type → Documents / L-KYC labels. */
export const LEGACY_ORDER_DOC_TYPE_LABELS = {
  electricity_bill: "Electricity Bill",
  house_tax_bill: "House Tax Bill",
  aadhar_card: "Aadhar Card",
  passport_photo: "Passport Size Picture",
  pan_card: "PAN Card or Driving Licence",
  cancelled_cheque: "Cancelled Cheque",
  customer_sign: "Customer Sign",
  registration_letter: "Registration Letter",
  payment_receipt: "Payment Receipt",
};

export const resolveOrderDocTypeLabel = (docType, masterTypes = []) => {
  if (!docType) return "";
  const str = String(docType);
  const found = Array.isArray(masterTypes) ? masterTypes.find((t) => t?.type === str) : null;
  if (found?.type) return found.type;
  return LEGACY_ORDER_DOC_TYPE_LABELS[str] || str;
};

/**
 * Whether an uploaded order document matches an order-form / L-KYC slot
 * (key/code, label/type, or legacy snake key whose mapped label equals the slot).
 */
export const docMatchesSlot = (doc, slot) => {
  if (!doc || !slot) return false;
  const dt = normalizeDocToken(doc.doc_type || doc.type);
  if (!dt) return false;
  const keyNorm = normalizeDocToken(slot.key);
  const labelNorm = normalizeDocToken(slot.label);
  if (keyNorm && dt === keyNorm) return true;
  if (labelNorm && dt === labelNorm) return true;
  const legacyLabel = LEGACY_ORDER_DOC_TYPE_LABELS[String(doc.doc_type || doc.type || "").trim()];
  if (legacyLabel && labelNorm && normalizeDocToken(legacyLabel) === labelNorm) return true;
  return false;
};

/** Latest order document for a form / L-KYC slot (key or label or legacy map). */
export const findDocForSlot = (docs, slot) => {
  const list = Array.isArray(docs) ? docs : [];
  return list.find((d) => docMatchesSlot(d, slot)) || null;
};

const matchesSlot = (doc, inquiryDoc) => {
  const dt = normalizeDocToken(inquiryDoc?.doc_type);
  if (!dt || !doc?.key) return false;
  const keyNorm = normalizeDocToken(doc.key);
  const labelNorm = normalizeDocToken(doc.label);
  return dt === keyNorm || (labelNorm && dt === labelNorm);
};

/**
 * Latest inquiry document that matches a form slot by key or label.
 */
export const findInquiryDocForSlot = (doc, inquiryDocuments = []) => {
  const list = Array.isArray(inquiryDocuments) ? inquiryDocuments : [];
  const matches = list.filter((d) => matchesSlot(doc, d));
  if (matches.length === 0) return null;
  return matches.slice().sort((a, b) => {
    const aTime = new Date(a?.created_at || 0).getTime();
    const bTime = new Date(b?.created_at || 0).getTime();
    return bTime - aTime;
  })[0];
};

/**
 * Inquiry documents that do not match any form upload slot (e.g. PDC).
 */
export const getUnmatchedInquiryDocs = (formDocs = [], inquiryDocuments = []) => {
  const slots = Array.isArray(formDocs) ? formDocs : [];
  const list = Array.isArray(inquiryDocuments) ? inquiryDocuments : [];
  return list.filter((d) => !slots.some((slot) => matchesSlot(slot, d)));
};

/**
 * Document is satisfied if a new File is picked, an existing path/id is present,
 * or an inquiry document matches by key or label (case-insensitive).
 */
export const isDocumentSatisfied = (doc, formData = {}, inquiryDocuments = []) => {
  if (!doc?.key) return false;
  const value = formData[doc.key];
  if (value instanceof File) return true;
  if (typeof value === "string" && value.trim() !== "") return true;
  return Boolean(findInquiryDocForSlot(doc, inquiryDocuments));
};

export const useOrderFormDocumentConfig = () => {
  const [documents, setDocuments] = useState(LEGACY_ORDER_FORM_DOCUMENTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await orderDocumentsService.getOrderFormConfig();
        const list = res?.result ?? res?.data ?? res;
        if (!cancelled && Array.isArray(list) && list.length > 0) {
          setDocuments(list);
        } else if (!cancelled) {
          setDocuments(LEGACY_ORDER_FORM_DOCUMENTS);
        }
      } catch (err) {
        console.error("Failed to load order form document config", err);
        if (!cancelled) setDocuments(LEGACY_ORDER_FORM_DOCUMENTS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const documentKeys = useMemo(
    () => documents.map((d) => d.key),
    [documents]
  );

  return { documents, loading, documentKeys };
};
