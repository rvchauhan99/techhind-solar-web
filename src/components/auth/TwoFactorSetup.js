"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import apiClient from "@/services/apiClient";

export default function TwoFactorSetup({ onComplete, onSkip }) {
  const [step, setStep] = useState("intro"); // intro, qr, verify
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.post("/auth/2fa/generate");
      setQrCode(res.data.result.qrCodeUrl);
      setSecret(res.data.result.secret);
      setStep("qr");
    } catch (err) {
      setError("Could not generate QR code");
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async () => {
    setLoading(true);
    setError("");
    try {
      await apiClient.post("/auth/2fa/enable", { code });
      if (onComplete) onComplete();
    } catch (err) {
      setError(err.response?.data?.message || "Invalid Code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 space-y-4">
      <h2 className="text-lg font-semibold">Two-Factor Authentication</h2>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {step === "intro" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            To enhance your account security, we recommend enabling Two-Factor
            Authentication (2FA).
          </p>
          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? "Generating..." : "Setup 2FA"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={onSkip}>
            Skip for now
          </Button>
        </div>
      )}

      {step === "qr" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            1. Scan this QR code with your authenticator app.
          </p>
          <div className="flex justify-center">
            <img
              src={qrCode}
              alt="QR Code"
              className="max-w-full rounded border border-border p-1"
            />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Secret: {secret}
          </p>

          <p className="mt-4 text-sm text-muted-foreground">
            2. Enter the 6-digit code to verify.
          </p>
          <div className="space-y-2">
            <Label htmlFor="2fa-code">Authentication Code</Label>
            <Input
              id="2fa-code"
              value={code}
              onChange={(e) => setCode(e.target.value.slice(0, 6))}
              maxLength={6}
              placeholder="000000"
            />
          </div>
          <Button
            className="w-full"
            onClick={handleEnable}
            disabled={loading || code.length !== 6}
          >
            {loading ? "Verifying..." : "Verify & Enable"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={onSkip}>
            Skip
          </Button>
        </div>
      )}
    </div>
  );
}
