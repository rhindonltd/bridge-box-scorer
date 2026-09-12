/**
 * Generate a short, human-readable code for device handoff (director share
 * codes, seat transfers). 6 uppercase alphanumeric characters, excluding
 * ambiguous glyphs (0/O, 1/I/L) so codes are easy to read aloud and type.
 */
export function generateShortCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** How long a handoff code stays valid, in milliseconds. */
export const CODE_TTL_MS = 5 * 60 * 1000;
