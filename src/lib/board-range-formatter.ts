export function formatBoardRange(boards: number[]): string {
  if (boards.length === 0) return "";
  if (boards.length === 1) return String(boards[0]);

  const sorted = [...boards].sort((a, b) => a - b);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  // Check if boards are consecutive
  const isConsecutive = last - first === sorted.length - 1;

  if (isConsecutive) {
    return `${first} to ${last}`;
  }

  return sorted.join(", ");
}
