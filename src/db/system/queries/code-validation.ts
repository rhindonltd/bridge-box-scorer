/**
 * The three shared rejections a short code can fail with before any
 * feature-specific handling. Callers surface `error` to the user.
 */
export type CodeRejection = { valid: false; error: string };

/** The minimal short-code row shape the shared checks read. */
interface CodeRecord {
  used: number;
  expiresAt: string;
}

/**
 * Apply the validity checks shared by share codes and seat-transfer codes to a
 * looked-up record: it must exist, be unused, and be unexpired. Returns null
 * when the record is valid, or a {@link CodeRejection} the caller returns
 * as-is. Feature-specific steps (claiming, secret rotation) stay in the caller.
 *
 * The caller does the case-insensitive lookup (each feature reads its own
 * table); this collapses the identical "not found / used / expired" branches
 * the two validators previously duplicated.
 */
export function checkCodeValidity(
  record: CodeRecord | undefined,
): CodeRejection | null {
  if (!record) {
    return { valid: false, error: "Invalid code" };
  }
  if (record.used) {
    return { valid: false, error: "Code has already been used" };
  }
  if (new Date() > new Date(record.expiresAt)) {
    return { valid: false, error: "Code has expired" };
  }
  return null;
}
