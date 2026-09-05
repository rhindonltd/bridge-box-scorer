"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  /**
   * Whether the current game state permits viewing this page. When false (and
   * once loading has resolved) the guard redirects to `redirectTo`.
   */
  allowed: boolean;
  /**
   * Whether the underlying state signal is still loading. While true the guard
   * renders a spinner and never redirects, so a page is not bounced away before
   * we know the real state.
   */
  loading: boolean;
  /** Where to send the user when the state does not permit this page. */
  redirectTo: string;
  children: React.ReactNode;
}

/**
 * Client-side guard that gates a manage sub-page on live game state (e.g.
 * "has the game started?" or "are all results in?"). Mirrors DirectorGuard but
 * keys off a derived state flag instead of the director token.
 *
 * While the state is loading it shows a spinner (matching the app's loading
 * treatment). Once resolved, it either renders the page (allowed) or redirects
 * back to the manage menu.
 */
export function GameStateGuard({
  allowed,
  loading,
  redirectTo,
  children,
}: Props) {
  const router = useRouter();

  useEffect(() => {
    if (!loading && !allowed) {
      router.replace(redirectTo);
    }
  }, [loading, allowed, redirectTo, router]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}
