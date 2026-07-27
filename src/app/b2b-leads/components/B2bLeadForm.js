"use client";

import { useEffect, useMemo, useState } from "react";
import Input from "@/components/common/Input";
import Textarea from "@/components/common/Textarea";
import Select, { MenuItem } from "@/components/common/Select";
import AutocompleteField from "@/components/common/AutocompleteField";
import DateField from "@/components/common/DateField";
import PhoneField from "@/components/common/PhoneField";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormGrid from "@/components/common/FormGrid";
import { Button } from "@/components/ui/button";
import LoadingButton from "@/components/common/LoadingButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import productService from "@/services/productService";
import { formatProductAutocompleteLabel } from "@/utils/productAutocompleteLabel";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import {
  validateGSTIN,
  validatePAN,
  validateEmail,
  derivePanFromGstin,
} from "@/utils/validators";
import {
  B2B_PIPELINE_STAGE_OPTIONS,
  B2B_LOST_REASON_OPTIONS,
} from "../b2bLeadFilterOptions";

export const B2B_LEAD_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const B2B_BUSINESS_TYPES = [
  "Dealer",
  "Distributor",
  "Retailer",
  "EPC Company",
  "Installer",
  "Contractor",
  "Manufacturer",
  "Corporate Customer",
  "Government Organization",
  "Trader",
];

const emptyForm = {
  company_name: "",
  contact_person: "",
  designation: "",
  mobile_number: "",
  alternate_mobile_number: "",
  email: "",
  website: "",
  inquiry_source_id: "",
  inquiry_source_name: "",
  assigned_to: "",
  assigned_to_name: "",
  assigned_by_name: "",
  priority: "medium",
  pipeline_stage: "new",
  lost_reason: "",
  business_type: "",
  gstin: "",
  pan_number: "",
  industry: "",
  annual_purchase_volume: "",
  existing_supplier: "",
  existing_erp: "",
  number_of_branches: "",
  address: "",
  area: "",
  city: "",
  state: "",
  state_id: "",
  country: "India",
  pincode: "",
  requirement_description: "",
  expected_quantity: "",
  expected_budget: "",
  expected_purchase_date: "",
  remarks: "",
  products: [],
};

const EMPTY_OBJ = {};

function FormCard({ title, children, className }) {
  return (
    <Card className={`rounded-md shadow-sm border-slate-200/60 ${className || ""}`}>
      {title && (
        <CardHeader className="px-2 py-1 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-xs font-semibold text-slate-700 uppercase tracking-tight">
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-2">
        {children}
      </CardContent>
    </Card>
  );
}

export default function B2bLeadForm({
  defaultValues = EMPTY_OBJ,
  onSubmit,
  loading,
  readOnly = false,
  onCancel = null,
  serverError = null,
}) {
  const [formData, setFormData] = useState({ ...emptyForm });
  const [errors, setErrors] = useState({});

  const isEdit = useMemo(() => !!defaultValues?.id, [defaultValues]);

  useEffect(() => {
    const dv = defaultValues || {};
    const products = (dv.leadProducts || dv.products || []).map((p) => ({
      product_id: p.product_id || p.product?.id,
      quantity: p.quantity ?? "",
      label: p.product
        ? `${p.product.product_code || p.product.id} – ${formatProductAutocompleteLabel(p.product)}`
        : p.label || String(p.product_id),
    }));
    setFormData({
      ...emptyForm,
      ...dv,
      products,
      inquiry_source_id: dv.inquiry_source_id || "",
      inquiry_source_name: dv.inquiry_source_name || dv.inquirySource?.source_name || "",
      assigned_to: dv.assigned_to || "",
      assigned_to_name: dv.assigned_to_name || dv.assignedTo?.name || "",
      assigned_by_name: dv.assigned_by_name || dv.assignedBy?.name || "",
      state_id: dv.state_id || "",
      state: dv.state || "",
      priority: dv.priority || "medium",
      country: dv.country || "India",
      expected_purchase_date: dv.expected_purchase_date
        ? String(dv.expected_purchase_date).slice(0, 10)
        : "",
    });
  }, [defaultValues]);

  const setField = (key, value) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "gstin") {
        const pan = derivePanFromGstin(value);
        if (pan && !prev.pan_number) next.pan_number = pan;
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!String(formData.company_name || "").trim()) next.company_name = "Required";
    if (!String(formData.contact_person || "").trim()) next.contact_person = "Required";
    if (!String(formData.mobile_number || "").trim()) next.mobile_number = "Required";
    if (!formData.inquiry_source_id) next.inquiry_source_id = "Required";
    if (!formData.assigned_to) next.assigned_to = "Required";
    if (formData.email) {
      const emailRes = validateEmail(formData.email);
      if (emailRes && emailRes.isValid === false) next.email = emailRes.message || "Invalid email";
    }
    if (formData.gstin) {
      const gst = validateGSTIN(formData.gstin);
      if (!gst.isValid) next.gstin = gst.message;
    }
    if (formData.pan_number) {
      const pan = validatePAN(formData.pan_number);
      if (!pan.isValid) next.pan_number = pan.message;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (readOnly) return;
    if (!validate()) return;
    onSubmit?.({
      ...formData,
      inquiry_source_id: formData.inquiry_source_id || null,
      assigned_to: formData.assigned_to || null,
      state_id: formData.state_id || null,
      number_of_branches:
        formData.number_of_branches === "" || formData.number_of_branches == null
          ? null
          : Number(formData.number_of_branches),
      expected_budget:
        formData.expected_budget === "" || formData.expected_budget == null
          ? null
          : formData.expected_budget,
      products: (formData.products || [])
        .filter((p) => p.product_id)
        .map((p) => ({
          product_id: p.product_id,
          quantity: p.quantity === "" ? null : p.quantity,
        })),
    });
  };

  const addProduct = (_e, opt) => {
    if (!opt?.id && !opt?.value) return;
    const productId = opt.id || opt.value;
    setFormData((prev) => {
      if ((prev.products || []).some((p) => Number(p.product_id) === Number(productId))) return prev;
      return {
        ...prev,
        products: [
          ...(prev.products || []),
          {
            product_id: productId,
            quantity: "",
            label: `${opt.product_code || opt.id} – ${formatProductAutocompleteLabel(opt)}`,
          },
        ],
      };
    });
  };

  const removeProduct = (productId) => {
    setFormData((prev) => ({
      ...prev,
      products: (prev.products || []).filter((p) => Number(p.product_id) !== Number(productId)),
    }));
  };

  return (
    <FormContainer className="max-w-[1300px] mx-auto !p-1">
      <form
        id="b2b-lead-form"
        onSubmit={handleSubmit}
        onKeyDown={preventEnterSubmit}
        className="w-full"
        noValidate
      >
      {serverError && (
        <div className="mb-1 p-1 bg-destructive/10 text-destructive text-sm rounded border border-destructive/20">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-1.5">
        {/* LEFT COLUMN: Dense Data Entry */}
        <div className="lg:col-span-8 flex flex-col gap-1.5">
          
          <FormCard title="Company & Contact">
            <FormGrid cols={2} className="gap-x-2 gap-y-1.5">
              <Input
                label="Company Name *"
                value={formData.company_name}
                onChange={(e) => setField("company_name", e.target.value)}
                error={!!errors.company_name}
                helperText={errors.company_name}
                disabled={readOnly}
              />
              {isEdit ? <Input label="Lead Number" value={formData.lead_number || ""} disabled /> : <div className="hidden lg:block"></div>}
              
              <Input
                label="Contact Person *"
                value={formData.contact_person}
                onChange={(e) => setField("contact_person", e.target.value)}
                error={!!errors.contact_person}
                helperText={errors.contact_person}
                disabled={readOnly}
              />
              <Input
                label="Designation"
                value={formData.designation}
                onChange={(e) => setField("designation", e.target.value)}
                disabled={readOnly}
              />

              <PhoneField
                name="mobile_number"
                label="Mobile *"
                value={formData.mobile_number}
                onChange={(v) => setField("mobile_number", typeof v === "string" ? v : v?.target?.value || "")}
                error={!!errors.mobile_number}
                helperText={errors.mobile_number}
                disabled={readOnly}
              />
              <PhoneField
                name="alternate_mobile_number"
                label="Alternate Mobile"
                value={formData.alternate_mobile_number}
                onChange={(v) => setField("alternate_mobile_number", typeof v === "string" ? v : v?.target?.value || "")}
                disabled={readOnly}
              />

              <Input
                label="Email"
                value={formData.email}
                onChange={(e) => setField("email", e.target.value)}
                error={!!errors.email}
                helperText={errors.email}
                disabled={readOnly}
              />
              <Input
                label="Website"
                value={formData.website}
                onChange={(e) => setField("website", e.target.value)}
                disabled={readOnly}
              />
            </FormGrid>
          </FormCard>

          <FormCard title="Address & Location">
            <FormGrid cols={2} className="gap-x-2 gap-y-1.5">
              <div className="col-span-2">
                <Input
                  label="Street Address"
                  value={formData.address}
                  onChange={(e) => setField("address", e.target.value)}
                  disabled={readOnly}
                />
              </div>
              <Input
                label="Area / Landmark"
                value={formData.area}
                onChange={(e) => setField("area", e.target.value)}
                disabled={readOnly}
              />
              <Input
                label="City"
                value={formData.city}
                onChange={(e) => setField("city", e.target.value)}
                disabled={readOnly}
              />
              <AutocompleteField
                label="State"
                referenceModel="state.model"
                asyncLoadOptions={(q) => getReferenceOptionsSearch("state.model", { q, limit: 20 })}
                getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
                value={
                  formData.state_id
                    ? { id: formData.state_id, name: formData.state }
                    : formData.state ? { name: formData.state } : null
                }
                onChange={(_e, v) => {
                  setField("state_id", v?.id ?? "");
                  setField("state", v?.name ?? v?.label ?? "");
                }}
                disabled={readOnly}
              />
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  label="Pincode"
                  value={formData.pincode}
                  onChange={(e) => setField("pincode", e.target.value)}
                  disabled={readOnly}
                />
                <Input
                  className="flex-1"
                  label="Country"
                  value={formData.country}
                  onChange={(e) => setField("country", e.target.value)}
                  disabled={readOnly}
                />
              </div>
            </FormGrid>
          </FormCard>

          <FormCard title="Business Info">
            <FormGrid cols={2} className="gap-x-2 gap-y-1.5">
              <Input
                label="GSTIN"
                value={formData.gstin}
                onChange={(e) => setField("gstin", e.target.value.toUpperCase())}
                error={!!errors.gstin}
                helperText={errors.gstin}
                disabled={readOnly}
              />
              <Input
                label="PAN"
                value={formData.pan_number}
                onChange={(e) => setField("pan_number", e.target.value.toUpperCase())}
                error={!!errors.pan_number}
                helperText={errors.pan_number}
                disabled={readOnly}
              />
              <Select
                label="Business Type"
                value={formData.business_type || ""}
                onChange={(e) => setField("business_type", e.target.value)}
                disabled={readOnly}
              >
                <MenuItem value="">Select</MenuItem>
                {B2B_BUSINESS_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
              <Input
                label="Industry"
                value={formData.industry}
                onChange={(e) => setField("industry", e.target.value)}
                disabled={readOnly}
              />
              <div className="col-span-2 grid grid-cols-3 gap-3">
                <Input
                  label="Annual Vol."
                  value={formData.annual_purchase_volume}
                  onChange={(e) => setField("annual_purchase_volume", e.target.value)}
                  disabled={readOnly}
                />
                <Input
                  label="Current Supplier"
                  value={formData.existing_supplier}
                  onChange={(e) => setField("existing_supplier", e.target.value)}
                  disabled={readOnly}
                />
                <Input
                  label="Existing ERP"
                  value={formData.existing_erp}
                  onChange={(e) => setField("existing_erp", e.target.value)}
                  disabled={readOnly}
                />
              </div>
            </FormGrid>
          </FormCard>
        </div>

        {/* RIGHT COLUMN: Metadata & Requirements */}
        <div className="lg:col-span-4 flex flex-col gap-1.5">
          
          <FormCard title="Assignment & Tracking">
            <div className="flex flex-col gap-1.5">
              <AutocompleteField
                label="Lead Source *"
                referenceModel="inquiry_source.model"
                asyncLoadOptions={(q) => getReferenceOptionsSearch("inquiry_source.model", { q, limit: 20 })}
                getOptionLabel={(o) => o?.source_name ?? o?.name ?? o?.label ?? ""}
                value={
                  formData.inquiry_source_id
                    ? { id: formData.inquiry_source_id, source_name: formData.inquiry_source_name }
                    : null
                }
                onChange={(_e, v) => {
                  setField("inquiry_source_id", v?.id ?? "");
                  setField("inquiry_source_name", v?.source_name ?? v?.name ?? "");
                }}
                error={!!errors.inquiry_source_id}
                helperText={errors.inquiry_source_id}
                disabled={readOnly}
              />
              <AutocompleteField
                label="Assigned To *"
                referenceModel="user.model"
                asyncLoadOptions={(q) => getReferenceOptionsSearch("user.model", { q, limit: 20 })}
                getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
                value={
                  formData.assigned_to
                    ? { id: formData.assigned_to, name: formData.assigned_to_name }
                    : null
                }
                onChange={(_e, v) => {
                  setField("assigned_to", v?.id ?? "");
                  setField("assigned_to_name", v?.name ?? "");
                }}
                error={!!errors.assigned_to}
                helperText={errors.assigned_to}
                disabled={readOnly}
              />
              <Select
                label="Priority"
                value={formData.priority}
                onChange={(e) => setField("priority", e.target.value)}
                disabled={readOnly}
              >
                {B2B_LEAD_PRIORITIES.map((p) => (
                  <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                ))}
              </Select>
              {isEdit && (
                <Select
                  label="Pipeline Stage"
                  value={formData.pipeline_stage || "new"}
                  onChange={(e) => {
                    setField("pipeline_stage", e.target.value);
                    if (e.target.value !== "lost") setField("lost_reason", "");
                  }}
                  disabled={readOnly}
                >
                  {B2B_PIPELINE_STAGE_OPTIONS.map((p) => (
                    <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                  ))}
                </Select>
              )}
              {isEdit && formData.pipeline_stage === "lost" && (
                <Select
                  label="Lost Reason"
                  value={formData.lost_reason || ""}
                  onChange={(e) => setField("lost_reason", e.target.value)}
                  disabled={readOnly}
                >
                  <MenuItem value="">Select</MenuItem>
                  {B2B_LOST_REASON_OPTIONS.map((p) => (
                    <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                  ))}
                </Select>
              )}
              {isEdit && formData.assigned_by_name && (
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100">
                  <span>Assigned By</span>
                  <span className="font-semibold text-slate-700">{formData.assigned_by_name}</span>
                </div>
              )}
            </div>
          </FormCard>

          <FormCard title="Requirements">
            <div className="flex flex-col gap-1.5">
              <Textarea
                label="Description"
                value={formData.requirement_description}
                onChange={(e) => setField("requirement_description", e.target.value)}
                disabled={readOnly}
                rows={2}
                className="text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Expected Qty"
                  value={formData.expected_quantity}
                  onChange={(e) => setField("expected_quantity", e.target.value)}
                  disabled={readOnly}
                />
                <Input
                  label="Budget"
                  type="number"
                  value={formData.expected_budget}
                  onChange={(e) => setField("expected_budget", e.target.value)}
                  disabled={readOnly}
                />
              </div>
              <DateField
                label="Expected Purchase Date"
                value={formData.expected_purchase_date}
                onChange={(v) => setField("expected_purchase_date", v)}
                disabled={readOnly}
              />
            </div>
          </FormCard>

          <FormCard title="Products of Interest" className="flex-1 flex flex-col">
            {!readOnly && (
              <AutocompleteField
                placeholder="Search products..."
                getOptionLabel={(o) => o ? `${o.product_code || o.id} – ${formatProductAutocompleteLabel(o)}` : ""}
                asyncLoadOptions={async (q) => {
                  const res = await productService.getProducts({
                    page: 1, limit: 30, q: q || undefined, allow_b2b_sales_only: true,
                  });
                  return res?.result?.data || res?.result || res?.data || [];
                }}
                value={null}
                onChange={addProduct}
              />
            )}
            {(formData.products || []).length > 0 ? (
              <div className="mt-2 flex flex-col gap-1 overflow-y-auto max-h-48 pr-1 custom-scrollbar">
                {(formData.products || []).map((p) => (
                  <div key={p.product_id} className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-100 rounded px-2 py-1 shadow-sm">
                    <span className="flex-1 truncate font-medium text-slate-700">{p.label || p.product_id}</span>
                    <input
                      type="text"
                      className="w-14 text-center rounded border-slate-300 border px-1 py-0.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                      placeholder="Qty"
                      value={p.quantity}
                      disabled={readOnly}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          products: prev.products.map((x) =>
                            Number(x.product_id) === Number(p.product_id) ? { ...x, quantity: e.target.value } : x
                          ),
                        }))
                      }
                    />
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => removeProduct(p.product_id)}
                        className="text-slate-400 hover:text-red-500 font-bold px-1"
                        title="Remove"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 text-center text-xs text-slate-400 italic">No products added</div>
            )}
          </FormCard>
          
        </div>
      </div>
      </form>

      {!readOnly && (
        <FormActions className="!pt-2 !pb-1">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <LoadingButton type="submit" form="b2b-lead-form" loading={loading}>
            {isEdit ? "Update Lead" : "Create Lead"}
          </LoadingButton>
        </FormActions>
      )}
    </FormContainer>
  );
}
