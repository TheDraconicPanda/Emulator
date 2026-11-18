# Emulator Repository Migration — Codex Execution Brief

**Target repository:** https://github.com/TheDraconicPanda/Emulator  
**Source repository:** https://github.com/TheDraconicPanda/pokemon-reader  
**Target branch:** `main`  
**Status:** Migration authorized; execution must be isolated and verified before any Reader integration work.

## 1. User-approved outcome and hard boundary

Move the two Emulator applications out of Pokémon Reader and into the new standalone Emulator repository:

- Browser Emulator: the complete `browser-emulator/` application.
- Native iOS Emulator: the complete `ios/` application.

Copy into Emulator only the Reader code, data, fixtures, and assets that the Emulator actually needs to build and run independently.

**The Pokémon Reader application must remain untouched.** Do not delete, move, rename, reformat, regenerate, or otherwise modify any file in `pokemon-reader` as part of this migration. Do not change its workflows, Pages deployment, app navigation, save parsers, tests, documentation, or package metadata. Do not merge or close PR #9. Do not add links or integration code between the two applications yet.

The intended sequence is:

1. Extract and migrate both Emulator applications into the new repository.
2. Copy the minimum required Reader dependencies so Emulator builds and runs independently.
3. Validate the new repository and document any remaining gaps.
4. Stop. Only after this migration is reviewed will we plan how the two applications should link to one another.

This is a repository separation, not a product redesign or feature milestone.

## 2. Source selection: inspect before copying

Do not assume the local checkout or branch is current.

1. Inspect the local `pokemon-reader` checkout, all remotes, branch refs, working-tree status, and relevant commits before doing anything destructive.
2. The browser Emulator has a recent UI change in PR #9:
   - PR: https://github.com/TheDraconicPanda/pokemon-reader/pull/9
   - Branch: `emulator-0.2-immersive-ui`
   - Latest known head at preparation time: `d481008e6fd39ff2f44932a92a7f710786cd13dc`
   - It moves Pause beside Quick Save and adds immersive gameplay layout while preserving the existing green palette.
   - Its Codex follow-up regenerated offline assets and reported 9/9 B1 tests and 327/327 Reader tests passing. iPhone validation remains pending.
3. The native Emulator development track has historically used the `Emulator` branch. Verify whether that branch still exists and whether its native code is newer than the PR #9 head.
4. Select a source commit that contains the latest intended browser and native Emulator work. If the two tracks are at different commits, reconcile by copying the relevant paths from their respective verified source refs; do not silently discard either track's work.
5. Preserve PR #9 as open and unmerged. Do not merge it merely to make the migration easier.
6. Record exact source commit(s), branch names, and any path-level source differences in the migration report.

Do not overwrite uncommitted local work. If the local checkout is dirty, preserve it and use a clean separate worktree/clone for migration.

## 3. Target repository setup and safety

The target repository is currently expected to be a newly created, empty repository with default branch `main`. Verify this before writing.

- Target: `TheDraconicPanda/Emulator`
- Clone URL: `https://github.com/TheDraconicPanda/Emulator.git`
- Do not force-push.
- Do not rewrite or delete remote history.
- If the target is no longer empty, inspect its contents and reconcile without overwriting user work.
- Work on a dedicated branch such as `migration/initial-emulator-import`; do not push the migration directly to `main`.
- Commit the migration in reviewable logical commits and push the branch.
- Open a draft PR into `main` with the migration report and test results.
- Do not merge the PR. Do not create a release or deploy either application.

Prefer a history-preserving Git operation where practical. Because this is a new repository containing two applications plus copied dependencies, preserving the source repository's entire history is not required if it would make the extraction fragile. If using subtree/filter-repo, do not rewrite the source repository or push rewritten history back to it. Record the source commit provenance in the new repository.

## 4. What moves, what is copied, what stays

### 4.1 Move into the new Emulator repository

Move the complete application-specific source and supporting files for both Emulator implementations, including:

- `browser-emulator/` — all tracked source, HTML, CSS, JavaScript modules, worker, audio worklet, WASM/core binaries, PWA manifest, icons, offline asset manifest, service worker, scripts, tests, source/build archives, and third-party notices.
- `ios/` — all native application code, Core implementation, WebKit bridge, native web assets, build scripts, CMake configuration, tests, fixtures/helpers, pinned core metadata, and third-party notices.
- Emulator-specific GitHub Actions workflows, after adapting paths and triggers for the standalone repository.
- Emulator-specific documentation and evidence, including the B1 browser documentation and E1–E4 native milestone plans, runbooks, evidence, benchmark and download metadata.
- Any Emulator-specific test fixtures or test helpers currently outside `browser-emulator/` or `ios/` that are genuinely required to validate the Emulator.

Do not include unrelated Reader documents, Atlas audits, Planner notes, Safari-only documentation, or unrelated app source.

### 4.2 Copy into Emulator as standalone Reader dependencies

The Emulator currently relies on shared Pokémon Reader code and data. Copy the exact required dependencies into a clearly named, isolated directory such as:

`reader-dependency/`

The precise contents must be derived from actual import/build/runtime dependency analysis, not guessed. Likely dependencies include:

- Save parser modules used by browser B1 and native Reader integration.
- Their transitive JavaScript imports and required static data.
- Reader HTML, JavaScript, CSS, sprites, maps, and feature assets required by the native app's embedded Reader experience.
- The shared application shell assets currently referenced by browser Emulator (`css/app-shell.css`, `js/app-shell.js`) if they are still needed for the migrated standalone app. Since the Reader must not be changed, make the Emulator-side copy or replace this dependency with a minimal Emulator-owned navigation element later; do not edit the Reader's shell.
- Test fixtures required by Emulator-specific automated tests, including known-good synthetic save fixtures and expected outputs.
- Any static data generated from Reader sources that the Emulator needs to run offline.

The copied dependencies must be self-contained and pinned to an identifiable Reader source commit/version. Add a manifest documenting:
- Upstream repository and exact source commit.
- Reader release/version if available.
- Each copied directory/file group and why it is needed.
- Whether the copy is source code, data, generated output, or test-only.
- How to refresh the copy deliberately in a future dependency update.

Do not copy the entire Reader repository merely for convenience. Do not copy user ROMs, personal save files, secrets, credentials, local browser data, build caches, or machine-specific paths.

### 4.3 Keep in Pokémon Reader

Leave all of the following in `pokemon-reader` unchanged:

- Main Reader website and app entry points.
- Reader-owned save parser implementation and canonical data.
- Planner, Pokédex, Atlas, Safari Zone, Trade and other non-Emulator applications.
- Shared CSS/JS source files and production navigation.
- Existing Reader tests, fixtures, workflows and package metadata.
- GitHub Pages configuration and production deployment.
- `HANDOFF.md` and existing Reader project documentation.
- PR #9 and all other branches/PRs.

The new Emulator repository gets independent copies of any dependencies it needs. Do not create a submodule pointing at the Reader repo as a shortcut: the requirement is for Emulator to build and run independently from its own checked-out files.

## 5. Dependency and build audit — do this before changing paths

The current scripts assume the Emulator lives inside the Reader repository. A straight directory copy will not work.

Inspect and map all assumptions, especially:

### Browser B1

- `browser-emulator/scripts/prepare.mjs`
  - Currently assumes the repository root contains `js/saves/index.js`, `package.json`, `docs/browser-b1.md`, `ios/Tests/TestROM.h`, and the Browser Emulator source directory.
  - It regenerates icons, `source.zip`, `offline-assets.json`, and `sw.js`.
  - It copies the parser's transitive closure into `browser-emulator/vendor/reader/`.
  - It packages the pinned melonDS source plus project build inputs into `source.zip`.
  - Update its source paths to use the new dependency layout without changing generated output semantics.
- `browser-emulator/CMakeLists.txt`
  - Currently references `../ios/Tests`; keep or update this reference consistently after moving both app directories.
- `browser-emulator/scripts/build-core.mjs`
  - Verify the pinned core lock, source path, Emscripten version and repository-local tool/cache paths.
- `browser-emulator/index.html`
  - Currently references `../css/app-shell.css` and `../js/app-shell.js`. Replace those references with Emulator-owned copied assets or a standalone Emulator-owned shell. Do not link back to Reader production URLs for required app functionality.
- `browser-emulator/offline-assets.json` and `sw.js`
  - Regenerate after final path changes using the existing preparation script. Do not hand-edit generated hashes or cache versions.
- Browser tests and scripts must run from the new repository root and must not assume the Reader checkout is present.

### Native iOS E1–E4

- `ios/scripts/bundle-reader.py`
  - Currently copies Reader root directories such as `index.html`, `js`, `css`, `assets`, `team-planner`, `pokedex`, `atlas`, `safari-zone`, `trade`, `browser-emulator`, and `docs`.
  - Refactor the bundle input mapping to consume the pinned `reader-dependency/` snapshot and the migrated Browser Emulator from this repository.
  - Preserve the current audited overlay behavior, hash manifest, shiny asset integrity checks, and read-only completed-save integration.
  - Ensure it still builds the same intended embedded Reader feature set without requiring a sibling Reader checkout.
- `ios/CMakeLists.txt`
  - Audit every relative path, test fixture reference and build input after the move.
- `ios/scripts/*.py`, `*.cjs`, and workflow files
  - Audit root calculations, test fixture locations, generated output paths and dependency versions.
- `ios/README.md` and milestone docs
  - Correct paths and instructions so all commands are run from the new Emulator repository.
- The native workflow currently references `ios/**` and may use a branch filter for `Emulator` and `main`. Update it to trigger on the new repository's `main` and migration/development branches as appropriate, and on the actual native source paths. Ensure path filters do not prevent the workflow from running after migration.

Do not weaken integrity checks or test coverage to make a build pass.

## 6. Proposed repository structure

Use a clean structure that preserves application path assumptions where possible. This is a proposal, not permission to blindly relocate files:

```
Emulator/
  README.md
  CODEX_MIGRATION.md
  MIGRATION_REPORT.md
  package.json                    # only if useful for Emulator test/build scripts
  .github/
    workflows/
      browser-b1.yml
      emulator-e1.yml
  browser-emulator/
    ... complete Browser B1 application ...
  ios/
    ... complete native iOS application ...
  reader-dependency/
    manifest.json
    ... minimal copied Reader source/assets/data ...
  tests/
    ... Emulator-owned fixtures and test helpers ...
  docs/
    browser-b1.md
    iphone-emulator-v1-plan.md
    emulator-e1-*.md
    emulator-e2.md
    emulator-e3.md
    emulator-e4.md
    ... other Emulator-specific docs/evidence ...
```

Keep the original `browser-emulator/` and `ios/` directory names unless a strong technical reason requires changing them. Minimize path churn.

If tests need a copy of Reader's fixtures, put them under a clearly identified dependency/test directory and document their upstream source. Do not mix Reader-only tests into Emulator's test command.

## 7. Preserve behavior and project decisions

This is a migration, not a redesign. Preserve:

- Existing browser Emulator green palette and visual styling.
- Immersive gameplay layout from PR #9.
- Touch controls and portrait/landscape responsive layout.
- Pause/menu behavior and Quick Save placement.
- Cartridge save and full-state checkpoint separation.
- Offline PWA behavior and service-worker scope.
- Local-only ROM/save handling; do not upload personal ROMs or saves.
- Native iOS architecture, pinned melonDS core, no-JIT/no-OpenGL decisions, software rendering and audio pipeline.
- Reader integration as a read-only consumer of validated completed in-game saves.
- Save integrity, checksum, generation, fallback, and atomic storage behavior.
- Existing GPL and third-party licensing notices and source provenance.

Never claim iPhone acceptance based on host tests or builds. iPhone portrait/landscape, touch, audio, storage, persistence, battery, installation/signing and game compatibility remain device-level checks unless actual device evidence exists.

## 8. Required migration procedure

Work in bounded, reviewable phases:

### Phase A — inventory and provenance

1. Confirm target repo state and source refs.
2. Inspect source working tree and preserve uncommitted work.
3. Inventory all tracked Emulator paths and external dependencies.
4. Build a dependency map for both browser and native implementations.
5. Identify large binaries and licenses. Keep required checked-in binaries; do not add ROMs or private saves.
6. Record exact source refs and proposed move/copy/keep classification in `MIGRATION_REPORT.md`.

### Phase B — extract and copy

1. Create the migration branch in the target repo.
2. Move/copy the complete `browser-emulator/` and `ios/` trees from the selected source revisions.
3. Bring over only Emulator-specific workflows and docs.
4. Copy minimum Reader runtime dependencies into `reader-dependency/`.
5. Include the manifest and source provenance.
6. Do not modify the source Reader checkout or push any changes to it.

### Phase C — make standalone

1. Update build scripts and tests for the new repository root/layout.
2. Replace Reader-relative browser navigation assets with local Emulator-owned copies.
3. Refactor native bundling to consume the copied Reader dependency snapshot.
4. Ensure both applications work with the Emulator repo as the only checkout.
5. Ensure no build script, runtime page, worker, service worker, test or documentation command requires files from `pokemon-reader` outside the copied dependency snapshot.
6. Ensure no production Reader URL is used as a required runtime asset.
7. Regenerate generated offline assets using the canonical script after final path changes.

### Phase D — validation

Run all feasible automated checks from the new repository. At minimum:

**Browser B1**
- Run `node browser-emulator/scripts/prepare.mjs`.
- Run `node --test browser-emulator/tests/*.test.mjs`.
- Verify `offline-assets.json` hashes match actual files.
- Verify service-worker precache list and scope are correct for the standalone deployment.
- Verify the browser app starts through its documented local server and all required module/worker/WASM URLs resolve.
- Verify no requests to the Reader repository or production Reader origin are needed for core Emulator operation.

**Native iOS**
- Configure/build the portable host integration using the documented CMake commands.
- Run all available CTest groups.
- Run Reader fixture and bundle tests using the copied dependency snapshot.
- Verify the native Reader bundle manifest contains all required files and hashes.
- Verify the embedded Browser Emulator paths and service-worker bypass behavior remain correct in the native bundle.
- If macOS/iOS SDK builds are unavailable in the current environment, state this explicitly; do not claim they passed.

**Repository**
- Run all Emulator-specific Node tests.
- Verify workflows parse and path filters match the new structure.
- Search for stale references to `pokemon-reader`, old relative paths, the old repository name, and old branch names. Distinguish provenance/documentation links from runtime/build dependencies.
- Check for accidental ROMs, personal save files, credentials, local caches, generated temporary directories and unrelated Reader files.
- Check licenses and third-party notices for both cores and copied Reader dependencies.

Do not run the entire Reader test suite as a migration requirement if it requires restoring or changing the Reader repository. If you do run Reader tests for comparison, run them against an isolated source checkout and report that this was verification only; no Reader files may be changed.

### Phase E — report and handoff

Create/update `MIGRATION_REPORT.md` with:

- Source commit(s) and branch refs.
- Target migration commit and PR URL.
- Exact moved directories and copied dependency groups.
- Files intentionally excluded and why.
- Dependency manifest location and upstream Reader revision.
- Every changed build/runtime path and why.
- Commands run and exact pass/fail counts.
- Checks not run and the reason.
- Remaining device validation.
- Known technical debt and follow-up integration work.
- A clear statement confirming whether the Reader repository remained unchanged.

Update `README.md` with repository purpose, architecture, prerequisites and concise local run/build/test commands. Keep detailed implementation docs in `docs/`.

## 9. Explicit exclusions — do not do these in this task

- Do not modify `pokemon-reader` in any way.
- Do not delete Emulator files from the Reader repository yet. The user asked for the Reader to remain untouched; source cleanup is a separate later decision.
- Do not merge PR #9 or any other PR.
- Do not implement cross-application links, shared navigation, shared profile storage, shared save transfer, cloud sync, or any integration between the two repositories.
- Do not change app UI, colors, controls, save formats, emulator core, feature behavior or product scope.
- Do not add new features or perform unrelated refactors.
- Do not change the pinned melonDS revisions or compiler versions.
- Do not add ROMs, commercial game files, personal saves, secrets or credentials.
- Do not deploy GitHub Pages or change the Reader's existing website.
- Do not mark the Emulator accepted or claim iPhone validation without actual device evidence.

## 10. Completion criteria

The migration is ready for review only when:

1. Both complete Emulator applications exist in `TheDraconicPanda/Emulator`.
2. All required Reader dependencies are copied into the Emulator repository and documented with exact provenance.
3. Browser and native build/test scripts no longer depend on an external Reader checkout.
4. The generated Browser PWA assets are current.
5. All feasible browser and native host tests pass, with any unavailable platform checks clearly identified.
6. Licensing and source notices are retained.
7. The migration report is complete.
8. A draft PR is open against Emulator `main`.
9. The original Pokémon Reader repository is unchanged, and PR #9 remains open/unmerged.
10. No cross-app linking work has started.

If a blocker prevents a safe migration, stop at the smallest coherent checkpoint, preserve all work, document the blocker and proposed resolution, and do not improvise by changing the Reader repository.

## 11. Final Codex response format

Report concisely but completely:

- **Status:** complete / partially complete / blocked.
- **Target PR:** URL and branch.
- **Source provenance:** exact source refs.
- **Moved:** application directories and supporting files.
- **Copied:** dependency groups and upstream Reader commit.
- **Standalone:** browser and native dependency audit result.
- **Tests:** exact commands and results.
- **Not tested:** platform/device checks.
- **Reader untouched:** confirmation backed by source working-tree/status or equivalent before/after evidence.
- **Remaining blockers:** concrete only.
- **Next step:** stop for user review; do not merge or start linking.

The user values finite, token-efficient work. Do not spend tokens rediscovering project architecture already documented here or in source docs. Read this brief first, inspect only what is needed to execute it, and provide one complete evidence-based migration report.
