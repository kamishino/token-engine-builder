# OKLCH Token Math & Contrast Reference

Mathematical specifications and cognitive heuristics for constructing perceptually uniform design token scales without executable scripts.

---

## 1. The 11-Step OKLCH Lightness Ramp

Every color scale spans 11 perceptually uniform steps (50 to 950). Calculate step values using these exact lightness targets and chroma multipliers:

| Step | Lightness ($L$) | Chroma ($C$) Multiplier | Functional Role |
| :--- | :--- | :--- | :--- |
| **50** | `0.98` | $\le 0.03$ (subtle tint) | Canvas background (Light mode) |
| **100** | `0.93` | $0.05$ | Surface background / Subtle borders |
| **200** | `0.86` | $0.08$ | Raised cards / Muted badges |
| **300** | `0.76` | $0.12$ | Decorative borders |
| **400** | `0.65` | $0.15$ | Secondary accents |
| **500** | `0.55` | $\text{Peak } C$ ($0.15 - 0.20$) | Primary brand anchor |
| **600** | `0.45` | $0.90 \times \text{Peak } C$ | Primary hover / Focus rings |
| **700** | `0.35` | $0.75 \times \text{Peak } C$ | High-contrast actions |
| **800** | `0.25` | $0.50 \times \text{Peak } C$ | Raised surfaces (Dark mode) |
| **900** | `0.15` | $0.30 \times \text{Peak } C$ | Surface background (Dark mode) |
| **950** | `0.08` | $\le 0.03$ (deep obsidian) | Canvas background (Dark mode) |

### Chroma Scaling & Gamut Clamping
- **Peak Chroma Zone**: Concentrate maximum chroma at steps 500 and 600 where the sRGB gamut volume is widest for midtones.
- **Tapering Curve**: Smoothly taper chroma toward zero at step 50 ($L=0.98$) and step 950 ($L=0.08$) to avoid sRGB gamut clipping and prevent unnatural neon pastel artifacts.

---

## 2. Dark Mode Polarity Inversion

Construct dark mode semantics by inverting lightness coordinates symmetrically across neutral roles while preserving brand anchor chroma:

```text
Light Mode Step          Dark Mode Step
─────────────────        ──────────────
50 (Canvas)        <──>  950 (Canvas)
100 (Surface)      <──>  900 (Surface)
200 (Raised)       <──>  800 (Raised)
900 (Primary Text) <──>  100 (Primary Text)
700 (Muted Text)   <──>  200 (Muted Text)
```

- **Brand Anchor Preservation**: Maintain hue and peak chroma on action buttons across both themes.
- **Surface Elevation**: Elevate dark mode surfaces by increasing lightness ($L=0.08$ for canvas, $L=0.15$ for surface, $L=0.25$ for raised modals).

---

## 3. Cognitive Contrast Shortcuts

When verifying contrast ratios mentally or in code, use these delta lightness ($\Delta L = |L_{\text{foreground}} - L_{\text{background}}|$) thresholds:

- **Text on Background**: Maintain $\Delta L \ge 0.45$.
  - Guarantees WCAG 2.1 AA $\ge 4.5:1$ (normal text).
  - Guarantees APCA $|Lc| \ge 60$ (readability floor).
- **Borders & Non-Text UI**: Maintain $\Delta L \ge 0.30$.
  - Guarantees WCAG 2.1 AA $\ge 3.0:1$ (graphical objects and user interface components).
