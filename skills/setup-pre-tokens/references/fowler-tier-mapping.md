# Martin Fowler 3-Tier Model Mapping

Conceptual alignment and deliberate invariants between Martin Fowler's architecture and repository DTCG canon.

---

## 1. Architectural Source

Source: Andreas Kutschmann, [Design Token-Based UI Architecture](https://martinfowler.com/articles/design-token-based-ui-architecture.html) (Martin Fowler Architecture Guides, 12 Dec 2024).

Kutschmann structures design tokens into three conceptual tiers:
1. **Option Tokens**: Defines *what* choices exist (palette, scales, fonts).
2. **Decision Tokens**: Defines *how* choices apply in context (roles, themes, polarity).
3. **Component Tokens**: Defines *where* choices apply in UI widgets (buttons, cards, inputs).

---

## 2. Layer-to-Directory Mapping

| Fowler / Kutschmann Tier | Repository DTCG Directory | Content & Syntax | Purpose |
| :--- | :--- | :--- | :--- |
| **Option Tokens** | **`tokens/primitive/`** | Raw math only: `oklch()`, `px`, font families. Zero `{alias}` references. | Palette ramps, spacing, typography scales, corner radii. |
| **Decision Tokens** | **`tokens/semantic/`** | Intent aliases: `{color.primary.600}`. Zero raw hex or oklch literals. Symmetrical theme schemas (`light.tokens.json`, `dark.tokens.json`). | Background, text, action, border roles with dark mode polarity inversion. |
| **Component Tokens** | **`tokens/component/`** | Component slot aliases: `{semantic.color.action.primary}`. Zero direct primitive references (except layout/radius convention). | Scoped tokens for buttons, inputs, cards, dialogs. |

---

## 3. Deliberate Divergences

While embracing Fowler's 3-tier decoupling mental model, this repository enforces strict operational constraints:

### A. Physical Decoupling vs. Logical Layers
- **Fowler**: Treats tiers as logical layers where "there is no physical separation implied."
- **Repository Canon**: Mandates **strict physical directory separation** (`tokens/primitive/`, `tokens/semantic/`, `tokens/component/`). Physical isolation enables fast glob-based static auditing (`audit.mjs`), prevents merge conflicts in multi-theme authoring, and enforces the deletion test.

### B. Snowflake Bypassing Strictly Forbidden
- **Fowler**: Permits "snowflake" shortcuts where component tokens directly reference option tokens when a decision has not yet been formalized.
- **Repository Canon**: **Strictly forbids snowflake bypassing.** A component token referencing a primitive color directly fails the build audit (`audit.mjs` exits 1). Every visual decision must formalize a semantic role first.

### C. Symmetrical Per-Theme Schemas
- **Fowler**: Allows decision layers to be sparse across themes.
- **Repository Canon**: Mandates symmetrical path schemas across all themes (`light.tokens.json`, `dark.tokens.json`, `high-contrast.tokens.json`). Any key present in light must exist in dark to guarantee visual contrast parity.

### Precedence Rule
If Fowler's essay and repository documentation differ, **Repository Canon Wins** because repository tooling and contrast audits enforce it.
