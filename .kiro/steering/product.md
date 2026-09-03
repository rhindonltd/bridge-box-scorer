# Product

Bridge Box Scorer is a real-time scoring application for duplicate bridge clubs. It is designed to run on a local "Bridge Box" device (e.g. a Raspberry Pi) during club sessions.

Directors manage games from the device while players enter results from their own devices at the table, with updates propagating live over WebSockets.

## Core capabilities

- Create and manage duplicate bridge games (Pairs, Individual)
- Real-time score entry from player devices
- Multiple movement types: Mitchell, Howell, American Whist
- Live session timer with director controls
- Matchpoint (MP), IMP, and Cross-IMP scoring
- Traveller sheets and leaderboard display
- EBU player database integration
- Director authentication via PIN

## Deployment context

Runs as a single self-hosted server on a local device, serving both HTTP (Next.js) and WebSocket (Socket.IO) traffic on one port. Assume a small number of concurrent local clients on a LAN rather than internet-scale traffic.
