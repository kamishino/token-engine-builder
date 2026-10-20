import assert from 'node:assert/strict';
import test from 'node:test';
import { profileFileName, UI_PROFILE_IDS } from '../src/shared/ui-profiles.ts';

test('UI_PROFILE_IDS lists all 8 supported UI profiles', () => {
  assert.equal(UI_PROFILE_IDS.length, 8);
  assert.deepEqual(UI_PROFILE_IDS, [
    'shadcn',
    'bootstrap',
    'primevue',
    'antd',
    'mui',
    'chakra',
    'radix',
    'fluent',
  ]);
});

test('profileFileName maps JSON vs CSS destinations accurately', () => {
  assert.equal(profileFileName('antd'), 'antd-theme.json');
  assert.equal(profileFileName('mui'), 'mui-theme.json');
  assert.equal(profileFileName('chakra'), 'chakra-theme.json');
  assert.equal(profileFileName('fluent'), 'fluent-theme.json');
  assert.equal(profileFileName('radix'), 'radix-theme.css');
  assert.equal(profileFileName('shadcn'), 'shadcn.css');
  assert.equal(profileFileName('bootstrap'), 'bootstrap.css');
  assert.equal(profileFileName('primevue'), 'primevue.css');
});
