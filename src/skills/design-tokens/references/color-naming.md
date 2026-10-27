# Color naming — palette color → primitive key

Read when naming palette colors. Every palette color becomes a primitive group keyed by its name slug (`color.<slug>.<step>`), so the name is API surface — choose it like one.

## Rules

1. Map each anchor to the nearest name in the [meodai/color-names](https://github.com/meodai/color-names) list: match hue sector first, then lightness/chroma character (a pale blue is a "sky/powder" family name, a deep blue a "navy/midnight" one). A curated 144-color subset is vendored in `src/shared/color-names.ts` (12 names per sector across lightness/chroma tiers) and used by `token-engine extract` for deterministic slug assignment.
2. Slugify: lowercase, spaces → hyphens, strip everything except `a-z0-9-`. (`Cerulean Blue` → `cerulean-blue`.)
3. Slugs must be unique in the palette; on collision, add a character word (`sky` → `deep-sky`), never a number.
4. Names describe the color, not the role — roles (`primary`, `secondary`, `accent`, `other`) live in the spec's `role` field. A name that only makes sense for one brand ("acme-blue") is wrong; the same anchor in another brand gets the same name.
5. Functional keys are never renamed: `neutral`, `white`, `black`, `feedback.*` stay functional in every system.

## Hue sectors (OKLCH hue → name families)

| Hue     | Sector     | Example name families                  |
| ------- | ---------- | -------------------------------------- |
| 0–15    | red        | scarlet, crimson, brick                |
| 15–45   | orange     | tangerine, amber, rust                 |
| 45–70   | yellow     | saffron, ochre, butter                 |
| 70–100  | chartreuse | lime, pear, olive                      |
| 100–140 | green      | fern, emerald, moss                    |
| 140–170 | teal-green | lagoon (cool side), jade               |
| 170–200 | cyan       | lagoon, aqua, glacier                  |
| 200–230 | blue       | sky, azure, cerulean (deep)            |
| 230–260 | indigo     | cerulean (bright), indigo, navy (dark) |
| 260–290 | violet     | violet, lavender (pale)                |
| 290–320 | magenta    | orchid, fuchsia                        |
| 320–360 | pink       | rose, blush, coral (warm side)         |
