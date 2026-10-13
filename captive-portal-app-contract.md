# Contract — Captive-Portal Probe Handling (Scorer App)

> Audience: the **`bridge-box-scorer`** app (Next.js on port 3000). This specifies HTTP route
> handlers the app must add so client devices — **Amazon Fire tablets especially**, plus Android,
> iOS, Windows — accept the BridgeBox hotspot instead of declaring it "no internet" (which makes some
> devices, notably Fire OS, drop or refuse the connection).
>
> The box side (`bridge-box`) is already complete and is NOT the problem: the hotspot's DNS is
> hijacked so **every** hostname resolves to the box (`bridge-box-captive.sh`:
> `address=/#/<box-ip>`), and NAT redirects guest **:80 and :443 → the app on :3000**
> (`bridge-box-nat.sh`). So the OS captive-detection probe already arrives at this app. What's missing
> is the app answering those probe requests the way each OS expects.

## Why this is needed (the failure today)

On joining WiFi, modern OSes fetch a known "is there internet / is this a captive portal?" URL and
judge the network by the HTTP response:
- **Expected success response → "online"** (no portal, device stays connected silently).
- **Redirect to another host → "captive portal"** (device shows the sign-in sheet, lets the user in).
- **Wrong/ambiguous response, refused, or timeout → "no internet"** → Fire OS may **drop the
  network**. This is the current bug: the probe hits the app, and the app returns its normal homepage
  HTML (HTTP 200) or a 404 — neither is what the probe expects — so Fire OS reads it as "no internet".

The fix: detect the probe requests (by host and/or path) and return an OS-appropriate response.

## Detection

A request is a captive probe if **either** the `Host` header is a known detection domain **or** the
path is a known probe path (match either, since the DNS hijack means the Host arrives but resolves
locally). Match case-insensitively; match the path exactly or by suffix.

### Known probe hosts (match `Host` header)
- `connectivitycheck.gstatic.com`, `connectivitycheck.android.com`, `clients3.google.com`,
  `www.google.com` (Android/Chrome/Fire OS all use Google-style checks)
- `captive.apple.com` (iOS/macOS)
- `www.msftconnecttest.com`, `www.msftncsi.com`, `dns.msftncsi.com` (Windows)
- `detectportal.firefox.com` (Firefox)
- Amazon/Fire OS detection hosts, e.g. `fireoscaptiveportal.com`,
  `spectrum.s3.amazonaws.com`, `aka-cdn.net`-style — **Fire OS has varied across versions**, so the
  path-based match below is the reliable net; treat ANY unknown host that requests a known probe
  path as a probe.

### Known probe paths (match path, any host)
| OS / client | Path | Normal "online" response it expects |
|---|---|---|
| Android / Fire OS | `/generate_204`, `/gen_204` | **HTTP 204**, empty body |
| Fire OS (Kindle) | `/kindle-wifi/wifistub.html` | 200 with the specific stub HTML (see note) |
| iOS / macOS | `/hotspot-detect.html`, `/library/test/success.html` | 200 body `<HTML><HEAD><TITLE>Success</TITLE></HEAD><BODY>Success</BODY></HTML>` |
| Windows | `/connecttest.txt` | 200 body exactly `Microsoft Connect Test` |
| Windows (legacy) | `/ncsi.txt` | 200 body exactly `Microsoft NCSI` |
| Firefox | `/canonical.html`, `/success.txt` | 200 body `success` |

## Required behaviour (strategy: "either pop the sheet or accept silently, whichever is reliable")

The goal is that **every device accepts the network AND the user reaches the app**. The most reliable
cross-device way is to **redirect probes to the app's landing page** so the OS classifies the network
as a captive portal and opens the in-OS browser sheet showing the app:

- **Default for all probe requests: respond `302 Found` with `Location: http://<box-ip>/`** (the app
  root). `<box-ip>` is the host the request already arrived on — use the request's `Host`/authority
  or the server's own address; do not hardcode. A 302 to the app root is what triggers the
  "sign in to network" sheet on Android/Fire OS/iOS and lands the user on the scoring app.

- **Fire OS caveat (why we don't just always 204):** returning 204 makes the device decide "internet
  is fine" and **suppress** the portal sheet — the player then sees nothing and has to open a browser
  and type an address, which is the opposite of the auto-pop UX. So prefer the **302-to-app** for the
  Google/Android/Fire `generate_204`/`gen_204` probes too, which Fire OS treats as "captive portal,
  show sheet". (This satisfies "2=c": the device accepts the network, and the user is taken to the
  app.)

- **If, in device testing, a specific OS refuses to settle on a 302** (some iOS versions want the
  literal `Success` document to *stop* nagging), fall back to serving that OS its expected 200 body
  for its probe path, and rely on the user opening the app manually. Decide per-OS during testing;
  the 302-to-app is the default, the exact-body response is the per-OS escape hatch.

- **Everything else (non-probe requests to unknown hosts/paths):** the DNS hijack already routes all
  hostnames here; the app should serve its normal UI (or 302 unknown paths to `/`) so "open any
  address" lands on the app. This likely already happens — just make sure probe paths are handled
  *before* a catch-all 404.

## Implementation notes (Next.js)

- Add this as **middleware** (runs before routing) or dedicated route handlers, so probe paths are
  caught regardless of the app's page routes. Middleware is cleanest: inspect `request.nextUrl.pathname`
  and `request.headers.get('host')`, and for a probe return `NextResponse.redirect(new URL('/', origin), 302)`
  (or a `new NextResponse(body, {status})` for the per-OS literal-body fallback).
- Keep it allocation-light and synchronous — these fire on every device join, sometimes repeatedly.
- No external calls (the box is offline-first; the handler must work with no internet).
- Do not require auth on these paths (there is no login; see the box's captive design — DNS hijack,
  no sign-in step).

## Testing (needs real devices — this is the empirical half)

For each device, join the hotspot and confirm: (a) it does NOT show "no internet" / does not drop,
and (b) the user reaches the scoring app (via the auto sheet, or by opening a browser). Capture on
the box with `sudo tcpdump -i <AP_IFACE> -n port 80` and/or the app's access logs to see the exact
probe host/path each device uses and the response it got — then tune per-OS if needed.
- **Amazon Fire tablet** is the priority device (the reason for this work).
- Also verify Android phone, iPhone, Windows laptop.

## Boundary

- The box (`bridge-box`) owns: hotspot, PMF-disabled, DNS hijack to the box, NAT 80/443→3000. All
  verified and complete — no box change is required for this.
- The app (`bridge-box-scorer`) owns: answering the probe URLs per this contract. This is the only
  remaining piece for Fire-tablet (and general) captive-portal behaviour.
