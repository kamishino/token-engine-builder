# Operating Without Scripts: How LLMs Reason Through Pure Cognitive Skills

Research reflection and operational evaluation on how autonomous AI agents understand, reason through, and execute skills that carry zero executable scripts. Grounded in the transformation of the `design-tokens` skill in `token-engine-builder`.

---

## 1. The Cognitive Shift: Subprocess Typist vs. Architectural Partner

When designing AI agent skills, the prevailing reflex is to write executable scripts and wrap them in Markdown instructions. However, observing LLM behavior across hundreds of runs reveals a profound cognitive divergence between **script-bound skills** and **scriptless cognitive skills**:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   SCRIPT-BOUND SKILL (The Bash Typist)                 │
│                                                                        │
│   Agent Focus: Assembling CLI flags, managing file paths,              │
│                handling subprocess exit codes.                         │
│   Cognitive Role: An automated cron job typing terminal commands.      │
│   Failure Mode: If a script crashes or exits with code 1, the agent    │
│                 lacks domain visibility and enters futile retry loops. │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                         The Cognitive Inversion
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                 SCRIPTLESS COGNITIVE SKILL (The Architect)             │
│                                                                        │
│   Agent Focus: Internalizing purpose, evaluating codebase ASTs,        │
│                enforcing architectural seams, surgical refactoring.    │
│   Cognitive Role: An in-context compiler and systems engineer.         │
│   Failure Mode: None; the agent uses native file tools directly and    │
│                 self-corrects against checkable completion gates.      │
└────────────────────────────────────────────────────────────────────────┘
```

### What Happens When Scripts Are Removed?
When an AI agent reads a skill that provides no scripts:
1. **The LLM Does Not Search for Commands to Run**: It stops looking for a bash one-liner to copy and paste.
2. **Native Toolchain Activation**: The agent reaches for the tools it natively commands: `glob` (discovering files), `read` (sampling ASTs), `grep` (locating debt), `edit` (surgical diffs), and `write` (authoring contracts).
3. **Reasoning Replaces Delegation**: The model internalizes the **Purpose** ("Why am I here?") and the **Mental Model** (Seams, Locality, Leverage, Deletion Test), using disclosed reference cards to construct solutions tailored to the specific repository.

---

## 2. Practical Execution: A Cognitive Trace of `design-tokens`

In practice, how does an autonomous model actually process and execute the 67-line `design-tokens/SKILL.md`?

```mermaid
sequenceDiagram
  autonumber
  actor User as Human / Task
  participant Agent as AI Agent (design-tokens)
  participant FS as Codebase Filesystem
  participant Ref as Sibling References

  User->>Agent: "Set up design tokens and dark mode for our components"
  Note over Agent: Matches trigger: "palettes, contrast, dark mode, refactoring"
  
  rect rgb(240, 248, 255)
    Note over Agent: Phase 1: Silent Triage
    Agent->>FS: glob("**/*.css", "package.json")
    Agent->>FS: grep(":host", "packages/ui/")
    Note over Agent: Identifies Web Components (Shadow DOM) & existing color debt
  end

  rect rgb(255, 250, 240)
    Note over Agent: Phase 2: Socratic Specification
    Agent->>User: "Proposing tokens.config.json with Cyan anchor for HUD"
    User-->>Agent: "Approved"
    Agent->>FS: write("tokens.config.json")
  end

  rect rgb(240, 255, 240)
    Note over Agent: Phase 3: In-Context Token Construction
    Agent->>Ref: read("references/token-math.md")
    Agent->>Ref: read("references/dtcg-tiers.md")
    Agent->>FS: write("tokens/primitive/*.json")
    Agent->>FS: write("tokens/semantic/*.json") (Polarity Inversion)
    Agent->>FS: write("tokens/component/*.json")
  end

  rect rgb(255, 245, 245)
    Note over Agent: Phase 4: Surgical Modernization
    Agent->>FS: grep("#[0-9a-fA-F]{3,8}")
    Agent->>FS: edit("packages/ui/src/*.ts") -> replace hex with var(--color-*)
    Agent->>FS: inject tokens.css into :host root
  end

  Note over Agent: Pre-Yield Checklist: 0 hexes remain, Delta L >= 0.45, @tokens isolated
  Agent-->>User: "Tokens wired cleanly; zero hex drift verified."
```

### The 5 Cognitive States
1. **Trigger Recognition**: The agent loads the skill when keywords in the task match the front-loaded description (`"creating palettes, fixing contrast, migrating to OKLCH, setting up dark mode, refactoring raw hexes, or piercing Shadow DOM"`).
2. **Silent Triage**: Without prompting the user, the agent inspects `package.json` and styled components. It establishes whether the environment is greenfield or brownfield and whether `:host` scoping is required.
3. **Spec Formulation**: The agent anchors brand intent in `tokens.config.json` (20 lines of intent) rather than attempting to guess 200 raw token variables.
4. **On-Demand Reference Consultation**: Rather than having 500 lines of math cluttering the main prompt, the agent reaches for `references/token-math.md` and `references/dtcg-tiers.md` only when constructing the token files.
5. **The Pre-Yield Gate**: The agent evaluates the 4 observable completion criteria (zero raw hexes, DTCG tier decoupling, $\Delta L \ge 0.45$, `@tokens` seam). If any check fails, it self-corrects before declaring the task complete.

---

## 3. Architectural Tradeoffs: Pure Cognition vs. Compiled Acceleration

Stripping scripts from a skill provides extraordinary architectural advantages, along with specific engineering boundaries:

| Dimension | Script-Bound Skills | Pure Cognitive Skills (Scriptless) |
| :--- | :--- | :--- |
| **Portability** | **Fragile**: Requires specific Node runtimes, shell environments (bash/zsh vs PowerShell), global CLIs, or path resolution shims. | **Universal**: Runs identically across Claude Code, Codex, Cursor, Gemini CLI, or air-gapped agent runners with zero install steps. |
| **Failure Modes** | **Brittle**: Path errors, permission bits (`chmod +x`), missing devDependencies, and non-zero exit codes stall the agent. | **Resilient**: The agent uses native tools (`read`, `edit`, `write`); zero external dependencies can fail. |
| **Explainability** | **Opaque**: The script does the work; the agent merely reports standard output. | **Complete**: The agent understands every token and CSS variable because it derived them through reasoning. |
| **Throughput on Bulk Data** | **High**: A compiled binary generates 500 token files across 8 UI frameworks in $<10\text{ms}$. | **Moderate**: Generating thousands of lines of boilerplate consumes context tokens and generation time. |

### The Synthesis: Cognitive Primary, Tool Accelerated
The optimal architecture is **Cognitive-First**:
- The **Skill** (`SKILL.md`) MUST be authored as a self-contained, pure cognitive guide. It must be capable of achieving 100% success without external binaries.
- Compiled binaries (such as `token-engine`) act as **optional speed accelerators** for large monorepos, but the skill's instructions never treat them as a mandatory crutch.

---

## 4. Heuristics for Authoring High-Signal Scriptless Skills

When authoring agent skills that achieve maximum consistency without executable scripts, apply these five heuristics:

### 1. Anchor on Purpose, Not Procedures
Start with the mission: *Why are we here? What visual or architectural debt are we eliminating?* An agent that understands the goal makes intelligent trade-offs; an agent following rote steps crashes on novel edge cases.

### 2. Keep the Procedural Driver Under 80 Lines
Long documents suffer from attention thinning and encourage premature completion. Keep the primary `SKILL.md` under 80 lines: pure sequential moves, zero academic essays.

### 3. Progressive Disclosure for Reference Cards
Push flat reference tables (the 11-step OKLCH ramp, DTCG JSON schemas, visual HTML templates) into sibling files (`references/*.md`). The agent loads them on demand, preserving working memory for code refactoring.

### 4. Steer by Positive Action, Never Negation
Avoid negative prohibitions (*"Never do X"*, *"Do NOT touch Y"*). Negation drags the forbidden concept into context (*"don't think of an elephant"*). State the positive target behavior (*"Preserve anchor chroma"*, *"Consolidate mined colors into unified roles"*).

### 5. Checkable, Observable Pre-Yield Gates
Define completion criteria as observable binary facts:
- *"Zero `#hex` literals remaining in styled components."*
- *"Text on canvas achieves $\Delta L \ge 0.45$."*
- *"Token package imports cleanly behind `@tokens`."*

When the completion criteria are checkable, the agent never yields halfway.
