import "@testing-library/jest-dom";
import { vi } from "vitest";

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// The shared HeaderBar renders a default back arrow wired to useBackNavigation,
// which calls Next's useRouter. Most component/page unit tests render a header
// without mounting an App Router, so stub the hook globally to a no-op. Tests
// that exercise the back behaviour itself (useBackNavigation.test.ts,
// HeaderBar.test.tsx) provide their own local mock, which overrides this.
vi.mock("@/hooks/useBackNavigation", () => ({
  useBackNavigation: () => ({ onBack: vi.fn() }),
  useTrackAppNavigation: () => {},
}));
