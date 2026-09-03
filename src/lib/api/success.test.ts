import { describe, it, expect } from "vitest";

import { success } from "./success";

describe("success", () => {
  it("wraps a result in a { success: true, result } JSON response", async () => {
    const res = success({ id: 1, name: "x" });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      success: true,
      result: { id: 1, name: "x" },
    });
  });

  it("passes primitive results through", async () => {
    await expect(success("ok").json()).resolves.toEqual({
      success: true,
      result: "ok",
    });
  });
});
