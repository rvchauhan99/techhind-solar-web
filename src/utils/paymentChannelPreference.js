const STORAGE_KEY = "solar_payment_channel";

const VALID_CHANNELS = new Set(["all", "b2b", "b2c"]);

export function getStoredPaymentChannel(fallback = "all") {
  if (typeof window === "undefined") return fallback;
  const value = sessionStorage.getItem(STORAGE_KEY);
  return VALID_CHANNELS.has(value) ? value : fallback;
}

export function setStoredPaymentChannel(channel) {
  if (typeof window === "undefined") return;
  if (VALID_CHANNELS.has(channel)) {
    sessionStorage.setItem(STORAGE_KEY, channel);
  }
}
