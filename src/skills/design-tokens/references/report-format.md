# Design System Review — Report Format

The design system review is rendered as a single self-contained HTML file in the OS temp directory (`<tmpdir>/design-system-review-<timestamp>.html`). Tailwind and Mermaid both come from CDNs, paired with a small inline fallback CSS block so the document remains legible offline.

## Scaffold

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Design System Review — {{project name}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

      mermaid.initialize({ startOnLoad: true, theme: 'neutral', securityLevel: 'loose' });
    </script>
    <style>
      /* Offline fallback styles if CDN fails */
      body {
        font-family:
          system-ui,
          -apple-system,
          sans-serif;
        line-height: 1.5;
        margin: 0;
        padding: 2rem;
        background: #f8fafc;
        color: #0f172a;
      }
      .container {
        max-width: 1024px;
        margin: 0 auto;
      }
      .card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
      }
      .badge-error {
        background: #fee2e2;
        color: #991b1b;
        padding: 0.25rem 0.5rem;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 0.75rem;
      }
      .badge-warning {
        background: #fef3c7;
        color: #92400e;
        padding: 0.25rem 0.5rem;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 0.75rem;
      }
      .badge-info {
        background: #f1f5f9;
        color: #334155;
        padding: 0.25rem 0.5rem;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 0.75rem;
      }
    </style>
  </head>
  <body class="bg-slate-50 text-slate-900 p-8">
    <div class="max-w-5xl mx-auto space-y-6">
      <!-- Header -->
      <header class="border-b border-slate-200 pb-4">
        <h1 class="text-2xl font-bold tracking-tight">Design System Health Review</h1>
        <p class="text-sm text-slate-500">
          Project: <strong>{{name}}</strong> · Generated {{timestamp}}
        </p>
        <div class="flex gap-2 mt-3 text-xs font-mono">
          <span class="px-2 py-1 bg-slate-200 rounded">spec: {{spec.status}}</span>
          <span class="px-2 py-1 bg-slate-200 rounded">tokens: {{tokens.status}}</span>
          <span class="px-2 py-1 bg-slate-200 rounded">audit: {{auditStamp}}</span>
          <span class="px-2 py-1 bg-slate-200 rounded">build: {{build.status}}</span>
        </div>
      </header>

      <!-- Pipeline Graph (Mermaid) -->
      <section class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 class="text-lg font-semibold mb-3">Pipeline Flow & Gate Status</h2>
        <pre class="mermaid">
graph LR
  Spec[style-spec.json] --> Generate[generate.mjs]
  Generate --> Tokens[3-Tier Tokens]
  Tokens --> Audit{audit.mjs}
  Audit -->|Pass| Stamp[.token-engine-audit.json]
  Stamp --> Build[build.mjs]
  Build --> Outputs[CSS & Profiles]
        </pre>
      </section>

      <!-- Findings Cards -->
      <section class="space-y-4">
        <h2 class="text-xl font-bold">Identified Holes & Diagnostic Findings</h2>

        <!-- Card Template -->
        <article class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-base text-slate-900">{{finding.title}}</h3>
            <span class="badge-{{severity}} px-2.5 py-0.5 rounded-full text-xs font-semibold"
              >{{severity}}</span
            >
          </div>
          <p class="text-sm text-slate-600">{{finding.detail}}</p>
          <div class="bg-slate-50 p-3 rounded text-xs font-mono border border-slate-200">
            <strong>Evidence:</strong>
            <ul class="list-disc list-inside mt-1 text-slate-700">
              <li>{{evidence line}}</li>
            </ul>
          </div>
          <div
            class="text-xs text-slate-700 pt-2 border-t border-slate-100 flex items-center justify-between"
          >
            <span><strong>Resolution:</strong> <code>{{finding.next}}</code></span>
          </div>
        </article>
      </section>

      <!-- Top Recommendation -->
      <section class="bg-indigo-50 border border-indigo-200 p-6 rounded-xl space-y-2">
        <h2 class="text-lg font-bold text-indigo-950">Top Recommendation</h2>
        <p class="text-sm text-indigo-900">
          {{Actionable summary of which hole to tackle first and exact copy-paste command}}
        </p>
      </section>
    </div>
  </body>
</html>
```

## Proposal Scaffold (when no system exists)

When `state.spec.status === 'missing'`, replace the findings cards with a **System Proposal**:

- **Brand & Domain Goal**: inferred from package description and README.
- **Proposed Palette**: 3–5 named OKLCH anchors (primary, secondary, accent, neutral temperature).
- **Typography & Scale**: base font family, modular scale ratio (1.25 balanced default), base line-height.
- **Layout & Density**: 4px grid spacing, density setting (`comfortable` vs `compact`), corner radii presets.
- **Specification Skeleton**: a valid, complete `tokens.config.json` preview ready to be recorded.
- **Handoff Action**: invoke `design-tokens` (or `token-engine extract` if code colors exist) to record the proposal into the project root.
