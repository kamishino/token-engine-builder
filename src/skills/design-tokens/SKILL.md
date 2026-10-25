---
name: design-tokens
description: "Comprehensive design token engineering: palette discovery, OKLCH mathematical scales, dual-gate accessibility auditing, and framework integration."
license: MIT
compatibility: ">=node-22.12"
allowed-tools: "Bash(node:*) Read Write Edit Glob Grep"
---

# Design Tokens — Cognitive Architecture & Systems Guide

Comprehensive guide for designing, generating, and integrating W3C DTCG design tokens across any modern frontend repository.

---

## 1. Why the AI Agent Needs This Skill

Without this skill, an autonomous AI agent naturally falls into three destructive anti-patterns:
1. **The Hallucinated Hex Trap**: The agent invents arbitrary hex colors (`#3b82f6`, `#1f2937`) that fail WCAG AA and APCA contrast floors on hover/focus states, introducing accessibility compliance debt.
2. **The Fragmented Drift Anti-Pattern**: The agent scatters raw color and spacing literals across dozens of component files. A subsequent brand redesign or theme switch requires massive, error-prone manual refactoring across the entire repository.
3. **Muddy Dark Mode Polarity**: The agent attempts dark mode by naively darkening hex codes, resulting in muddy grays, lost visual hierarchy, and sRGB gamut clipping.

### The Agent's Superpower With This Skill
With this skill, you operate as a **Principal Design Systems Architect**:
- You ground color in **perceptually uniform color science (OKLCH)**, guaranteeing smooth, predictable lightness transitions.
- You enforce a strict **3-tier DTCG token hierarchy** (`primitive/` $\to$ `semantic/` $\to$ `component/`), completely decoupling raw color values from component implementations.
- You modernize the codebase behind a **deep-module package seam (`@tokens`)**, eliminating raw `#hex` drift while piercing framework boundaries (Lit/Shadow DOM, Tailwind v4, CSS Modules).

---

## 2. How to Work With This Skill (The 5-Phase Cognitive Lifecycle)

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        5-PHASE COGNITIVE LIFECYCLE                     │
├─────────────────┬─────────────────┬──────────────────┬─────────────────┤
│    Phase 1      │     Phase 2     │     Phase 3      │     Phase 4     │
│ Silent Triage   │ Socratic Design │  Deterministic   │   Deep-Module   │
│  & Discovery    │ & Mood Framing  │    Generation    │   Refactoring   │
└─────────────────┴─────────────────┴──────────────────┴─────────────────┘
                                       │
                                    Phase 5
                                 Visual Specimen
                                  & HTML Proof
```

### Phase 1: Silent Context Triage (Zero-Interruption)
Inspect the repository before creating or modifying files. Answer three load-bearing architectural questions autonomously:
1. **Detect Codebase Maturity**:
   - Check if styling files exist (`.css`, `.scss`, styled-components).
   - **Brownfield**: Mine existing colors as historical evidence (`npx token-engine extract --audit-baseline`) before designing new palettes.
   - **Greenfield**: Proceed directly to Socratic brand mood discovery.
2. **Detect Runtime Scoping**:
   - **Web Components / Shadow DOM** (e.g. `:host`, `attachShadow`, Lit, Stencil): tokens must pierce shadow roots via `:host, :root` selectors.
   - **Standard DOM**: target `:root`.
   - **Tailwind v4**: tokens map to `@theme { --color-*: ... }`.
3. **Detect Monorepo & Package Manager Layout**:
   - Inspect lockfiles (`pnpm-lock.yaml`, `bun.lockb`, `package-lock.json`, `yarn.lock`).
   - Check `workspaces` in `package.json` or `pnpm-workspace.yaml`. If multiple packages exist (e.g. `apps/web` using Tailwind and `packages/ui` using Web Components), identify the target directory for token installation.

### Phase 2: Socratic Design Synthesis & Mood Framing
Never ask the user for raw `#hex` values. Elevate the conversation to brand intent and aesthetic psychology:
- **Greenfield**: Frame choices around **Kobayashi Mood Clusters**:
  - *Modern Minimalist*: Clean neutral slate with high-chroma electric indigo anchor.
  - *Cool Tech / Cyberpunk*: Obsidian canvas with luminous cyan and alert amber anchors.
  - *Warm Editorial*: Cream canvas, deep espresso text, and rich terracotta accents.
- **Brownfield (Semantic Intent Clustering)**:
  - Do NOT mirror 50 fragmented legacy hexes 1:1.
  - Cluster mined colors into functional roles (e.g. collapsing 6 drifting blues into 1 harmonious OKLCH action ramp).
  - Present the consolidated palette proposal to the user before generation:
    *"I extracted 4 drifting blues across your buttons. I propose unifying them into a single high-chroma OKLCH cyan-blue anchor (`oklch(60% 0.15 250deg)`) that guarantees 10.6:1 contrast against your canvas."*

### Phase 3: Deterministic Generation
Translate the design contract into multi-theme tokens:
- **When CLI is available (`token-engine`)**:
  ```bash
  # Multi-theme compilation (light, dark, high-contrast + typed TypeScript exports)
  npx token-engine sync --spec style-spec.json --tokens tokens --out build --theme all

  # For Web Components / Shadow DOM HUDs:
  npx token-engine sync --spec style-spec.json --tokens tokens --out build --theme all --selector ":host, :root"

  # For Monorepo Workspace Package (@tokens):
  npx token-engine sync --spec style-spec.json --tokens tokens --out packages/tokens --theme all --package @tokens --force
  ```
- **When NO CLI or scripts are available**:
  Execute the **Scriptless Deterministic Protocol** defined in Section 3 below.

### Phase 4: Deep-Module Codebase Modernization (Matt Pocock Model)
Apply Matt Pocock's `codebase-design` principles to token integration:
- **Module**: The Design System as a deep module (small interface, massive implementation).
- **Interface**: CSS Custom Properties (`var(--color-*)`) and `@tokens` package alias.
- **Seam**: The package import boundary (`import '@tokens/tokens.css'`).
- **Leverage & Locality**: The developer learns 1 token name (`--color-action-primary`); receives 3 themes, dark-mode adaptation, and guaranteed WCAG/APCA compliance across 100+ components.
- **The Deletion Test**: Deleting `@tokens` causes raw hexes to explode across all components; keeping it encapsulates styling complexity behind a 1-line import.

Surgically refactor host components:
```ts
// packages/ui/src/hud.ts
import tokensCss from '@tokens/tokens.css?inline';

export const hudStyles = `
  ${tokensCss}

  :host {
    display: block;
    background: var(--color-bg-canvas);
    color: var(--color-text-primary);
    border-radius: var(--radius-md);
  }
  .btn-action {
    background-color: var(--color-action-primary);
    color: var(--color-action-primary-text);
  }
`;
```

### Phase 5: Visual Specimen & Proof (The Pocock HTML Report Pattern)
To ensure human trust, generate a self-contained, interactive HTML design token specimen in the OS temp directory (`<tmpdir>/design-token-specimen-<timestamp>.html`) styled with Tailwind via CDN:
- **Interactive Theme Switcher**: Buttons toggling Light, Dark, and High-Contrast.
- **Component Specimen Cards**: Live buttons, inputs, alerts, and elevated cards.
- **Contrast Proof Badges**: Displays actual WCAG ratios and APCA scores for every pair.
- Open the file for the human user (`start <path>` on Windows, `open <path>` on macOS, `xdg-open <path>` on Linux).

---

## 3. Scriptless Consistency & Deterministic Heuristics

If the environment provides **ZERO executable scripts or binaries**, the agent MUST still produce $100\%$ mathematically consistent, production-ready tokens every single time using these cognitive algorithms:

### 1. The 11-Step OKLCH Lightness Ramp Algorithm
For each anchor color, construct the 11-step lightness ramp using these exact perceptual lightness values:

| Step | Lightness ($L$) | Chroma ($C$) Multiplier | Role / Usage |
| :--- | :--- | :--- | :--- |
| **50** | $0.98$ | $\le 0.03$ (subtle tint) | Canvas background (Light mode) |
| **100** | $0.93$ | $0.05$ | Surface background / Subtle borders |
| **200** | $0.86$ | $0.08$ | Raised cards / Muted badges |
| **300** | $0.76$ | $0.12$ | Decorative borders |
| **400** | $0.65$ | $0.15$ | Secondary accents |
| **500** | $0.55$ | $\text{Peak } C$ ($0.15 - 0.20$) | Primary brand anchor |
| **600** | $0.45$ | $0.90 \times \text{Peak } C$ | Primary hover / Focus rings |
| **700** | $0.35$ | $0.75 \times \text{Peak } C$ | High-contrast actions |
| **800** | $0.25$ | $0.50 \times \text{Peak } C$ | Raised surfaces (Dark mode) |
| **900** | $0.15$ | $0.30 \times \text{Peak } C$ | Surface background (Dark mode) |
| **950** | $0.08$ | $\le 0.03$ (deep obsidian) | Canvas background (Dark mode) |

*Gamut Rule:* Taper chroma smoothly toward steps 50 and 950 to ensure values stay within the sRGB gamut.

### 2. Strict 3-Tier DTCG Decoupling Invariants
1. **Tier 1 (`tokens/primitive/*.json`)**:
   - Contains ONLY raw math values (`oklch(...)`, `px`, font families).
   - Zero `{alias}` references allowed.
2. **Tier 2 (`tokens/semantic/*.json`)**:
   - MUST use `{alias}` references pointing to primitives (e.g. `"{color.blue.600}"`).
   - Zero raw hex or color literals allowed.
3. **Tier 3 (`tokens/component/*.json`)**:
   - MUST use `{alias}` references pointing to semantic tokens (e.g. `"{color.action.primary}"`).
   - Zero primitive references allowed.

### 3. Polarity Inversion Algorithm for Dark Mode
When creating dark mode semantic tokens:
- **Canvas / Surface**: Invert lightness symmetrically ($L_{50} \leftrightarrow L_{950}$, $L_{100} \leftrightarrow L_{900}$).
- **Text / Icons**: Invert lightness symmetrically ($L_{900} \leftrightarrow L_{100}$, $L_{700} \leftrightarrow L_{200}$).
- **Brand / Action**: Retain step 500/600 anchor hue and chroma; never wash out accents with muddy grays.

### 4. Cognitive Contrast Verification Shortcuts
- **Text on Background**: Requires $\Delta L = |L_{\text{text}} - L_{\text{bg}}| \ge 0.45$. This mathematically guarantees WCAG 2.1 AA $\ge 4.5:1$ and APCA $|Lc| \ge 60$.
- **Borders & Non-Text**: Requires $\Delta L = |L_{\text{border}} - L_{\text{bg}}| \ge 0.30$. This guarantees WCAG 2.1 AA $\ge 3.0:1$.

---

## 4. The Self-Auditing Gate (Pre-Yield Checklist)

Before declaring your token engineering complete, execute this 4-point internal verification:
- [ ] **Zero Hex Drift**: Grep the refactored code; assert that zero hardcoded `#hex` or `rgba()` literals remain in styled components.
- [ ] **Tier Decoupling**: Verify that every component token references a semantic token, never a primitive.
- [ ] **Contrast Floors**: Verify that text on canvas and action buttons pass $\Delta L \ge 0.45$ in both light and dark themes.
- [ ] **Framework Seam**: Verify that the token import is clean and isolated behind `@tokens`, with `:host, :root` piercing verified for Shadow DOM environments.
