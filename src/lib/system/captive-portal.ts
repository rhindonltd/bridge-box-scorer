/**
 * Captive-portal probe handling (framework-agnostic core).
 *
 * When a device joins WiFi, its OS fetches a well-known "is there internet /
 * is this a captive portal?" URL and classifies the network by the HTTP
 * response. On the BridgeBox hotspot the box hijacks DNS so every hostname
 * resolves to the box and NATs guest :80/:443 to this app on :3000, so those
 * probe requests arrive here. If the app answers with its normal homepage HTML
 * or a 404, the probe reads it as "no internet" and some devices (notably Fire
 * OS) drop the network. See `captive-portal-app-contract.md`.
 *
 * This module is intentionally pure (no Next.js / I/O imports) so it can run in
 * the Edge middleware bundle and be unit-tested directly. The Next.js glue
 * lives in `src/middleware.ts`.
 */

/**
 * Known captive-detection domains, matched against the request `Host` header
 * (case-insensitively). Because the box's DNS hijack resolves every hostname
 * to the box, these arrive with their real public Host but hit this app.
 */
export const PROBE_HOSTS: readonly string[] = [
  // Android / Chrome / Fire OS (Google-style checks)
  "connectivitycheck.gstatic.com",
  "connectivitycheck.android.com",
  "clients3.google.com",
  "www.google.com",
  // iOS / macOS
  "captive.apple.com",
  // Windows
  "www.msftconnecttest.com",
  "www.msftncsi.com",
  "dns.msftncsi.com",
  // Firefox
  "detectportal.firefox.com",
  // Amazon / Fire OS (varies across versions; the path match below is the
  // reliable net, so this list is best-effort only)
  "fireoscaptiveportal.com",
  "spectrum.s3.amazonaws.com",
];

/**
 * Known probe paths, matched against the request path regardless of host.
 * Because Fire OS has varied its detection hosts across versions, the path is
 * the reliable signal: treat ANY host requesting one of these as a probe.
 *
 * `body === null` means "no OS-specific literal body is defined" (the probe is
 * handled by the default 302-to-app). A non-null `body`/`status` is the per-OS
 * escape hatch the contract describes — served only if the default redirect is
 * explicitly overridden for that path during device testing.
 */
export type ProbePath = {
  /** The probe path, matched case-insensitively (exact or by suffix). */
  readonly path: string;
  /** The literal "online" body this OS expects, if we fall back to serving it. */
  readonly body: string | null;
  /** The status that accompanies {@link body} (ignored when body is null). */
  readonly status: number;
  /** Content-Type for the literal body response. */
  readonly contentType: string;
};

export const PROBE_PATHS: readonly ProbePath[] = [
  // Android / Fire OS — normally expects 204 empty; we prefer 302-to-app.
  {
    path: "/generate_204",
    body: null,
    status: 204,
    contentType: "text/plain",
  },
  { path: "/gen_204", body: null, status: 204, contentType: "text/plain" },
  // Fire OS (Kindle) stub.
  {
    path: "/kindle-wifi/wifistub.html",
    body: null,
    status: 200,
    contentType: "text/html",
  },
  // iOS / macOS — expects the literal Success document.
  {
    path: "/hotspot-detect.html",
    body: "<HTML><HEAD><TITLE>Success</TITLE></HEAD><BODY>Success</BODY></HTML>",
    status: 200,
    contentType: "text/html",
  },
  {
    path: "/library/test/success.html",
    body: "<HTML><HEAD><TITLE>Success</TITLE></HEAD><BODY>Success</BODY></HTML>",
    status: 200,
    contentType: "text/html",
  },
  // Windows.
  {
    path: "/connecttest.txt",
    body: "Microsoft Connect Test",
    status: 200,
    contentType: "text/plain",
  },
  // Windows (legacy).
  {
    path: "/ncsi.txt",
    body: "Microsoft NCSI",
    status: 200,
    contentType: "text/plain",
  },
  // Firefox.
  {
    path: "/canonical.html",
    body: "success",
    status: 200,
    contentType: "text/html",
  },
  { path: "/success.txt", body: "success", status: 200, contentType: "text/plain" },
];

/** Normalise a Host header to a bare lowercased hostname (strip any port). */
function normaliseHost(host: string | null | undefined): string {
  if (!host) return "";
  // Host may be "example.com:443"; a bracketed IPv6 literal keeps its brackets.
  const trimmed = host.trim().toLowerCase();
  const lastColon = trimmed.lastIndexOf(":");
  // Only strip a trailing :port, never a colon inside an IPv6 literal.
  if (lastColon > trimmed.lastIndexOf("]")) {
    return trimmed.slice(0, lastColon);
  }
  return trimmed;
}

/** True when the Host header is a known captive-detection domain. */
export function isProbeHost(host: string | null | undefined): boolean {
  const hostname = normaliseHost(host);
  if (!hostname) return false;
  return PROBE_HOSTS.some((h) => h.toLowerCase() === hostname);
}

/**
 * Find the matching probe path for a request path, if any. Matches
 * case-insensitively, exactly or by suffix (so `/kindle-wifi/wifistub.html`
 * still matches when prefixed). Returns the {@link ProbePath} descriptor or
 * null.
 */
export function matchProbePath(pathname: string): ProbePath | null {
  const lower = pathname.toLowerCase();
  for (const probe of PROBE_PATHS) {
    const target = probe.path.toLowerCase();
    if (lower === target || lower.endsWith(target)) {
      return probe;
    }
  }
  return null;
}

/**
 * Decide whether a request is a captive probe. A request is a probe if EITHER
 * the Host is a known detection domain OR the path is a known probe path —
 * match either, since the DNS hijack means the real Host arrives but resolves
 * locally.
 */
export function isCaptiveProbe(
  host: string | null | undefined,
  pathname: string,
): boolean {
  return matchProbePath(pathname) !== null || isProbeHost(host);
}
