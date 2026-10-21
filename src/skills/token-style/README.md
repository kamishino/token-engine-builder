# token-style

First in the pipeline: a Socratic interview about brand aesthetic that records one OKLCH anchor as `style-spec.json`. Judgement lives here; arithmetic does not.

## Install

```bash
cp -r dist/token-style <skills-dir>/token-style
```

See [Where skills install](../../README.md#where-skills-install) for common `<skills-dir>` locations.

Requires Node `>=22.12`. No dependencies — this skill ships no scripts.

## Use

Ask the agent to run the design interview, or answer from the example:

```bash
cp <skills-dir>/token-style/assets/style-spec.example.json style-spec.json
```

A second worked example (`examples/style-spec.compact.json`) shows a compact green brand. The full procedure is in [SKILL.md](SKILL.md); the input schema for the next stage is `assets/style-spec.example.json`.

## Next

Hand `style-spec.json` to the `token-math` skill (`node <token-math-root>/scripts/generate.mjs --spec style-spec.json --out tokens`).
