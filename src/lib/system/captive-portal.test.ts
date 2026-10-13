import { describe, it, expect } from "vitest";

import {
  isProbeHost,
  matchProbePath,
  isCaptiveProbe,
  PROBE_HOSTS,
  PROBE_PATHS,
} from "./captive-portal";

describe("isProbeHost", () => {
  it("matches a known detection domain", () => {
    expect(isProbeHost("connectivitycheck.gstatic.com")).toBe(true);
    expect(isProbeHost("captive.apple.com")).toBe(true);
    expect(isProbeHost("www.msftconnecttest.com")).toBe(true);
    expect(isProbeHost("detectportal.firefox.com")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(isProbeHost("Captive.Apple.COM")).toBe(true);
  });

  it("strips a trailing port before matching", () => {
    expect(isProbeHost("captive.apple.com:80")).toBe(true);
    expect(isProbeHost("www.google.com:443")).toBe(true);
  });

  it("does not match an unknown host", () => {
    expect(isProbeHost("example.com")).toBe(false);
    expect(isProbeHost("bridge-box.local")).toBe(false);
  });

  it("handles missing / empty host", () => {
    expect(isProbeHost(null)).toBe(false);
    expect(isProbeHost(undefined)).toBe(false);
    expect(isProbeHost("")).toBe(false);
  });

  it("keeps an IPv6 literal intact (does not treat its colons as a port)", () => {
    // Not a probe host, but must not throw or mis-parse.
    expect(isProbeHost("[::1]:3000")).toBe(false);
  });
});

describe("matchProbePath", () => {
  it("matches Android / Fire OS probe paths with no literal body (prefers 302)", () => {
    expect(matchProbePath("/generate_204")?.body).toBeNull();
    expect(matchProbePath("/gen_204")?.body).toBeNull();
  });

  it("returns the iOS Success document as the literal escape-hatch body", () => {
    const probe = matchProbePath("/hotspot-detect.html");
    expect(probe?.status).toBe(200);
    expect(probe?.body).toBe(
      "<HTML><HEAD><TITLE>Success</TITLE></HEAD><BODY>Success</BODY></HTML>",
    );
    expect(probe?.contentType).toBe("text/html");
  });

  it("returns the exact Windows connect-test body", () => {
    expect(matchProbePath("/connecttest.txt")?.body).toBe(
      "Microsoft Connect Test",
    );
    expect(matchProbePath("/ncsi.txt")?.body).toBe("Microsoft NCSI");
  });

  it("returns the Firefox success body", () => {
    expect(matchProbePath("/canonical.html")?.body).toBe("success");
    expect(matchProbePath("/success.txt")?.body).toBe("success");
  });

  it("matches case-insensitively", () => {
    expect(matchProbePath("/Generate_204")).not.toBeNull();
  });

  it("matches by suffix (prefixed probe path)", () => {
    expect(matchProbePath("/kindle-wifi/wifistub.html")).not.toBeNull();
    expect(
      matchProbePath("/some/prefix/kindle-wifi/wifistub.html"),
    ).not.toBeNull();
  });

  it("returns null for a non-probe path", () => {
    expect(matchProbePath("/")).toBeNull();
    expect(matchProbePath("/game/123")).toBeNull();
    expect(matchProbePath("/api/healthz")).toBeNull();
  });
});

describe("isCaptiveProbe", () => {
  it("is true when only the path is a probe path (any host)", () => {
    expect(isCaptiveProbe("fireoscaptiveportal.example", "/generate_204")).toBe(
      true,
    );
    expect(isCaptiveProbe("some-unknown-host.net", "/gen_204")).toBe(true);
  });

  it("is true when only the host is a known detection domain", () => {
    expect(isCaptiveProbe("captive.apple.com", "/")).toBe(true);
    expect(isCaptiveProbe("connectivitycheck.gstatic.com", "/anything")).toBe(
      true,
    );
  });

  it("is false for a normal app request", () => {
    expect(isCaptiveProbe("bridge-box.local", "/")).toBe(false);
    expect(isCaptiveProbe("10.0.0.1", "/game/123")).toBe(false);
  });
});

describe("probe tables", () => {
  it("exposes a non-empty, lowercased host list", () => {
    expect(PROBE_HOSTS.length).toBeGreaterThan(0);
    for (const host of PROBE_HOSTS) {
      expect(host).toBe(host.toLowerCase());
    }
  });

  it("exposes probe paths that each start with a slash", () => {
    expect(PROBE_PATHS.length).toBeGreaterThan(0);
    for (const probe of PROBE_PATHS) {
      expect(probe.path.startsWith("/")).toBe(true);
    }
  });
});
