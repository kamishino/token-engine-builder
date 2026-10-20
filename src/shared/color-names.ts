import type { OklchColor } from './types.js';

export type { OklchColor };

/**
 * Vendored meodai/color-names subset (144 colors, 12 per hue sector across light/mid/deep).
 * Maps any OKLCH color to a deterministic, human-recognizable kebab-case name slug.
 */
export interface NamedColor {
  name: string;
  l: number;
  c: number;
  h: number;
}

export const COLOR_NAMES: readonly NamedColor[] = [
  // Sector 0: Red (0° - 15°)
  { name: 'pale-rose', l: 0.85, c: 0.08, h: 5 },
  { name: 'salmon', l: 0.75, c: 0.12, h: 8 },
  { name: 'coral', l: 0.65, c: 0.16, h: 12 },
  { name: 'tomato', l: 0.6, c: 0.18, h: 14 },
  { name: 'scarlet', l: 0.55, c: 0.22, h: 10 },
  { name: 'crimson', l: 0.5, c: 0.2, h: 8 },
  { name: 'ruby', l: 0.45, c: 0.18, h: 5 },
  { name: 'firebrick', l: 0.4, c: 0.16, h: 12 },
  { name: 'garnet', l: 0.35, c: 0.14, h: 6 },
  { name: 'burgundy', l: 0.3, c: 0.12, h: 4 },
  { name: 'maroon', l: 0.25, c: 0.09, h: 8 },
  { name: 'mahogany', l: 0.2, c: 0.06, h: 10 },

  // Sector 1: Orange (15° - 45°)
  { name: 'apricot', l: 0.85, c: 0.09, h: 35 },
  { name: 'peach', l: 0.8, c: 0.11, h: 38 },
  { name: 'cantaloupe', l: 0.75, c: 0.13, h: 40 },
  { name: 'tangerine', l: 0.7, c: 0.17, h: 32 },
  { name: 'persimmon', l: 0.65, c: 0.18, h: 28 },
  { name: 'carrot', l: 0.6, c: 0.19, h: 34 },
  { name: 'cinnamon', l: 0.55, c: 0.14, h: 25 },
  { name: 'amber', l: 0.55, c: 0.16, h: 42 },
  { name: 'copper', l: 0.5, c: 0.13, h: 30 },
  { name: 'rust', l: 0.45, c: 0.12, h: 26 },
  { name: 'terracotta', l: 0.4, c: 0.11, h: 24 },
  { name: 'burnt-orange', l: 0.32, c: 0.09, h: 28 },

  // Sector 2: Yellow / Ochre (45° - 70°)
  { name: 'buttercream', l: 0.9, c: 0.08, h: 65 },
  { name: 'daisy', l: 0.85, c: 0.14, h: 60 },
  { name: 'sunflower', l: 0.8, c: 0.16, h: 58 },
  { name: 'canary', l: 0.78, c: 0.18, h: 62 },
  { name: 'gold', l: 0.72, c: 0.15, h: 55 },
  { name: 'saffron', l: 0.68, c: 0.15, h: 50 },
  { name: 'mustard', l: 0.64, c: 0.13, h: 58 },
  { name: 'ochre', l: 0.58, c: 0.11, h: 52 },
  { name: 'dune', l: 0.52, c: 0.07, h: 60 },
  { name: 'dijon', l: 0.48, c: 0.09, h: 56 },
  { name: 'raw-amber', l: 0.4, c: 0.07, h: 48 },
  { name: 'bronze', l: 0.32, c: 0.06, h: 50 },

  // Sector 3: Chartreuse / Lime (70° - 100°)
  { name: 'pale-lime', l: 0.9, c: 0.09, h: 85 },
  { name: 'celery', l: 0.85, c: 0.11, h: 88 },
  { name: 'chartreuse', l: 0.8, c: 0.17, h: 80 },
  { name: 'key-lime', l: 0.75, c: 0.18, h: 85 },
  { name: 'pear', l: 0.72, c: 0.14, h: 90 },
  { name: 'citron', l: 0.68, c: 0.15, h: 78 },
  { name: 'wasabi', l: 0.62, c: 0.12, h: 92 },
  { name: 'moss', l: 0.56, c: 0.09, h: 95 },
  { name: 'olive', l: 0.5, c: 0.09, h: 82 },
  { name: 'herb', l: 0.44, c: 0.07, h: 90 },
  { name: 'sage-gold', l: 0.38, c: 0.06, h: 85 },
  { name: 'army-green', l: 0.3, c: 0.05, h: 80 },

  // Sector 4: Green (100° - 140°)
  { name: 'mint-cream', l: 0.9, c: 0.07, h: 125 },
  { name: 'honeydew', l: 0.85, c: 0.09, h: 128 },
  { name: 'pistachio', l: 0.8, c: 0.12, h: 120 },
  { name: 'spring-green', l: 0.75, c: 0.16, h: 130 },
  { name: 'apple-green', l: 0.7, c: 0.18, h: 122 },
  { name: 'basil', l: 0.62, c: 0.13, h: 126 },
  { name: 'fern', l: 0.58, c: 0.14, h: 132 },
  { name: 'clover', l: 0.52, c: 0.13, h: 128 },
  { name: 'emerald', l: 0.48, c: 0.15, h: 135 },
  { name: 'forest', l: 0.4, c: 0.11, h: 130 },
  { name: 'pine', l: 0.32, c: 0.09, h: 125 },
  { name: 'evergreen', l: 0.24, c: 0.07, h: 132 },

  // Sector 5: Teal-Green (140° - 170°)
  { name: 'seafoam', l: 0.88, c: 0.08, h: 155 },
  { name: 'pale-teal', l: 0.82, c: 0.09, h: 158 },
  { name: 'spearmint', l: 0.76, c: 0.13, h: 150 },
  { name: 'eucalyptus', l: 0.7, c: 0.11, h: 162 },
  { name: 'jade', l: 0.62, c: 0.12, h: 152 },
  { name: 'malachite', l: 0.56, c: 0.13, h: 148 },
  { name: 'viridian', l: 0.5, c: 0.11, h: 155 },
  { name: 'sea-green', l: 0.45, c: 0.1, h: 160 },
  { name: 'jungle', l: 0.38, c: 0.08, h: 150 },
  { name: 'spruce', l: 0.32, c: 0.07, h: 158 },
  { name: 'deep-teal', l: 0.26, c: 0.06, h: 162 },
  { name: 'dark-emerald', l: 0.2, c: 0.05, h: 152 },

  // Sector 6: Cyan (170° - 200°)
  { name: 'glacier', l: 0.9, c: 0.06, h: 185 },
  { name: 'ice-blue', l: 0.85, c: 0.08, h: 192 },
  { name: 'aqua', l: 0.78, c: 0.12, h: 180 },
  { name: 'tiffany', l: 0.74, c: 0.11, h: 175 },
  { name: 'turquoise', l: 0.68, c: 0.13, h: 182 },
  { name: 'lagoon', l: 0.62, c: 0.12, h: 188 },
  { name: 'caribbean', l: 0.56, c: 0.12, h: 195 },
  { name: 'ocean', l: 0.5, c: 0.1, h: 190 },
  { name: 'deep-sea', l: 0.42, c: 0.09, h: 185 },
  { name: 'petrol', l: 0.35, c: 0.07, h: 192 },
  { name: 'abyss', l: 0.28, c: 0.06, h: 188 },
  { name: 'deep-cyan', l: 0.2, c: 0.05, h: 182 },

  // Sector 7: Blue (200° - 230°)
  { name: 'powder-blue', l: 0.88, c: 0.06, h: 215 },
  { name: 'baby-blue', l: 0.82, c: 0.09, h: 220 },
  { name: 'sky', l: 0.76, c: 0.12, h: 215 },
  { name: 'carolina', l: 0.7, c: 0.13, h: 225 },
  { name: 'cerulean', l: 0.62, c: 0.14, h: 218 },
  { name: 'azure', l: 0.56, c: 0.16, h: 224 },
  { name: 'cobalt', l: 0.48, c: 0.18, h: 228 },
  { name: 'steel-blue', l: 0.44, c: 0.1, h: 216 },
  { name: 'sapphire', l: 0.38, c: 0.15, h: 225 },
  { name: 'prussian-blue', l: 0.32, c: 0.11, h: 220 },
  { name: 'midnight-blue', l: 0.25, c: 0.08, h: 224 },
  { name: 'oxford', l: 0.2, c: 0.06, h: 215 },

  // Sector 8: Indigo (230° - 260°)
  { name: 'periwinkle', l: 0.85, c: 0.08, h: 245 },
  { name: 'soft-violet', l: 0.78, c: 0.11, h: 250 },
  { name: 'cornflower', l: 0.7, c: 0.13, h: 242 },
  { name: 'slate-blue', l: 0.62, c: 0.14, h: 252 },
  { name: 'denim', l: 0.54, c: 0.13, h: 240 },
  { name: 'royal-blue', l: 0.48, c: 0.17, h: 255 },
  { name: 'indigo', l: 0.42, c: 0.16, h: 248 },
  { name: 'navy', l: 0.35, c: 0.12, h: 245 },
  { name: 'space-cadet', l: 0.28, c: 0.09, h: 250 },
  { name: 'ink', l: 0.22, c: 0.07, h: 242 },
  { name: 'deep-navy', l: 0.18, c: 0.06, h: 248 },
  { name: 'midnight', l: 0.14, c: 0.05, h: 252 },

  // Sector 9: Violet (260° - 290°)
  { name: 'lavender', l: 0.88, c: 0.07, h: 275 },
  { name: 'thistle', l: 0.82, c: 0.09, h: 280 },
  { name: 'lilac', l: 0.74, c: 0.12, h: 272 },
  { name: 'wisteria', l: 0.68, c: 0.13, h: 282 },
  { name: 'amethyst', l: 0.6, c: 0.16, h: 278 },
  { name: 'iris', l: 0.54, c: 0.15, h: 268 },
  { name: 'violet', l: 0.46, c: 0.18, h: 280 },
  { name: 'grape', l: 0.4, c: 0.14, h: 285 },
  { name: 'eggplant', l: 0.32, c: 0.11, h: 275 },
  { name: 'plum', l: 0.28, c: 0.09, h: 282 },
  { name: 'blackcurrant', l: 0.22, c: 0.07, h: 272 },
  { name: 'deep-violet', l: 0.16, c: 0.05, h: 280 },

  // Sector 10: Magenta (290° - 320°)
  { name: 'cotton-candy', l: 0.88, c: 0.08, h: 305 },
  { name: 'blossom', l: 0.82, c: 0.11, h: 310 },
  { name: 'bubblegum', l: 0.75, c: 0.15, h: 315 },
  { name: 'orchid', l: 0.68, c: 0.16, h: 300 },
  { name: 'fuchsia', l: 0.6, c: 0.22, h: 312 },
  { name: 'magenta', l: 0.52, c: 0.24, h: 308 },
  { name: 'mulberry', l: 0.46, c: 0.17, h: 318 },
  { name: 'raspberry', l: 0.4, c: 0.16, h: 312 },
  { name: 'boysenberry', l: 0.34, c: 0.12, h: 305 },
  { name: 'wine', l: 0.28, c: 0.09, h: 315 },
  { name: 'blackberry', l: 0.22, c: 0.07, h: 308 },
  { name: 'marcellus', l: 0.16, c: 0.05, h: 312 },

  // Sector 11: Pink / Rose (320° - 360°)
  { name: 'ballet-slipper', l: 0.9, c: 0.06, h: 345 },
  { name: 'blush', l: 0.85, c: 0.09, h: 350 },
  { name: 'rosewater', l: 0.8, c: 0.12, h: 340 },
  { name: 'carnation', l: 0.74, c: 0.15, h: 348 },
  { name: 'flamingo', l: 0.68, c: 0.17, h: 355 },
  { name: 'rose', l: 0.6, c: 0.18, h: 342 },
  { name: 'watermelon', l: 0.55, c: 0.19, h: 352 },
  { name: 'cerise', l: 0.48, c: 0.18, h: 340 },
  { name: 'brick-rose', l: 0.42, c: 0.13, h: 348 },
  { name: 'cabernet', l: 0.35, c: 0.11, h: 338 },
  { name: 'bordeaux', l: 0.28, c: 0.08, h: 345 },
  { name: 'rosewood', l: 0.2, c: 0.06, h: 340 },
];

/**
 * Calculates Euclidean distance in OKLCH cylindrical space:
 * ΔL² + ΔC² + (2 * C1 * C2 * (1 - cos(ΔH)))
 */
function oklchDistanceSq(c1: { l: number; c: number; h: number }, c2: NamedColor): number {
  const dL = c1.l - c2.l;
  const dC = c1.c - c2.c;
  const rad = ((c1.h - c2.h) * Math.PI) / 180;
  const dH = 2 * c1.c * c2.c * (1 - Math.cos(rad));
  // Weight lightness and chroma slightly higher to favor character match
  return dL * dL * 2 + dC * dC * 1.5 + dH;
}

/**
 * Finds the nearest vendored color name for an OKLCH color.
 */
export function nearestColorName(color: { l: number; c: number; h: number }): string {
  let closest: NamedColor = COLOR_NAMES[0] as NamedColor;
  let minDistance = Number.POSITIVE_INFINITY;

  for (const entry of COLOR_NAMES) {
    const dist = oklchDistanceSq(color, entry);
    if (dist < minDistance) {
      minDistance = dist;
      closest = entry;
    }
  }

  return closest.name;
}
