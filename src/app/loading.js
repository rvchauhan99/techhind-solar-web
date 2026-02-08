export default function Loading() {
  return (
    <div
      className="bg-background flex min-h-dvh flex-1 items-center justify-center"
      role="status"
      aria-label="Loading"
    >
      <div
        className="border-primary size-10 animate-spin rounded-full border-2 border-t-transparent"
        aria-hidden
      />
    </div>
  );
}
