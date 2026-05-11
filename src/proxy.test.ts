import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

describe("proxy", () => {
  it("redirects to /login when accessing /director without directorToken", () => {
    const req = new NextRequest("http://localhost/director/dashboard");

    const response = proxy(req);

    expect(response).toBeDefined();
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("http://localhost/login");
  });

  it("does not redirect when directorToken exists", () => {
    const req = new NextRequest("http://localhost/director/dashboard", {
      headers: {
        cookie: "directorToken=abc123",
      },
    });

    const response = proxy(req);

    expect(response).toBeUndefined();
  });

  it("does not redirect for non-director routes", () => {
    const req = new NextRequest("http://localhost/about");

    const response = proxy(req);

    expect(response).toBeUndefined();
  });
});
