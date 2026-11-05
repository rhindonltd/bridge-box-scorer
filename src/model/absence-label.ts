/**
 * The label for the director's combined "Late Arrivals / Withdrawals /
 * Substitutions" screen and its manage-menu item (design §11): only the kinds
 * actually present, in a fixed order, joined as "A", "A & B" or "A, B & C".
 * Null when there is nothing to show (the menu item is then hidden).
 */
export function absencesScreenLabel(present: {
  lateArrivals: boolean;
  withdrawals: boolean;
  substitutions: boolean;
}): string | null {
  const parts = [
    present.lateArrivals && "Late Arrivals",
    present.withdrawals && "Withdrawals",
    present.substitutions && "Substitutions",
  ].filter((p): p is string => Boolean(p));

  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} & ${parts[parts.length - 1]}`;
}
