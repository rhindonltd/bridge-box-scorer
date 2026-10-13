# 09 — Settings, admin & Cloud Backup

Device-level settings, reached via the **⚙ cog** on the home screen. Protected
screens ask for the **admin key** once per device (this is separate from the
director token — it gates the box's device settings, not game management).

**Device:** any device on the box's network. You need the **admin key** (printed
on the device label, or output by the box's first-boot migration).

---

## 1. Admin unlock

| Check | Step | Expected |
|---|---|---|
| ☐ SET-1 | Tap the **⚙ cog**. | The **Settings** menu, or an **"Admin Access"** prompt. |
| ☐ SET-2 | If prompted, enter the **admin key** and tap **Unlock**. | Settings menu appears. |
| ☐ SET-3 | Confirm the menu lists: **WiFi Settings**, **Club Information**, **BridgeWebs**, **Cloud Backup**, **Update Admin Key**, **Log Out**. | All present. |
| ☐ SET-4 | Enter a **wrong** admin key on a fresh unlock attempt. | Rejected; settings stay locked. |

---

## 2. WiFi

| Check | Step | Expected |
|---|---|---|
| ☐ SET-5 | **WiFi Settings** (header "Wifi Settings"). | Network dropdown, a **Rescan** link, a password field, **Test Connection**, **Save & Apply**. |
| ☐ SET-6 | Tap **Rescan**. | The list repopulates with nearby networks. |
| ☐ SET-7 | Pick a network, type its **password**, tap **Test Connection**. | Tests the credentials; **Save & Apply** stays disabled until a test **succeeds**. |
| ☐ SET-8 | On a **successful** test, tap **Save & Apply**. | The box connects out to that network. *(This drops the client hotspot briefly — expected on real hardware; reconnect your device to the box afterwards.)* |

---

## 3. Club Information

| Check | Step | Expected |
|---|---|---|
| ☐ SET-9 | **Club Information**. | "Club Name" and "EBU Club Number" fields. |
| ☐ SET-10 | Enter club details → **Save**. | Saved; these appear in exported USEBIO files (verify in [file 10](10-sharing-export-lifecycle.md)). |

---

## 4. BridgeWebs

| Check | Step | Expected |
|---|---|---|
| ☐ SET-11 | **BridgeWebs**. | Fields for the club's BridgeWebs credentials / club id. |
| ☐ SET-12 | Enter (or confirm) credentials → **Save**. | Saved. When set, a **Use BridgeWebs Event** picker appears on the create form (`CREATE-BW-1`) and **Upload to BridgeWebs** appears on a completed game (file 10). |

---

## 5. Cloud Backup

A subscription feature. Behaviour depends on whether the box is **cloud-enabled**
and entitled — **both** states below are valid test outcomes.

### If cloud backup is NOT enabled on this box

| Check | Step | Expected |
|---|---|---|
| ☐ CLOUD-1 | **Cloud Backup** (header "Cloud Backup"). | Copy reads it's not enabled, e.g. **"Cloud backup is not enabled on this box…"**, and **no "Back up now" button**. |

### If cloud backup IS enabled

| Check | Step | Expected |
|---|---|---|
| ☐ CLOUD-2 | **Cloud Backup**. | A **"Games backed up"** panel showing a relative time (e.g. "3 minutes ago") or **"Not yet"**, and a **Back up now** button. |
| ☐ CLOUD-3 | Tap **Back up now**. | Button briefly reads **"Backing up..."** and disables; a green **"✅ Backup started"** message appears. |
| ☐ CLOUD-4 | Wait a few seconds. | The **"Games backed up"** time updates to a recent time (the box completes the sync in the background). |
| ☐ CLOUD-5 | Tap **Back up now** rapidly several times. | Stays disabled for a few seconds after a press (debounced); does not error. |
| ☐ CLOUD-6 | **Fire-and-forget:** confirm pressing **Back up now** never restarts the app or interrupts a running game/timer. | Nothing else changes; the game keeps running. |
| ☐ CLOUD-7 | **(If reproducible)** With the box's internet unplugged, trigger a backup and wait. | A soft warning (e.g. "Last backup didn't complete (the box was offline). It will retry automatically."), **not** a hard error. |

---

## 6. Admin key & logout

| Check | Step | Expected |
|---|---|---|
| ☐ SET-13 | **Update Admin Key**: enter **New Admin Key** + matching **Confirm Admin Key** → **Update Key**. | Saved. *(Remember the new key!)* |
| ☐ SET-14 | Return to the Settings menu → **Log Out**. | Settings re-lock. |
| ☐ SET-15 | Open a protected setting again. | The admin key prompt returns (proving logout). Enter the **new** key → accepted. |
