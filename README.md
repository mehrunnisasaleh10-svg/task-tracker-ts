# Typed Task Tracker

A framework-free TypeScript task tracker for the **AI-Assisted Software Development Internship — Week 1** assignment. It implements the typed data layer, validation boundary, async/retry and cancellation helpers, filtering/sorting/grouping, cursor pagination, optimistic store, cache/search helpers, safe HTML renderer, statistics, and an interactive browser demo.

## Scope

- The API is simulated and in-memory. There is no backend, database, or real network request.
- The browser demo supports adding, editing, completing/reopening, deleting, searching, filtering, sorting, and task statistics.
- Sample tasks reset when the browser page reloads.
- All user-controlled strings are HTML-escaped before being inserted into rendered HTML.
- Do not commit secrets or real employee data. AI-generated code is not verified until you run and understand the checks.

## Requirements

- Node.js 24.x (the handbook specifies Node 24.18.0; a compatible Node 24 release is suitable)
- npm 11.x
- Git

## Run the browser demo

```powershell
npm ci
npm run dev
```

Open the `Local` URL printed by Vite, usually `http://localhost:5173/`. Use the form to add tasks; each task card has Complete/Reopen, Edit, and Delete controls. Search is debounced; priority and status filters and sorting run locally against the simulated data.

## Verify before submission

Run each command and inspect its actual output:

```powershell
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
```

Coverage thresholds are configured at **85% lines** and **80% branches**. Do not lower them to make a run pass. If a check fails, investigate and fix the relevant code/tests first. See `VERIFICATION_STATUS.md` for the exact checks completed in the environment that produced this archive and the limitations of that verification.

## Source modules

- `src/types.ts`: branded IDs, immutable Task, generic `AsyncState<T>`, exhaustive helper, `mapAsyncState`.
- `src/validation.ts`: `unknown` input parsing and per-item rejection reporting.
- `src/api.ts`: in-memory simulated API, overlapping cursor pages, configurable transient/persistent page failures.
- `src/fetcher.ts`: injectable delay/outcomes, exponential backoff with jitter, timeout, abort, latest-request guard.
- `src/filters.ts`: AND-combined filters, stable typed sorting, multi-key sorting, grouping.
- `src/pagination.ts`: retries, accumulated pages, ID de-duplication, cursor/page safeguards, retained loaded data on failure.
- `src/store.ts`: pure reducer and optimistic CRUD with rollback; latest mutation response wins for a task.
- `src/cache.ts`: injectable TTL clock, stale-while-revalidate, in-flight de-duplication.
- `src/search.ts`: debounced, cancellable search with stale-result protection.
- `src/render.ts`: exhaustive async-state HTML rendering and HTML escaping.
- `src/stats.ts`: totals, completion rate, priority counts, and average completion duration.
- `src/main.ts` and `src/styles.css`: responsive interactive browser interface.

## Required GitHub workflow from the PDF

1. Create your own **public** GitHub repository (do not share a repository with another intern).
2. Push the local scaffold to `main`, then protect `main` with PR approval and required CI checks.
3. Add `shameershahzad` as a collaborator with Write access.
4. Work only on focused feature branches, with at least **12 focused commits** overall.
5. Open at least **three separate Draft PRs** for the assignment. Use `.github/pull_request_template.md`.
6. Mark a PR Ready for review only after local checks and CI are green. Reply to review comments and get the reviewer’s approval. Never merge your own PR.
7. Submit the public repo link, at least three merged PR links showing reviewer comments/approval and green CI, coverage evidence, and an honest **8–10 sentence** learning log.

The browser demo is only one part of the assignment; the modules, meaningful tests, quality gates, and real review workflow are all required.
