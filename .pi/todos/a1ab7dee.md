{
"id": "a1ab7dee",
"title": "Phase 5: Networking latency + jitter metrics",
"tags": [
"phase-5",
"networking"
],
"status": "closed",
"created_at": "2026-02-06T19:00:28.544Z"
}

Added latency/jitter telemetry metrics.

- Added `network_latency` telemetry event type and summary aggregation.
- Added `computeLatencyMetrics` and `buildNetworkLatencyTelemetryEvent` helpers in `src/analytics/telemetry.ts`.
- Added tests in `tests/analytics/telemetry.test.ts` for latency metrics and summary behavior.

Tests: `npm run format`, `npm run lint`, `npm test`.
