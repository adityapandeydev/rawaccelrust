# Raw Accel — Rust Rewrite

A rewrite of the [Raw Accel](https://github.com/RawAccelOfficial/rawaccel) mouse acceleration driver's userspace application, built with **Rust + Tauri + React**.

## What is this?

This is a reimplementation of the Raw Accel userspace tool. The kernel-mode driver remains unchanged — this project replaces the C#/WinForms frontend and C++ math layer with:

- **Pure Rust backend** — all acceleration curve math (classic, jump, natural, power, synchronous, lookup) ported 1:1 from the original C++ headers
- **Tauri** — lightweight native window shell, replacing the .NET runtime dependency
- **React + TypeScript** — modern UI (in progress)
- **Tiered mode** — a new acceleration mode that defines piecewise linear breakpoint curves

## Architecture

```
┌──────────────────────────────────┐
│  React UI (TypeScript)           │
│  Curve editor, settings panel    │
├──────────────────────────────────┤
│  Tauri IPC bridge                │
├──────────────────────────────────┤
│  Rust backend                    │
│  ├── models.rs   (driver ABI)   │
│  ├── math.rs     (curve init)   │
│  ├── config.rs   (settings)     │
│  └── driver.rs   (DeviceIoCtl)  │
├──────────────────────────────────┤
│  Raw Accel kernel driver (C)     │
│  (unchanged, communicates via    │
│   DeviceIoControl IOCTL)         │
└──────────────────────────────────┘
```

## Building

### Prerequisites
- [Rust](https://rustup.rs/) (stable toolchain)
- [Node.js](https://nodejs.org/) (v18+)
- Raw Accel driver installed (for runtime testing)

### Build & Run
```bash
cd rawaccel-userspace
npm install
npm run tauri dev
```

## Original Project

The original Raw Accel project is maintained at:  
https://github.com/RawAccelOfficial/rawaccel

This rewrite is based on the math and driver interface from that project. The kernel driver code is shared.

## Status

- [x] Rust backend — pure Rust math port of all acceleration curves
- [x] Driver communication — DeviceIoControl read/write
- [x] Tiered mode — new piecewise linear acceleration mode
- [ ] React UI — curve editor, settings panel, graph visualization
- [ ] Full end-to-end testing with driver