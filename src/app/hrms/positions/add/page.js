"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import Textarea from "@/components/common/Textarea";
import AutocompleteField from "@/components/common/AutocompleteField";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import { getReferenceOptionsSearch } from "@/services/mastersService";

export default function HrmsPositionAddPage() {
  const router = useRouter();
  const [branchSelections, setBranchSelections] = useState([]);
  const [form, setForm] = useState({
    title: "",
    job_description: "",
    status: "active",
    branch_ids: [],
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!(form.branch_ids || []).length) errs.branch_ids = "Select at least one branch";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      await hrmsService.createPosition({
        title: form.title.trim(),
        job_description: form.job_description.trim() || null,
        status: form.status,
        branch_ids: form.branch_ids.map(Number),
      });
      toastSuccess("Position created");
      router.push("/hrms/positions");
    } catch (err) {
      toastErrorFromApi(err, "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Add position" listHref="/hrms/positions" listLabel="Open Positions">
        <form onSubmit={onSubmit} onKeyDown={preventEnterSubmit}>
          <FormContainer>
            <FormSection
              variant="card"
              title="Position"
              description="Assign one or more company branches. Candidates and interviews come in later slices."
            >
              <FormGrid>
                <FormField>
                  <Input
                    label="Title"
                    name="title"
                    value={form.title}
                    onChange={(e) => setField("title", e.target.value)}
                    error={!!errors.title}
                    helperText={errors.title}
                    required
                  />
                </FormField>
                <FormField>
                  <Select
                    label="Status"
                    name="status"
                    value={form.status}
                    onChange={(e) => setField("status", e.target.value)}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormField>
                <FormField className="sm:col-span-2">
                  <AutocompleteField
                    label="Branches"
                    name="branch_ids"
                    multiple
                    required
                    placeholder="Type to search branches…"
                    asyncLoadOptions={(q) =>
                      getReferenceOptionsSearch("company_branch.model", { q, limit: 20 })
                    }
                    getOptionLabel={(b) => b?.label ?? b?.name ?? b?.branch_name ?? ""}
                    value={branchSelections}
                    onChange={(_e, opts) => {
                      const list = Array.isArray(opts) ? opts : [];
                      setBranchSelections(list);
                      setField(
                        "branch_ids",
                        list.map((b) => b?.id ?? b?.value).filter((id) => id != null && id !== "")
                      );
                    }}
                    error={!!errors.branch_ids}
                    helperText={errors.branch_ids}
                  />
                </FormField>
              </FormGrid>

              <FormField className="mt-3">
                <Textarea
                  name="job_description"
                  label="Job description"
                  value={form.job_description}
                  onChange={(e) => setField("job_description", e.target.value)}
                  rows={6}
                  placeholder="Enter job description"
                />
              </FormField>
            </FormSection>
            <FormActions>
              <Button type="button" variant="outline" onClick={() => router.push("/hrms/positions")}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Save
              </Button>
            </FormActions>
          </FormContainer>
        </form>
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
