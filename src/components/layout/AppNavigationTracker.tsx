"use client";

import { useTrackAppNavigation } from "@/hooks/useBackNavigation";

/**
 * Mount-once tracker that records in-app navigations for the standard header
 * back behaviour (see {@link useBackNavigation}). Renders nothing.
 */
export function AppNavigationTracker() {
  useTrackAppNavigation();
  return null;
}
