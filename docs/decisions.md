# MSDF Decisions Log

Date: 2026-02-23

## Scope and Goals
- Goal: Move title text rendering into WebGL using MSDF for crisp results.
- Assumption: 8K export is the target resolution.
- Requirements: Multi-line wrapping and text alignment support.
- UI: Menu/FAB remain HTML; text/card render in WebGL.

## Decisions
1) Use MSDF text rendering
- Rationale: Crisp rendering at large sizes and for 8K export.
- Rollback: Switch to 2D canvas text texture if MSDF complexity or atlas quality becomes a blocker.

2) Pre-baked font atlases (per font)
- Rationale: Deterministic quality, consistent exports, no runtime surprises.
- Rollback: Use runtime atlas generation if we need dynamic fonts.

3) Alignment scope (initial)
- Decision: Left-only alignment for the first iteration.
- Rationale: Keep layout logic simple while implementing wrapping.
- Rollback/Next: Add center and right alignment after basic flow is stable.

4) MSDF tooling
- Decision: Use `msdf-bmfont-xml` to generate atlas PNG + JSON.
- Rationale: Simple CLI pipeline with JSON output, good for frontend-only delivery.
- Rollback: Switch to `msdf-atlas-gen` if atlas quality or metadata is insufficient.

5) Charset scope (initial)
- Decision: Latin-1 glyph coverage for first pass.
- Rationale: Broad Western coverage without massive atlas sizes.
- Rollback/Next: Expand to full Unicode subsets as needed.

## Fonts and Assets
- We can keep the current fonts if we download and host them locally.
- Each font needs an MSDF atlas + metadata (glyph metrics). This is a build-time asset step.
- Rollback: Reduce font list temporarily if atlas generation or licensing becomes problematic.

### Current Google Fonts licenses
- Inter (OFL 1.1): https://fonts.google.com/specimen/Inter
- Raleway (OFL 1.1): https://fonts.google.com/specimen/Raleway
- Playfair Display (OFL 1.1): https://fonts.google.com/specimen/Playfair+Display
- Fraunces (OFL 1.1): https://fonts.google.com/specimen/Fraunces
- Roboto Slab (Apache 2.0): https://fonts.google.com/specimen/Roboto+Slab
- Nunito (OFL 1.1): https://fonts.google.com/specimen/Nunito
- Pacifico (OFL 1.1): https://fonts.google.com/specimen/Pacifico
- Space Mono (OFL 1.1): https://fonts.google.com/specimen/Space+Mono
- Unbounded (OFL 1.1): https://fonts.google.com/specimen/Unbounded
- Black Ops One (OFL 1.1): https://fonts.google.com/specimen/Black+Ops+One
- UnifrakturMaguntia (OFL 1.1): https://fonts.google.com/specimen/UnifrakturMaguntia
- Silkscreen (OFL 1.1): https://fonts.google.com/specimen/Silkscreen

## Open Items
- Finalize atlas size and distance range per font.
- Define wrapping rules (word-based vs. character-based, max width behavior).
- Decide export pipeline once text is on-canvas.
