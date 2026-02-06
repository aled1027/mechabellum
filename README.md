# Mechabellum Sim

Deterministic simulation and data tooling for the Mechabellum-style combat prototype.

## Development

### Prerequisites

- Node.js 20+ (project uses ESM and TypeScript)
- npm (ships with Node)

### Install

```bash
npm install
```

### Common commands

```bash
npm run lint
npm run format
npm test
```

## Building

Compile TypeScript to `dist/`:

```bash
npm run build
```

## Running

This project runs locally with Node.js (no Cloudflare runtime required today). The implementation plan describes a future Cloudflare-first backend (Workers/Durable Objects), but that stack is not implemented in this repo yet.

Run the deterministic checksum simulation (loads data from `./data` and runs a small battle):

```bash
npm run sim:checksum
```

## Playing the game

There is no playable client or UI in this repository yet—only the deterministic simulation and data tooling. The plan’s UI/UX and networking phases (Phases 5–6 in `IMPLEMENATATION_PLAN.md`) have not been built.
