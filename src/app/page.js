"use client";

// This page should never render because middleware redirects / to /home or /auth/login
// But keeping it as a fallback just in case
export default function Home() {
  return null;
}
