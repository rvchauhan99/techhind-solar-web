"use client";

import { useEffect, useMemo, useState } from "react";
import { listPublicPositions, submitPublicApplication } from "@/services/publicHrmsService";
import { IconBriefcase, IconCircleCheck } from "@tabler/icons-react";

function unwrapResult(res) {
  if (Array.isArray(res?.result)) return res.result;
  if (Array.isArray(res)) return res;
  return [];
}

export default function CareersPage() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(null);
  const [form, setForm] = useState({
    position_id: "",
    first_name: "",
    last_name: "",
    email: "",
    mobile: "",
    reference: "",
    notes: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
        setLoadError((prev) => prev || "Timed out loading open roles");
      }
    }, 8000);

    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const res = await listPublicPositions();
        if (cancelled) return;
        const rows = unwrapResult(res);
        setPositions(rows);
        if (rows.length === 1) {
          setForm((f) => ({ ...f, position_id: String(rows[0].id) }));
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err?.message || err?.data?.message || "Unable to load open roles");
        }
      } finally {
        clearTimeout(timer);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const selected = useMemo(
    () => positions.find((p) => String(p.id) === String(form.position_id)) || null,
    [positions, form.position_id]
  );

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.position_id) errs.position_id = "Select a role";
    if (!form.first_name.trim()) errs.first_name = "First name is required";
    if (!form.last_name.trim()) errs.last_name = "Last name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    if (!form.mobile.trim()) errs.mobile = "Mobile is required";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await submitPublicApplication({
        position_id: Number(form.position_id),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        reference: form.reference.trim() || null,
        notes: form.notes.trim() || null,
      });
      setSuccess(res?.result || res);
      setForm((f) => ({
        ...f,
        first_name: "",
        last_name: "",
        email: "",
        mobile: "",
        reference: "",
        notes: "",
      }));
    } catch (err) {
      setSubmitError(err?.message || err?.data?.message || "Application failed");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass =
    "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900/5 text-slate-900">
            <IconBriefcase className="size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Careers</h1>
          <p className="mt-1 text-sm text-slate-600">
            Browse open roles and submit a short application.
          </p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-slate-200" />
            ))}
          </div>
        ) : null}

        {!loading && loadError ? (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {loadError}
          </div>
        ) : null}

        {!loading && !loadError && !positions.length ? (
          <div className="rounded-md border border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-600">
            No open roles right now. Please check back later.
          </div>
        ) : null}

        {!loading && !loadError && positions.length ? (
          <div className="space-y-6">
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Open roles
              </h2>
              <ul className="space-y-2">
                {positions.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                        String(form.position_id) === String(p.id)
                          ? "border-slate-900 bg-slate-50"
                          : "border-slate-200"
                      }`}
                      onClick={() => setField("position_id", String(p.id))}
                    >
                      <div className="font-medium">{p.title}</div>
                      {p.job_description ? (
                        <p className="mt-1 line-clamp-2 text-slate-600">{p.job_description}</p>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-1 text-base font-semibold">Apply</h2>
              {selected ? (
                <p className="mb-3 text-sm text-slate-600">Applying for: {selected.title}</p>
              ) : (
                <p className="mb-3 text-sm text-slate-600">
                  Select a role above, then complete the form.
                </p>
              )}

              {success ? (
                <div className="mb-4 rounded-md border border-green-400 bg-green-50 px-3 py-3 text-sm text-green-800">
                  <div className="mb-1 flex items-center gap-2 font-medium">
                    <IconCircleCheck className="size-4" />
                    Application submitted
                  </div>
                  <p>
                    Thanks {success.first_name}. Your application is recorded as{" "}
                    {success.stage_label || "Applied"}.
                  </p>
                </div>
              ) : null}

              {submitError ? (
                <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {submitError}
                </div>
              ) : null}

              <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium">
                    Role <span className="text-red-600">*</span>
                  </span>
                  <select
                    className={fieldClass}
                    name="position_id"
                    value={form.position_id}
                    onChange={(e) => setField("position_id", e.target.value)}
                    required
                  >
                    <option value="">Select role</option>
                    {positions.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                  {errors.position_id ? (
                    <span className="mt-1 block text-xs text-red-600">{errors.position_id}</span>
                  ) : null}
                </label>

                <label className="block text-sm">
                  <span className="font-medium">
                    First name <span className="text-red-600">*</span>
                  </span>
                  <input
                    className={fieldClass}
                    name="first_name"
                    value={form.first_name}
                    onChange={(e) => setField("first_name", e.target.value)}
                    required
                  />
                  {errors.first_name ? (
                    <span className="mt-1 block text-xs text-red-600">{errors.first_name}</span>
                  ) : null}
                </label>

                <label className="block text-sm">
                  <span className="font-medium">
                    Last name <span className="text-red-600">*</span>
                  </span>
                  <input
                    className={fieldClass}
                    name="last_name"
                    value={form.last_name}
                    onChange={(e) => setField("last_name", e.target.value)}
                    required
                  />
                  {errors.last_name ? (
                    <span className="mt-1 block text-xs text-red-600">{errors.last_name}</span>
                  ) : null}
                </label>

                <label className="block text-sm">
                  <span className="font-medium">
                    Email <span className="text-red-600">*</span>
                  </span>
                  <input
                    className={fieldClass}
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    required
                  />
                  {errors.email ? (
                    <span className="mt-1 block text-xs text-red-600">{errors.email}</span>
                  ) : null}
                </label>

                <label className="block text-sm">
                  <span className="font-medium">
                    Mobile <span className="text-red-600">*</span>
                  </span>
                  <input
                    className={fieldClass}
                    name="mobile"
                    value={form.mobile}
                    onChange={(e) => setField("mobile", e.target.value)}
                    required
                  />
                  {errors.mobile ? (
                    <span className="mt-1 block text-xs text-red-600">{errors.mobile}</span>
                  ) : null}
                </label>

                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium">Reference (optional)</span>
                  <input
                    className={fieldClass}
                    name="reference"
                    value={form.reference}
                    onChange={(e) => setField("reference", e.target.value)}
                  />
                </label>

                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium">Notes (optional)</span>
                  <textarea
                    className={fieldClass}
                    name="notes"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                  />
                </label>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={submitting || !positions.length}
                    className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {submitting ? "Submitting…" : "Submit application"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
