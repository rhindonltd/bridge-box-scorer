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
export function generateMitchell(spec: MitchellMovementSpec): Tables<"PAIR"> {
  if (spec.skip) {
    return generateSkipMitchell({ ...spec, skip: true });
  }

  if (spec.shareAndRelay) {
    return generateShareAndRelayMitchell({ ...spec, shareAndRelay: true });
  }

  if (spec.blackpool) {
    return generateBlackpool({ ...spec, blackpool: true });
  }

  if (spec.hesitation) {
    return generateHesitationMitchell({ ...spec, hesitation: true });
  }

  if (spec.doubleHesitation) {
    return generateDoubleHesitationMitchell({
      ...spec,
      doubleHesitation: true,
    });
  }

  if (spec.web) {
    return generateWebMitchell({ ...spec, web: true });
  }

  return generateStandardMitchell(spec);
}
