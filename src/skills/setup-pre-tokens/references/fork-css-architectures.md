# Fork: CSS Architecture Alternatives

Scaffolding and configuration guides for alternative styling architectures: ITCSS, Utility-First (Tailwind v4), and SMACSS.

---

## 1. ITCSS (Inverted Triangle CSS) — Native CSS Alternative

ITCSS organizes stylesheets into inverted-triangle layers based on specificity, from generic resets to explicit utilities. Because modern browsers support native CSS `@layer`, ITCSS runs cleanly with **zero Sass dependencies**.

### Layer Folders
Scaffold under `<stylesRoot>/`:
```text
styles/
├── 1-settings/     # Token imports, font definitions
├── 2-tools/        # CSS custom property helper macros
├── 3-generic/      # CSS resets and box-sizing rules
├── 4-elements/     # Unclassed HTML tags (h1-h6, p, a, table)
├── 5-objects/      # Class-based layout patterns (.o-container, .o-grid)
├── 6-components/   # Discrete UI components (.c-button, .c-card)
├── 7-utilities/    # High-specificity overrides (.u-visually-hidden)
└── main.css        # Root entry declaring @layer order and imports
```

### Root Stylesheet (`main.css`)
```css
@layer settings, tools, generic, elements, objects, components, utilities;

@import '1-settings/index.css' layer(settings);
@import '2-tools/index.css' layer(tools);
@import '3-generic/index.css' layer(generic);
@import '4-elements/index.css' layer(elements);
@import '5-objects/index.css' layer(objects);
@import '6-components/index.css' layer(components);
@import '7-utilities/index.css' layer(utilities);
```

### Tooling Changes
- **No `sass` package installed.**
- Stylelint uses `templates/configs/stylelint.css.config.mjs` (extends `stylelint-config-standard@^40`, no `customSyntax`).
- `sd.config.mjs`: drop the `scssAliases` platform; components consume CSS variables (`var(--semantic-color-...)`) directly.
- Script: `"lint:styles": "stylelint \"__STYLES_ROOT__/**/*.css\""`.

---

## 2. Utility-First (Tailwind v4)

Tailwind v4 is an engine-level utility-first framework that compiles directly from `@theme` CSS custom properties.

### Packages & Bundler Integration
Install Tailwind v4 with the matching bundler plugin:
- Vite: `npm install -D tailwindcss@^4 @tailwindcss/vite@^4`
  Add `@tailwindcss/vite` to `vite.config.ts`.
- PostCSS: `npm install -D tailwindcss@^4 @tailwindcss/postcss@^4`
  Add `@tailwindcss/postcss` to `postcss.config.mjs`.

### Root Stylesheet (`main.css`)
```css
@import "tailwindcss";

@theme inline {
  --color-canvas: var(--semantic-color-bg-canvas);
  --color-surface: var(--semantic-color-bg-surface);
  --color-text-primary: var(--semantic-color-text-primary);
  --color-action-primary: var(--semantic-color-action-primary);
  --color-border-default: var(--semantic-color-border-default);
}
```

### Tooling Changes
- Zero 7-1 directories; single `main.css` entry.
- Stylelint config adds `rules: { "at-rule-no-unknown": [true, { "ignoreAtRules": ["theme", "utility", "custom-variant"] }] }`.

---

## 3. SMACSS (Scalable and Modular Architecture for CSS)

SMACSS organizes styles into five categories: Base, Layout, Module, State, and Theme.

### Folder Mapping vs. 7-1
```text
styles/
├── base/           # Defaults, resets, elemental styling
├── layout/         # Major layout partitions (.l-header, .l-grid)
├── modules/        # Discrete components (replaces 7-1 components)
├── states/         # State overrides (.is-active, .has-dropdown)
├── theme/          # Visual skin variations
└── main.scss       # Composes base, layout, modules, states, theme
```

---

## 4. OOCSS & Atomic CSS

- **OOCSS (Object-Oriented CSS)**: An architectural principle (separating structure from skin, container from content). Implemented purely through class composition; does not require custom directory scaffolding.
- **Atomic CSS**: A utility methodology where classes perform single visual functions (e.g. `f-14`, `c-blue`). Fully represented by the Tailwind v4 Utility-First option above.
