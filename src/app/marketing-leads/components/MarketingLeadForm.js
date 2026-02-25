"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import moment from "moment";
import mastersService, {
  getReferenceOptionsSearch,
} from "@/services/mastersService";
import companyService from "@/services/companyService";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import DateField from "@/components/common/DateField";
import PhoneField from "@/components/common/PhoneField";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import { Button } from "@/components/ui/button";
import LoadingButton from "@/components/common/LoadingButton";

export default function MarketingLeadForm(props) {
  const { defaultValues: propDefaultValues, onSubmit, loading } = props;
  const defaultValues = propDefaultValues || {};
  const router = useRouter();
  const [formData, setFormData] = useState(defaultValues);
  const [errors, setErrors] = useState({});

  const getOptionLabel = (opt) =>
    opt?.label ??
    opt?.name ??
    opt?.source_name ??
    (opt?.id != null ? String(opt.id) : "");

  const [options, setOptions] = useState({
    states: [],
    cities: [],
  });

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
    }));
  }, [propDefaultValues]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [statesRes, citiesRes] = await Promise.all([
          mastersService.getReferenceOptions("state.model"),
          mastersService.getReferenceOptions("city.model"),
        ]);
        setOptions({
          states: statesRes?.result || [],
          cities: citiesRes?.result || [],
        });
      } catch (err) {
        console.error("Failed to load reference options", err);
      }
    };
    loadOptions();
  }, [isEdit]);

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
      }));
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

    if (!formData.customer_name)
      newErrors.customer_name = "Customer name is required";
    if (!formData.mobile_number)
      newErrors.mobile_number = "Mobile number is required";
    if (!formData.inquiry_source_id)
      newErrors.inquiry_source_id = "Source is required";
    if (!formData.branch_id) newErrors.branch_id = "Branch is required";

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSubmit(formData);
  };

  return (
    <FormContainer>
      <form
        id="marketing-lead-form"
        onSubmit={handleSubmit}
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
            <Input
              name="campaign_name"
              label="Campaign"
              value={formData.campaign_name || ""}
              onChange={handleChange}
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
            <AutocompleteField
              name="state_id"
              label="State"
              options={options.states}
              getOptionLabel={getOptionLabel}
              value={
                options.states.find((s) => s.id == formData.state_id) ||
                (formData.state_id ? { id: formData.state_id } : null)
              }
              onChange={(e, v) =>
                handleChange({
                  target: { name: "state_id", value: v?.id ?? "" },
                })
              }
              placeholder="Type to search..."
              usePortal
            />
            <AutocompleteField
              name="city_id"
              label="City"
              usePortal
              dropdownPlacement="top"
              options={options.cities.filter((c) => {
                if (!formData.state_id) return false;
                const cityStateId =
                  typeof c.state_id === "string"
                    ? parseInt(c.state_id, 10)
                    : c.state_id;
                const selectedStateId =
                  typeof formData.state_id === "string"
                    ? parseInt(formData.state_id, 10)
                    : formData.state_id;
                return cityStateId === selectedStateId;
              })}
              getOptionLabel={getOptionLabel}
              value={(() => {
                const filtered = options.cities.filter((c) => {
                  if (!formData.state_id) return false;
                  const cityStateId =
                    typeof c.state_id === "string"
                      ? parseInt(c.state_id, 10)
                      : c.state_id;
                  const selectedStateId =
                    typeof formData.state_id === "string"
                      ? parseInt(formData.state_id, 10)
                      : formData.state_id;
                  return cityStateId === selectedStateId;
                });
                return (
                  filtered.find((c) => c.id == formData.city_id) ||
                  (formData.city_id ? { id: formData.city_id } : null)
                );
              })()}
              onChange={(e, v) =>
                handleChange({
                  target: { name: "city_id", value: v?.id ?? "" },
                })
              }
              placeholder="Type to search..."
              disabled={!formData.state_id}
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
            <Input
              name="pin_code"
              label="Pin Code"
              value={formData.pin_code || ""}
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
            <Input
              name="remarks"
              label="Remarks"
              value={formData.remarks || ""}
              onChange={handleChange}
              multiline
              rows={3}
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

