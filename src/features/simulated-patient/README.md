# Simulated Patient Domain

This feature owns the clinical simulation state and its deterministic transitions.

- `model.ts` defines patient state and interaction result contracts.
- `engine.ts` initializes a patient, applies learner choices or timeouts, detects crisis state, and resolves successful de-escalation.
- `index.ts` is the public module boundary used by the application.

Scenario content remains in `src/data`, while UI rendering, audio/animation effects, scoring, and persistence remain outside this module. Keeping the engine pure makes it suitable for unit tests, alternative interfaces, and a future backend-driven scenario source.
