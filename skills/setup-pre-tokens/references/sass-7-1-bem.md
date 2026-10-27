# Sass 7-1 Architecture & BEM Guidelines

Guidelines for modular Sass organization and Block-Element-Modifier syntax.

---

## 1. The 7-1 Folder Pattern

Based on Kitty Giraudel's [Sass Guidelines: The 7-1 Pattern](https://sass-guidelin.es/#the-7-1-pattern), stylesheets are divided into 7 functional directories composed by one root entry file (`main.scss`):

```text
styles/
├── abstracts/      # Mixins, functions, and generated variables (no CSS output)
├── vendors/        # Third-party styles, vendor resets, library overrides
├── base/           # Element defaults, reset boilerplate, base typography
├── layout/         # Macro structure, grid systems, navigation, headers, footers
├── components/     # Self-contained UI widgets (buttons, cards, dialogs)
├── pages/          # Page-specific views and overrides
├── themes/         # Multiple visual themes or skin variants
└── main.scss       # Root stylesheet composing all 7 layers in order
```

### Folder Roles & Invariants

| Directory | Emits CSS? | Purpose & Rules |
| :--- | :--- | :--- |
| **`abstracts/`** | **NO** | Contains Sass mixins (`_mixins.scss`) and generated token variables (`_variables.scss`). Zero raw color or dimension literals allowed. |
| **`vendors/`** | **YES** | Holds third-party imports and overrides. Stylelint BEM rules are relaxed here. |
| **`base/`** | **YES** | Global resets (`_reset.scss`) and typography defaults (`_typography.scss`). |
| **`layout/`** | **YES** | Macro containers (`.l-grid`, `.header`, `.footer`, `.sidebar`). |
| **`components/`** | **YES** | Discrete UI component styles. Each component gets its own partial (e.g. `_button.scss`). |
| **`pages/`** | **YES** | Route-specific overrides (`_home.scss`, `_dashboard.scss`). Kept minimal. |
| **`themes/`** | **YES** | Runtime theme variant overrides. Base dark-mode theming is driven by `tokens.css`. |

---

## 2. Modern Dart Sass Module System (`@use` / `@forward`)

Legacy `@import` is deprecated in Dart Sass and removed in Dart Sass 3. The 7-1 scaffold strictly uses `@use` and `@forward`:

1. **Folder Indexing**: Every folder provides an `_index.scss` file forwarding its partials:
   ```scss
   // styles/base/_index.scss
   @forward 'reset';
   @forward 'typography';
   ```
2. **Root Composition**: `main.scss` loads each layer in canonical order:
   ```scss
   @use 'abstracts';
   @use 'vendors';
   @use 'base';
   @use 'layout';
   @use 'components';
   @use 'pages';
   @use 'themes';
   ```
3. **Consuming Variables**: Partials that use `$variables` import abstracts explicitly:
   ```scss
   @use '../abstracts' as *;

   .button {
     padding: $component-button-padding-y $component-button-padding-x;
   }
   ```

---

## 3. BEM Naming Conventions

All component stylesheets enforce Block-Element-Modifier syntax:

- **Block**: Standalone entity with meaning (`.button`, `.card`, `.dialog`)
- **Element**: Part of a block tied to its parent (`.button__icon`, `.card__header`)
- **Modifier**: Variation in appearance or behavior (`.button--primary`, `.card--raised`)
- **State Classes**: Dynamic state hooks prefixed with `is-` or `has-` (`.is-active`, `.has-error`)

### Stylelint Regex Pattern
Enforced in `stylelint.config.mjs` via `selector-class-pattern`:
```regex
^(?:[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__[a-z0-9]+(?:-[a-z0-9]+)*)?(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?|(?:is|has)-[a-z0-9]+(?:-[a-z0-9]+)*)$
```
- Passes: `.button`, `.button__icon`, `.button--primary`, `.card__header--compact`, `.is-active`, `.has-dropdown`
- Fails: `.btn`, `.btn_icon`, `.primaryButton`, `.button_primary`, `.Active`
