import type { TableRow } from "./table";
import type { RoleScoreResult } from "../utils/roleScoring";

export type TacticalView = "with-ball" | "without-ball";

export type FormationLine =
  | "Atak"
  | "Pomoc"
  | "Obrona"
  | "attack"
  | "attacking-midfield"
  | "midfield"
  | "defensive-midfield"
  | "defense";

export type SlotSide = "left" | "center" | "right";

export type FootRequirement =
  | "any"
  | "left"
  | "right"
  | "left-decent"
  | "left-strong"
  | "left-high"
  | "left-dominant"
  | "right-decent"
  | "right-strong"
  | "right-high"
  | "right-dominant"
  | "both-decent"
  | "both-strong";

export type CandidateKind = "natural" | "close" | "conversion";

export type PitchPosition = {
  x: number;
  y: number;
};

export type FormationSlot = {
  id: string;
  label: string;
  line: FormationLine;
  positionGroup: string;
  phase: TacticalView;
  roleId: string;
  excludedRoleId?: string;
  footRequirement: FootRequirement;

  /** Opcjonalne pola legacy po prototypie dwóch faz. Zostają dla kompatybilności. */
  side?: SlotSide;
  withBallRoleId?: string;
  withoutBallRoleId?: string;
  withoutBallLabel?: string;
  withoutBallLine?: FormationLine;
  withoutBallPositionGroup?: string;
  withoutBallFootRequirement?: FootRequirement;
};

export type FormationPreset = {
  id: string;
  name: string;
  slots: FormationSlot[];
};
export type SlotCandidateScoreBreakdown = {
  roleScore: number;
  formBoost: number;
  overallAbilityBoost: number;
  reliabilityBoost: number;
  positionPenalty: number;
  finalScore: number;
};

export type SlotCandidateRankingBreakdown = {
  baseScore: number;
  naturalSelectionAdjustment: number;
  callUpPositionAdjustment: number;
  tacticalTransitionAdjustment: number;
  selectionScore: number;
};
export type SlotCandidate = {
  row: TableRow;
  key: string;
  name: string;
  club: string;
  position: string;

  finalScore: number;
  phaseScore?: number;
  roleScore: number;
  roleResult: RoleScoreResult;

  /**
   * OU / Obecne umiejętności z importu FM, zakres zwykle 0–200.
   */
  overallAbility?: number | null;
  campaignCallUps?: number;
campaignPositionCallUps?: number;
campaignMatches?: number;
campaignMinutes?: number;
campaignAvgRating?: number | null;
  positionPenalty?: number;
  positionScore?: number;
  mobilityScore?: number;
  sideScore?: number;

  candidateKind: CandidateKind;
  candidateKindLabel: string;
  footLabel: string;

  withBallScore?: number;
  withoutBallScore?: number;
  withBallRoleName?: string;
  withoutBallRoleName?: string;

  infoStatus?: string;
  isInjured?: boolean;
  availabilityLabel?: string;
    availabilityTone?: string;

    scoreBreakdown?: SlotCandidateScoreBreakdown;
rankingBreakdown?: SlotCandidateRankingBreakdown;
selectionScore?: number;
isUsedInOtherSlot?: boolean;
usedInOtherSlotId?: string;
usedInOtherSlotLabel?: string;
potentialRankInSlot?: number;
};

export type Lineup = Record<string, SlotCandidate | null>;

export type TacticalLineup = {
  formationId: string;
  slots: FormationSlot[];
  lineup: Lineup;
};

export type SquadPlan = {
  withBall: TacticalLineup;
  withoutBall: TacticalLineup;
};
export type SquadBuilderScoreMode =
  | "role-score"
  | "overall-ability"
  | "campaign-callups";
  export type PlayerMark = "selected" | "rejected";

export type SquadBuilderProps = {
  rows: TableRow[];
  playerMarks?: Record<string, PlayerMark>;
  getPlayerMark?: (row: TableRow) => PlayerMark | null;
  onSelectPlayer?: (row: TableRow, selectionPosition: string) => void;
  onClearCallUps?: () => void;
  selectedPlayersCount?: number;
  selectedPositionByPlayerKey?: Record<string, string>;
};
