# Design Systems vs. Style Guides (NN/g) — mapped to token-engine-builder

Research mapping the NN/g taxonomy onto this repo, read from the primary source on 2026-10-19. Article claims cite the article; repo claims cite files. Observations in the implications section are labeled as such and commit the project to nothing.

## The article's taxonomy

NN/g (Kelley Gordon, "Design Systems vs. Style Guides", 2024) frames a **parent-child relationship**: the design system is the parent — "a complete set of standards intended to manage design at scale using reusable components and patterns" — and style guides are one kind of child inside it ([article, comparison table](https://www.nngroup.com/articles/design-systems-vs-style-guides/)). The children that collectively make up a design system are:

- **Style guides**: "a piece of documentation that contains specific guidelines, visual references, and design principles", each focused on one aspect — brand (color palettes, typography, logos, imagery), content (tone of voice, grammar, formatting), or front-end/visual (layout/grid, palette, type styles, common UI components) ([article, Style Guides section](https://www.nngroup.com/articles/design-systems-vs-style-guides/)).
- **Component library**: reusable individual UI elements where "for each UI element, specific design and implementation details are provided, including information like attributes that can be customized (size, copy, etc), different states (enabled, hover, focus, disabled), and the reusable clean, tight code for each element" ([article, Repository section](https://www.nngroup.com/articles/design-systems-vs-style-guides/)).
- **Pattern library**: reusable compositions of components (e.g. a page header of title + breadcrumb + search + buttons) ([article, Repository section](https://www.nngroup.com/articles/design-systems-vs-style-guides/)).
- **Repository**: the housing/access point for all pieces, "generally takes the form of a website", plus designer resources such as design files, logos, typefaces, and icons ([article, Repository section](https://www.nngroup.com/articles/design-systems-vs-style-guides/)).
- **Maintenance**: design systems are "living" and "require continuous maintenance and oversight" by an owning team or senior individual; style guides need lighter upkeep (brand guides change mainly at rebranding) ([article, Maintaining sections](https://www.nngroup.com/articles/design-systems-vs-style-guides/)).

The article's stated payoff: consistency at scale, a shared design language across teams, and reduced redundancy (no duplicated design elements) ([article, Design Systems section](https://www.nngroup.com/articles/design-systems-vs-style-guides/)).

## Repo mapping

| NN/g piece                     | What this repo has                                                                                                                                                                                     | Status                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| System core (foundations)      | 3-tier DTCG token tree (primitive → semantic → component) in OKLCH with measured WCAG+APCA gates, generated deterministically from a recorded palette (ARCHITECTURE.md §§1–3; ADR-0002)                | Present — and stricter than NN/g's "style" scope: values are computed and certified, not just documented |
| Front-end / visual style guide | Guidance exists but is **agent-facing**: SKILL.md procedures per skill, `references/` (style clusters, design mappings, contrast floors, scales), emitted CSS custom properties + Tailwind v4 `@theme` | Partial — no human-facing usage guide ("use this token when…") exists                                    |
| Brand style guide              | The palette/cluster system produces brand palettes with accessible combinations (ADR-0002; `token-style/references/style-clusters.md`)                                                                 | Partial — color/typography only; logos, imagery, and voice are outside this project's domain             |
| Content style guide            | —                                                                                                                                                                                                      | Absent — outside this project's domain                                                                   |
| Component library              | Component **tokens** for button/card/input (aliases, states implied by roles incl. the new `text.disabled`, `border.focus`) in `src/skills/token-math/templates/tokens/component/`                     | **Absent as NN/g defines it** — no components, no per-state specifications, no copy-paste code           |
| Pattern library                | —                                                                                                                                                                                                      | Absent                                                                                                   |
| Repository                     | GitHub repo + versioned release zips (`release/`, SHA256SUMS) + skills deployed into `~/.agents/skills`                                                                                                | Present in a different form — an artifact/skills registry, not a documentation website                   |
| Maintenance / ownership        | Changesets whole-set versioning, CI gate, ADRs, audit gates (ARCHITECTURE.md §§4–5)                                                                                                                    | Present — the "living system" upkeep is automated rather than team-process                               |

## Implications (observations, not commitments)

1. By NN/g's definition this repo is a **token foundation with a partial front-end style guide**, not a complete design system: the token core is deeper than a style guide (generated, gamut-clamped, contrast-certified), while two children are missing entirely. Claiming "design system" status in outward docs would overstate scope; "design-token system" is the accurate label today.
2. The NN/g-shaped gaps, if they are ever pursued: (a) a human-facing usage/style-guide surface — this is the already-deferred DESIGN.md work (ADR-0001, explicitly not-ported list), now with an external taxonomy argument for what it should contain; (b) component specifications with states (enabled/hover/focus/disabled) — our semantic/component tokens already carry the roles such specs would reference (including disabled and focus), so the token layer would not need changes first.
3. The article's maintenance point is already answered structurally here (gates + versioning + ADRs), which is the part most token projects lack; the missing children are documentation/component surfaces, not rigor.

## Sources

- https://www.nngroup.com/articles/design-systems-vs-style-guides/ (NN/g, Kelley Gordon, 2024-05-24)
- `ARCHITECTURE.md` §§1–5 (system overview, tiers, build decisions, verified behavior)
- `docs/adr/0001-port-style-detection-knowledge.md` (deferred list incl. DESIGN.md/Gate B)
- `docs/adr/0002-palette-first-style-spec.md` (palette foundation)
- `src/skills/token-math/templates/tokens/component/` (component tokens)
- `src/skills/token-style/references/style-clusters.md` (brand palette production)
- `README.md` Releases section (artifact distribution)
