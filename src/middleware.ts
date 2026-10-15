import { NextResponse, type NextRequest } from "next/server";
import { isCaptiveProbe, matchProbePath } from "@/lib/system/captive-portal";

/**
 * Captive-portal probe handling.
 *
 * On the BridgeBox hotspot the box hijacks DNS (every host → the box) and NATs
 * guest :80/:443 → this app, so OS captive-detection probes land here. If we
 * answer them with the normal homepage or a 404 the device decides "no
 * internet" and may drop the network (notably Fire OS). This middleware runs
 * before routing and answers probes the way each OS expects.
 *
 * Default strategy ("accept silently — NO sign-in sheet"): answer each probe
 * with the exact success response that OS expects (e.g. 204 empty for Android /
 * Fire OS, the literal `Success` document for iOS), so the device concludes
 * "internet is fine" and does NOT pop a captive-portal sheet. BridgeBox has no
 * sign-in step, so a sheet is a dead-end nag — the player just opens the app
 * (the DNS hijack + NAT route any address here). A 302 to the app would make
 * the OS classify the network as a captive portal and show the sheet, which is
 * exactly what we want to avoid, so it is NEVER the default.
 *
 * Per-OS escape hatch (last resort): if a specific OS refuses to settle on
 * silent-accept during device testing, its probe paths can be switched to a
 * 302-to-app by listing them in `CAPTIVE_REDIRECT_PATHS` (comma-separated).
 * That reintroduces the sheet for that OS only — use sparingly and record which
 * device needed it.
 *
 * Must stay allocation-light, synchronous, and free of network / Node-only
 * imports: it fires on every device join, sometimes repeatedly, and runs in the
 * Edge runtime with no internet.
 */

/**
 * Probe paths that should fall back to a 302-to-app (reintroducing the sign-in
 * sheet) instead of the default silent-accept success response. Last-resort
 * per-OS escape hatch, configured during device testing via a comma-separated
 * list in `CAPTIVE_REDIRECT_PATHS` (e.g. "/hotspot-detect.html").
 */
const REDIRECT_PATHS: ReadonlySet<string> = new Set(
  (process.env.CAPTIVE_REDIRECT_PATHS ?? "")
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean),
);

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host");

  if (!isCaptiveProbe(host, pathname)) {
    // Not a probe: let the request fall through to normal routing. The DNS
    // hijack already routes every hostname here, so the app's own UI serves
    // "open any address" and lands the user on the main menu.
    return NextResponse.next();
  }

  const probe = matchProbePath(pathname);

  // Last-resort per-OS escape hatch: 302 to the app root (this reintroduces the
  // sign-in sheet, so it is only used for paths explicitly opted in).
  if (probe && REDIRECT_PATHS.has(probe.path.toLowerCase())) {
    const appRoot = new URL("/", request.nextUrl);
    const redirect = NextResponse.redirect(appRoot, 302);
    redirect.headers.set("Cache-Control", "no-store");
    return redirect;
  }

  // Default: answer with the exact success response this OS expects so the
  // device accepts the network silently and shows no sign-in sheet.
  if (probe) {
    return new NextResponse(probe.body, {
      status: probe.status,
      headers: {
        "Content-Type": probe.contentType,
        "Cache-Control": "no-store",
      },
    });
  }

  // A host-only probe (known detection domain, but a path with no descriptor,
  // e.g. "/"): serve the app so the user lands on the main menu. The DNS hijack
  // already routes it here, so falling through is the silent-accept outcome.
  return NextResponse.next();
}

/**
 * Only run this middleware for the known probe paths. The entries mirror
 * `PROBE_PATHS` in `@/lib/system/captive-portal`; keep them in sync. Host-only
 * probes (a known detection domain requesting `/`) are also matched because
 * `/` is included.
 *
 * Static assets and Next internals are excluded so the middleware never fires
 * on normal app traffic.
 */
export const config = {
  matcher: [
    "/",
    "/generate_204",
    "/gen_204",
    "/kindle-wifi/wifistub.html",
    "/hotspot-detect.html",
    "/library/test/success.html",
    "/connecttest.txt",
    "/ncsi.txt",
    "/canonical.html",
    "/success.txt",
  ],
};
