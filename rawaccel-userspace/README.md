# RawAccel desktop application

The Rust/Tauri application and React/TypeScript frontend live in this directory.

See the [repository README](../ReadMe.md) for features, driver compatibility, setup, settings locations, and planned work. [RELEASE.txt](RELEASE.txt) covers installation and packaging details.

```powershell
npm ci
npm run tauri -- dev
```

For checks, run `npm test` and `npm run build` here, then `cargo test --locked` from `src-tauri`. The C++ math and ABI checks are available through `npm run test:math-reference` and `npm run test:abi`.
