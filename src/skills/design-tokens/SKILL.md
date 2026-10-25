---
name: design-tokens
description: "Design, audit, and refactor W3C design tokens. Use when creating palettes, fixing contrast, migrating to OKLCH, setting up dark mode, refactoring raw hexes, or piercing Shadow DOM Web Components."
license: MIT
compatibility: ">=node-22.12"
allowed-tools: "Bash(node:*) Read Write Edit Glob Grep"
---

# Design Tokens

Engineer, verify, and integrate W3C DTCG design tokens across any modern frontend repository.

## Architecture: Seams and Decoupling

Treat the design token system as a **deep module**:
- **Interface**: Semantic CSS custom properties (`var(--color-*)`) and the workspace alias (`@tokens`).
- **Implementation**: Perceptually uniform OKLCH color science, APCA $|Lc| \ge 60$ contrast floors, and multi-theme polarity inversion.
- **Seam**: The package import boundary (`import '@tokens/tokens.css'`).
- **Locality & Leverage**: Alter brand decisions in one central token definition; all downstream components adapt automatically.
- **The Deletion Test**: Deleting the token package exposes raw values across dozens of components; keeping it encapsulates styling complexity behind a one-line seam.

Consult sibling references on demand:
- [`references/token-math.md`](references/token-math.md): The 11-step OKLCH lightness ramp, chroma scaling curves, and cognitive contrast heuristics.
- [`references/dtcg-tiers.md`](references/dtcg-tiers.md): The 3-tier W3C DTCG schema (`primitive/`, `semantic/`, `component/`) and decoupling invariants.
- [`references/specimen-template.html`](references/specimen-template.html): Standalone HTML specimen scaffold with live theme toggles and contrast badges.

---

## Process

### 1. Silent Context Triage
Inspect repository structure before creating files:
- **Codebase Maturity**: Check for existing stylesheets (`.css`, `.scss`, styled-components). In brownfield projects, mine legacy colors as evidence (`npx token-engine extract --audit-baseline`) before proposing new palettes. In greenfield projects, proceed to Socratic discovery.
- **Runtime Scoping**: Identify Shadow DOM Web Components (target `:host, :root`), Tailwind v4 (target `@theme`), or standard DOM (target `:root`).
- **Monorepo Layout**: Inspect lockfiles and workspace packages (`apps/*`, `packages/*`) to establish target output paths.

### 2. Socratic Aesthetic Synthesis
Translate brand intent into harmonious OKLCH anchors:
- **Greenfield**: Frame choices around Kobayashi mood clusters (Modern Minimalist, Cool Tech / Cyberpunk, Warm Editorial).
- **Brownfield**: Consolidate mined colors into unified functional roles via semantic intent clustering (collapsing drifting hues into purposeful ramps). Propose the consolidated palette for human approval before generation.

### 3. Token Generation
Execute generation using the appropriate path:
- **CLI Accelerator**: When `token-engine` is present, run single-pass synchronization:
  ```bash
  # Multi-theme compilation (light, dark, high-contrast)
  npx token-engine sync --spec tokens.config.json --tokens tokens --out build --theme all

  # For Web Components / Shadow DOM:
  npx token-engine sync --spec tokens.config.json --tokens tokens --out build --theme all --selector ":host, :root"

  # For Monorepo Workspace Package (@tokens):
  npx token-engine sync --spec tokens.config.json --tokens tokens --out packages/tokens --theme all --package @tokens --force
  ```


### 4. Codebase Modernization
Wire tokens into host components:
- Pierce Shadow DOM boundaries by injecting compiled CSS inline into `:host` scopes.
- Establish framework aliasing (`@tokens` mapped in `vite.config.ts` or `tsconfig.json`).
- Replace hardcoded color literals with semantic custom properties (`background: var(--color-bg-canvas)`).

### 5. Visual Specimen Proof
Generate a self-contained HTML specimen in the OS temp directory (`<tmpdir>/design-token-specimen-<timestamp>.html`) based on [`references/specimen-template.html`](references/specimen-template.html). Open the file for the user (`start <path>` on Windows, `open <path>` on macOS, `xdg-open <path>` on Linux) to provide immediate visual confirmation of themes and contrast floors.

---

## Pre-Yield Checklist

Verify these observable states before completing work:
- [ ] Raw `#hex` or `rgba()` literals in styled components are fully migrated to `var(--color-*)`.
- [ ] Every component token resolves through a semantic token alias.
- [ ] Text on canvas and action buttons achieve $\Delta L \ge 0.45$ across light and dark themes.
- [ ] Token package imports cleanly behind the `@tokens` seam.
