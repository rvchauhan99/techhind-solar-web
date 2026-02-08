"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import authService from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Loader from "@/components/common/Loader";
import { IconKey, IconArrowLeft } from "@tabler/icons-react";

function VerifyOtpPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      router.replace("/home");
    }
    if (!email) {
      router.replace("/auth/forgot-password");
    }
  }, [user, email, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      setLoading(false);
      return;
    }

    try {
      const res = await authService.verifyPasswordResetOtp(email, otp);

      if (res.status === false) {
        setError(res.message || "Invalid or expired OTP");
        return;
      }

      router.push(
        `/auth/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Invalid or expired OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setLoading(true);
    try {
      await authService.sendPasswordResetOtp(email);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to resend OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !email) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <IconKey className="size-8" />
        </div>
        <h1 className="text-2xl font-bold">Verify OTP</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the 6-digit code sent to
        </p>
        <p className="mt-0.5 text-sm font-semibold text-primary">{email}</p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          placeholder="000000"
          value={otp}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, "").slice(0, 6);
            setOtp(value);
          }}
          maxLength={6}
          className="text-center text-lg font-semibold tracking-[0.5em]"
        />

        <Button
          type="submit"
          disabled={loading || otp.length !== 6}
          className="w-full"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Verifying...
            </span>
          ) : (
            "Verify Code"
          )}
        </Button>

        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => router.push("/auth/forgot-password")}
          >
            <IconArrowLeft className="mr-2 size-4" />
            Back
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-primary font-semibold"
            onClick={handleResendOtp}
            disabled={loading}
          >
            Resend OTP
          </Button>
        </div>
      </form>

      <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-center text-xs text-muted-foreground">
        OTP expires in 10 minutes
      </p>

      <p className="text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Solar Systems Inc.
      </p>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader />
        </div>
      }
    >
      <VerifyOtpPageContent />
    </Suspense>
  );
}
