# Browser Emulator migration report

**Scope:** Browser B1 only, following the user's 17 November 2026 direction to exclude the native iOS app. This supersedes the original two-app scope in `CODEX_MIGRATION.md`; that brief remains unchanged on target `main` as historical authorization.

**Status:** Browser-only tree and local checks are ready. The updated branch still needs to be pushed, then its hosted Browser workflow and draft PR must be checked. No PR has been opened, and nothing has been merged or deployed.

## Source provenance

- Original Pokémon Reader checkout at start: clean `main`, `df6665ff10df2b36c887e726d47eea15bfb211dd`. No changes were made there.
- Current Reader parser source: `main` at `66ba4a5ef7b5ef1694e50b5aaa061cb6c51fda07`, Reader version `0.27.8`.
- Browser UI source: open, unmerged Reader PR #9, branch `emulator-0.2-immersive-ui`, head `d481008e6fd39ff2f44932a92a7f710786cd13dc`, based on `6765803c3a31e8ae2c4117b962f909c35e08c261`. PR #9 remains open and unmerged.
- Target Emulator `main` contained only `CODEX_MIGRATION.md` at `90396b8c7bd0f2a42d0c0b01f921d66e3b84e883` when cloned.

PR #9's Browser-related differences were `index.html`, `style.css`, `offline-assets.json`, `sw.js` and `source.zip`. Its unrelated Gen 3 shiny parser edit was excluded. The immersive layout and controls were retained; generated offline files and `source.zip` were rebuilt for the standalone tree.

## Included

- Complete `browser-emulator/`, including source, PWA assets, shipped WASM/core, tests, build/serve scripts and third-party notices.
- Browser B1 protocol/evidence and its verification workflow.
- The 16-module Reader parser/data closure in `reader-dependency/`, pinned in `reader-dependency/manifest.json`.
- The synthetic save helper and Platinum fixture required by Browser tests.
- The Browser test ROM header under `browser-emulator/tests/TestROM.h`; CMake and the corresponding-source package no longer refer to an `ios/` path.

The native `ios/` app, native workflow, E1–E4 documents, Reader UI/runtime files and native-only fixtures have been removed from the branch's current tree. CMake 3.31.6, Ninja 1.11.1.3 and their pip cache were removed from ignored `work/` as requested. The branch's first migration commit briefly included iOS before this scope change; a follow-up commit removes those files from the current tree. No draft PR was opened while the scope was being revised.

## Standalone adaptations

- Browser parser preparation reads only from `reader-dependency/js/` and emits the existing `browser-emulator/vendor/reader/` layout.
- Browser UI no longer loads the Reader menu or links to the Reader website. It keeps the immersive green layout with Emulator naming and documentation links.
- The browser core includes `browser-emulator/tests/` for its test ROM. The source ZIP uses `emulator/` paths and has no `pokemon-reader/` prefix.
- The workflow targets `main` and `migration/**`, and watches Browser B1/parser inputs only.
- Root README and package scripts describe Browser B1 only.

## Validation

Passed locally against the Browser-only tree:

- `node browser-emulator/scripts/prepare.mjs` — **32 offline assets**, **774-entry** corresponding-source ZIP (773 app/core inputs plus `SOURCE-BUILD.txt`).
- Node `v24.22.1`: `node --test browser-emulator/tests/audio.test.mjs browser-emulator/tests/browser.test.mjs browser-emulator/tests/core.test.mjs` — **9 passed, 0 failed**, including real Chromium, offline restart, save import/export, checkpoint restore, parser closure and hash checks.
- The source ZIP was checked to use standalone `emulator/` paths only, with no `pokemon-reader/` prefix.
- Browser tests detected no required external Reader requests. Parser modules are supplied from the pinned snapshot.

System Node `v20.11.0` lacks the global WebSocket API used by the existing Chromium test; Node `v24.22.1` passed. Native/iOS builds and checks are out of scope. Browser iPhone WebKit, game compatibility, persistence and battery/energy acceptance remain untested; no device acceptance is claimed.

## Reader and integration boundaries

The original Pokémon Reader checkout's tracked status was clean before migration. Upstream refs were inspected in a separate clone under ignored `work/`; no Git operations or edits were performed in the original checkout. PR #9 remains open and unmerged. No Reader workflow, deployment, release or app-to-app integration was added. Historical Reader URLs remain only in source evidence or manual validation instructions, not as required Browser runtime assets.

## Review handoff

Branch: `migration/initial-emulator-import`, based on target `main` at `90396b8c7bd0f2a42d0c0b01f921d66e3b84e883`. Record the final branch commit, draft PR URL and hosted Browser workflow result here after pushing the scope update. Keep the PR unmerged for user review.
