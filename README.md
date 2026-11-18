# Pokémon Emulator

This repository contains the Browser B1 local-first Pokémon DS emulator. It is a static, offline-capable WebAssembly application in `browser-emulator/`; it does not require the Pokémon Reader checkout to build or run. ROMs and personal saves stay in the browser and are not included here.

## Prerequisites

- Node.js 22 or later for preparation and tests.
- Chromium for the automated browser integration test.
- Emscripten 4.0.10, CMake 3.25+ and Ninja to rebuild the WebAssembly core. The checked-in WASM can be used without this build toolchain.

The scripts keep downloaded sources, caches and build output under repository-local `work/`.

## Run Browser B1

```sh
node browser-emulator/scripts/serve.mjs
```

Open `http://127.0.0.1:8080/browser-emulator/`. The loopback server exposes only the explicit public asset list and never serves `work/`.

## Prepare and test

```sh
node browser-emulator/scripts/prepare.mjs
node --test browser-emulator/tests/*.test.mjs
```

Preparation builds the parser closure from `reader-dependency/`, regenerates icons, offline hashes, the service worker and corresponding-source archive. Browser tests exercise the shipped WASM in Chromium; set `CHROMIUM_PATH` if Chromium is not on `PATH`.

## Browser core build

Use Emscripten 4.0.10, CMake 3.25+ and Ninja:

```sh
node browser-emulator/scripts/build-core.mjs
node browser-emulator/scripts/prepare.mjs
```

The build script uses `work/research/melonds` for the verified core source and `work/tools/emsdk` for Emscripten. See [Browser B1 protocol](docs/browser-b1.md) for setup and phone validation. Browser phone acceptance remains separate from desktop Chromium results.

## Reader parser snapshot

`reader-dependency/manifest.json` records the exact upstream Reader revision and the small parser/data closure used by Browser B1. It also documents how to refresh that copy deliberately. No Reader app routes, native iOS app, submodule or external Reader checkout is required.
