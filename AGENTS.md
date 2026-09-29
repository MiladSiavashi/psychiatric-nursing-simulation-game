# Repository Workflow

## Scope

These instructions apply to the entire repository. This project is a psychiatric nursing simulation built with React, TypeScript, Vite, and canvas-based game effects. Keep clinical simulation logic, presentation components, scenario content, and future backend integrations modular and synchronized.

## Before Editing

- Inspect `git status`, the relevant project structure, and applicable `AGENTS.md` files before changing code.
- Present a concise plan before significant features, bug fixes, refactors, or configuration changes.
- Preserve unrelated work and warn before replacing essential configuration.
- Report environment failures with the exact error and a safe proposed solution before continuing.

## Architecture

- Keep scenario content in `src/data`, reusable simulation behavior in `src/features`, general game services in `src/game`, and React presentation in `src/components`.
- Prefer pure, deterministic domain functions for patient state transitions so they remain testable and portable to a future backend.
- Keep UI, scoring, persistence, audio, and clinical state responsibilities separate.
- If a .NET backend is introduced, define explicit API contracts and keep frontend and backend models synchronized without duplicating business rules unnecessarily.

## Code Quality

- Follow strict TypeScript settings and existing formatting conventions.
- Use clear names, focused functions, explicit types at module boundaries, and minimal dependencies.
- Avoid `any`, hidden mutation, duplicated domain logic, and unrelated cleanup.
- Preserve Persian/RTL content and file encoding; do not rewrite scenario copy unless the task requires it.
- Maintain keyboard accessibility and responsive behavior when changing UI flows.

## Validation

- Run the narrowest relevant checks first, then `node node_modules/typescript/bin/tsc --noEmit` and a production Vite build for frontend changes.
- Use `npm ci` when dependencies must be restored from `package-lock.json`.
- Do not commit generated output, dependency folders, local environment files, or editor metadata.
- Report unrelated test failures or dependency advisories without silently broadening the task.

## Git Workflow

- Review status and staged diffs before every commit.
- Use focused branches for significant work when requested or when collaborating through a remote repository.
- Write descriptive Conventional Commit messages such as `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, or `chore:`.
- Stage only files belonging to the requested change and preserve unrelated modifications.
- Do not force-push, rewrite shared history, or use destructive Git commands without explicit approval.
- If a merge, rebase, or push conflict occurs, stop and ask for clarification before choosing a resolution.
- Create commits, pushes, tags, branches, and pull requests only when explicitly requested.
