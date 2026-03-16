import { Player } from "@/model/player";

export type PairIMPResult = {
  pairId: string;
  players: Player[];
  crossImps: number;
  boardsPlayed: number;
  percentage: number;
};

export type PairMPResult = {
  pairId: string;
  players: Player[];
  totalMP: number;
  maxMP: number;
  boardsPlayed: number;
  percentage: number;
};

export interface TeamMatchLine {
  board: number;
  nsTeamId: string;
  ewTeamId: string;
  nsImps: number;
  ewImps: number;
}

export interface TeamMatchResult {
  nsTeamId: string;
  ewTeamId: string;
  nsTotal: number;
  ewTotal: number;
  boardResults: TeamMatchLine[];
}

export interface OverallTeamResult {
  [teamId: string]: number;
}
