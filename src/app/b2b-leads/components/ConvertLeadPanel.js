"use client"

import { useEffect, useMemo, useState } from "react"
import Input from "@/components/common/Input"
import PhoneField from "@/components/common/PhoneField"
import AutocompleteField from "@/components/common/AutocompleteField"
import FormSection from "@/components/common/FormSection"
import FormGrid from "@/components/common/FormGrid"
import LoadingButton from "@/components/common/LoadingButton"
import { Button } from "@/components/ui/button"
import { getReferenceOptionsSearch } from "@/services/mastersService"
import { validateEmail, validateE164Phone, normalizeEmail } from "@/utils/validators"

const CONVERT_AS_CLIENT = "client"
const CONVERT_AS_CHANNEL_PARTNER = "channel_partner"

const buildUserDefaults = (lead) => ({
  name: lead?.contact_person || lead?.company_name || "",
  email: lead?.email || "",
  mobile_number: lead?.mobile_number || "",
  address: lead?.address || "",
  manager_id: "",
  manager_name: "",
})

export default function ConvertLeadPanel({
  lead,
  saving = false,
  onBack,
  onConfirm,
  showBack = true,
}) {
  const [convertAs, setConvertAs] = useState(CONVERT_AS_CLIENT)
  const [userForm, setUserForm] = useState(() => buildUserDefaults(lead))
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setConvertAs(CONVERT_AS_CLIENT)
    setUserForm(buildUserDefaults(lead))
    setErrors({})
  }, [lead?.id])

  const leadSummary = useMemo(
    () => (
      <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs space-y-1.5">
        <div className="flex gap-2">
          <span className="w-20 text-muted-foreground">Lead</span>
          <span className="font-medium">
            {lead?.company_name || "-"}{" "}
            {lead?.lead_number ? `(#${lead.lead_number})` : ""}
          </span>
        </div>
        <div className="flex gap-2">
          <span className="w-20 text-muted-foreground">Contact</span>
          <span>{lead?.contact_person || "-"}</span>
        </div>
        <div className="flex gap-2">
          <span className="w-20 text-muted-foreground">Mobile</span>
          <span>{lead?.mobile_number || "-"}</span>
        </div>
        <div className="flex gap-2">
          <span className="w-20 text-muted-foreground">City</span>
          <span>{lead?.city || "N/A"}</span>
        </div>
        <div className="flex gap-2">
          <span className="w-20 text-muted-foreground">GSTIN</span>
          <span>{lead?.gstin || "N/A"}</span>
        </div>
      </div>
    ),
    [lead]
  )

  const handleUserChange = (e) => {
    let { name, value } = e.target
    if (name === "email") value = normalizeEmail(value)
    setUserForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const validateChannelPartner = () => {
    const next = {}
    if (!String(userForm.name || "").trim()) next.name = "Name is required"
    if (!String(userForm.email || "").trim()) {
      next.email = "Email is required"
    } else {
      const emailValidation = validateEmail(userForm.email)
      if (!emailValidation.isValid) next.email = emailValidation.message
    }
    if (userForm.mobile_number && String(userForm.mobile_number).trim()) {
      const phoneValidation = validateE164Phone(userForm.mobile_number, { required: false })
      if (!phoneValidation.isValid) next.mobile_number = phoneValidation.message
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleConfirm = () => {
    if (convertAs === CONVERT_AS_CHANNEL_PARTNER) {
      if (!validateChannelPartner()) return
      onConfirm?.({
        convert_as: CONVERT_AS_CHANNEL_PARTNER,
        user: {
          name: String(userForm.name).trim(),
          email: normalizeEmail(userForm.email),
          mobile_number: userForm.mobile_number || null,
          address: userForm.address || null,
          manager_id: userForm.manager_id || null,
        },
      })
      return
    }
    onConfirm?.({ convert_as: CONVERT_AS_CLIENT })
  }

  return (
    <FormSection title="Convert B2B lead?">
      <div className="space-y-3 py-1 text-sm">
        <p className="text-muted-foreground">
          Choose how to convert this lead. It will be marked as{" "}
          <span className="font-semibold">Converted</span> and hidden from day-to-day lead views
          unless you filter by converted status.
        </p>
        {lead ? leadSummary : null}

        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-muted-foreground">Convert as</legend>
          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="radio"
                name="convert_as"
                value={CONVERT_AS_CLIENT}
                checked={convertAs === CONVERT_AS_CLIENT}
                onChange={() => setConvertAs(CONVERT_AS_CLIENT)}
                disabled={saving}
                className="accent-primary"
              />
              B2B Client
            </label>
            <label className="inline-flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="radio"
                name="convert_as"
                value={CONVERT_AS_CHANNEL_PARTNER}
                checked={convertAs === CONVERT_AS_CHANNEL_PARTNER}
                onChange={() => setConvertAs(CONVERT_AS_CHANNEL_PARTNER)}
                disabled={saving}
                className="accent-primary"
              />
              Channel Partner
            </label>
          </div>
        </fieldset>

        {convertAs === CONVERT_AS_CLIENT ? (
          <p className="text-muted-foreground text-xs">
            Creates a B2B client from this lead company and contact details.
          </p>
        ) : (
          <div className="space-y-2 rounded-md border border-border/60 p-2">
            <p className="text-xs text-muted-foreground">
              Creates a User Master account with role <span className="font-semibold">Channel Partner</span>.
              Lead team does not need full User Master access.
            </p>
            <FormGrid cols={2}>
              <Input
                name="name"
                label="Name"
                value={userForm.name}
                onChange={handleUserChange}
                required
                error={!!errors.name}
                helperText={errors.name}
                disabled={saving}
              />
              <Input
                name="email"
                label="Email"
                type="email"
                value={userForm.email}
                onChange={handleUserChange}
                required
                error={!!errors.email}
                helperText={errors.email}
                disabled={saving}
              />
              <PhoneField
                name="mobile_number"
                label="Mobile Number"
                value={userForm.mobile_number}
                onChange={handleUserChange}
                error={!!errors.mobile_number}
                helperText={errors.mobile_number}
                disabled={saving}
              />
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                  Channel Partner
                </div>
              </div>
              <div className="sm:col-span-2">
                <Input
                  name="address"
                  label="Address"
                  value={userForm.address}
                  onChange={handleUserChange}
                  disabled={saving}
                />
              </div>
              <div className="sm:col-span-2">
                <AutocompleteField
                  label="Manager"
                  referenceModel="user.model"
                  asyncLoadOptions={(q) =>
                    getReferenceOptionsSearch("user.model", { q, limit: 20 })
                  }
                  getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
                  value={
                    userForm.manager_id
                      ? { id: userForm.manager_id, name: userForm.manager_name }
                      : null
                  }
                  onChange={(_e, v) => {
                    setUserForm((prev) => ({
                      ...prev,
                      manager_id: v?.id ?? "",
                      manager_name: v?.name ?? "",
                    }))
                  }}
                  disabled={saving}
                />
              </div>
            </FormGrid>
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t pt-3 sm:flex-row sm:justify-end">
        {showBack && onBack ? (
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={onBack}
            disabled={saving}
          >
            Back
          </Button>
        ) : null}
        <LoadingButton
          size="sm"
          type="button"
          onClick={handleConfirm}
          loading={saving}
        >
          {convertAs === CONVERT_AS_CHANNEL_PARTNER
            ? "Convert to Channel Partner"
            : "Convert to Client"}
        </LoadingButton>
      </div>
    </FormSection>
  )
}

export { CONVERT_AS_CLIENT, CONVERT_AS_CHANNEL_PARTNER }
