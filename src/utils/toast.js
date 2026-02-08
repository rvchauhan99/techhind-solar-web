/**
 * Central toast utility for ERP-level consistency.
 * Toasts appear top-right. Colors: Green = success, Red = error, Yellow = warning.
 * Use these helpers so all call sites share the same API and styling.
 */
import { toast as sonnerToast } from "sonner";

export function toastSuccess(message) {
    return sonnerToast.success(message);
}

export function toastError(message) {
    return sonnerToast.error(message);
}

export function toastWarning(message) {
    return sonnerToast.warning(message);
}

export function toastInfo(message) {
    return sonnerToast.info(message);
}

/**
 * Show error toast from an API/axios error.
 * Uses error.response?.data?.message or error.message, or fallback.
 */
export function toastErrorFromApi(error, fallback = "Something went wrong") {
    const message =
        error?.response?.data?.message ||
        error?.message ||
        (typeof fallback === "string" ? fallback : "Something went wrong");
    return sonnerToast.error(message);
}

// Re-export raw toast for edge cases (e.g. toast.promise, custom options)
export { sonnerToast as toast };
