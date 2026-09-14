import { Tables } from "@/model/movement";
import { MitchellMovementSpec } from "./mitchell-utils";
import { generateSkipMitchell } from "./skip-mitchell";
import { generateShareAndRelayMitchell } from "./share-and-relay-mitchell";
import { generateStandardMitchell } from "./standard-mitchell";
import { generateBlackpool } from "./blackpool";
import { generateHesitationMitchell } from "./hesitation-mitchell";
import { generateDoubleHesitationMitchell } from "./double-hesitation-mitchell";
import { generateWebMitchell } from "./web-mitchell";

/**
 * Single entry point for generating any Mitchell-family pair movement.
 *
 * The spec carries optional discriminant flags (skip, shareAndRelay, blackpool,
 * hesitation, doubleHesitation, web); at most one should be set. When none is
 * set a Standard Mitchell is produced.
 *
 * NOTE: the movement-selection layer is not yet updated to offer or persist the
 * newer movements (Blackpool and the Hesitation family). `rehydrateSelectedMovement`
 * still regenerates a Standard Mitchell for any persisted MITCHELL selection, and
 * `selectedMovementSchema` / the movement chooser UI do not yet expose these
 * flags. So today these generators are reachable only through this function, not
 * through the game start flow. Wiring selection / rehydration / UI is a
 * deliberate follow-up.
 */
/**
 * The variant discriminant flags, in the order they are checked. The first flag
 * present on the spec selects its generator; when none is present a Standard
 * Mitchell is produced. Adding a variant is one entry here (plus its generator)
 * rather than another arm in an if-chain.
 */
type VariantFlag =
  | "skip"
  | "shareAndRelay"
  | "blackpool"
  | "hesitation"
  | "doubleHesitation"
  | "web";

const VARIANT_GENERATORS: {
  flag: VariantFlag;
  generate: (spec: MitchellMovementSpec) => Tables<"PAIR">;
}[] = [
  { flag: "skip", generate: (s) => generateSkipMitchell({ ...s, skip: true }) },
  {
    flag: "shareAndRelay",
    generate: (s) => generateShareAndRelayMitchell({ ...s, shareAndRelay: true }),
  },
  {
    flag: "blackpool",
    generate: (s) => generateBlackpool({ ...s, blackpool: true }),
  },
  {
    flag: "hesitation",
    generate: (s) => generateHesitationMitchell({ ...s, hesitation: true }),
  },
  {
    flag: "doubleHesitation",
    generate: (s) =>
      generateDoubleHesitationMitchell({ ...s, doubleHesitation: true }),
  },
  { flag: "web", generate: (s) => generateWebMitchell({ ...s, web: true }) },
];

export function generateMitchell(spec: MitchellMovementSpec): Tables<"PAIR"> {
  const variant = VARIANT_GENERATORS.find(({ flag }) => spec[flag]);
  return variant ? variant.generate(spec) : generateStandardMitchell(spec);
}
