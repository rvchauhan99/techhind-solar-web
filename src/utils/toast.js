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
 * Extract a user-readable message from an API/axios error.
 */
export function getApiErrorMessage(error, fallback = "Something went wrong") {
    const data = error?.response?.data;

    if (!data) {
        return error?.message || fallback;
    }

    if (typeof data.message === "string" && data.message && data.message !== "Validation error") {
        return data.message;
    }

    if (Array.isArray(data.errors) && data.errors.length > 0) {
        return data.errors
            .map((entry) => (typeof entry === "string" ? entry : entry?.message))
            .filter(Boolean)
            .join("; ");
    }

    if (data.message === "Validation error") {
        return "Validation failed. Please check transfer details and serial numbers.";
    }

    return error?.message || fallback;
}

/**
 * Show error toast from an API/axios error.
 * Uses error.response?.data?.message or error.message, or fallback.
 */
export function toastErrorFromApi(error, fallback = "Something went wrong") {
    return sonnerToast.error(getApiErrorMessage(error, fallback));
}

// Re-export raw toast for edge cases (e.g. toast.promise, custom options)
export { sonnerToast as toast };
