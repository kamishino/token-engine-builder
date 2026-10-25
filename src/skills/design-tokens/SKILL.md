---
name: design-tokens
description: "Comprehensive design token engineering: palette discovery, OKLCH mathematical scales, dual-gate accessibility auditing, and framework integration."
license: MIT
compatibility: ">=node-22.12"
allowed-tools: "Bash(node:*) Read Write Edit Glob Grep"
---

# Design Tokens — Cognitive Architecture & Integration Guide

Comprehensive guide for designing, generating, and integrating W3C DTCG design tokens across any modern frontend repository.

## Mental Model: Cognitive Reasoning vs. Deterministic Math

- **The Agent (You)** owns **context discovery, palette aesthetics, and codebase refactoring**:
  - Identifying whether the project is greenfield or brownfield.
  - Selecting harmonious brand anchors (OKLCH) and typography scales.
  - Refactoring hardcoded CSS/TS colors (`#hex`, `rgba()`) into `var(--color-*)`.
  - Piercing Shadow DOM Web Components (`:host`) and configuring framework bundlers.
- **The CLI Engine (`token-engine`)** owns **deterministic mathematics**:
  - Calculating 11-step OKLCH color ramps clamped to sRGB gamut.
  - Computing dual-gate contrast floors (WCAG 2.1 AA $\ge 4.5:1$ and APCA $|Lc| \ge 60$).
  - Compiling DTCG JSON into CSS custom properties, Tailwind v4 `@theme`, and typed TypeScript dictionaries.

---

## 4-Phase Workflow

### Phase 1: Context Discovery & Triage

Inspect the repository before creating or modifying files:
1. **Detect Codebase Maturity**:
   - Check if CSS/SCSS or styled components exist.
   - If styling exists (brownfield): mine existing colors as evidence before designing new palettes.
   - If greenfield: conduct a Socratic interview with the user to establish brand personality.
2. **Detect Runtime Scoping**:
   - Web Components / Shadow DOM (e.g. `:host`, `attachShadow`, Lit): tokens must pierce shadow roots via `:host, :root` selectors.
   - Standard DOM: target `:root`.
   - Tailwind v4: tokens map to `@theme { --color-*: ... }`.
3. **Detect Package Manager**:
   - Observe lockfile (`pnpm-lock.yaml`, `package-lock.json`, `bun.lockb`, `yarn.lock`).

### Phase 2: Palette Architecture (`style-spec.json`)

Establish the design token contract. Every design system requires at least:
- **Primary Anchor**: Brand identity color (e.g. `oklch(60% 0.15 250deg)`).
- **Secondary Anchor**: Complementary or supporting hue.
- **Accent Anchor**: High-visibility action or highlight color.
- **Neutral Hue**: Subtle tint matching the brand primary hue.
- **Typography Scale**: Modular scale ratio (e.g. `1.2` for compact apps, `1.25` for web).

```json
{
  "name": "My App Brand",
  "palette": [
    { "role": "primary", "anchor": "oklch(60% 0.15 250deg)" },
    { "role": "secondary", "anchor": "oklch(65% 0.12 180deg)" },
    { "role": "accent", "anchor": "oklch(75% 0.16 70deg)" }
  ],
  "neutral": { "hue": 250 },
  "typography": { "baseSize": 16, "ratio": 1.25, "fontFamily": "Inter, sans-serif" }
}
```

### Phase 3: Deterministic Sync (`token-engine sync`)

Execute the complete color-science, auditing, and compilation pipeline in a single pass:

```bash
# Multi-theme compilation (light, dark, high-contrast + typed TypeScript exports)
npx token-engine sync --spec style-spec.json --tokens tokens --out build --theme all

# For Web Components / Shadow DOM HUDs:
npx token-engine sync --spec style-spec.json --tokens tokens --out build --theme all --selector ":host, :root"

# To scaffold a monorepo workspace package (@tokens):
npx token-engine sync --spec style-spec.json --tokens tokens --out packages/tokens --theme all --package @tokens --force
```

Outputs produced:
- `tokens/`: 3-tier DTCG token JSON (`primitive/`, `semantic/`, `component/`).
- `build/tokens.css`: Consolidated CSS custom properties with `@media (prefers-color-scheme: dark)` and `[data-theme="dark"]` overrides.
- `build/tokens.js` & `build/tokens.d.ts`: Strongly typed ESM dictionary for Canvas, WebGL, and runtime scripts.
- `build/theme.css`: Tailwind v4 `@theme` block.
- `.token-engine-audit.json`: Cryptographic audit stamp verifying WCAG & APCA contrast floors.

### Phase 4: Production Codebase Refactoring

Do not leave tokens disconnected from production code. Wire them into the host project:
1. **Framework Aliasing**:
   - In `vite.config.ts`: add `resolve: { alias: { '@tokens': resolve(__dirname, 'packages/tokens') } }`.
   - In `tsconfig.json`: add `"paths": { "@tokens": ["./packages/tokens"] }`.
2. **Shadow DOM Scoping**:
   - When injecting tokens into Shadow Roots, import the compiled CSS inline and apply custom properties to `:host`:
   ```ts
   import tokensCss from '@tokens/tokens.css?inline';
   // Inject into shadow root style element or adoptStyleSheets
   ```
3. **Refactor Hardcoded Literals**:
   - Replace raw `#hex` or `rgba()` with semantic tokens:
     - `#10131d` $\to$ `var(--color-bg-canvas)`
     - `#ffffff` text on dark $\to$ `var(--color-text-primary)`
     - `#38bdf8` button accent $\to$ `var(--color-action-primary)`
