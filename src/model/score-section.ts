import {
  PairMPTraveller,
  IndividualMPTraveller,
  PairIMPTraveller,
  IndividualIMPTraveller,
  PairTravellerLine,
  IndividualTravellerLine,
} from "@/model/traveller";

export interface AggregateResult {
  participantId: string;
  totalNs: number;
  totalEw: number;
}

export function getParticipantIds<TScore extends object>(
  line: PairTravellerLine<TScore> | IndividualTravellerLine<TScore>,
): string[] {
  if ("nsPairId" in line && "ewPairId" in line) {
    return [line.nsPairId, line.ewPairId];
  } else {
    const individualLine = line as IndividualTravellerLine<TScore>;
    return [
      individualLine.nPlayerId,
      individualLine.sPlayerId,
      individualLine.ePlayerId,
      individualLine.wPlayerId,
    ];
  }
}

/**
 * Aggregate already scored Matchpoint travellers
 */
export function aggregateMatchpointTravellers<
  TTraveller extends PairMPTraveller | IndividualMPTraveller,
>(travellers: TTraveller[]): AggregateResult[] {
  const resultsMap = new Map<string, AggregateResult>();

  for (const traveller of travellers) {
    for (const line of traveller.lines) {
      const participantIds = getParticipantIds(line);

      for (const participantId of participantIds) {
        if (!participantId) continue;

        let agg = resultsMap.get(participantId);
        if (!agg) {
          agg = { participantId, totalNs: 0, totalEw: 0 };
          resultsMap.set(participantId, agg);
        }

        if ("nsMatchPoints" in line && line.nsMatchPoints !== undefined) {
          agg.totalNs += line.nsMatchPoints;
          agg.totalEw += line.ewMatchPoints!;
        }
      }
    }
  }

  return Array.from(resultsMap.values());
}

/**
 * Aggregate already scored IMP travellers (cross-IMP or Butler)
 */
export function aggregateImpTravellers<
  TTraveller extends PairIMPTraveller | IndividualIMPTraveller,
>(travellers: TTraveller[]): AggregateResult[] {
  const resultsMap = new Map<string, AggregateResult>();

  for (const traveller of travellers) {
    for (const line of traveller.lines) {
      const participantIds = getParticipantIds(line);

      for (const participantId of participantIds) {
        if (!participantId) continue;

        let agg = resultsMap.get(participantId);
        if (!agg) {
          agg = { participantId, totalNs: 0, totalEw: 0 };
          resultsMap.set(participantId, agg);
        }

        if ("nsImps" in line && line.nsImps !== undefined) {
          agg.totalNs += line.nsImps;
          agg.totalEw += line.ewImps!;
        }
      }
    }
  }

  return Array.from(resultsMap.values());
}
