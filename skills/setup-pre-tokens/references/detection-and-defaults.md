# Detection & Defaults Reference

Audit matrix and default tooling configuration for `setup-pre-tokens`.

---

## 1. Toolchain Slot Matrix

| Tool Slot | Evidence of Presence (Keep) | Pinned Default Package(s) | Switch Keyword |
| :--- | :--- | :--- | :--- |
| **Formatter** | `.prettierrc*`, `prettier.config.*`, `"prettier"` in `package.json` | `prettier@^3` | `biome` |
| **Alternative Formatter** | `biome.json`, `biome.jsonc`, `"@biomejs/biome"` in `package.json` | `@biomejs/biome@^2` | `prettier` |
| **Style Linter** | `.stylelintrc*`, `stylelint.config.*`, `"stylelint"` in `package.json` | `stylelint@^17`<br>`stylelint-config-standard-scss@^17`<br>`postcss-scss@^4` | `none` |
| **Token Compiler** | `sd.config.*`, `style-dictionary.config.*`, `"style-dictionary"` | `style-dictionary@^5` | `terrazzo` |
| **Alternative Compiler** | `terrazzo.config.*`, `"@terrazzo/cli"` | `@terrazzo/cli@^2`<br>`@terrazzo/plugin-css@^2`<br>`@terrazzo/plugin-sass@^2` | `style-dictionary` |
| **CSS Architecture** | `.scss` files, `"sass"` in `package.json` | `sass@^1` | `itcss`, `tailwind`, `smacss` |
| **CSS Transformer** | `postcss.config.*`, `.postcssrc*`, `"lightningcss"`, `"postcss"`, `transformer: 'lightningcss'` in a Vite config | *(None by default)* | `lightning`, `postcss` |
| **Tokens Directory** | `tokens/**/*.tokens.json` | *(Scaffolds 3-tier seeds)* | — |
| **Styles Directory** | `src/styles/` or `styles/` | *(Scaffolds 7-1 partials)* | — |

Step 2 presents this matrix per slot with the evidence actually found — detection is never surfaced as bare defaults.
---

## 2. Package Manager Precedence

Determine the package manager by inspecting lockfiles in the project root:

1. `pnpm-lock.yaml` $\to$ **`pnpm`** (Install: `pnpm add -D <pkgs>`; add `-w` if workspace root)
2. `yarn.lock` $\to$ **`yarn`** (Install: `yarn add -D <pkgs>`)
3. `bun.lockb` or `bun.lock` $\to$ **`bun`** (Install: `bun add -d <pkgs>`)
4. Default fallback: `package-lock.json` or absence of above $\to$ **`npm`** (Install: `npm install -D <pkgs>`)

*Guard*: If `.pnp.cjs` is detected (Yarn Plug'n'Play), stop execution and notify the user that Yarn PnP is unsupported.

---

## 3. Styles Root Resolution

- If `src/styles/` exists $\to$ use `src/styles`.
- If `styles/` exists at the root $\to$ use `styles`.
- If `src/` exists $\to$ use `src/styles`.
- Otherwise $\to$ default to `styles`.

Substitute `__STYLES_ROOT__` in all templates using the resolved relative posix path.
