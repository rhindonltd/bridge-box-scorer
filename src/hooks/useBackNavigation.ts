"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasInAppHistory, recordAppNavigation } from "@/lib/nav-history";

/**
 * Records in-app navigations so {@link useBackNavigation} can tell whether
 * `router.back()` is safe. Mount this ONCE near the app root. It watches the
 * App Router pathname and reports every change after the first render as an
 * in-app navigation.
 *
 * The very first render is the app's entry point (a fresh load, reload, or
 * direct link), so it is NOT counted — there is nothing of ours to go back to
 * yet. Each subsequent pathname change is a client-side navigation that pushes
 * an entry we own.
 */
export function useTrackAppNavigation(): void {
  const pathname = usePathname();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    recordAppNavigation();
  }, [pathname]);
}

/**
 * Standard "go back" behaviour for the app header.
 *
 * Returns an `onBack` callback that pops the navigation stack when there is an
 * in-app entry to return to, and otherwise navigates to `fallbackHref` (via
 * `replace`, so the current entry is swapped rather than a dead one being
 * pushed). This keeps a header back arrow useful even when the screen was
 * opened directly or is a root landing screen.
 *
 * Does not touch the browser history stack, so the hardware/browser back
 * button keeps working exactly as before.
 */
export function useBackNavigation(fallbackHref: string = "/") {
  const router = useRouter();

  const onBack = useCallback(() => {
    if (hasInAppHistory()) {
      router.back();
    } else {
      router.replace(fallbackHref);
    }
  }, [router, fallbackHref]);

  return { onBack };
}
