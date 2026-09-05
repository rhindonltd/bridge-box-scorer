# Product

Bridge Box Scorer is a real-time scoring application for duplicate bridge clubs.
It runs on the **Bridge Box** — a plug-in appliance provided to the club. The
appliance is internally a small single-board computer (currently a Raspberry
Pi), but this is an implementation detail; treat it as an opaque appliance in
product-facing language and documentation.

When switched on, the Bridge Box creates its **own local network**. Players and
directors connect their phones/tablets to that network and use the app in a
browser. All in-venue communication happens over this local network, so a
session works with no internet access at the venue.

Directors manage games; players enter their own results at the table; updates
propagate live to every connected device.

## Core capabilities

- Create and manage duplicate bridge games (**Pairs** and **Teams**)
- Multiple sections per game, each with its own tables and movement
- Real-time score entry from player devices, with dual-side confirmation
- Multiple movement types: Mitchell, Howell, American Whist
- Live session timer with director controls (play/move/break phases)
- Matchpoint (MP), IMP, and Cross-IMP scoring
- Traveller sheets and live leaderboard display (per-section + combined)
- Director result correction / overrides (including adjusted scores)
- EBU player database integration for player search
- USEBIO export of results

## Director access

Director access is **not** a PIN. The person who creates a game becomes its
director automatically on that device (a director token is held on the device,
per game). To let a co-director manage from another device, a director
generates a short **share code** which the other person claims. Device-level
settings are protected separately by an **admin key**.

## Cloud services (subscription)

The Bridge Box can optionally connect out to the internet for **subscription**
cloud services:

- Publishing event results to the cloud for display on the BridgeBox website
- Receiving software updates for the appliance
- Backing up the appliance's data

Running a session does not require any of these — they are additive to the
local, offline-capable core.

## Deployment context

Runs as a single self-hosted server on the appliance, serving both HTTP
(Next.js) and WebSocket (Socket.IO) traffic on one port over the appliance's
local network. Assume a small number of concurrent local clients on a LAN
rather than internet-scale traffic.
