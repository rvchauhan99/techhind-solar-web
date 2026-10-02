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
