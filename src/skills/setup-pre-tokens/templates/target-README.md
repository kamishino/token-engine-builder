# Design Tokens & Styling Architecture

This project uses a 3-tier W3C Design Tokens Community Group (DTCG) token hierarchy paired with Sass 7-1 modular architecture and BEM naming conventions.

---

## 1. The 3-Tier Token Hierarchy

Design tokens live under `tokens/` and decouple visual style into three strict layers:

1. **`tokens/primitive/` (Raw Math & Scales)**:
   - Contains literal values only (`oklch()`, `px`, font family strings).
   - Zero `{alias}` references allowed.
   - Files: `color.tokens.json`, `spacing.tokens.json`, `typography.tokens.json`, `radius.tokens.json`.

2. **`tokens/semantic/` (Intent Aliases & Theming)**:
   - Maps functional roles (e.g. `bg.canvas`, `text.primary`, `action.primary`) to primitives via `{alias}` references.
   - Symmetrical file schema per theme: `light.tokens.json`, `dark.tokens.json`.
   - Zero raw `#hex` or `oklch()` literals allowed.

3. **`tokens/component/` (Component Slot Scoping)**:
   - Maps UI components (e.g. `button.bg`, `button.radius`) to semantic aliases.
   - Never references primitive tokens directly (except layout/radius conventions where documented).

---

## 2. Sass 7-1 Modular Architecture

Styles live under this directory and follow the 7-1 pattern using Dart Sass `@use` and `@forward` modules:

- `abstracts/`: Sass mixins and generated variables. Emits zero CSS output.
- `base/`: Foundation resets, typography, and element defaults.
- `components/`: Isolated UI widget partials (e.g. `_button.scss`).
- `layout/`: Macro grid structures, headers, footers, navigation containers.
- `pages/`: Page-specific view overrides.
- `themes/`: Variant theme overrides (runtime theming is governed by `tokens.css`).
- `vendors/`: Third-party library overrides.
- `main.scss`: The single root stylesheet entry composing all 7 layers.

### BEM Naming Convention

All components adhere to Block-Element-Modifier syntax:

- Block: `.button`
- Element: `.button__icon`
- Modifier: `.button--primary`, `.button--disabled`
- State classes: `.is-active`, `.has-error`

Stylelint enforces BEM selectors and prohibits raw color literals (`color-no-hex`).

---

## 3. Generated Files — Do Not Edit Directly

The following artifacts are regenerated automatically by `npm run tokens:build`:

- `build/tokens.css`: CSS custom properties under `:root`.
- `build/tokens.dark.css`: CSS custom properties under `[data-theme="dark"]`.
- `abstracts/_variables.scss`: SCSS variables mapping semantic tokens to `var(--...)` and primitive dimensions to literals.

Always edit source token definitions in `tokens/**`, then rebuild.

---

## 4. Scripts & Commands

- **Build tokens**: `npm run tokens:build` (compiles CSS custom properties and SCSS aliases)
- **Lint styles**: `npm run lint:styles` (validates Sass and enforces token discipline)
- **Format code**: `npm run format` / `npm run format:check`

---

## 5. Runtime Theming & App Entry

Import generated stylesheets in your root application entry (e.g. `main.tsx` or `index.html`):

```ts
import './build/tokens.css';
import './build/tokens.dark.css';
import './styles/main.scss'; // or src/styles/main.scss
```

Toggle dark mode programmatically:

```ts
document.documentElement.dataset.theme = 'dark'; // or 'light'
```

---

## 6. Next Step: Customizing Brand Tokens

The initial token values are seed placeholders. Run the `design-tokens` skill to replace them with your brand's color science, APCA-verified contrast ramps, and custom component slots:

```bash
/design-tokens
```
