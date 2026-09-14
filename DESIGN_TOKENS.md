# Soft-Light Glass Design Tokens

This is the design language for 2KBigRedFlowers, written to be independent of
any one technology stack. `nba2k-glass.css` is its first implementation; a
Flutter client is expected to be the second, so every token below lists both a
CSS custom property and the Flutter construct it maps to.

**Provenance.** This is an interpretation of a soft-light-glass aesthetic in the
direction Xiaomi HyperOS has taken, not a transcription of an official Xiaomi
specification. No verified HyperOS 4 design documentation was available when this
was written, so the numbers here are chosen for internal coherence and legibility
rather than pixel fidelity to a vendor spec. If official guidance or reference
screenshots become available, re-derive the values in this file — every consumer
reads the tokens, so nothing downstream needs to change.

## Principles

1. **Elevation is blur and translucency, not shadow weight.** A surface reads as
   higher up because it blurs more of what is behind it, not because it casts a
   darker shadow. Shadows stay wide and faint.
2. **Borders are catch-lights.** A pane of glass catches light along its upper
   edge. Every glass surface gets a hairline border plus a brighter inset
   highlight on the top edge, rather than a uniform outline.
3. **Soft light means low contrast between surfaces.** Neighbouring panels differ
   by a few percent of opacity, not by flat colour steps. Separation comes from
   the catch-light and the blur, and typography carries the contrast instead.
4. **One loud voice.** Surfaces are quiet so a single accent can carry emphasis.
   The brand red is that voice; every other accent is desaturated relative to the
   previous broadcast-style palette.
5. **Radii are generous and concentric.** Nested corners are computed as
   `outer radius − padding`, so an inner panel's curve stays parallel to its
   parent's.
6. **Glass is a privilege, not a default.** Stacked `backdrop-filter` layers are
   expensive and unreadable over busy content. At most two glass tiers overlap,
   and every tier degrades to an opaque fill.

## Glass elevation scale

Four tiers. Nothing in the UI invents its own blur value.

| Tier | CSS token prefix | Blur | Saturate | Dark fill | Light fill | Used by |
| --- | --- | --- | --- | --- | --- | --- |
| Sunken | `--glass-sunken-*` | none | none | `rgba(0,0,0,0.20)` | `rgba(24,20,16,0.045)` | Inset wells, progress tracks, table headers |
| Raised | `--glass-raised-*` | 16px | 150% | `rgba(26,28,33,0.72)` | `rgba(255,255,255,0.74)` | Cards, list rows, panels |
| Floating | `--glass-floating-*` | 28px | 165% | `rgba(18,20,24,0.64)` | `rgba(255,255,255,0.68)` | App header, desktop nav, mobile tab bar, sticky bars |
| Overlay | `--glass-overlay-*` | 40px | 180% | `rgba(14,15,18,0.78)` | `rgba(255,255,255,0.82)` | Modals, bottom sheets, menus |

Light mode uses **higher** fill opacity than dark mode at the same tier. Dark
surfaces hide the content behind them easily; light ones need more body before
text on them stays legible over a busy backdrop.

Flutter: `BackdropFilter(filter: ImageFilter.blur(sigmaX: blur/2, sigmaY: blur/2))`
wrapped in a `DecoratedBox` carrying the fill. CSS `blur(16px)` is a box blur
radius; Skia's sigma is roughly half that, so halve the CSS value for `sigmaX`.
Saturation needs `ColorFilter.matrix` with a saturation matrix, or drop it —
saturation boost matters most on photographic backdrops, which this app does not
have behind glass.

## Catch-light borders

| Token | Dark | Light |
| --- | --- | --- |
| `--glass-hairline` | `rgba(255,255,255,0.10)` | `rgba(30,25,20,0.10)` |
| `--glass-hairline-strong` | `rgba(255,255,255,0.18)` | `rgba(30,25,20,0.17)` |
| `--glass-catch` | `inset 0 1px 0 rgba(255,255,255,0.13)` | `inset 0 1px 0 rgba(255,255,255,0.92)` |

The light-mode catch-light is nearly opaque white: on a white-ish surface the
highlight has to be brighter than the fill to read as a lit edge at all.

Flutter: hairline is `Border.all(width: 0.5)` at device pixel ratio ≥ 2, plus a
`LinearGradient` top stop or a one-pixel `Container` for the catch-light —
Flutter has no inset box-shadow.

## Soft shadows

Two layers each: a tight contact shadow and a broad ambient one. Never a single
hard shadow.

| Token | Dark | Light |
| --- | --- | --- |
| `--glass-shadow-raised` | `0 1px 2px rgba(0,0,0,0.20), 0 8px 24px -8px rgba(0,0,0,0.28)` | `0 1px 2px rgba(52,38,20,0.05), 0 8px 24px -8px rgba(52,38,20,0.10)` |
| `--glass-shadow-floating` | `0 2px 4px rgba(0,0,0,0.22), 0 16px 40px -12px rgba(0,0,0,0.34)` | `0 2px 4px rgba(52,38,20,0.05), 0 16px 40px -12px rgba(52,38,20,0.12)` |
| `--glass-shadow-overlay` | `0 4px 8px rgba(0,0,0,0.26), 0 32px 72px -16px rgba(0,0,0,0.46)` | `0 4px 8px rgba(52,38,20,0.07), 0 32px 72px -16px rgba(52,38,20,0.16)` |

Light-mode shadows are warm (brown-biased, inherited from the existing premium
layer) rather than neutral grey. A cool grey shadow on a warm white surface reads
as dirt.

Flutter: `BoxShadow` list; CSS's negative spread becomes a smaller `blurRadius`
with a positive `offset`, tuned by eye.

## Radii

| Token | Value | Used by |
| --- | --- | --- |
| `--glass-r-xs` | 8px | Chips, tier badges, tags |
| `--glass-r-sm` | 12px | Buttons, inputs, selects |
| `--glass-r-md` | 18px | List rows, inner panels, table shells |
| `--glass-r-lg` | 24px | Cards, page panels |
| `--glass-r-xl` | 32px | Modals, bottom sheets |
| `--glass-r-pill` | 999px | Pills, avatars, toggles |

Concentric rule: an inner element inset by `p` from a parent of radius `R` takes
radius `max(R - p, --glass-r-xs)`.

Flutter: `BorderRadius.circular(...)`. For the large radii, a continuous
(squircle) curve reads closer to this language than a circular arc —
`ContinuousRectangleBorder` at roughly 1.6× the circular value approximates it.

## Motion

| Token | Value | Used by |
| --- | --- | --- |
| `--glass-t-fast` | 160ms | Hover, focus, colour changes |
| `--glass-t-base` | 240ms | Panel reveals, tab switches |
| `--glass-t-slow` | 380ms | Sheets, modals, page transitions |
| `--glass-ease` | `cubic-bezier(0.22, 1, 0.36, 1)` | Default: decelerating, no overshoot |
| `--glass-ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Sheets and anything that should feel physical |

Flutter: `Curves.easeOutQuint` approximates `--glass-ease`;
`Curves.easeOutBack` approximates the spring.

## Accent palette

Surfaces are quiet, so accents were pulled back from the previous broadcast
palette. Semantics are unchanged: red is the brand and also a loss, green is a
win.

| Role | Before (dark) | After (dark) | After (light) |
| --- | --- | --- | --- |
| Brand / loss | `#D4001A` | `#E11D32` | `#BA1024` |
| Win | `#00ff88` | `#3DDC97` | `#157A45` |
| Caution / gold | `#ffcc00` | `#F0B429` | `#9C7330` |
| Info | `#3399ff` | `#5AA9F0` | `#2F6FA8` |
| Special | `#b14bff` | `#A78BFA` | `#7A4FD0` |

The neon green and pure yellow were the two values that fought hardest with
translucent surfaces: at full saturation they bloom through a blurred backdrop
and stop reading as text colour.

## Ambient backdrop

Glass needs something to refract. The page background is a low-contrast radial
wash rather than a flat fill, so blurred panels pick up a gradient instead of one
dead colour. Two very faint accent-tinted pools, one warm and one cool, placed
off-centre. Amplitude stays under 4% luminance — visible through 28px of blur,
invisible as banding on a flat area.

Flutter: a `Stack` with a `DecoratedBox` carrying two `RadialGradient` layers
below the app content.

## Required fallbacks

A glass tier is never the only path to a legible surface.

1. `@supports not (backdrop-filter: blur(1px))` → replace every fill with its
   opaque equivalent. Without the blur, a 0.64-alpha fill is just unreadable.
2. `@media (prefers-reduced-transparency: reduce)` → same opaque fills. Some
   people cannot read text over translucency, and the OS says so.
3. `@media (prefers-reduced-motion: reduce)` → all durations to `0.01ms`.
4. Always pair `backdrop-filter` with `-webkit-backdrop-filter`. Safari still
   needs the prefix, and it is the browser most likely to be running this as an
   installed PWA.

## Implementation status

- `nba2k-glass.css` — CSS implementation, loaded after `nba2k-premium.css` and
  before `nba2k-mobile.css`, so it wins over the earlier desktop restyle layers
  while the mobile layer's media-query rules still apply on top.
- Flutter — not started. The planned architecture is a Rust core called over FFI
  (`flutter_rust_bridge`) with data staying on-device, so these tokens will be
  consumed by a Dart `ThemeExtension` rather than being re-derived.
