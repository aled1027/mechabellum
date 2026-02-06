{
  "id": "4fe4d2aa",
  "title": "Phase 5: UI/UX, replay, and networking hardening",
  "tags": [
    "phase-5",
    "ui",
    "replay",
    "networking"
  ],
  "status": "open",
  "created_at": "2026-02-06T08:03:09.992Z",
  "assigned_to_session": "85d49396-ae9e-4e00-af31-4e11c62bcf41"
}

Deliver HUD/planning UI, replay system, and networked authoritative server hardening per Phase 5.

- Added server-side planning input validation in `src/server/matchRoom.ts` (bounds, ownership, orientation, tech/level sanity, cap checks, duplicate tiles) with optional placement limits.
- Added test coverage for invalid planning inputs in `tests/server/matchRoom.test.ts`.
- Tests: `npm test -- tests/server/matchRoom.test.ts`.
