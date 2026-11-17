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

// registerHandler (socket) and the HTTP finalised guard ask the game-index DB
// whether a game is finalised before running a mutating event. Most handler
// tests run without a game-index database, so default every game to "not
// finalised". Tests of the finalised behaviour itself (finalised-guard tests,
// the wrapper's blockWhenFinalised tests) provide their own local mock, which
// overrides this.
vi.mock("@/db/game-index/queries/is-game-finalised", () => ({
  isGameFinalised: vi.fn().mockResolvedValue(false),
}));
