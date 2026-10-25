# RawAccel

A Windows mouse acceleration application built with Rust, Tauri, React, and TypeScript. This branch rewrites the RawAccel desktop application and adds **Tiered**, a two-stage acceleration mode with Linear and Natural transitions.

The work is intended as a contribution to [RawAccel](https://github.com/RawAccelOfficial/rawaccel). The existing C++ kernel driver is retained. The desktop application uses the installed signed driver for supported modes; Tiered can be edited and previewed until a compatible signed driver is available.

## Features

- Profiles, per-device assignments, and device settings for DPI, polling, time clamps, and diagnostic options.
- No acceleration, Linear, Classic, Jump, Natural, Power, Synchronous, Lookup, and Tiered curve editing.
- Sensitivity, Velocity, and Gain graphs: show any one, any pair, or all three. Combined and independent X/Y views keep distinct curve colors in light and dark themes.
- Tiered Linear and Natural submodes, with three sensitivity levels and two adjustable transitions.
- Lookup-table editing, draggable points, CSV import, and table restoration.
- Output sensitivity, directional ratios, rotation, snapping, domain/range weights, speed limits, and smoothing controls.
- Import of modern and original RawAccel settings, JSON export, validation, recovery copies, and explicit Apply & Save.
- Silent restoration of saved settings at sign-in, using the same executable as the desktop application.
- Light, dark, and system themes; saved window bounds and interface preferences; warnings before discarding unsaved edits.

## Driver compatibility

The default build targets the signed **RawAccel 1.7.0 driver protocol**, as shipped in the upstream v1.7.1 release. The application checks the reported driver version before sending settings. Unsupported or unavailable drivers leave curve editing and previews usable, but block Apply.

**Tiered is preview-only with the stock driver.** Any profile containing Tiered on either axis blocks the entire Apply request, including profiles that are not currently selected. Tiered is a native acceleration mode, not a lookup-table approximation.

The modified C++ headers in `common/` contain the Tiered implementation and its extended configuration layout. Stock packets and the future Tiered layout have separate serializers and reference tests. The `custom-tiered-driver` Cargo feature is reserved for a matching, separately verified driver; it must remain off for stock-driver releases. Enabling a build feature does not make an installed driver compatible.

The driver is installed separately and does not need reinstalling after every restart. Its acceleration configuration needs to be reapplied. Official driver downloads and installation instructions are available from the [upstream releases](https://github.com/RawAccelOfficial/rawaccel/releases) and [guide](https://github.com/RawAccelOfficial/rawaccel/blob/master/doc/Guide.md).

## Run from source

The native application and ABI checks target **Windows x64**. Install:

- Stable Rust with the MSVC toolchain.
- Visual Studio C++ Build Tools with the Windows SDK.
- Node.js 22.12 or later and npm. The Vite 7 dependency also supports Node.js 20.19 or later.
- Microsoft Edge WebView2 Runtime.

See the [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/#windows) for native toolchain setup. A driver is needed to apply settings, but not to edit or preview curves.

```powershell
cd rawaccel-userspace
npm ci
npm run tauri -- dev
```

`npm run dev` starts only the browser frontend. Native driver, device, settings, and startup commands require the Tauri application.

## Configure a mouse

1. Create or import a profile and adjust its curve.
2. Assign the profile to the intended mouse under Mappings. A disconnected device's saved configuration remains available.
3. Use **Apply & Save** to send all supported profiles and device settings to the driver, then save the document.

Editing a field or importing a file does not change the driver. Export saves an editor document without applying it. If Apply succeeds but saving fails, the application reports that distinction: the driver can have the new configuration while the saved file still contains the previous one.

The live-input readout is an aggregate Raw Input estimate across relative mouse devices. Graph dots are theoretical curve projections, not measured kernel output. Loading a file or displaying a previous startup result does not establish the driver's current configuration.

## Settings and sign-in restoration

| Mode | Authoritative file | Secondary copy |
| --- | --- | --- |
| Installed/default | `%LOCALAPPDATA%\RawAccel\settings.json` | Beside the executable, when distinct and writable |
| Portable (`portable.txt` beside the executable) | `settings.json` beside the executable | `%LOCALAPPDATA%\RawAccel\settings.json` |

Settings shows the resolved paths and provides an **Open settings folder** button. Paths do not depend on the working directory. If the executable is installed directly in `%LOCALAPPDATA%\RawAccel`, the two paths coincide and only one file is written. A save must update the authoritative file; a secondary-copy failure is reported as a warning.

Settings are validated before use. Recognized original-format files are migrated in memory; saving preserves a previous file as `settings.json.bak`. The desktop app can recover from another copy or backup. Keep an export of your original settings when trying both GUIs, since the original GUI may not understand this application's document format.

After a successful Apply & Save, enable **Restore settings at sign-in** in Settings. Windows launches `RawAccel.exe --silent`, which validates and applies the authoritative saved configuration, records `startup-result.json`, and exits without opening the UI. It does not silently apply an older recovery file; recover and save that file in the desktop app first.

Disable older RawAccel or `writer.exe` startup shortcuts to avoid competing writers. Moving a portable copy requires updating its startup path from the new location. Startup remains opt-in; Settings shows stale registrations, failures, and previous restoration results.

## Build packages

From `rawaccel-userspace`:

```powershell
npm run bundle:windows
npm run bundle:portable
```

The first command builds a current-user NSIS installer and checks the generated payload. The second builds a portable ZIP with `RawAccel.exe`, `portable.txt`, a guide, and the license. Neither package contains a driver installer, `writer.exe`, or personal settings.

Artifacts are written under:

- `rawaccel-userspace/src-tauri/target/release/bundle/nsis/`
- `rawaccel-userspace/src-tauri/target/distribution/`

The installer embeds the WebView2 bootstrapper; downloading the runtime can still require internet access. Portable use requires WebView2 already installed. Builds made without a signing certificate are unsigned development packages, not official signed RawAccel releases. See [RELEASE.txt](rawaccel-userspace/RELEASE.txt) for installation details and the release checklist.

## Tests

From `rawaccel-userspace`:

```powershell
npm test
npm run build
npm run test:math-reference
npm run test:abi
cd src-tauri
cargo test --locked
```

The C++ reference checks require Python 3 and the MSVC x64 compiler. They compile small user-mode programs against the actual headers, without building or opening a driver. The stock ABI reference is pinned in `src-tauri/tests/abi/stock-reference.json`; that Git commit must be available locally.

The shared mathematical corpus covers 112 configurations and 6,068 samples. Rust and TypeScript results are compared with the C++ operators, including Tiered Linear/Natural, Gain/Legacy choices, lookup packing, and Synchronous tables. This provides sampled arithmetic evidence, not proof of every valid input or live driver behavior.

`npm run test:ui` builds the production frontend and tests it in isolated Chrome with a fake native backend. It requires Chrome and Playwright available to Node; `NODE_PATH` can point to a globally installed Playwright package. The tests cover imports, discard protection, startup controls, preferences, and themes without changing the real driver or Windows startup registration.

The scripts and fixtures are part of the regression suite and packaging workflow. Generated outputs and personal configurations are excluded from version control.

## Project layout

| Path | Purpose |
| --- | --- |
| `rawaccel-userspace/src/` | React interface, TypeScript curve previews, and editor state |
| `rawaccel-userspace/src-tauri/src/` | Rust validation, settings, driver communication, device enumeration, and startup |
| `rawaccel-userspace/src-tauri/tests/` | Mathematical/ABI references, fixtures, and executable integration tests |
| `rawaccel-userspace/scripts/` | Regression checks and package builds |
| `common/` | C++ acceleration operators and driver contracts, including Tiered |
| `driver/` | Existing Windows kernel driver source |
| `doc/` | Original RawAccel documentation |

## Remaining work

The measured **Curve Laboratory** is planned after a compatible signed Tiered driver is available. It will need a validated per-device capture method and an explicit error budget before comparing expected and observed output. Kernel latency cannot be inferred from frontend update intervals or Raw Input arrival gaps.

Live Tiered verification and measured latency remain pending. Final native installation, upgrade, uninstall, window-close, and sign-in tests are also needed before a production release. English is available; Japanese translation is planned.

## License

[MIT](LICENSE). Based on the original RawAccel project by a1xd and its contributors.
