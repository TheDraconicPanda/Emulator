# Pokémon Emulator

This repository contains two local-first Pokémon DS emulator applications:

- **Browser B1**: a static, offline-capable WebAssembly emulator in `browser-emulator/`.
- **Native iOS E4**: an iPhone application in `ios/`, built around the pinned melonDS core and an embedded read-only Reader snapshot.

The embedded Reader code is a versioned copy in `reader-dependency/`; it does not require a sibling Pokémon Reader checkout. ROMs and personal saves remain local to the app. They are not included in this repository.

## Prerequisites

- Node.js 22 or later for Browser B1 preparation and tests.
- CMake 3.25+, a C/C++ toolchain and Git for the portable native host build.
- macOS with Xcode and CMake for unsigned iPhone and simulator builds.
- Emscripten 4.0.10, CMake 3.25+ and Ninja to rebuild the browser core. The checked-in WebAssembly output can be used without the toolchain.

The scripts keep downloaded sources, caches and build output under repository-local `work/`.

## Run and verify Browser B1

```sh
node browser-emulator/scripts/serve.mjs
```

Open `http://127.0.0.1:8080/browser-emulator/`. The loopback server exposes only the explicit public asset list and never serves `work/`.

```sh
node browser-emulator/scripts/prepare.mjs
node --test browser-emulator/tests/*.test.mjs
```

Preparation rebuilds the parser closure, offline manifest, service worker, icons and source archive. Browser tests exercise the shipped WASM in Chromium; set `CHROMIUM_PATH` if Chromium is not available on `PATH`.

## Build and verify native E4

Portable host integration and tests (Linux, macOS or Windows with compatible CMake, compiler, Python and Node installations):

```sh
cmake -S ios -B work/e1/build-linux -DCMAKE_BUILD_TYPE=Release
cmake --build work/e1/build-linux --parallel 4
ctest --test-dir work/e1/build-linux --output-on-failure
```

On macOS, `python3 ios/scripts/build.py --sdk iphoneos` or `--sdk iphonesimulator` creates an unsigned build under `work/e1/artifacts/`. An unsigned build is not an installable iPhone release; signing and device acceptance remain separate checks.

See [native build and test notes](ios/README.md), [Browser B1 protocol](docs/browser-b1.md), and the E1–E4 evidence in `docs/`.

## Dependency updates

`reader-dependency/manifest.json` records the upstream Reader commit, release version, copied groups and update process. Refreshing it is a deliberate migration: rerun the Browser parser-closure preparation, native bundle tests and full Emulator-specific checks before changing its provenance.

The migration report records source refs, exclusions, path adaptations, checks and outstanding device validation.
