# Spec for `bridge-box-scorer`: use the wifi-ctl sudo helper instead of direct nmcli

This is a work brief for the **`bridge-box-scorer`** app repo. Written to be handed to that repo's
Kiro; it has the context needed without access to the provisioning repo.

## Problem

The app's "connect this box to WiFi" flow shells out to `nmcli` to scan and to test candidate
credentials. On the appliance the app runs as the unprivileged **`bridgebox`** user, and
NetworkManager only lets root change networking — so those calls fail with:

```
Connection activation failed: Not authorized to control networking
```

The provisioning repo now exposes a **root sudo helper** with a small set of allow-listed verbs.
The app must switch its **privileged** nmcli calls to that helper. **Read-only** nmcli calls and the
availability check stay as they are (reads don't need authorization).

## The helper

Fixed path, run via passwordless sudo (already allow-listed in `/etc/sudoers.d/bridgebox`):

```
sudo -n /usr/local/bridgebox/bin/wifi-ctl.sh <verb> [args]
```

Each privileged verb takes the shared network lock, drops the hotspot (single WiFi radio), does its
work, and **always restores the hotspot afterwards** — so the client's connection to the box drops
during the operation and returns after (the UI already handles that reconnect).

## Exact changes (before → after)

**1. Scan for networks** — needs privilege (rescan), returns the network list:

- before: `nmcli device wifi list --rescan yes`
- after:  `sudo -n /usr/local/bridgebox/bin/wifi-ctl.sh scan`

The helper runs exactly `nmcli device wifi list --rescan yes` and prints its **raw output
verbatim** on stdout — so your existing parser of that output needs no change. (It drops/rescans/
restores the hotspot around it.)

**2. Test candidate credentials** — needs privilege (create/up/down/delete a profile):

- before: your sequence of `nmcli connection add/modify` for the `bridge-box-wifi-test` profile,
  `nmcli connection up <ap>`, then `nmcli connection down`/`delete`.
- after (one call does the whole add → up → verify → down → delete):
  ```
  sudo -n /usr/local/bridgebox/bin/wifi-ctl.sh test-connect "<ssid>" "<password>" [yes]
  ```
  (third arg `yes` only for a hidden SSID; omit otherwise.)
  It prints one of:
  - `TEST_RESULT: ok (connected + internet)`
  - `TEST_RESULT: connected-no-internet (associated but no route out)`
  - `TEST_RESULT: failed (could not connect — check password/SSID)`
  Parse the `TEST_RESULT:` line for pass/fail. The helper always cleans up the test profile and
  restores the hotspot, so you don't need a separate teardown in the normal path.

- If you need an explicit teardown (e.g. after an aborted flow):
  ```
  sudo -n /usr/local/bridgebox/bin/wifi-ctl.sh test-cleanup
  ```

**3. Commit the chosen network** — no privilege needed:

- The app should **not** activate the real connection itself. To make the box use a network, just
  **write `/home/bridgebox/wifi.json`**:
  ```json
  { "ssid": "<name>", "password": "<pw>", "hidden": "no" }
  ```
  Provisioning connects to it during its online window (boot, or `bridge update-now`). Writing the
  file is a normal file write — no nmcli, no sudo.

**4. Read-only diagnostics + availability — NO change (keep calling nmcli directly):**

- `nmcli -t -f ACTIVE,SSID dev wifi`
- `nmcli connection show ...`
- `command -v nmcli`

These work as `bridgebox` without privilege; leave them as-is.

## Rules / notes
- **Only these three privileged verbs are allow-listed** (`scan`, `test-connect`, `test-cleanup`),
  plus the provisioning-owned `connect`/`hotspot` which the app should NOT call. Any other `sudo
  nmcli ...` will be denied — route through the helper.
- **Don't touch** the `bridge-hotspot` or the real client profile from the app; testing is confined
  to the `bridge-box-wifi-test` profile, which the helper manages.
- Every privileged verb briefly drops the hotspot (the client disconnects, reconnects after). The
  UI already accounts for this.
- If a verb prints `another network operation is in progress`, a provisioning window is running;
  surface a "busy, try again" message and retry.

## Acceptance criteria
- The "scan networks" UI works with the app calling `wifi-ctl.sh scan` (same list as before).
- Credential testing works via `wifi-ctl.sh test-connect` and reports pass/fail from `TEST_RESULT:`.
- Committing a network writes `wifi.json` (no direct activation); the box connects on its next
  online window.
- No direct `nmcli` call that *changes* state remains in the app; read-only nmcli + `command -v`
  are unchanged.
- No "Not authorized to control networking" errors.
