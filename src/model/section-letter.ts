/**
 * The next unused section letter (A, B, C, ...). Falls back to a numbered
 * suffix in the extremely unlikely event all 26 letters are taken.
 */
export function nextSectionLetter(existing: string[]): string {
  const used = new Set(existing);
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    if (!used.has(letter)) return letter;
  }
  return `Z${existing.length}`;
}
