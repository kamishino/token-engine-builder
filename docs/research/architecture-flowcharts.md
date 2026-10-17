# Architecture flowcharts — token-engine-builder

Visual companion to [`ARCHITECTURE.md`](../../ARCHITECTURE.md). Source of truth stays there; these diagrams mirror it.

## 1. End-to-end token pipeline

```mermaid
flowchart LR
  A["design-style\ninterview → style-spec.json"] --> B["token-math\ngenerate.mjs → tokens/"]
  B --> C["token-audit\naudit.mjs → gate"]
  C -->|exit 0| D["token-build\nbuild.mjs → CSS"]
  C -->|exit 1| B
  D --> E["tokens.css\n:root custom properties"]
  D --> F["theme.css\nTailwind v4 @theme"]
```

## 2. Per-skill build and packaging

```mermaid
flowchart TD
  S["src/skills/<skill>/\nSKILL.md + scripts/*.ts + templates/ + assets/ + examples/"] --> V["Vite, one pass per skill\nSKILL_ENTRY + inlineDynamicImports"]
  V --> J["dist/<skill>/scripts/*.mjs\ndeps inlined, node:* external"]
  V --> M["sync-skill-packages\ncopy SKILL.md + templates/ + assets/ + examples/\nchmod 0o755 on *.mjs"]
  J --> P["dist/<skill>/\nstandalone package"]
  M --> P
  P -->|copy| H["~/agents/skills/<skill>/\nnode, no install"]
```

## 3. Tier alias discipline and the audit gate

```mermaid
flowchart TD
  R["primitive/\nraw OKLCH + px values ONLY"] --> S2["semantic/ light + dark\n{alias} only, same paths"]
  R --> C2["component/ button card input\n{alias} only"]
  S2 --> C2
  C2 --> G["audit.mjs\n7 pairs x 2 themes\nall aliases resolve\nzero raw above primitive"]
  G -->|pass| B["build.mjs"]
  G -->|fail| R
```
