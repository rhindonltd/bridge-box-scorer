import { Tables } from "@/model/movement";
import { MitchellMovementSpec } from "./mitchell-utils";
import { generateSkipMitchell } from "./skip-mitchell";
import { generateShareAndRelayMitchell } from "./share-and-relay-mitchell";
import { generateStandardMitchell } from "./standard-mitchell";

export function generateMitchell(
    spec: MitchellMovementSpec & {
        skip?: boolean;
        shareAndRelay?: boolean;
    },
): Tables<"PAIR"> {
    if (spec.skip) {
        return generateSkipMitchell({
            ...spec,
            skip: true,
        });
    }

    if (spec.shareAndRelay) {
        return generateShareAndRelayMitchell({
            ...spec,
            shareAndRelay: true,
        });
    }

    return generateStandardMitchell(spec);
}
