"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import authService from "@/services/authService";
import { toastSuccess, toastError } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Loader from "@/components/common/Loader";
import { IconLock, IconArrowLeft } from "@tabler/icons-react";

function ResetPasswordPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const otp = searchParams.get("otp") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      router.replace("/home");
    }
    if (!email || !otp) {
      router.replace("/auth/forgot-password");
    }
  }, [user, email, otp, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newPassword || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password must match");
      return;
    }

    setLoading(true);

    try {
      const res = await authService.resetPassword(
        email,
        otp,
        newPassword,
        confirmPassword
      );

      if (res.status === false) {
        const msg = res.message || "Failed to reset password";
        setError(msg);
        toastError(msg);
        return;
      }

      const successMsg = "Password reset successfully! Redirecting to login...";
      setSuccess(successMsg);
      toastSuccess(successMsg);

      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to reset password. Please try again.";
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !email || !otp) {
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
          <IconLock className="size-8" />
        </div>
        <h1 className="text-2xl font-bold">Reset Password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your new password
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
          <Label htmlFor="new-password">NEW PASSWORD</Label>
          <div className="relative">
            <IconLock className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="new-password"
              type={showNewPassword ? "text" : "password"}
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading || !!success}
              className="pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showNewPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">CONFIRM NEW PASSWORD</Label>
          <div className="relative">
            <IconLock className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading || !!success}
              className="pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
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
              Resetting...
            </span>
          ) : success ? (
            "Redirecting..."
          ) : (
            "Reset Password"
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="text-muted-foreground"
          onClick={() =>
            router.push(`/auth/verify-otp?email=${encodeURIComponent(email)}`)
          }
          disabled={loading || !!success}
        >
          <IconArrowLeft className="mr-2 size-4" />
          Back to Verify OTP
        </Button>
      </form>

      <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-center text-xs text-muted-foreground">
        Password must be at least 6 characters long
      </p>

      <p className="text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Solar Systems Inc.
      </p>
    </div>
  );
}

function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader />
        </div>
      }
    >
      <ResetPasswordPageContent />
    </Suspense>
  );
}

export default ResetPasswordPage;
