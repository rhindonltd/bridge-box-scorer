import { Deal } from "@/model/common";
import { dealerFor } from "@/model/deal";
import { HandView } from "./HandView";

/**
 * A board's deal as a hand diagram.
 *
 * On wider screens the four hands are laid out in the traditional compass
 * arrangement (North top, West/East middle, South bottom). On narrow screens
 * they stack vertically (N, E, S, W) so each hand stays readable. The dealer,
 * derived from the board number, is marked on the relevant hand.
 *
 * Renders nothing when there is no deal for the board.
 */
export function DealDisplay({
  boardNumber,
  deal,
}: {
  boardNumber: number;
  deal: Deal | null;
}) {
  if (!deal) return null;

  const dealer = dealerFor(boardNumber);

  return (
    <div
      className="rounded-lg border bg-white p-3 shadow-sm"
      data-testid="deal-display"
    >
      {/* Stacked layout (default / narrow screens). */}
      <div className="flex flex-col gap-3 sm:hidden">
        <HandView direction="N" hand={deal.N} isDealer={dealer === "N"} />
        <HandView direction="E" hand={deal.E} isDealer={dealer === "E"} />
        <HandView direction="S" hand={deal.S} isDealer={dealer === "S"} />
        <HandView direction="W" hand={deal.W} isDealer={dealer === "W"} />
      </div>

      {/* Compass layout (small breakpoint and up). */}
      <div className="hidden sm:grid grid-cols-3 gap-2 items-center justify-items-center">
        <div />
        <HandView direction="N" hand={deal.N} isDealer={dealer === "N"} />
        <div />

        <HandView direction="W" hand={deal.W} isDealer={dealer === "W"} />
        <div className="text-xs font-medium text-gray-400">
          Board {boardNumber}
        </div>
        <HandView direction="E" hand={deal.E} isDealer={dealer === "E"} />

        <div />
        <HandView direction="S" hand={deal.S} isDealer={dealer === "S"} />
        <div />
      </div>
    </div>
  );
}
