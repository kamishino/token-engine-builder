/**
 * extract — scan an existing project (CSS/SCSS/JSON/JS/TS/HTML) for color,
 * font, and radius signals and write a candidate style-spec.json.
 */
export * from '../../../shared/extract.js';
import { runExtract } from '../../../shared/extract.js';
import { isMainModule } from '../../../shared/paths.js';

if (isMainModule(import.meta.url, 'extract.mjs', 'extract.ts')) {
  runExtract().then((code) => process.exit(code));
}
