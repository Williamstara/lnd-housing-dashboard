// Shared between server (validation) and client (dropdown) code, so this
// file must stay free of "server-only" imports.
export const FASTIGHETER = [
  "Arkivet (223 59, Lund)",
  "Gamla huset (223 51, Lund)",
  "Nya huset (223 51, Lund)",
  "Finn huset (223 51, Lund)",
] as const;

export type Fastighet = (typeof FASTIGHETER)[number];
