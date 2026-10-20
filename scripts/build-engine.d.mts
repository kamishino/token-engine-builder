export function discoverSkillEntries(skillsDir: string): Record<string, string>;
export function discoverScriptEntries(
  skillsDir: string,
  only?: string[],
): { scriptEntries: Array<{ skill: string; script: string }>; uniqueSkills: string[] };
export function computeBundleHash(scriptsDir: string): string;
export function readBuildStamp(
  distDir: string,
  skill: string,
): { builtAt: number; bundleHash: string } | null;
export function writeBuildStamp(
  distDir: string,
  skill: string,
): { builtAt: number; bundleHash: string };
export function isSkillStale(
  skill: string,
  options: {
    skillsDir: string;
    distDir: string;
    sharedNewest: number;
    newestMtime: (path: string) => number;
  },
): boolean;
