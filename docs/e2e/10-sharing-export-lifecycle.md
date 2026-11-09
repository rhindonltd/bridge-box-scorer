# 10 — Sharing, export & game lifecycle

Director sharing, moving a player's seat to another device, exporting results
(USEBIO / PBN / BridgeWebs), and the end-of-life flows (delete, completed-game
redirect).

**Devices:** DIRECTOR + a second device (for sharing) + a spare (for seat
transfer). Export checks want a game with **all results in** — the quickest is a
seeded fixture played to completion, e.g. `--scoring MP --play all`.

---

## 1. Share director access (DIRECTOR + a second device)

| Check | Step | Expected |
|---|---|---|
| ☐ SHARE-1 | Header menu (hamburger) → **Share Director Access**; the back arrow returns to the page you came from. | A 6-character **share code** with a countdown ("Expires in m:ss"). |
| ☐ SHARE-2 | On a **second** device: **Manage Games → the game**. | Because this device isn't a director yet, the **"Claim Director Code"** screen appears. |
| ☐ SHARE-3 | Enter the code → **Claim Access**. | The second device gains full director access (lands on the Manage Game Menu). |
| ☐ SHARE-4 | On a fresh attempt, enter a **bogus** code. | Rejected with an error; no access granted. |
| ☐ SHARE-5 | On the first device, tap **Generate New Code**. | A new code replaces the old one; the old code no longer works. |
| ☐ SHARE-6 | Let a code's countdown **expire**, then try to claim it. | Rejected (expired). |
| ☐ SHARE-7 | **Where it lives:** open the Manage Game Menu body. | **No** "Share Director Access" button there. |
| ☐ SHARE-8 | Open the header **Menu** on a manage screen (e.g. **Travellers**), on the **Setup menu** during setup, and on a **play** screen on a director device. | **Share Director Access** is in each. On a **player-only** device's play Menu it is **not** offered. |
| ☐ SHARE-9 | From **Travellers**, choose **Share Director Access**, then tap the **back arrow**. | Returns to **Travellers**, not the manage menu. Repeat from a play screen: back returns to that play screen. |
| ☐ SHARE-10 | Open the share screen directly by URL (`/game/<id>/manage/share-access`) in a fresh tab, then tap back. | Falls back to the **Manage Game Menu**. |

> **Seeded-fixture note:** the seeding script plants a director token directly,
> so you don't need the share flow to get director access for a fixture — but
> `SHARE-*` still verifies the share/claim path itself.

---

## 2. Change device / seat transfer (players)

(Also in [file 01](01-core-flows.md) `XFER-*`; repeated here as the lifecycle
home for it.)

| Check | Step | Expected |
|---|---|---|
| ☐ XFER-1 | On a player's play screen, **Menu → Change device**. | A short code + a warning the device will be signed out of the seat once used. |
| ☐ XFER-2 | On a spare device: **Join Game → the game → Move a seat to this device** → enter the code → **Take over seat**. | The spare takes the seat and lands on the play screen. **No names are asked for**: it is the same pair. |
| ☐ XFER-3 | The original device. | "This seat has moved to another device", with **Back to main menu**; it no longer controls the seat. |
| ☐ XFER-4 | DIRECTOR **Pairs**. | The seat is still **Active** with the **same** pair. A change of device is not a substitution. |

The same **Move a seat to this device** entry is used to claim a **handover**
code ([file 12](12-handover-substitution.md) `HAND-9..14`) and a **reinstate**
code ([file 11](11-withdrawals-late-arrivals.md) `RE-*`).

---

## 3. Export results (DIRECTOR)

| Check | Step | Expected |
|---|---|---|
| ☐ EXP-1 | Ensure **all** results are in (play/confirm, or use `--play all` fixture, or fill gaps via director overrides). | Game complete. |
| ☐ EXP-2 | Manage Game Menu → **Export & Publish** → **Download USEBIO**. (Disabled until all results are in.) | A **USEBIO XML** file downloads. |
| ☐ EXP-3 | Open the USEBIO file. | Non-empty; contains the event name, the **club details** entered in [file 09](09-settings-admin-cloud.md), and board/result data; the scoring method matches the game. |
| ☐ EXP-4 | If deals were entered, **Export & Publish** → **Download PBN**. | A `.pbn` file downloads with board/deal tags. |
| ☐ EXP-5 | Open the PBN file. | Non-empty; contains the entered deals. |
| ☐ EXP-6 | **Export gating:** before all results are in, confirm **Download USEBIO** is **disabled**. | Disabled until complete. |
| ☐ EXP-7 | **Absent boards don't block export:** on **F11-D** ([file 11](11-withdrawals-late-arrivals.md)), play the remaining round-3 boards at tables 2 and 3. | **Download USEBIO** becomes **enabled**: the withdrawn pair's absent boards count as resolved, whichever treatment is chosen. |
| ☐ EXP-8 | Download it with the treatment on **AVE− / AVE+**, then again on **Remove**. | With AVE, the absent boards appear with their AVE result. With Remove, those boards are left out. The leaderboard and the file agree. |

> **BridgeWebs upload:** if BridgeWebs is configured (file 09, `SET-11/12`), an
> **Upload to BridgeWebs** action appears (also disabled until complete).
> Optional: tap it and confirm a success message. (`EXP-BW-1`)

---

## 4. Delete game & completed-game redirect

| Check | Step | Expected |
|---|---|---|
| ☐ DEL-1 | Manage Game Menu → **Delete Game** (red). | A confirmation prompt. |
| ☐ DEL-2 | Confirm deletion. | The game is removed; it disappears from the Join/Manage lists. |
| ☐ DEL-3 | Confirm the deleted game no longer appears under **Join Game**. | Not listed. |
| ☐ DEL-4 | Open an old join/play link for a **completed** game (if you have one). | Redirected to its **leaderboard**, not the seat picker. |
