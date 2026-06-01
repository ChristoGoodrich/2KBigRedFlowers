# NBA 2K26 Build Tracker Architecture

This app is still delivered as a single HTML page plus classic script sidecars. The HTML owns the document shell, app header, account bar, page roots, template slots, stylesheet links, and script loading. Static modal markup and feature logic live in `nba2k26-*.js` sidecars.

## Main HTML

`nba2k26-build-tracker.html`

- Document structure, page roots, template slots, stylesheet links, and script loading.
- Calls `bootstrapApp()` after the OCR sidecars load, so global modal handlers are registered after `closeOCRModal` exists.
- Stable `<!-- BEGIN ... -->` / `<!-- END ... -->` boundary comments mark the head assets, header, account bar, page regions, modal template slots, toast root, and script load order. Keep those pairs intact when moving markup into templates or sidecars.
- Modal regions in the HTML should remain lightweight `data-template-slot` placeholders unless a modal needs server-rendered or first-paint content.

## Styles

Styles are split by page layer and loaded in cascade order:

- `nba2k26-theme.css`: Theme tokens, light mode overrides, base reset, and page background.
- `nba2k26-shell.css`: Header, account summary bar, and home dashboard shell.
- `nba2k26-visualizations.css`: Timeline, trend, shot profile, stat mix, and rank visual panels.
- `nba2k26-components.css`: Main layout, page headers, build cards, performance dashboard, and shared controls.
- `nba2k26-modals-forms.css`: Modal shell, game modal workflow, form fields, and modal footers.
- `nba2k26-build-detail.css`: Build workspace, aggregate stats, games table, badges, attributes, highlights, and trends.
- `nba2k26-ocr-data.css`: OCR workflow, setup guide, data menu, toast, loading, utility, and shared responsive rules.
- `nba2k26-scout-report.css`: Scout report overlay, report sections, pro scouting layout, and scout responsive rules.
- `nba2k26-readability.css`: Final typography and contrast overrides for dense UI copy, loaded last.
- `nba2k26-styles.css`: Compatibility entrypoint that imports the layered stylesheets; edit the layered files directly.

## Core Modules

- `nba2k26-app-bootstrap.js`: Startup sequence, first render, data menu binding, import file binding.
- `nba2k26-app-globals.js`: Global `state` plus classic-script compatibility proxies for inline handlers such as `openBuildModal`, `saveGame`, `renderBuildDetail`, and `showPage`.
- `nba2k26-ui-core.js`: Toasts, escaping, confirm modal, theme toggle, keyboard shortcuts, modal overlay close.
- `nba2k26-build-template.js`: Static build editing modal fragment.
- `nba2k26-game-template.js`: Static game logging modal fragment.
- `nba2k26-ocr-templates.js`: Static OCR processing and OCR settings modal fragments.
- `nba2k26-system-templates.js`: Static confirm and data backup modal fragments.
- `nba2k26-html-templates.js`: Template injector that writes registered fragments into HTML template slots before `bootstrapApp()` runs.
- `nba2k26-storage.js`: IndexedDB/local storage persistence helpers.
- `nba2k26-cloud-sync.js`: Optional Supabase cloud sync layer that mirrors the local `build:*`, `game:*`, and `player:*` records after the user configures and signs in.
- `nba2k26-i18n.js`: Translation dictionary and `t()` helper.
- `nba2k26-render-modules.js`: Shared render HTML snippets, including build list and account bar.

## Build Modules

- `nba2k26-build-engine.js`: Build constants, attribute groups, comparisons, and build math.
- `nba2k26-build-form.js`: Build modal tabs, new/edit form flow, save, delete, duplicate.
- `nba2k26-build-detail.js`: Build detail page orchestration.
- `nba2k26-build-detail-panels.js`: Attribute radar/cards and badge detail panels.
- `nba2k26-badges.js`: Badge catalog, thresholds, auto-unlock, badge tier math.
- `nba2k26-badge-editor.js`: Build modal badge selection state and editable badge list rendering.
- `nba2k26-ovr-estimator.js`: Position-weighted OVR estimate from build attributes.

## Game Modules

- `nba2k26-game-analysis.js`: Aggregation, teammate/opponent roster rollups, recent-vs-earlier comparison, trend arrows.
- `nba2k26-visualizations.js`: Shared account/build visual panels for timelines, split bars, shot profile, and stat-shape reads.
- `nba2k26-game-panels.js`: Detail page trend, season summary, and roster chemistry panels.
- `nba2k26-game-table.js`: Aggregate cards, filters, sorting, filter bar, game table.
- `nba2k26-game-form.js`: Game modal, teammate/opponent roster rows, new/edit form flow, save, delete.
- `nba2k26-player-profile-core.js`: Pure player profile helpers, grade constants, escaping, and avatar color helpers.

## OCR Modules

- `nba2k26-ocr-parser.js`: DOM-free OCR text parsing and validation.
- `nba2k26-ocr.js`: OCR modal flow, image handling, local OCR, and Zhipu GLM-4V cloud OCR integration.

## Analysis And Reports

- `nba2k26-performance-lab.js`: Overview performance lab.
- `nba2k26-scout-data.js`: Scout template data.
- `nba2k26-scout-report.js`: Scout report rendering and player comparison helpers.
- `nba2k26-data-portability.js`: Export, import, clear all data, data modal stats.
- `supabase-cloud-sync.sql`: Supabase table, index, and RLS policies for per-user cloud records.

## Development Rules

- Preserve classic script globals until the app is deliberately migrated to a bundler or framework.
- Keep HTML inline handlers working through compatibility proxies.
- Add new behavior to the relevant sidecar module instead of expanding the main HTML script.
- Keep static modal markup in the `nba2k26-*-template*.js` files; leave `nba2k26-build-tracker.html` as a small shell with stable slots.
- After structural changes, run the local smoke test. It parses each local script, verifies the layered stylesheet list, preserves the expected sidecar load order, checks required HTML ids, and confirms the classic-script compatibility surface is still present:

```powershell
$node = 'C:\Users\ChristopherGoodrich\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node scripts/smoke-test.cjs
& $node scripts/upgrade-guard-test.cjs
& $node scripts/flow-smoke-test.cjs
```

## Quality guards

Run everything at once with `& $node scripts/test-all.cjs` — it auto-discovers every `*-test.cjs`/`*-guard.cjs`, runs each in its own process, prints a PASS/FAIL summary, and exits non-zero on any failure (use it for a pre-commit hook or CI step). The individual guards:

- `scripts/mojibake-guard.cjs`: fails on encoding-corruption signatures (`璺`, U+FFFD, isolated `路` separators) so the Overview mojibake cannot recur.
- `scripts/i18n-coverage-guard.cjs`: scans UI render/template files for literal HTML text nodes and fails on hardcoded English with no `I18N_COPY` key (allowlists stat abbreviations; skips `data-i18n` elements). Automates the manual "is this string translatable" sweep.
- `scripts/engine-regression-test.cjs`: boundary + regression checks for `aggregate`/advanced-analytics/ovr-estimator — empty/NaN inputs, div-by-zero guards, and the `aggregate()` full-id cache key (pins the cache-collision fix).
- `scripts/sw-cache-guard.cjs`: keeps `scripts/sw-cache.lock.json` mapping the SW `CACHE` version to a content hash of every STATIC asset; fails if cached assets changed without a `CACHE` bump, auto-updates the lock when they change together.

OCR parser suites: `scripts/ocr-parser-smoke-test.cjs`, `scripts/ocr-openai-normalizer-smoke-test.cjs`, `scripts/ocr-zhipu-structured-smoke-test.cjs`.
