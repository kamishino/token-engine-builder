/**
 * Interactive visualizer surface: zero-dep single-file HTML previewing color
 * ramps, typography, and components under the reader's theme.
 */
export interface VisualizerModel {
  name: string;
  label: string;
  ramps: Array<{
    group: string;
    steps: Array<{
      step: string;
      value: string;
      hex?: string | undefined;
      semantics: string[];
    }>;
  }>;
  semantics: Array<{
    group: string;
    roles: Array<{
      path: string;
      value: string;
      hex?: string | undefined;
      source?: string | undefined;
    }>;
  }>;
  typography: {
    fontFamily: string;
    steps: Array<{
      step: string;
      fontSize: string;
      lineHeight?: string | undefined;
    }>;
    weights: Array<{
      name: string;
      value: string;
    }>;
  };
  cssVars: {
    bg: string;
    surface: string;
    text: string;
    textMuted: string;
    primary: string;
    primaryText: string;
    border: string;
    radius: string;
    font: string;
  };
}

export function renderVisualizerHtml(model: VisualizerModel): string {
  const rampHtml =
    model.ramps.length === 0
      ? '<p style="color:var(--text-muted);">No color ramp tokens in this theme.</p>'
      : model.ramps
          .map(({ group, steps }) => {
            const chips = steps
              .map((s) => {
                const hexHtml = s.hex
                  ? `<span style="font-family:monospace;font-size:10px;margin-top:2px;font-weight:600;">${s.hex}</span>`
                  : '';
                const oklchHtml = `<span style="font-size:10px;color:var(--text-muted);word-break:break-all;">${s.value}</span>`;
                const badgesHtml =
                  s.semantics.length > 0
                    ? `<div style="display:flex;flex-wrap:wrap;gap:2px;margin-top:4px;">` +
                      s.semantics
                        .map((sem) => {
                          const shortName = sem.startsWith('semantic.color.')
                            ? sem.slice('semantic.color.'.length)
                            : sem;
                          return `<span style="background:var(--surface);border:1px solid var(--border);color:var(--text);padding:1px 4px;border-radius:9999px;font-size:10px;" title="${sem}">${shortName}</span>`;
                        })
                        .join('') +
                      `</div>`
                    : '';
                return (
                  `<div style="flex:1;min-width:92px;display:flex;flex-direction:column;border:1px solid var(--border);border-radius:4px;padding:4px;background:var(--surface);box-sizing:border-box;">` +
                  `<div style="height:50px;background:${s.value};display:flex;align-items:flex-end;padding:4px;font-size:10px;font-weight:600;color:${Number(s.step) >= 600 ? '#fff' : '#000'};border-radius:2px;"><span>${s.step}</span></div>` +
                  `<div style="display:flex;flex-direction:column;margin-top:4px;">${hexHtml}${oklchHtml}${badgesHtml}</div>` +
                  `</div>`
                );
              })
              .join('');
            return `<div style="margin-bottom:1.5rem;"><h3 style="font-size:1rem;margin-bottom:0.5rem;text-transform:capitalize;">${group}</h3><div style="display:flex;gap:6px;flex-wrap:wrap;">${chips}</div></div>`;
          })
          .join('');

  const semanticsHtml =
    model.semantics.length === 0
      ? '<p style="color:var(--text-muted);">No semantic color tokens in this theme.</p>'
      : model.semantics
          .map(({ group, roles }) => {
            const rows = roles
              .map((r) => {
                const shortRole = r.path.startsWith('semantic.color.')
                  ? r.path.slice('semantic.color.'.length)
                  : r.path;
                const hexText = r.hex ?? '—';
                const sourceText = r.source ? `{${r.source}}` : '—';
                return (
                  `<tr style="border-bottom:1px solid var(--border);">` +
                  `<td style="padding:0.5rem;width:32px;"><div style="width:24px;height:24px;background:${r.value};border:1px solid var(--border);border-radius:4px;"></div></td>` +
                  `<td style="padding:0.5rem;font-family:monospace;font-size:0.875rem;">${shortRole}</td>` +
                  `<td style="padding:0.5rem;font-family:monospace;font-size:0.875rem;">${hexText}</td>` +
                  `<td style="padding:0.5rem;font-size:0.875rem;color:var(--text-muted);word-break:break-all;">${r.value}</td>` +
                  `<td style="padding:0.5rem;font-family:monospace;font-size:0.875rem;color:var(--text-muted);">${sourceText}</td>` +
                  `</tr>`
                );
              })
              .join('');
            return (
              `<div style="margin-bottom:1.5rem;"><h3 style="font-size:1rem;margin-bottom:0.5rem;text-transform:capitalize;">${group}</h3>` +
              `<table style="width:100%;border-collapse:collapse;font-size:0.875rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;">` +
              `<thead><tr style="background:var(--surface);color:var(--text-muted);border-bottom:1px solid var(--border);text-align:left;">` +
              `<th style="padding:0.5rem;"></th><th style="padding:0.5rem;">Role</th><th style="padding:0.5rem;">HEX</th><th style="padding:0.5rem;">Value</th><th style="padding:0.5rem;">Source</th>` +
              `</tr></thead><tbody>${rows}</tbody></table></div>`
            );
          })
          .join('');

  const typographyStepsHtml =
    model.typography.steps.length === 0
      ? '<p style="color:var(--text-muted);">No typography tokens in this theme.</p>'
      : `<table style="width:100%;border-collapse:collapse;font-size:0.875rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;">` +
        `<thead><tr style="background:var(--surface);color:var(--text-muted);border-bottom:1px solid var(--border);text-align:left;">` +
        `<th style="padding:0.5rem;">Step</th><th style="padding:0.5rem;">Specimen</th><th style="padding:0.5rem;">Size</th><th style="padding:0.5rem;">Line height</th>` +
        `</tr></thead><tbody>` +
        model.typography.steps
          .map((s) => {
            const lh = s.lineHeight ?? '—';
            return (
              `<tr style="border-bottom:1px solid var(--border);">` +
              `<td style="padding:0.5rem;font-weight:600;width:60px;">${s.step}</td>` +
              `<td style="padding:0.5rem;overflow:hidden;"><span style="font-family:var(--font);font-size:${s.fontSize};line-height:${s.lineHeight ?? 'inherit'};white-space:nowrap;">Aa</span></td>` +
              `<td style="padding:0.5rem;font-family:monospace;font-size:0.875rem;width:90px;">${s.fontSize}</td>` +
              `<td style="padding:0.5rem;font-family:monospace;font-size:0.875rem;color:var(--text-muted);width:90px;">${lh}</td>` +
              `</tr>`
            );
          })
          .join('') +
        `</tbody></table>`;

  const weightsHtml =
    model.typography.weights.length > 0
      ? `<div style="display:flex;gap:1.5rem;flex-wrap:wrap;align-items:center;margin-top:1rem;padding:0.75rem 1rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);">${model.typography.weights
          .map(
            (w) =>
              `<span style="font-family:var(--font);font-size:1rem;font-weight:${w.value};">Aa <span style="font-size:0.75rem;color:var(--text-muted);font-weight:normal;">(${w.name} ${w.value})</span></span>`,
          )
          .join('')}</div>`
      : '';

  const typographyHtml =
    `<p style="margin-bottom:1rem;">Font family: <code style="font-family:var(--font);font-weight:600;">${model.typography.fontFamily}</code></p>` +
    typographyStepsHtml +
    (model.typography.steps.length > 0 ? weightsHtml : '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${model.name} — Visualizer (${model.label})</title>
  <style>
    :root {
      --bg: ${model.cssVars.bg};
      --surface: ${model.cssVars.surface};
      --text: ${model.cssVars.text};
      --text-muted: ${model.cssVars.textMuted};
      --primary: ${model.cssVars.primary};
      --primary-text: ${model.cssVars.primaryText};
      --border: ${model.cssVars.border};
      --radius: ${model.cssVars.radius};
      --font: ${model.cssVars.font};
    }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      margin: 0;
      padding: 2rem;
      line-height: 1.5;
    }
    .container { max-width: 960px; margin: 0 auto; }
    h1 { font-size: 1.875rem; margin-bottom: 0.25rem; }
    h2 { font-size: 1.25rem; margin-top: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    .specimen-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.5rem;
      margin-top: 1rem;
    }
    .btn {
      background: var(--primary);
      color: var(--primary-text);
      border: none;
      border-radius: var(--radius);
      padding: 0.5rem 1rem;
      font-weight: 500;
      cursor: pointer;
      display: inline-block;
    }
    .btn:hover { opacity: 0.9; }
    .input-field {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.5rem 0.75rem;
      color: var(--text);
      width: 100%;
      max-width: 320px;
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${model.name} Visualizer</h1>
    <p style="color:var(--text-muted);margin-top:0;">Theme: <strong>${model.label}</strong> — generated by token-engine-builder for visual inspection</p>

    <h2>1. Color Ramps</h2>
    ${rampHtml}

    <h2>2. Semantic Colors</h2>
    ${semanticsHtml}

    <h2>3. Typography</h2>
    ${typographyHtml}

    <h2>4. Component Specimens</h2>
    <div class="specimen-card">
      <h3 style="margin-top:0;">Card Specimen</h3>
      <p style="color:var(--text-muted);">This card tests surface background, borders, radius, and typography bindings.</p>
      <div style="display:flex;gap:1rem;align-items:center;margin-top:1rem;">
        <button class="btn">Action Button</button>
        <input type="text" class="input-field" placeholder="Input specimen..." value="Sample text" />
      </div>
      <div style="display:flex;gap:0.75rem;align-items:center;margin-top:1rem;flex-wrap:wrap;">
        <span style="background:var(--surface);border:1px solid var(--border);color:var(--text);padding:0.25rem 0.5rem;border-radius:9999px;font-size:0.75rem;font-weight:600;">Status Badge</span>
        <div style="background:var(--bg);border:1px solid var(--border);color:var(--text-muted);width:32px;height:32px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:0.875rem;font-weight:600;">JD</div>
        <div style="background:var(--text);color:var(--bg);padding:0.25rem 0.5rem;border-radius:var(--radius);font-size:0.75rem;">Tooltip helper</div>
      </div>
      <div style="background:var(--bg);border-left:4px solid var(--primary);padding:0.75rem 1rem;border-radius:var(--radius);margin-top:1rem;font-size:0.875rem;color:var(--text);">
        <strong>Alert Banner:</strong> System tokens active and certified.
      </div>
      <table style="width:100%;margin-top:1rem;border-collapse:collapse;font-size:0.875rem;">
        <thead>
          <tr style="background:var(--surface);color:var(--text-muted);border-bottom:1px solid var(--border);">
            <th style="padding:0.5rem;text-align:left;">Role</th>
            <th style="padding:0.5rem;text-align:left;">Token</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid var(--border);">
            <td style="padding:0.5rem;">Surface</td>
            <td style="padding:0.5rem;font-family:monospace;">var(--surface)</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
`;
}
