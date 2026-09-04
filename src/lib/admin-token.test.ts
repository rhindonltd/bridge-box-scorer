import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  setAdminToken,
  getAdminToken,
  clearAdminToken,
  hasAdminToken,
  subscribeAdminToken,
} from "./admin-token";

describe("admin token store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("has no token initially", () => {
    expect(getAdminToken()).toBeNull();
    expect(hasAdminToken()).toBe(false);
  });

  it("stores and reads the device-global token", () => {
    setAdminToken("admin-1");
    expect(getAdminToken()).toBe("admin-1");
    expect(hasAdminToken()).toBe(true);
    expect(localStorage.getItem("admin-token")).toBe("admin-1");
  });

  it("clears the token", () => {
    setAdminToken("admin-1");
    clearAdminToken();
    expect(getAdminToken()).toBeNull();
    expect(hasAdminToken()).toBe(false);
  });

  it("notifies subscribers on set and clear", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeAdminToken(onChange);

    setAdminToken("admin-1");
    clearAdminToken();

    expect(onChange).toHaveBeenCalledTimes(2);

    unsubscribe();
    setAdminToken("admin-2");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("returns a no-op unsubscribe when window is undefined (SSR)", () => {
    const originalWindow = globalThis.window;
    // Simulate a server-side environment where window is not defined.
    // @ts-expect-error deliberately removing window for the SSR branch.
    delete globalThis.window;

    try {
      const onChange = vi.fn();
      const unsubscribe = subscribeAdminToken(onChange);
      // The returned teardown must be safe to call and register no listeners.
      expect(() => unsubscribe()).not.toThrow();
      expect(onChange).not.toHaveBeenCalled();
    } finally {
      globalThis.window = originalWindow;
    }
  });

  it("skips dispatching the change event when window is undefined (SSR)", () => {
    const originalWindow = globalThis.window;
    // Provide a storage backing that survives removing window, so the setters
    // reach notifyAdminTokenChange() with window undefined.
    const store = new Map<string, string>();
    const storageStub = {
      setItem: (k: string, v: string) => store.set(k, v),
      getItem: (k: string) => store.get(k) ?? null,
      removeItem: (k: string) => store.delete(k),
    };
    vi.stubGlobal("localStorage", storageStub);
    // @ts-expect-error deliberately removing window for the SSR branch.
    delete globalThis.window;

    try {
      // Both setters call notifyAdminTokenChange(); with no window they must
      // not attempt to dispatch and must not throw.
      expect(() => setAdminToken("ssr-token")).not.toThrow();
      expect(getAdminToken()).toBe("ssr-token");
      expect(() => clearAdminToken()).not.toThrow();
      expect(getAdminToken()).toBeNull();
    } finally {
      globalThis.window = originalWindow;
      vi.unstubAllGlobals();
    }
  });
});
