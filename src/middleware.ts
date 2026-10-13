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
 * Default strategy ("either pop the sheet or accept silently, whichever is
 * reliable"): respond `302 Found` with `Location: http://<box-ip>/`. A 302 to
 * the app root is what makes Android / Fire OS / iOS classify the network as a
 * captive portal and open the in-OS browser sheet showing the scoring app. The
 * `<box-ip>` is never hardcoded — it is the host the request already arrived
 * on.
 *
 * Per-OS escape hatch: a specific OS can be switched to its literal "online"
 * body (e.g. iOS `Success`) by setting `CAPTIVE_LITERAL_BODY_PATHS` to a
 * comma-separated list of probe paths. Those paths then get their expected 200
 * (or 204) literal response instead of the redirect, for cases where a device
 * refuses to settle on the 302 during testing.
 *
 * Must stay allocation-light, synchronous, and free of network / Node-only
 * imports: it fires on every device join, sometimes repeatedly, and runs in the
 * Edge runtime with no internet.
 */

/**
 * Probe paths that should receive their OS-specific literal body instead of the
 * default 302-to-app, configured per-OS during device testing. Comma-separated
 * list of paths in `CAPTIVE_LITERAL_BODY_PATHS` (e.g. "/hotspot-detect.html").
 */
const LITERAL_BODY_PATHS: ReadonlySet<string> = new Set(
  (process.env.CAPTIVE_LITERAL_BODY_PATHS ?? "")
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean),
);

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host");

  if (!isCaptiveProbe(host, pathname)) {
    // Not a probe: let the request fall through to normal routing. The DNS
    // hijack already routes every hostname here, so the app's own UI (and its
    // not-found handling) serves "open any address" lands on the app.
    return NextResponse.next();
  }

  const probe = matchProbePath(pathname);

  // Per-OS escape hatch: serve the literal "online" body this OS expects.
  if (probe && probe.body !== null && LITERAL_BODY_PATHS.has(probe.path.toLowerCase())) {
    return new NextResponse(probe.body, {
      status: probe.status,
      headers: {
        "Content-Type": probe.contentType,
        "Cache-Control": "no-store",
      },
    });
  }

  // A host-only probe that already requested the app root has nowhere to
  // redirect to — serving the app at "/" is the desired outcome, and a
  // "/" → "/" 302 would just loop. Let it fall through to the app.
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Default: 302 to the app root on the same host the request arrived on, so
  // the OS pops the captive-portal sheet and lands the user on the scoring app.
  const appRoot = new URL("/", request.nextUrl);
  const response = NextResponse.redirect(appRoot, 302);
  response.headers.set("Cache-Control", "no-store");
  return response;
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
