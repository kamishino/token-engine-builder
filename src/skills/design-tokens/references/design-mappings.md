# Design mappings — vague words → spec decisions

Read when user language is vague ("premium", "playful", "clean") or an anchor/spec pick needs adjusting. These rules _modify_ a cluster pick from `style-clusters.md`; they never override an explicit user answer.

## Vibe → spec adjustments

| Vibe                    | Adjustments (relative to cluster center)                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| Premium / luxury        | Chroma toward floor; `density: comfortable`; type ratio 1.333; radii soft (4/8/16), never pill-everything |
| Playful / fun           | Chroma toward ceiling; radii round (8/16/24); type ratio 1.25–1.333                                       |
| Minimal / clean         | Chroma floor; neutral chroma 0.008; radii sharp (2/4/8); type ratio 1.2                                   |
| Corporate / trustworthy | Hue into 210–260 unless cluster says otherwise; `density: comfortable`; radii soft                        |
| Data-dense / tool-like  | `density: compact`; type ratio 1.2; radii sharp                                                           |
| Organic / natural       | Neutral temperature warm; chroma mid-low; radii soft-to-round                                             |
| Dark-first              | Anchor lightness toward 0.45–0.55 (ramp must serve dark canvas first); verify both themes at audit        |

## Plain ↔ technical (for interview phrasing)

| Say to the user                | Means in the spec                        |
| ------------------------------ | ---------------------------------------- |
| "Pill-shaped buttons"          | `radius.full` for interactive elements   |
| "Sharp, squared corners"       | radii 2/4/8                              |
| "Airy, lots of breathing room" | `density: comfortable`, spacing base 4px |
| "Tight, information-dense"     | `density: compact`                       |
| "Big dramatic headlines"       | type ratio 1.333                         |
| "Quiet, understated color"     | anchor chroma at cluster floor           |

## Guardrails (apply unless the user explicitly overrides)

- Anchor lightness 0.45–0.65 unless the cluster box is narrower — outside this band one theme's ramp starves.
- Never anchor on pure black or pure white; neutrals carry brand temperature (`neutralChroma` 0.008–0.015), never 0.
- One anchor hue family per system. A second hue is a new interview, not an adjustment.
- Chroma above the cluster ceiling reads neon on UI surfaces — treat the ceiling as hard.
- Every adjustment is stated aloud with its reason ("premium → chroma to floor"); silent drift from the cluster pick is how anchors become unexplainable.
