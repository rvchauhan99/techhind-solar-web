const STORAGE_KEY = "solar_payment_channel";

export function getStoredPaymentChannel(fallback = "b2c") {
  if (typeof window === "undefined") return fallback;
  const value = sessionStorage.getItem(STORAGE_KEY);
  return value === "b2b" || value === "b2c" ? value : fallback;
}

export function setStoredPaymentChannel(channel) {
  if (typeof window === "undefined") return;
  if (channel === "b2b" || channel === "b2c") {
    sessionStorage.setItem(STORAGE_KEY, channel);
  }
}
