export interface AuditPair {
  fg: string;
  bg: string;
  kind: 'text' | 'border' | 'decorative';
}

export const SEMANTIC_ROLE_PATHS = {
  BG_CANVAS: 'semantic.color.bg.canvas',
  BG_SURFACE: 'semantic.color.bg.surface',
  BG_RAISED: 'semantic.color.bg.raised',
  BG_SUBTLE: 'semantic.color.bg.subtle',
  TEXT_PRIMARY: 'semantic.color.text.primary',
  TEXT_SECONDARY: 'semantic.color.text.secondary',
  TEXT_TERTIARY: 'semantic.color.text.tertiary',
  TEXT_DISABLED: 'semantic.color.text.disabled',
  TEXT_LINK: 'semantic.color.text.link',
  ACTION_PRIMARY: 'semantic.color.action.primary',
  ACTION_PRIMARY_TEXT: 'semantic.color.action.primary-text',
  ACTION_PRIMARY_HOVER: 'semantic.color.action.primary-hover',
  ACTION_PRIMARY_ACTIVE: 'semantic.color.action.primary-active',
  ACTION_PRIMARY_SUBTLE: 'semantic.color.action.primary-subtle',
  BORDER_DEFAULT: 'semantic.color.border.default',
  BORDER_SUBTLE: 'semantic.color.border.subtle',
  BORDER_STRONG: 'semantic.color.border.strong',
  BORDER_FOCUS: 'semantic.color.border.focus',
} as const;

const text = (fg: string, bg: string): AuditPair => ({ fg, bg, kind: 'text' });
const border = (fg: string, bg: string): AuditPair => ({ fg, bg, kind: 'border' });
const decorative = (fg: string, bg: string): AuditPair => ({ fg, bg, kind: 'decorative' });

/** Canonical 42 audit contrast pairs across semantic and component roles. */
export const AUDIT_PAIRS: readonly AuditPair[] = [
  // Semantic text on surfaces
  text('semantic.color.text.primary', 'semantic.color.bg.canvas'),
  text('semantic.color.text.primary', 'semantic.color.bg.surface'),
  text('semantic.color.text.primary', 'semantic.color.bg.raised'),
  text('semantic.color.text.secondary', 'semantic.color.bg.canvas'),
  text('semantic.color.text.secondary', 'semantic.color.bg.surface'),
  text('semantic.color.text.tertiary', 'semantic.color.bg.canvas'),
  text('semantic.color.text.link', 'semantic.color.bg.canvas'),
  // Action (rest + hover)
  text('semantic.color.action.primary-text', 'semantic.color.action.primary'),
  text('semantic.color.action.primary-text', 'semantic.color.action.primary-hover'),
  // Feedback text on feedback bg
  ...(['success', 'warning', 'danger', 'info', 'help'] as const).map((role) =>
    text(`semantic.color.feedback.${role}.text`, `semantic.color.feedback.${role}.bg`),
  ),
  // Borders: meaningful boundaries gated; decorative hairlines measured only
  border('semantic.color.border.strong', 'semantic.color.bg.canvas'),
  border('semantic.color.border.focus', 'semantic.color.bg.canvas'),
  decorative('semantic.color.border.default', 'semantic.color.bg.canvas'),
  decorative('semantic.color.border.default', 'semantic.color.bg.surface'),
  decorative('semantic.color.border.subtle', 'semantic.color.bg.canvas'),
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
