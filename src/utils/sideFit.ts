import type { RoleDefinition } from "../constants/roles";
import type { TableRow } from "../types/table";
import { getFootStrength } from "./filters";

export type SideFootMode = "same" | "opposite" | "either" | "none";

export type SideFitResult = {
  mode: SideFootMode;
  bestSide: "Lewa" | "Prawa" | "Dowolna" | "-";
  score: number | null;
  profileLabel: string;
};

const ROLE_SIDE_MODE: Record<string, SideFootMode> = {
  // Skrzydłowi
  "wide-forward-with-ball": "opposite",
  "winger-with-ball": "same",
  "inverted-winger-with-ball": "opposite",
  "inside-forward-with-ball": "opposite",
  "wide-playmaker-with-ball": "opposite",

  "winger-without-ball": "same",
  "tracking-winger-without-ball": "same",
  "wide-receiving-winger-without-ball": "same",
  "inverted-receiving-winger-without-ball": "opposite",

  // Boczni pomocnicy
  "wide-midfielder-winger-with-ball": "same",
  "wide-midfielder-inverted-winger-with-ball": "opposite",
  "wide-midfielder-wide-playmaker-with-ball": "opposite",
  "wide-midfielder-with-ball": "same",

  "wide-midfielder-without-ball": "same",
  "tracking-wide-midfielder-without-ball": "same",
  "wide-receiving-midfielder-without-ball": "same",

  // Wahadłowi
  "complete-wing-back-with-ball": "same",
  "wide-playmaker-wing-back-with-ball": "same",
  "wing-back-with-ball": "same",
  "inverted-wing-back-with-ball": "opposite",

  "pressing-wing-back-without-ball": "same",
  "wing-back-without-ball": "same",
  "defensive-wing-back-without-ball": "same",

  // Boczni obrońcy
  "full-back-wide-playmaker-with-ball": "same",
  "full-back-wing-back-with-ball": "same",
  "full-back-inverted-wing-back-with-ball": "opposite",
  "full-back-with-ball": "same",
  "inverted-full-back-with-ball": "opposite",

  "pressing-full-back-without-ball": "same",
  "defensive-full-back-without-ball": "same",
  "full-back-without-ball": "same",

  // Boczni środkowi obrońcy
  "wide-centre-back-with-ball": "same",
  "blocking-wide-centre-back-without-ball": "same",
  "wide-centre-back-without-ball": "same",
  "covering-wide-centre-back-without-ball": "same",
};

function getModeLabel(mode: SideFootMode): string {
  if (mode === "same") {
    return "klasycznie po linii";
  }

  if (mode === "opposite") {
    return "zejście do środka";
  }

  if (mode === "either") {
    return "dowolna strona";
  }

  return "-";
}

export function getRoleSideMode(role: RoleDefinition): SideFootMode {
  return ROLE_SIDE_MODE[role.id] ?? "none";
}

export function getRoleSideFit(
  row: TableRow,
  role: RoleDefinition
): SideFitResult {
  const mode = getRoleSideMode(role);

  if (mode === "none") {
    return {
      mode,
      bestSide: "-",
      score: null,
      profileLabel: "-",
    };
  }

  const leftFoot = getFootStrength(row["Lewa noga"] ?? "");
  const rightFoot = getFootStrength(row["Prawa noga"] ?? "");

  if (leftFoot === 0 && rightFoot === 0) {
    return {
      mode,
      bestSide: "-",
      score: null,
      profileLabel: getModeLabel(mode),
    };
  }

  if (mode === "either") {
    return {
      mode,
      bestSide: "Dowolna",
      score: (Math.max(leftFoot, rightFoot) / 20) * 100,
      profileLabel: getModeLabel(mode),
    };
  }

  const leftSideScore = mode === "same" ? leftFoot : rightFoot;
  const rightSideScore = mode === "same" ? rightFoot : leftFoot;

  if (leftSideScore === rightSideScore) {
    return {
      mode,
      bestSide: "Dowolna",
      score: (leftSideScore / 20) * 100,
      profileLabel: getModeLabel(mode),
    };
  }

  if (leftSideScore > rightSideScore) {
    return {
      mode,
      bestSide: "Lewa",
      score: (leftSideScore / 20) * 100,
      profileLabel: getModeLabel(mode),
    };
  }

  return {
    mode,
    bestSide: "Prawa",
    score: (rightSideScore / 20) * 100,
    profileLabel: getModeLabel(mode),
  };
}

export function formatSideScore(result: SideFitResult | null | undefined): string {
  if (!result || result.score === null) {
    return "-";
  }

  return result.score.toFixed(1);
}

export function formatRoleSide(result: SideFitResult | null | undefined): string {
  return result?.bestSide ?? "-";
}

export function formatSideProfile(result: SideFitResult | null | undefined): string {
  return result?.profileLabel ?? "-";
}