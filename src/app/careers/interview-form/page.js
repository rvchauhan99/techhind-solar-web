"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getPublicInterviewForm,
  submitPublicInterviewForm,
} from "@/services/publicHrmsService";

function InterviewFormInner() {
  const search = useSearchParams();
  const token = search.get("token") || "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [positionTitle, setPositionTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    mobile: "",
    reference: "",
    date_of_birth: "",
    gender: "",
    marital_status: "",
    address: "",
    state: "",
    city: "",
    education: "",
    experience: "",
    current_designation: "",
    current_ctc: "",
    expected_ctc: "",
    in_hand_salary: "",
    describe_yourself: "",
    same_field: "",
    experience_in_field: "",
    job_responsibilities: "",
    why_this_job: "",
    previous_job_status: "",
    days_left: "",
    gap_months: "",
    join_timeline: "",
    notice_period_days: "",
    solar_experience: "",
    currently_working: "",
    ready_for_travel: "",
    own_vehicle: "",
    resume_url: "",
    notes: "",
  });

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Missing form token");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await getPublicInterviewForm(token);
        const row = res?.result || res?.data || res || {};
        if (cancelled) return;
        setPositionTitle(row.position_title || "");
        setJobDescription(row.job_description || "");
        setForm((f) => ({
          ...f,
          first_name: row.first_name || "",
          last_name: row.last_name || "",
          email: row.email || "",
          mobile: row.mobile || "",
          reference: row.reference || "",
          date_of_birth: row.date_of_birth || "",
          gender: row.gender || "",
          marital_status: row.marital_status || "",
          address: row.address || "",
          state: row.state || "",
          city: row.city || "",
          education: row.education || "",
          experience: row.experience || "",
          current_designation: row.current_designation || "",
          current_ctc: row.current_ctc != null ? String(row.current_ctc) : "",
          expected_ctc: row.expected_ctc != null ? String(row.expected_ctc) : "",
          in_hand_salary: row.in_hand_salary != null ? String(row.in_hand_salary) : "",
          describe_yourself: row.describe_yourself || "",
          same_field: row.same_field || "",
          experience_in_field: row.experience_in_field || "",
          job_responsibilities: row.job_responsibilities || "",
          why_this_job: row.why_this_job || "",
          previous_job_status: row.previous_job_status || "",
          days_left: row.days_left != null ? String(row.days_left) : "",
          gap_months: row.gap_months != null ? String(row.gap_months) : "",
          join_timeline: row.join_timeline || "",
          notice_period_days: row.notice_period_days != null ? String(row.notice_period_days) : "",
          solar_experience: row.solar_experience || "",
          currently_working: row.currently_working || "",
          ready_for_travel: row.ready_for_travel || "",
          own_vehicle: row.own_vehicle || "",
          resume_url: row.resume_url || "",
        }));
        if (row.is_form_filled) setSuccess(true);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Unable to load form");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await submitPublicInterviewForm(token, {
        ...form,
        current_ctc: form.current_ctc !== "" ? Number(form.current_ctc) : null,
        expected_ctc: form.expected_ctc !== "" ? Number(form.expected_ctc) : null,
        in_hand_salary: form.in_hand_salary !== "" ? Number(form.in_hand_salary) : null,
        days_left: form.days_left !== "" ? Number(form.days_left) : null,
        gap_months: form.gap_months !== "" ? Number(form.gap_months) : null,
        notice_period_days: form.notice_period_days !== "" ? Number(form.notice_period_days) : null,
      });
      setSuccess(true);
    } catch (err) {
      setError(err?.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-lg p-6 text-sm text-muted-foreground">Loading form…</div>;
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <h1 className="text-lg font-semibold text-[#1b365d]">Thank you</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your interview form has been submitted. Our HR team will contact you.
        </p>
      </div>
    );
  }

  const yesNo = [
    ["same_field", "Are you in the same field as applied?"],
    ["currently_working", "Currently working?"],
    ["ready_for_travel", "Ready for travel & field job?"],
    ["own_vehicle", "Own vehicle & license?"],
  ];

  return (
    <div className="mx-auto max-w-lg p-4 sm:p-6">
      <h1 className="text-lg font-semibold text-[#1b365d]">Interview form</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        {positionTitle ? `Position: ${positionTitle}` : "Complete your details for recruitment."}
      </p>
      {jobDescription ? (
        <div className="mt-2 rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground whitespace-pre-wrap">
          {jobDescription}
        </div>
      ) : null}
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      <form onSubmit={onSubmit} className="mt-4 grid gap-3">
        {[
          ["first_name", "First name", true],
          ["last_name", "Last name", true],
          ["email", "Email", true],
          ["mobile", "Mobile (10 digits)", true],
          ["reference", "Reference", false],
          ["date_of_birth", "Date of birth (YYYY-MM-DD)", true],
          ["gender", "Gender", true],
          ["marital_status", "Marital status (married/unmarried)", true],
          ["state", "Current State", true],
          ["city", "Current City", true],
          ["education", "Education Qualification", true],
          ["experience", "Total Experience", true],
          ["current_designation", "Current Designation", false],
          ["solar_experience", "Solar Industry Experience", true],
          ["current_ctc", "Current CTC", false],
          ["expected_ctc", "Expected CTC", true],
          ["in_hand_salary", "Month In Hand Salary", true],
          ["join_timeline", "Join timeline (immediate/15_days/1_month/2_month)", true],
          ["notice_period_days", "Notice Period (Days)", true],
          ["previous_job_status", "Status at previous job", false],
          ["days_left", "How many days left?", false],
          ["gap_months", "Gap in months", false],
          ["resume_url", "Resume URL", true],
        ].map(([key, label, required]) => (
          <label key={key} className="grid gap-1 text-xs font-medium">
            {label}
            {required ? <span className="text-destructive"> *</span> : null}
            <input
              className="h-9 rounded-md border px-2 text-sm"
              value={form[key]}
              onChange={(e) => setField(key, e.target.value)}
              required={required}
            />
          </label>
        ))}
        {yesNo.map(([key, label]) => (
          <label key={key} className="grid gap-1 text-xs font-medium">
            {label} <span className="text-destructive">*</span>
            <select
              className="h-9 rounded-md border px-2 text-sm"
              value={form[key]}
              onChange={(e) => setField(key, e.target.value)}
              required
            >
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
        ))}
        <label className="grid gap-1 text-xs font-medium">
          Experience in this field <span className="text-destructive">*</span>
          <select
            className="h-9 rounded-md border px-2 text-sm"
            value={form.experience_in_field}
            onChange={(e) => setField("experience_in_field", e.target.value)}
            required
          >
            <option value="">Select</option>
            <option value="0-1">0 - 1 Year</option>
            <option value="1-3">1 - 3 Year</option>
            <option value="3-5">3 - 5 Year</option>
            <option value="5+">5+ Year</option>
          </select>
        </label>
        {[
          ["address", "Address", true],
          ["describe_yourself", "Describe yourself", true],
          ["job_responsibilities", "Current job responsibilities", false],
          ["why_this_job", "Why do you want this job?", true],
          ["notes", "Notes", false],
        ].map(([key, label, required]) => (
          <label key={key} className="grid gap-1 text-xs font-medium">
            {label}
            {required ? <span className="text-destructive"> *</span> : null}
            <textarea
              className="min-h-[72px] rounded-md border px-2 py-1 text-sm"
              value={form[key]}
              onChange={(e) => setField(key, e.target.value)}
              required={required}
            />
          </label>
        ))}
        <button
          type="submit"
          disabled={submitting || !token}
          className="h-9 rounded-md bg-[#1b365d] px-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit"}
        </button>
      </form>
    </div>
  );
}

export default function InterviewFormPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <InterviewFormInner />
    </Suspense>
  );
}
