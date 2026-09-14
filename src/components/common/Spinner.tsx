const SIZE_CLASSES = {
  md: "h-8 w-8",
  lg: "h-10 w-10",
} as const;

export type SpinnerSize = keyof typeof SIZE_CLASSES;

/**
 * The app's standard loading spinner (a spinning blue ring). Callers provide
 * their own centering wrapper; this is just the ring so it can sit inside a
 * full-screen loader, an inline row, or a button.
 *
 * `size` picks the ring diameter ("md" = h-8, "lg" = h-10); `className` appends
 * extra utility classes (e.g. margins) for the odd call site that needs them.
 */
export function Spinner({
  size = "md",
  className = "",
}: {
  size?: SpinnerSize;
  className?: string;
}) {
  return (
    <div
      className={`animate-spin ${SIZE_CLASSES[size]} border-4 border-blue-600 border-t-transparent rounded-full ${className}`.trim()}
    />
  );
}

/**
 * A full-height, centered loading state on the neutral play background — the
 * screen the play flow shows while a schedule or scored board is still loading.
 */
export function FullScreenSpinner() {
  return (
    <div className="h-dvh flex items-center justify-center bg-gray-100">
      <Spinner />
    </div>
  );
}

/**
 * A centered spinner with a caption beneath it — the "Loading…" screen used by
 * the route-level loading boundaries and full-page loaders.
 */
export function CaptionedSpinner({ caption }: { caption: string }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <Spinner className="mx-auto" />
        <p className="mt-4 text-gray-600">{caption}</p>
      </div>
    </div>
  );
}
