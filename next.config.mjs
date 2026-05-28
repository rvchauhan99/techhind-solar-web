/** @type {import('next').NextConfig} */
const extraDevOrigins = (process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow phone/LAN access to dev server (QR warranty verify, etc.)
  allowedDevOrigins: [
    ...extraDevOrigins,
    "192.168.*",
    "10.*",
    "172.*",
  ],
};

export default nextConfig;
