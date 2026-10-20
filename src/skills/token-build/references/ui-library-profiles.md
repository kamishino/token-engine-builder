# UI-library profiles — which libraries, in which order, and why

Read when choosing or adding an output profile (`build.mjs --profile <id>`). Profiles map this system's library-neutral semantic roles to one library's documented variable/theme names via a shared engine in the compiler. The token tree never adopts a library's naming.

## Selection rule

**CSS-variable libraries first** (pure mapping, no new renderer), **object-theme libraries next** (need a JSON/TS renderer decision), **step-scale libraries only with an explicit step-mapping decision** (their scales do not align 1:1 with our 5/9/11 ramps).

## Shipped

| Profile     | Target format                                                                       | Why it shipped                                                                                                                                                      |
| ----------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shadcn`    | CSS variables, `:root` + `.dark` in one file                                        | The de-facto token consumption shape in the npm ecosystem (shadcn catalogs, Stitch build skills); maps 1:1 from semantic roles; cheapest profile, proves the engine |
| `bootstrap` | CSS variables (`--bs-*`), `:root` + `[data-bs-theme="dark"]`                        | Second CSS-var system with different names/shape — proves the registry is not a shadcn special case                                                                 |
| `primevue`  | CSS variables (`--p-*`), `:root` + `.p-dark`                                        | PrimeVue/PrimeReact v4 design-token variables; same renderer family, third mapping                                                                                  |
| `antd`      | Ant Design theme-token JSON (`{light, dark}` ConfigProvider token maps, hex values) | First object-theme renderer: proves profiles are not CSS-only                                                                                                       |

## Backlog (in priority order)

| Library           | Target format                           | Blocker / decision needed                                                                |
| ----------------- | --------------------------------------- | ---------------------------------------------------------------------------------------- |
| Material UI (MUI) | JS theme object (`createTheme` palette) | Needs a JSON/TS renderer, not CSS vars                                                   |
| Material UI (MUI) | JS theme object (`createTheme` palette) | Needs a JSON/TS renderer, not CSS vars                                                   |
| Ant Design        | ConfigProvider theme-token JSON         | JSON renderer; its seed/map/alias token tiers need a mapping review                      |
| Chakra UI v3      | TS semantic-token theme                 | TS renderer + recipe model review                                                        |
| Radix Themes      | 1–12 accent/gray step scales            | Step-scale mismatch: our ramps are 5/9/11 steps; needs an explicit step-mapping decision |
| Fluent UI 2       | Theme JSON (colorPalette)               | Enterprise audience; lowest priority for this product                                    |

Adding a library = one mapping table (+ a renderer only for object-theme formats), a gold example, and a row here. Never rename semantic roles to match a library.
