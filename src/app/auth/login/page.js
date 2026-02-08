"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/services/apiClient";
import { setTokens, setStoredProfile } from "@/lib/authStorage";
import TwoFactorSetup from "@/components/auth/TwoFactorSetup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Loader from "@/components/common/Loader";
import {
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconSolarElectricity,
} from "@tabler/icons-react";
export default function LoginPage() {
  const { user, setUser } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState("");
  const [cpSuccess, setCpSuccess] = useState("");

  const [mounted, setMounted] = useState(false);
  const [requireTwoFactor, setRequireTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [setupTwoFactor, setSetupTwoFactor] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      router.replace("/home");
    }
  }, [user, router]);

  const login = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const loginRes = await apiClient.post("/auth/login", { email, password });

      if (loginRes.data.status === false) {
        setError(loginRes?.data?.message || "Invalid credentials");
        return;
      }

      if (loginRes.data.result?.require_2fa) {
        setTempToken(loginRes.data.result.tempToken);
        setRequireTwoFactor(true);
        setLoading(false);
        return;
      }

      const { accessToken, refreshToken, first_login } = loginRes.data.result;

      setTokens(accessToken, refreshToken);

      if (first_login === false) {
        localStorage.setItem("requirePasswordChange", "1");
        setRequirePasswordChange(true);
        setLoading(false);
        return;
      }

      const profileRes = await apiClient.get("/auth/profile");
      const profile = profileRes.data.result;
      setUser(profile);
      setStoredProfile(profile);
      router.push("/home");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorVerify = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiClient.post("/auth/verify-2fa", {
        tempToken,
        code: twoFactorCode,
      });

      if (res.data.status === false) {
        setError(res?.data?.message || "Invalid code");
        return;
      }

      const { accessToken, refreshToken, first_login } = res.data.result;

      setTokens(accessToken, refreshToken);

      if (first_login === false) {
        localStorage.setItem("requirePasswordChange", "1");
        setRequirePasswordChange(true);
        setLoading(false);
        return;
      }

      const profileRes = await apiClient.get("/auth/profile");
      const profile = profileRes.data.result;
      setUser(profile);
      setStoredProfile(profile);
      router.push("/home");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setCpError("");
    setCpSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setCpError("All fields are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      setCpError("New password and confirm password must match");
      return;
    }

    setCpLoading(true);
    try {
      await apiClient.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setCpSuccess("Password changed successfully.");
      try {
        localStorage.removeItem("requirePasswordChange");
      } catch (e) {}

      setRequirePasswordChange(false);
      setSetupTwoFactor(true);
    } catch (err) {
      setCpError(err.response?.data?.message || "Could not change password");
    } finally {
      setCpLoading(false);
    }
  };

  const handleTwoFactorSetupComplete = async () => {
    try {
      const profileRes = await apiClient.get("/auth/profile");
      const profile = profileRes.data.result;
      setUser(profile);
      setStoredProfile(profile);
      router.push("/home");
    } catch (e) {
      router.push("/home");
    }
  };

  const handleCancelChangePassword = async () => {
    try {
      await apiClient.get("/auth/logout");
    } catch (err) {}
    try {
      localStorage.removeItem("requirePasswordChange");
    } catch (e) {}
    setRequirePasswordChange(false);
    router.replace("/auth/login");
  };

  if (!mounted) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader />
      </div>
    );
  }

  const pageTitle = requirePasswordChange
    ? "Change Password"
    : requireTwoFactor
      ? "2FA Verification"
      : setupTwoFactor
        ? "Setup Security"
        : "Welcome Back";

  const renderDescription = () => {
    if (requirePasswordChange) return "Update your password to continue.";
    if (requireTwoFactor) return "Enter code from authenticator app.";
    if (setupTwoFactor) return "Setup 2FA for enhanced security.";
    return "Enter credentials to access dashboard.";
  };

  return (
    <div className="space-y-6">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <IconSolarElectricity className="size-8" />
        </div>
        <h1 className="text-2xl font-bold">{pageTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {renderDescription()}
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

      {!requirePasswordChange && !requireTwoFactor && !setupTwoFactor && (
        <form onSubmit={login} className="flex flex-col gap-4">
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
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">PASSWORD</Label>
            <div className="relative">
              <IconLock className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <IconEyeOff className="size-5" />
                ) : (
                  <IconEye className="size-5" />
                )}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Sign In
              </span>
            ) : (
              "Sign In"
            )}
          </Button>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => router.push("/auth/forgot-password")}
            >
              Forgot Password?
            </Button>
          </div>
        </form>
      )}

      {requireTwoFactor && (
        <form onSubmit={handleTwoFactorVerify} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Input
              placeholder="000 000"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              maxLength={6}
              className="text-center text-lg font-semibold tracking-widest"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Verify
              </span>
            ) : (
              "Verify Identity"
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => {
              setRequireTwoFactor(false);
              setTempToken("");
            }}
          >
            Back to Login
          </Button>
        </form>
      )}

      {setupTwoFactor && (
        <TwoFactorSetup
          onComplete={handleTwoFactorSetupComplete}
          onSkip={handleTwoFactorSetupComplete}
        />
      )}

      {requirePasswordChange && (
        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
          {cpSuccess && (
            <div
              role="alert"
              className="rounded-md border border-green-500/50 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400"
            >
              {cpSuccess}
            </div>
          )}
          {cpError && (
            <div
              role="alert"
              className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {cpError}
            </div>
          )}

          {[
            {
              label: "Current",
              value: currentPassword,
              setter: setCurrentPassword,
              show: showCurrentPassword,
              setShow: setShowCurrentPassword,
            },
            {
              label: "New",
              value: newPassword,
              setter: setNewPassword,
              show: showNewPassword,
              setShow: setShowNewPassword,
            },
            {
              label: "Confirm New",
              value: confirmPassword,
              setter: setConfirmPassword,
              show: showConfirmPassword,
              setShow: setShowConfirmPassword,
            },
          ].map(({ label, value, setter, show, setShow }) => (
            <div key={label} className="space-y-2">
              <Label>{label.toUpperCase()} PASSWORD</Label>
              <div className="relative">
                <Input
                  type={show ? "text" : "password"}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {show ? (
                    <IconEyeOff className="size-5" />
                  ) : (
                    <IconEye className="size-5" />
                  )}
                </button>
              </div>
            </div>
          ))}

          <Button type="submit" disabled={cpLoading} className="w-full">
            {cpLoading ? (
              <span className="flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Update
              </span>
            ) : (
              "Update Password"
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground"
            onClick={handleCancelChangePassword}
          >
            Cancel
          </Button>
        </form>
      )}

      <p className="text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Solar Systems Inc.
      </p>
    </div>
  );
}
