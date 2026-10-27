# UI-library profiles — which libraries, in which order, and why

Read when choosing or adding an output profile (`token-engine build --profile <id>`). Profiles map this system's library-neutral semantic roles to one library's documented variable/theme names via a shared engine in the compiler. The token tree never adopts a library's naming.

## Selection rule

**CSS-variable libraries first** (pure mapping, no new renderer), **object-theme libraries next** (need a JSON/TS renderer decision), **step-scale libraries only with an explicit step-mapping decision** (their scales do not align 1:1 with our 5/9/11 ramps).

## Shipped

| Profile     | Target format                                                                           | Why it shipped                                                                                                                                                                         |
| ----------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shadcn`    | CSS variables, `:root` + `.dark` in one file                                            | The de-facto token consumption shape in the npm ecosystem (shadcn catalogs, Stitch build skills); maps 1:1 from semantic roles; cheapest profile, proves the engine                    |
| `bootstrap` | CSS variables (`--bs-*`), `:root` + `[data-bs-theme="dark"]`                            | Second CSS-var system with different names/shape — proves the registry is not a shadcn special case                                                                                    |
| `primevue`  | CSS variables (`--p-*`), `:root` + `.p-dark`                                            | PrimeVue/PrimeReact v4 design-token variables; same renderer family, third mapping                                                                                                     |
| `antd`      | Ant Design theme-token JSON (`{light, dark}` ConfigProvider token maps, hex values)     | First object-theme renderer: proves profiles are not CSS-only                                                                                                                          |
| `mui`       | MUI theme JSON (`{light, dark}` createTheme-ready palette/typography/shape, hex values) | Second object-theme renderer; secondary color comes from the palette's secondary ramp                                                                                                  |
| `chakra`    | Chakra v3 semantic-token JSON (`semanticTokens.colors` with `_light`/`_dark` pairs)     | Condition-based semantic tokens: one object carries both themes per token                                                                                                              |
| `radix`     | Radix Themes CSS (`--accent-1..12`, `--gray-1..12`, `:root` + `.dark`)                  | Step-scale library: our ramp is interpolated onto the 12 Radix lightness positions (1–2 bg, 3–5 interactive, 6–8 borders, 9–10 solid, 11–12 text) — the explicit step-mapping decision |
| `fluent`    | Fluent UI 2 theme JSON (`{light, dark}` color-token map, hex values)                    | Enterprise theme shape; brand/neutral role names map 1:1 from semantic roles                                                                                                           |

Registry complete: every candidate from the selection rule ships. New libraries enter only by user request, following the same rule.

Adding a library = one mapping table (+ a renderer only for object-theme formats), a gold example, and a row here. Never rename semantic roles to match a library.
