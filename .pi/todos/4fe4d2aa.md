{
"id": "4fe4d2aa",
"title": "Phase 5: UI/UX, replay, and networking hardening",
"tags": [
"phase-5",
"ui",
"replay",
"networking"
],
"status": "closed",
"created_at": "2026-02-06T08:03:09.992Z"
}

Deliver HUD/planning UI, replay system, and networked authoritative server hardening per Phase 5.

- Added server-side planning input validation in `src/server/matchRoom.ts` (bounds, ownership, orientation, tech/level sanity, cap checks, duplicate tiles) with optional placement limits.
- Added test coverage for invalid planning inputs in `tests/server/matchRoom.test.ts`.
- Tests: `npm test -- tests/server/matchRoom.test.ts`.

## Updates

- Added replay speed bounds/constants (0.25x–2x) and tick metadata per round in `src/sim/replay.ts`.
- Match room now records round tick counts into replays; replay HUD state builder added at `src/client/replayHud.ts` and exported.
- Added replay UI localization entries and updated replay/localization tests.
- Added tests for replay HUD state and replay timeline speed bounds.

Tests: `npm test -- tests/sim/replay.test.ts tests/sim/replayTimeline.test.ts tests/client/replayHud.test.ts tests/client/localization.test.ts`
