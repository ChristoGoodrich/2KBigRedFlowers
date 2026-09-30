# Migration to a native core and a Flutter client

## Decided architecture

**A Rust core linked into the client, not a server.**

The product's premise is that records live on the device and are useful with no
account and no network (`README.md`: "Data stays local by default"). A hosted
backend would contradict that, so the Rust side is a library:

```
              ┌──────────────────────────────┐
              │  nba2k-core  (Rust)          │
              │  badges · ovr · seasons      │
              │  game-year datasets          │
              └──────────────┬───────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
  flutter_rust_bridge      wasm                 (tests)
   (iOS · Android ·      web client            cargo test
    macOS · Windows)
```

One implementation of the rules, three ways in. No server to operate, no
account required, nothing to breach.

Optional Supabase sync stays as it is: a mirror the user opts into, not a
dependency. Replacing it with a self-hosted Rust service was considered and
rejected — it turns a local-first tool into a service with uptime, privacy, and
support obligations, for a feature most users do not enable.

## Status

| Piece | State |
| --- | --- |
| Game-year datasets as JSON | **Done** — `game-data/*.json`, exported from the JS datasets |
| Export drift guard | **Done** — `scripts/gamedata-export-guard.cjs` |
| `nba2k-core`: attributes, datasets, badges, OVR, seasons | **Done** — 24 tests + 1 doctest, fmt and clippy clean |
| CI for the core | **Done** — a second `core` job runs fmt, clippy, and tests |
| Remaining pure logic (aggregation, advanced analytics, data quality) | Not started |
| OCR parsing | Not started |
| FFI bindings | Not started — **not verifiable here** |
| Flutter client | Not started — **not verifiable here** |

**What could not be verified.** The environment this was prepared in has Rust
but no Flutter or Dart SDK, so the FFI layer and the Dart side are unwritten
rather than written-and-untested. Nothing in this repo claims a Flutter client
works. The Rust core, by contrast, is built and tested on every CI run.

## The datasets must not fork

`nba2k-gamedata-2k26.js` / `nba2k-gamedata-2k27.js` remain the source a
contributor edits. `scripts/export-gamedata.cjs` derives `game-data/*.json`,
which the Rust crate embeds with `include_str!`.

`scripts/gamedata-export-guard.cjs` fails the suite when the committed JSON no
longer matches the JS. Without it, someone corrects a badge threshold in the JS
dataset, ships it, and the Rust side keeps evaluating the old number — the two
clients disagree about what a build has earned and no test complains.

After the web client is retired, the JSON becomes the source of truth directly
and both the exporter and its guard can go.

## Existing users' data will not migrate itself

This is the part with a user-visible cost, and it needs planning before any
Flutter build ships.

Records live in the browser's `localStorage` under `build:*`, `game:*`, and
`player:*`. A Flutter app is a different sandbox: it **cannot** read them. There
is no code change that avoids this — it is what per-origin browser storage
means.

The path that exists today:

1. Web client → `Settings > Backup > Export` writes a JSON backup
   (`nba2k-data-portability.js`).
2. Flutter client imports that file.

So the Flutter client needs a working importer for the existing export format
**before** it is offered to anyone, and the web client needs an in-app prompt
telling users to export first. Users who have enabled Supabase sync are the
exception: their records are already off-device and a signed-in Flutter client
can pull them.

Do not ship a Flutter build that silently starts from an empty library.

## Order of work

Ported in this order, because each step is verifiable before the next depends
on it:

1. **Pure logic first** (in progress). Badge evaluation, OVR, seasons, then
   aggregation and analytics. No I/O, no UI, exhaustively testable, and it is
   the code two clients would otherwise duplicate.
2. **The FFI boundary.** Get one real call from Dart into Rust returning a real
   badge evaluation. Do this while the surface is small; discovering that the
   bridge shapes are wrong after porting everything is the expensive order.
3. **Storage.** A Rust-side record store plus an importer for the existing JSON
   export format. Until this lands, no Flutter build goes to a user.
4. **UI, screen by screen**, against `DESIGN_TOKENS.md`. The token spec already
   names the Flutter construct for each value, so the design does not need
   re-deriving.
5. **OCR last.** It is the least pure part — image handling, a local engine, and
   a cloud vision API — and the JS implementation works. There is no reason to
   move it until everything else is running.

## Invariants that must survive the port

These are behaviours the JS side got wrong once and now guards against. The
Rust tests in `rust-core/nba2k-core/tests/invariants.rs` restate each one, and
they must keep passing in both implementations for as long as both exist.

- **An unpublished badge tier never counts as unlocked.** The JS code treated an
  empty requirement list as satisfied, so every 2K27 badge with unknown
  thresholds evaluated to Legend. In Rust the distinction is in the type:
  `Option<Vec<ReqGroup>>`, where `None` is "unknown" and an empty `Vec` is still
  unmet.
- **An out-of-range season lookup says so.** The 2K26 table ends 2026-08-06; the
  old code returned the finished Season 8 as current for every later date, with
  nothing marking it. `seasons::resolve` returns `Stale` instead.
- **An OVR estimate is absent, not zero,** when a build has no ratings — a zero
  renders as a real 40-rated build.
- **Switching game years never rewrites records.** Records are keyed by build and
  game id, never by year, so pinning an older catalog is reversible.
