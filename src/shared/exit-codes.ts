/**
 * Standard exit code taxonomy for token-engine CLI and cores:
 * - OK (0): Success.
 * - GENERIC (1): Generic runtime or unclassified failure.
 * - USAGE (2): Unknown command, missing argument, or invalid CLI flag.
 * - REFUSAL (3): Guard refusal (destination exists, tampered files, unsafe path, missing audit stamp).
 * - AUDIT (4): Contrast floor or unresolved alias audit gatekeeper failure.
 * - VALIDATION (5): StyleSpec schema validation, syntax, or JSON parse error.
 */
export const EXIT = {
  OK: 0,
  GENERIC: 1,
  USAGE: 2,
  REFUSAL: 3,
  AUDIT: 4,
  VALIDATION: 5,
} as const;

export type ExitCode = (typeof EXIT)[keyof typeof EXIT];
