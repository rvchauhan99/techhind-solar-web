"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import moment from "moment";
import mastersService, {
  getReferenceOptionsSearch,
} from "@/services/mastersService";
import companyService from "@/services/companyService";
import Input from "@/components/common/Input";
import Textarea from "@/components/common/Textarea";
import AutocompleteField from "@/components/common/AutocompleteField";
import DateField from "@/components/common/DateField";
import PhoneField from "@/components/common/PhoneField";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import { Button } from "@/components/ui/button";
import LoadingButton from "@/components/common/LoadingButton";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import AddressFields, { DEFAULT_COUNTRY, isIndiaCountry } from "@/components/common/AddressFields";
import { validatePostalCode } from "@/utils/validators";
import { toastError } from "@/utils/toast";

export default function MarketingLeadForm(props) {
  const { defaultValues: propDefaultValues, onSubmit, loading } = props;
  const defaultValues = propDefaultValues || {};
  const router = useRouter();
  const [formData, setFormData] = useState({
    ...defaultValues,
    country: defaultValues.country || DEFAULT_COUNTRY,
    state_text: defaultValues.state_text || "",
  });
  const [errors, setErrors] = useState({});

  const getOptionLabel = (opt) =>
    opt?.label ??
    opt?.name ??
    opt?.source_name ??
    (opt?.id != null ? String(opt.id) : "");

  const isEdit = useMemo(() => !!defaultValues?.id, [defaultValues]);

  useEffect(() => {
    const dv = defaultValues || {};
    setFormData((prev) => ({
      ...prev,
      ...dv,
      created_at: dv?.created_at
        ? moment(dv.created_at, ["YYYY-MM-DD", "DD-MM-YYYY"]).format(
            "YYYY-MM-DD"
          )
        : moment().format("YYYY-MM-DD"),
      next_follow_up_at: dv?.next_follow_up_at
        ? moment(dv.next_follow_up_at, ["YYYY-MM-DD", "DD-MM-YYYY"]).format(
            "YYYY-MM-DD"
          )
        : "",
      priority: dv?.priority || "medium",
      status: dv?.status || "new",
      country: dv?.country || prev.country || DEFAULT_COUNTRY,
      state_text: dv?.state_text || prev.state_text || "",
    }));
  }, [propDefaultValues]);

  useEffect(() => {
    const loadDefaultBranch = async () => {
      if (!isEdit && !formData.branch_id) {
        try {
          const defaultBranchRes = await companyService.getDefaultBranch();
          const br =
            defaultBranchRes?.result ||
            defaultBranchRes?.data ||
            defaultBranchRes;
          if (br?.id) {
            setFormData((prev) =>
              prev.branch_id
                ? prev
                : {
                    ...prev,
                    branch_id: br.id,
                  }
            );
          }
        } catch (err) {
          console.error("Failed to load default branch", err);
        }
      }
    };
    loadDefaultBranch();
  }, [isEdit, formData.branch_id]);

  useEffect(() => {
    const loadDefaultState = async () => {
      if (!isEdit && !formData.state_id) {
        try {
          const defaultStateRes = await mastersService.getDefaultState();
          const st =
            defaultStateRes?.result ||
            defaultStateRes?.data ||
            defaultStateRes;
          if (st?.id) {
            setFormData((prev) =>
              prev.state_id
                ? prev
                : {
                    ...prev,
                    state_id: st.id,
                  }
            );
          }
        } catch (err) {
          console.error("Failed to load default state", err);
        }
      }
    };
    loadDefaultState();
  }, [isEdit, formData.state_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "state_id") {
      setFormData((prev) => ({
        ...prev,
        state_id: value,
        city_id: "",
        city_name: "",
      }));
      if (errors.state_id || errors.city_id) {
        setErrors((prev) => {
          const copy = { ...prev };
          delete copy.state_id;
          delete copy.city_id;
          return copy;
        });
      }
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    const india = isIndiaCountry(formData.country);

    if (!formData.customer_name)
      newErrors.customer_name = "Customer name is required";
    if (!formData.mobile_number)
      newErrors.mobile_number = "Mobile number is required";
    if (!formData.inquiry_source_id)
      newErrors.inquiry_source_id = "Source is required";
    if (!formData.branch_id) newErrors.branch_id = "Branch is required";
    if (!formData.state_id) newErrors.state_id = "State is required";
    if (india) {
      if (!formData.city_id) newErrors.city_id = "City is required";
    }
    if (formData.pin_code && String(formData.pin_code).trim() !== "") {
      const postal = validatePostalCode(formData.pin_code, formData.country);
      if (!postal.isValid) newErrors.pin_code = postal.message;
    }

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      toastError("Please fix the highlighted fields");
      return;
    }

    setErrors({});
    onSubmit({
      ...formData,
      country: formData.country || DEFAULT_COUNTRY,
      state_id: formData.state_id || null,
      state_text: formData.state_text || "",
    });
  };

  return (
    <FormContainer>
      <form
        id="marketing-lead-form"
        onSubmit={handleSubmit}
        onKeyDown={preventEnterSubmit}
        className="mx-auto ml-2 pr-1 max-w-full"
        noValidate
      >
        <FormSection title="Lead Details">
          <FormGrid cols={3}>
            <Input
              name="customer_name"
              label="Customer Name"
              value={formData.customer_name || ""}
              onChange={handleChange}
              error={!!errors.customer_name}
              helperText={errors.customer_name}
              required
            />
            <PhoneField
              name="mobile_number"
              label="Mobile Number"
              value={formData.mobile_number || ""}
              onChange={handleChange}
              error={!!errors.mobile_number}
              helperText={errors.mobile_number}
              required
            />
            <AutocompleteField
              name="campaign_id"
              label="Campaign"
              asyncLoadOptions={(q) =>
                getReferenceOptionsSearch("campaign.model", { q, limit: 20 })
              }
              referenceModel="campaign.model"
              getOptionLabel={getOptionLabel}
              value={
                formData.campaign_id
                  ? { id: formData.campaign_id, name: formData.campaign_name }
                  : null
              }
              onChange={(e, v) => {
                handleChange({
                  target: { name: "campaign_id", value: v?.id ?? "" },
                });
                handleChange({
                  target: { name: "campaign_name", value: v?.name ?? "" },
                });
              }}
              placeholder="Type to search..."
            />
            <AutocompleteField
              name="inquiry_source_id"
              label="Source"
              asyncLoadOptions={(q) =>
                getReferenceOptionsSearch("inquiry_source.model", { q, limit: 20 })
              }
              referenceModel="inquiry_source.model"
              getOptionLabel={getOptionLabel}
              value={
                formData.inquiry_source_id
                  ? { id: formData.inquiry_source_id }
                  : null
              }
              onChange={(e, v) =>
                handleChange({
                  target: { name: "inquiry_source_id", value: v?.id ?? "" },
                })
              }
              placeholder="Type to search..."
              error={!!errors.inquiry_source_id}
              helperText={errors.inquiry_source_id}
              required
            />
            <AutocompleteField
              name="branch_id"
              label="Branch"
              asyncLoadOptions={(q) =>
                getReferenceOptionsSearch("company_branch.model", {
                  q,
                  limit: 20,
                })
              }
              referenceModel="company_branch.model"
              getOptionLabel={getOptionLabel}
              value={
                formData.branch_id ? { id: formData.branch_id } : null
              }
              onChange={(e, v) =>
                handleChange({
                  target: { name: "branch_id", value: v?.id ?? "" },
                })
              }
              placeholder="Type to search..."
              error={!!errors.branch_id}
              helperText={errors.branch_id}
              required
            />
            <DateField
              name="next_follow_up_at"
              label="Next Follow-Up"
              value={formData.next_follow_up_at || ""}
              onChange={handleChange}
            />
            <Input
              name="lead_segment"
              label="Segment"
              value={formData.lead_segment || ""}
              onChange={handleChange}
            />
            <Input
              name="product_interest"
              label="Product Interest"
              value={formData.product_interest || ""}
              onChange={handleChange}
            />
          </FormGrid>
        </FormSection>

        <FormSection title="Contact & Address">
          <FormGrid cols={3}>
            <Input
              name="company_name"
              label="Company Name"
              value={formData.company_name || ""}
              onChange={handleChange}
            />
            <Input
              name="email_id"
              label="Email"
              value={formData.email_id || ""}
              onChange={handleChange}
            />
            <Input
              name="alternate_mobile_number"
              label="Alternate Mobile"
              value={formData.alternate_mobile_number || ""}
              onChange={handleChange}
            />
            <AddressFields
              values={formData}
              onChange={handleChange}
              errors={errors}
              fieldNames={{
                country: "country",
                state_id: "state_id",
                state: "state_text",
                pincode: "pin_code",
              }}
              requiredState
            />
            <AutocompleteField
              key={`city-${formData.state_id || "none"}`}
              name="city_id"
              label="City"
              asyncLoadOptions={(q) => {
                if (!formData.state_id) return Promise.resolve([]);
                return getReferenceOptionsSearch("city.model", {
                  q,
                  limit: 40,
                  state_id: formData.state_id,
                });
              }}
              referenceModel="city.model"
              getOptionLabel={getOptionLabel}
              value={
                formData.city_id
                  ? { id: formData.city_id, name: formData.city_name }
                  : null
              }
              onChange={(e, v) => {
                setFormData((prev) => ({
                  ...prev,
                  city_id: v?.id ?? "",
                  city_name: v?.name ?? v?.label ?? "",
                }));
                if (errors.city_id) {
                  setErrors((prev) => {
                    const copy = { ...prev };
                    delete copy.city_id;
                    return copy;
                  });
                }
              }}
              placeholder="Type to search..."
              disabled={!formData.state_id}
              required={isIndiaCountry(formData.country)}
              error={!!errors.city_id}
              helperText={errors.city_id}
            />
            <Input
              name="address"
              label="Address"
              value={formData.address || ""}
              onChange={handleChange}
              multiline
              rows={2}
            />
            <Input
              name="landmark_area"
              label="Landmark / Area"
              value={formData.landmark_area || ""}
              onChange={handleChange}
            />
          </FormGrid>
        </FormSection>

        <FormSection title="Additional Info">
          <FormGrid cols={3}>
            <Input
              name="expected_capacity_kw"
              label="Expected Capacity (kW)"
              value={formData.expected_capacity_kw || ""}
              onChange={handleChange}
            />
            <Input
              name="expected_project_cost"
              label="Expected Project Cost"
              value={formData.expected_project_cost || ""}
              onChange={handleChange}
            />
            <Textarea
              name="remarks"
              label="Remarks"
              value={formData.remarks || ""}
              onChange={handleChange}
              minRows={5}
              className="md:col-span-2 lg:col-span-3"
            />
          </FormGrid>
        </FormSection>
      </form>
      <FormActions>
        <Button
          variant="outline"
          size="sm"
          className="mr-2"
          type="button"
          onClick={() => router.push("/marketing-leads")}
          disabled={loading}
        >
          Back
        </Button>
        <LoadingButton
          type="submit"
          form="marketing-lead-form"
          size="sm"
          loading={loading}
        >
          {isEdit ? "Update" : "Save"}
        </LoadingButton>
      </FormActions>
    </FormContainer>
  );
}

