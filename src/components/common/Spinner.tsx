/**
 * The app's standard loading spinner (a spinning blue ring). Callers provide
 * their own centering wrapper; this is just the ring so it can sit inside a
 * full-screen loader, an inline row, or a button.
 */
export function Spinner() {
  return (
    <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
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
