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
});
