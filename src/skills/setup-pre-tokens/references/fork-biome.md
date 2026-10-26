# Fork: Biome Formatter & Linter

Instructions for substituting Biome in place of Prettier.

---

## 1. When to Choose Biome

Biome is a single-binary Rust-based linter and formatter that provides instant execution speeds without Node runtime overhead.

*Note*: Because Biome does not parse complex SCSS ASTs or enforce CSS-specific token rules, **Stylelint is retained alongside Biome** to guard token discipline (`color-no-hex`) and BEM selectors.

---

## 2. Package Changes

Install `@biomejs/biome` instead of `prettier`:

```bash
# npm
npm install -D @biomejs/biome@^2

# pnpm
pnpm add -D @biomejs/biome@^2

# yarn
yarn add -D @biomejs/biome@^2

# bun
bun add -d @biomejs/biome@^2
```

Do not install `prettier`, and do not write `.prettierrc.json` or `.prettierignore`.

---

## 3. Configuration Scaffolding

Copy `templates/configs/biome.json` to `biome.json` at the project root:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.6.3/schema.json",
  "files": {
    "includes": [
      "**",
      "!build",
      "!**/build",
      "!__STYLES_ROOT__/abstracts/_variables.scss",
      "!**/_variables.scss"
    ]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "lineWidth": 100
  },
  "linter": {
    "enabled": true
  }
}
```

Replace `__STYLES_ROOT__` with the resolved styles directory (e.g. `src/styles` or `styles`).

---

## 4. Script Updates (`package.json`)

Wire Biome into npm scripts:
- `"format"`: `"biome check --write ."`
- `"format:check"`: `"biome check ."`

---

## 5. Verification

Format and verify Biome runs cleanly:
```bash
npm run format
npm run format:check
```
Expected output: all files formatted and linted with zero errors.
