"use client";

export default function Loader() {
  return (
    <div className="flex justify-center mt-10">
      <div
        className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
