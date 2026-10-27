export interface AuditPair {
  fg: string;
  bg: string;
  kind: 'text' | 'border' | 'decorative';
}

export const FEEDBACK_ROLES = ['success', 'warning', 'danger', 'info', 'help'] as const;
export type FeedbackRole = (typeof FEEDBACK_ROLES)[number];

export const TOKEN_ENGINE_EXTENSION = 'token-engine';

/** `$extensions` payload carried by a palette ramp's anchor token (step 500). */
export function paletteRoleExtensions(role: string): Record<string, unknown> {
  return { [TOKEN_ENGINE_EXTENSION]: { role } };
}

/** Read the palette role stamped on a ramp anchor; malformed extensions are ignored. */
export function paletteRoleOf(token: {
  $extensions?: Record<string, unknown>;
}): string | undefined {
  const extension = token.$extensions?.[TOKEN_ENGINE_EXTENSION];
  if (extension === null || typeof extension !== 'object') return undefined;
  const role = (extension as { role?: unknown }).role;
  return typeof role === 'string' ? role : undefined;
}

export const SEMANTIC_ROLE_PATHS = {
  BG_CANVAS: 'semantic.color.bg.canvas',
  BG_SURFACE: 'semantic.color.bg.surface',
  BG_SUBTLE: 'semantic.color.bg.subtle',
  BG_RAISED: 'semantic.color.bg.raised',
  TEXT_PRIMARY: 'semantic.color.text.primary',
  TEXT_SECONDARY: 'semantic.color.text.secondary',
  TEXT_TERTIARY: 'semantic.color.text.tertiary',
  TEXT_DISABLED: 'semantic.color.text.disabled',
  TEXT_INVERSE: 'semantic.color.text.inverse',
  TEXT_LINK: 'semantic.color.text.link',
  ACTION_PRIMARY: 'semantic.color.action.primary',
  ACTION_PRIMARY_HOVER: 'semantic.color.action.primary-hover',
  ACTION_PRIMARY_TEXT: 'semantic.color.action.primary-text',
  BORDER_SUBTLE: 'semantic.color.border.subtle',
  BORDER_DEFAULT: 'semantic.color.border.default',
  BORDER_STRONG: 'semantic.color.border.strong',
  BORDER_FOCUS: 'semantic.color.border.focus',
} as const;

export interface SemanticColorRole {
  path: string;
  /** Nested keys below `semantic.color`; exactly two levels. */
  keys: readonly [string, string];
  /** Key in target registry. */
  target: string;
}

export const SEMANTIC_COLOR_ROLES: readonly SemanticColorRole[] = [
  { path: SEMANTIC_ROLE_PATHS.BG_CANVAS, keys: ['bg', 'canvas'], target: 'canvas' },
  { path: SEMANTIC_ROLE_PATHS.BG_SURFACE, keys: ['bg', 'surface'], target: 'surface' },
  { path: SEMANTIC_ROLE_PATHS.BG_SUBTLE, keys: ['bg', 'subtle'], target: 'subtle' },
  { path: SEMANTIC_ROLE_PATHS.BG_RAISED, keys: ['bg', 'raised'], target: 'raised' },
  { path: SEMANTIC_ROLE_PATHS.TEXT_PRIMARY, keys: ['text', 'primary'], target: 'textPrimary' },
  {
    path: SEMANTIC_ROLE_PATHS.TEXT_SECONDARY,
    keys: ['text', 'secondary'],
    target: 'textSecondary',
  },
  { path: SEMANTIC_ROLE_PATHS.TEXT_TERTIARY, keys: ['text', 'tertiary'], target: 'textTertiary' },
  { path: SEMANTIC_ROLE_PATHS.TEXT_DISABLED, keys: ['text', 'disabled'], target: 'textDisabled' },
  { path: SEMANTIC_ROLE_PATHS.TEXT_INVERSE, keys: ['text', 'inverse'], target: 'textInverse' },
  { path: SEMANTIC_ROLE_PATHS.TEXT_LINK, keys: ['text', 'link'], target: 'textLink' },
  { path: SEMANTIC_ROLE_PATHS.ACTION_PRIMARY, keys: ['action', 'primary'], target: 'action' },
  {
    path: SEMANTIC_ROLE_PATHS.ACTION_PRIMARY_HOVER,
    keys: ['action', 'primary-hover'],
    target: 'actionHover',
  },
  {
    path: SEMANTIC_ROLE_PATHS.ACTION_PRIMARY_TEXT,
    keys: ['action', 'primary-text'],
    target: 'actionText',
  },
  { path: SEMANTIC_ROLE_PATHS.BORDER_SUBTLE, keys: ['border', 'subtle'], target: 'borderSubtle' },
  {
    path: SEMANTIC_ROLE_PATHS.BORDER_DEFAULT,
    keys: ['border', 'default'],
    target: 'borderDefault',
  },
  { path: SEMANTIC_ROLE_PATHS.BORDER_STRONG, keys: ['border', 'strong'], target: 'borderStrong' },
  { path: SEMANTIC_ROLE_PATHS.BORDER_FOCUS, keys: ['border', 'focus'], target: 'borderFocus' },
];

export function feedbackBgPath(role: FeedbackRole): string {
  return `semantic.color.feedback.${role}.bg`;
}

export function feedbackTextPath(role: FeedbackRole): string {
  return `semantic.color.feedback.${role}.text`;
}

const text = (fg: string, bg: string): AuditPair => ({ fg, bg, kind: 'text' });
const border = (fg: string, bg: string): AuditPair => ({ fg, bg, kind: 'border' });
const decorative = (fg: string, bg: string): AuditPair => ({ fg, bg, kind: 'decorative' });

/** Canonical 42 audit contrast pairs across semantic and component roles. */
export const AUDIT_PAIRS: readonly AuditPair[] = [
  // Semantic text on surfaces
  text(SEMANTIC_ROLE_PATHS.TEXT_PRIMARY, SEMANTIC_ROLE_PATHS.BG_CANVAS),
  text(SEMANTIC_ROLE_PATHS.TEXT_PRIMARY, SEMANTIC_ROLE_PATHS.BG_SURFACE),
  text(SEMANTIC_ROLE_PATHS.TEXT_PRIMARY, SEMANTIC_ROLE_PATHS.BG_RAISED),
  text(SEMANTIC_ROLE_PATHS.TEXT_SECONDARY, SEMANTIC_ROLE_PATHS.BG_CANVAS),
  text(SEMANTIC_ROLE_PATHS.TEXT_SECONDARY, SEMANTIC_ROLE_PATHS.BG_SURFACE),
  text(SEMANTIC_ROLE_PATHS.TEXT_TERTIARY, SEMANTIC_ROLE_PATHS.BG_CANVAS),
  text(SEMANTIC_ROLE_PATHS.TEXT_LINK, SEMANTIC_ROLE_PATHS.BG_CANVAS),
  // Action (rest + hover)
  text(SEMANTIC_ROLE_PATHS.ACTION_PRIMARY_TEXT, SEMANTIC_ROLE_PATHS.ACTION_PRIMARY),
  text(SEMANTIC_ROLE_PATHS.ACTION_PRIMARY_TEXT, SEMANTIC_ROLE_PATHS.ACTION_PRIMARY_HOVER),
  // Feedback text on feedback bg
  ...FEEDBACK_ROLES.map((role) => text(feedbackTextPath(role), feedbackBgPath(role))),
  // Borders: meaningful boundaries gated; decorative hairlines measured only
  border(SEMANTIC_ROLE_PATHS.BORDER_STRONG, SEMANTIC_ROLE_PATHS.BG_CANVAS),
  border(SEMANTIC_ROLE_PATHS.BORDER_FOCUS, SEMANTIC_ROLE_PATHS.BG_CANVAS),
  decorative(SEMANTIC_ROLE_PATHS.BORDER_DEFAULT, SEMANTIC_ROLE_PATHS.BG_CANVAS),
  decorative(SEMANTIC_ROLE_PATHS.BORDER_DEFAULT, SEMANTIC_ROLE_PATHS.BG_SURFACE),
  decorative(SEMANTIC_ROLE_PATHS.BORDER_SUBTLE, SEMANTIC_ROLE_PATHS.BG_CANVAS),
  // Components — Core 3
  text('component.button.text', 'component.button.bg'),
  text('component.button.text', 'component.button.bg-hover'),
  text('component.card.text', 'component.card.bg'),
  text('component.card.text', 'component.card.bg-hover'),
  text('component.input.text', 'component.input.bg'),
  border('component.card.border', 'component.card.bg'),
  border('component.input.border', 'component.input.bg'),
  border('component.input.focus-border', 'component.input.bg'),
  border('component.input.error-border', 'component.input.bg'),
  // Components — Extended 6 (C1)
  text('component.badge.text', 'component.badge.bg'),
  text('component.alert.text', 'component.alert.bg'),
  text('component.dialog.text', 'component.dialog.bg'),
  text('component.avatar.text', 'component.avatar.bg'),
  text('component.tooltip.text', 'component.tooltip.bg'),
  text('component.table.header-text', 'component.table.header-bg'),
  text('component.table.row-text', 'component.table.row-bg'),
  text('component.table.row-text', 'component.table.row-hover-bg'),
  border('component.alert.icon', 'component.alert.bg'),
  border('component.dialog.border', 'component.dialog.bg'),
  decorative('component.badge.border', 'component.badge.bg'),
  decorative('component.alert.border', 'component.alert.bg'),
  decorative('component.avatar.border', 'component.avatar.bg'),
  decorative('component.table.border', 'component.table.row-bg'),
];
