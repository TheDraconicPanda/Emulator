# Emulator repository migration report

**Status:** local migration and checks complete; branch push, draft review and hosted checks are next. No merge or deployment has been made.

## Source provenance

- Pokémon Reader checkout inspected at start: clean `main`, `df6665ff10df2b36c887e726d47eea15bfb211dd`. It was not edited by the migration.
- Current upstream Reader source used for native iOS and the Reader dependency snapshot: `main` at `66ba4a5ef7b5ef1694e50b5aaa061cb6c51fda07`, Reader version `0.27.8`.
- Browser UI source: open, unmerged Pokémon Reader PR #9, branch `emulator-0.2-immersive-ui`, head `d481008e6fd39ff2f44932a92a7f710786cd13dc` (base `6765803c3a31e8ae2c4117b962f909c35e08c261`). The PR remains open and unmerged.
- Target `TheDraconicPanda/Emulator` `main` contained only `CODEX_MIGRATION.md` at `90396b8c7bd0f2a42d0c0b01f921d66e3b84e883` when cloned. Work is isolated on `migration/initial-emulator-import`.

PR #9's Browser-related path differences from the selected current Reader main were `browser-emulator/index.html`, `offline-assets.json`, `source.zip`, `style.css`, `sw.js`, and the vendored `vendor/reader/js/saves/gen3-pokemon.js`. The immersive layout and controls were carried over. The offline manifest, worker and source archive were regenerated after standalone path changes. The vendored parser closure was regenerated from the pinned Reader snapshot, excluding the unrelated Gen 3 shiny-edit change. The PR branch's unrelated tree omissions were not imported.

## Moved and copied

- Complete `browser-emulator/` and `ios/` application trees, including source, WebAssembly/core assets, PWA files, native tests, scripts and third-party notices.
- Emulator workflows, Browser B1 protocol/evidence, iPhone E1–E4 plans, runbooks and evidence under `.github/workflows/` and `docs/`.
- Reader runtime source/data/presentation groups and pinned version metadata under `reader-dependency/`, with exact provenance and refresh instructions in `reader-dependency/manifest.json`.
- Synthetic save helper and the two Platinum stage fixtures required by Emulator checks under `tests/fixtures/`.
- Only `docs/platinum-great-marsh.md` is included from Reader docs because the native integration check requests it. Other Reader docs, Atlas audits, Planner notes and Safari-only documentation were excluded. `team-planner/README.md` was excluded as non-runtime documentation.

## Standalone adaptations

- Browser parser closure now reads from `reader-dependency/js/saves/`; its generated vendor paths remain `browser-emulator/vendor/reader/js/saves/`.
- Browser app no longer loads the Reader app shell or links to the Reader website. It retains the green palette and immersive B1 controls, with Emulator-owned naming and documentation links.
- Browser `source.zip` now uses `emulator/` paths and includes the dependency manifest; no `pokemon-reader/` path remains in the archive.
- Native `bundle-reader.py` maps runtime inputs from `reader-dependency/` and copies the migrated `browser-emulator/` tree. Its integrity checks and read-only save overlay are retained.
- Native parser helpers import from `reader-dependency/`; native bundling reads the pinned Reader version from its copied package metadata.
- Browser and native workflows target `main` and `migration/**`, with path filters covering their actual standalone inputs. The source-only workflow artifact names were changed to Emulator names.
- `README.md`, `package.json` and `.gitignore` now describe the standalone repository and keep build/tool state in ignored `work/`.

## Validation

Passed locally:

- `node browser-emulator/scripts/prepare.mjs` — generated 32 offline assets and a 774-entry source ZIP (773 app/core source entries plus `SOURCE-BUILD.txt`).
- Browser B1 tests under Node `v24.22.1`: `node --test browser-emulator/tests/audio.test.mjs browser-emulator/tests/browser.test.mjs browser-emulator/tests/core.test.mjs` — **9 passed, 0 failed**, including real Chromium coverage, offline restart, save import/export, checkpoint restore and parser closure/hash checks.
- `ios/scripts/bundle-reader.py work/migration-check/Reader` — **2,064 files**, 34,992,981 bytes; all bundle hashes verified. Browser WASM, Reader app and required Great Marsh reference were present. Only the selected Great Marsh document was bundled.
- `ios/scripts/native-fixtures.cjs` and `ios/scripts/reader-fixtures.cjs` — generated four synthetic bridge saves; the pinned standalone Reader parser decoded all four.
- Source archive audit — 773 corresponding-source entries, all under standalone paths; no `pokemon-reader/` archive prefix.

Local environment limits:

- CMake `3.31.6` and Ninja `1.11.1.3` are installed only under ignored target `work/tools/`. Native CMake configuration was attempted, but this Windows host has no C or C++ compiler; CTest and the native C++/WebKit smoke checks could not run locally. The target branch's Linux/macOS workflows must pass before review handoff is complete.
- iOS SDK build/signing and iPhone installation, gameplay, persistence, energy and battery checks are not available on this Windows host and remain unaccepted. Existing E1–E4 evidence is historical source evidence, not a build from this migration branch.
- Initial system Node `v20.11.0` lacks the global WebSocket API used by the existing Chromium test; the full browser suite passed with the available Node `v24.22.1` runtime.
- The entire Reader regression suite was not run; the Reader checkout remains untouched.

## Reader and integration boundaries

The original Pokémon Reader checkout's tracked Git status was clean before migration. No Git operations or edits were performed in that checkout; upstream refs were inspected in a separate clone under its ignored `work/` directory. PR #9 remains open and unmerged. No Reader links, workflow changes, deployments, releases or app-to-app integration were added. No iPhone acceptance is claimed.

## Review handoff

The migration branch is `migration/initial-emulator-import`, based on target `main` commit `90396b8c7bd0f2a42d0c0b01f921d66e3b84e883`. The draft PR URL and hosted workflow results will be recorded here after the branch is pushed and checks finish. The PR will remain unmerged for user review.
