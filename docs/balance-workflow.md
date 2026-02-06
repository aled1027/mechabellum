# Balance Workflow

This project uses a data-first balance pipeline with hotfix support.

## Tuning Sheets

- Run `npm run balance:report` to export a snapshot of unit, tech, and card values to
  `data/balance/tuning.json`.
- Review and annotate the sheet for desired targets before making changes.

## Hotfix Overrides

- Use `data/overrides.json` for rapid balance adjustments.
- Each override should be scoped to a single patch ticket and include a short note in the
  change description.
- After shipping a hotfix, fold the adjustments back into `data/bundle.json` and refresh the
  tuning sheet.

## Replay Validation

- Record replay fixtures in `data/replays.json`.
- Validate deterministic output with `npm run replay:validate` or the `replayValidator` test.
