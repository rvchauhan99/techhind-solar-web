"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import authService from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Loader from "@/components/common/Loader";
import { IconMail, IconSolarElectricity, IconArrowLeft } from "@tabler/icons-react";

export default function ForgotPasswordPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      router.replace("/home");
    }
  }, [user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!email) {
      setError("Email is required");
      setLoading(false);
      return;
    }

    try {
      const res = await authService.sendPasswordResetOtp(email);

      if (res.status === false) {
        setError(res.message || "Failed to send OTP");
        return;
      }

      setSuccess(
        "If the email exists, a password reset OTP has been sent to your email."
      );

      setTimeout(() => {
        router.push(`/auth/verify-otp?email=${encodeURIComponent(email)}`);
      }, 2000);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
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
          <IconSolarElectricity className="size-8" />
        </div>
        <h1 className="text-2xl font-bold">Forgot Password?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your email to receive a reset code
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="alert"
          className="rounded-md border border-green-500/50 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400"
        >
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">EMAIL ADDRESS</Label>
          <div className="relative">
            <IconMail className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || !!success}
              className="pl-10"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || !!success}
          className="w-full"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Sending...
            </span>
          ) : success ? (
            "Redirecting..."
          ) : (
            "Send Reset Code"
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => router.push("/auth/login")}
        >
          <IconArrowLeft className="mr-2 size-4" />
          Back to Login
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Solar Systems Inc.
      </p>
    </div>
  );
}
