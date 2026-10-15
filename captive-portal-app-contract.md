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
>
> **:443 caveat.** The NAT rule redirects :443 as well as :80, but the app on :3000 serves **plain
> HTTP**, so an *HTTPS* probe (e.g. `https://captive.apple.com/...`) hits a plaintext port and its TLS
> handshake fails — the app can't return a usable response to an HTTPS probe. This is fine in
> practice: OS captive **detection** probes are plain **HTTP :80** (that's the point of the probe —
> it must be interceptable), so the handlers below only need to answer HTTP. The :443 redirect mainly
> stops guest HTTPS traffic from leaking out; don't rely on it to answer a probe. All probe handling
> and the redirect `Location` below are therefore `http://`.

## Why this is needed (the failure today)

On joining WiFi, modern OSes fetch a known "is there internet / is this a captive portal?" URL and
judge the network by the HTTP response:
- **Expected success response → "online"** (no portal, device stays connected silently).
- **Redirect to another host → "captive portal"** (device shows the sign-in sheet, lets the user in).
- **Wrong/ambiguous response, refused, or timeout → "no internet"** → Fire OS may **drop the
  network**. This is the current bug: the probe hits the app, and the app returns its normal homepage
  HTML (HTTP 200) or a 404 — neither is what the probe expects — so Fire OS reads it as "no internet".

The fix: detect the probe requests (by host and/or path) and return the OS's **expected success
response** (the first outcome above) so the device goes "online" silently — no sign-in sheet. See
"Required behaviour" below for exactly what to return.

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

## Required behaviour (strategy: "accept silently — NO sign-in sheet")

The desired UX: a device joining the hotspot should **accept the network silently and NOT show a
"sign in to network" sheet**. BridgeBox has no sign-in step, so a sheet is just a dead-end nag — the
player simply opens the app (`bridge.local` / any address, since the DNS hijack + NAT route it here).
The way to get silent acceptance is to answer each OS's probe with **exactly the success response it
expects**, so the OS concludes "internet is fine" and suppresses the portal sheet.

- **Default for a probe request: return that OS's expected success response from the table above**,
  verbatim:
  - Android / Fire OS `/generate_204`, `/gen_204` → **HTTP 204**, empty body, no `Location`.
  - iOS / macOS `/hotspot-detect.html`, `/library/test/success.html` → **200** with the exact body
    `<HTML><HEAD><TITLE>Success</TITLE></HEAD><BODY>Success</BODY></HTML>`.
  - Windows `/connecttest.txt` → **200** body exactly `Microsoft Connect Test`;
    `/ncsi.txt` → **200** body exactly `Microsoft NCSI`.
  - Firefox `/canonical.html`, `/success.txt` → **200** body `success`.
  - Match the body/status/headers precisely — some OSes compare the body text, not just the status.
    Serve `text/plain` for the text probes and `text/html` for the HTML ones; keep bodies byte-exact.

- **Do NOT 302 these probe paths to the app** — a redirect is exactly what makes the OS classify the
  network as a captive portal and pop the sheet. We want the opposite. (This reverses an earlier draft
  of this contract, which defaulted to 302-to-app to force the sheet. The product decision is: no
  sheet, players open the app themselves.)

- **Amazon Fire tablet is the risk to verify (priority device).** Silent-accept is the goal, but if a
  Fire device does NOT get the precise response it wants it reads the network as "no internet" and may
  **drop the hotspot** — the original symptom this whole effort is about. So the Fire probe
  (`/generate_204` / `/gen_204`, and any Fire-specific `/kindle-wifi/wifistub.html`) MUST be answered
  with its exact expected success response and verified on real hardware. If a specific OS version
  genuinely refuses to settle on silent-accept in testing, the per-OS escape hatch is a 302-to-app for
  *that* OS only — but that reintroduces the sheet for it, so treat it as a last resort and record
  which device needed it.

- **Everything else (non-probe requests to unknown hosts/paths):** the DNS hijack routes all hostnames
  here; serve the app's normal UI (or 302 unknown *non-probe* paths to `/`) so "open any address"
  lands on the app. Make sure the probe paths above are matched *before* any catch-all redirect/404,
  so a probe never accidentally gets 302'd (which would pop the sheet).

## Implementation notes (Next.js)

- Add this as **middleware** (runs before routing) or dedicated route handlers, so probe paths are
  caught regardless of the app's page routes. Middleware is cleanest: inspect `request.nextUrl.pathname`
  and `request.headers.get('host')`, and for a probe return the exact success response, e.g.
  `new NextResponse(null, { status: 204 })` for `generate_204`, or
  `new NextResponse('Microsoft Connect Test', { status: 200, headers: { 'content-type': 'text/plain' } })`
  for the Windows probe. Reserve `NextResponse.redirect(new URL('/', origin), 302)` for the last-resort
  per-OS escape hatch only — never as the default for a probe path.
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
