/** UI-library profile ids and their output files: the only profile list. */
export type UiProfileId =
  'shadcn' | 'bootstrap' | 'primevue' | 'antd' | 'mui' | 'chakra' | 'radix' | 'fluent';

export const UI_PROFILE_IDS: readonly UiProfileId[] = [
  'shadcn',
  'bootstrap',
  'primevue',
  'antd',
  'mui',
  'chakra',
  'radix',
  'fluent',
];

const PROFILE_FILE_NAMES: Record<UiProfileId, string> = {
  shadcn: 'shadcn.css',
  bootstrap: 'bootstrap.css',
  primevue: 'primevue.css',
  antd: 'antd-theme.json',
  mui: 'mui-theme.json',
  chakra: 'chakra-theme.json',
  radix: 'radix-theme.css',
  fluent: 'fluent-theme.json',
};

export function profileFileName(profile: UiProfileId): string {
  return PROFILE_FILE_NAMES[profile];
}
