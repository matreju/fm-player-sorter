import type { TableRow } from "../types/table";
import type { FormationSlot } from "../types/squadBuilderTypes";

export type SlotSide = "left" | "center" | "right";

export type PositionFamily =
  | "goalkeeper"
  | "center-back"
  | "wide-back"
  | "wing-back"
  | "defensive-midfielder"
  | "central-midfielder"
  | "attacking-midfielder"
  | "wide-midfielder"
  | "winger"
  | "striker";

export type MobilityKind = "natural" | "close" | "conversion" | "blocked";

export type PlayerMobilityProfile = {
  family: PositionFamily;
  side: SlotSide;
};

export type MobilityResult = {
  score: number;
  kind: MobilityKind;
  reason: string;
};

const BLOCKED: MobilityResult = {
  score: -999,
  kind: "blocked",
  reason: "Brak logicznego dopasowania pozycji",
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ł/g, "L")
    .replace(/ł/g, "l")
    .toUpperCase();
}

function uniqueProfiles(
  profiles: PlayerMobilityProfile[]
): PlayerMobilityProfile[] {
  const seen = new Set<string>();

  return profiles.filter((profile) => {
    const key = `${profile.family}:${profile.side}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function sidesFromToken(token: string): SlotSide[] {
  const normalized = normalizeText(token);
  const sides: SlotSide[] = [];

  if (normalized.includes("L")) {
    sides.push("left");
  }

  if (normalized.includes("P")) {
    sides.push("right");
  }

  if (normalized.includes("S") || normalized.includes("C")) {
    sides.push("center");
  }

  if (sides.length === 0) {
    sides.push("center");
  }

  return sides;
}

function addProfilesForPositionCode(
  profiles: PlayerMobilityProfile[],
  code: string,
  sidesToken: string
) {
  const normalizedCode = normalizeText(code);
  const sides = sidesFromToken(sidesToken);

  for (const side of sides) {
    if (normalizedCode === "BR") {
      profiles.push({ family: "goalkeeper", side: "center" });
      continue;
    }

    if (normalizedCode === "N") {
      profiles.push({ family: "striker", side: "center" });
      continue;
    }

    if (normalizedCode === "DP") {
      profiles.push({ family: "defensive-midfielder", side: "center" });
      continue;
    }

    if (normalizedCode === "O") {
      if (side === "center") {
        profiles.push({ family: "center-back", side: "center" });
      } else {
        profiles.push({ family: "wide-back", side });
      }

      continue;
    }

    if (normalizedCode === "WO") {
      if (side !== "center") {
        profiles.push({ family: "wing-back", side });
      }

      continue;
    }

    if (normalizedCode === "P") {
      if (side === "center") {
        profiles.push({ family: "central-midfielder", side: "center" });
      } else {
        profiles.push({ family: "wide-midfielder", side });
      }

      continue;
    }

    if (normalizedCode === "OP") {
      if (side === "center") {
        profiles.push({ family: "attacking-midfielder", side: "center" });
      } else {
        profiles.push({ family: "winger", side });
      }
    }
  }
}

export function getPlayerMobilityProfiles(
  row: TableRow
): PlayerMobilityProfile[] {
  const rawPosition = String(row["Pozycja"] ?? "");
  const position = normalizeText(rawPosition);
  const profiles: PlayerMobilityProfile[] = [];

  const parentheticalMatches = [
    ...position.matchAll(/\b(OP|WO|DP|BR|O|P|N)\s*\(([^)]*)\)/g),
  ];

  for (const match of parentheticalMatches) {
    addProfilesForPositionCode(profiles, match[1], match[2]);
  }

  if (/\bDP\b/.test(position)) {
    profiles.push({ family: "defensive-midfielder", side: "center" });
  }

  if (/\bBR\b/.test(position)) {
    profiles.push({ family: "goalkeeper", side: "center" });
  }

  if (position.includes("STOPER") || position.includes("SRODKOWY OBRONCA")) {
    profiles.push({ family: "center-back", side: "center" });
  }

  if (position.includes("BOCZNY OBRONCA")) {
    profiles.push({ family: "wide-back", side: "left" });
    profiles.push({ family: "wide-back", side: "right" });
  }

  if (position.includes("WAHAD")) {
    profiles.push({ family: "wing-back", side: "left" });
    profiles.push({ family: "wing-back", side: "right" });
  }

  if (position.includes("SRODKOWY POMOCNIK")) {
    profiles.push({ family: "central-midfielder", side: "center" });
  }

  if (position.includes("DEFENSYWNY POMOCNIK")) {
    profiles.push({ family: "defensive-midfielder", side: "center" });
  }

  if (position.includes("OFENSYWNY POMOCNIK")) {
    profiles.push({ family: "attacking-midfielder", side: "center" });
  }

  if (position.includes("SKRZYD")) {
    profiles.push({ family: "winger", side: "left" });
    profiles.push({ family: "winger", side: "right" });
  }

  if (position.includes("NAPAST")) {
    profiles.push({ family: "striker", side: "center" });
  }

  return uniqueProfiles(profiles);
}

export function getSlotSide(slot: FormationSlot): SlotSide {
  if (slot.side) {
    return slot.side;
  }

  const label = normalizeText(slot.label);

  if (label.startsWith("L")) {
    return "left";
  }

  if (label.startsWith("P")) {
    return "right";
  }

  return "center";
}

export function getSlotFamily(slot: FormationSlot): PositionFamily {
  if (slot.positionGroup === "Napastnik") {
    return "striker";
  }

  if (slot.positionGroup === "Skrzydłowy") {
    return "winger";
  }

  if (slot.positionGroup === "Boczny pomocnik") {
    return "wide-midfielder";
  }

  if (slot.positionGroup === "Wahadłowy") {
    return "wing-back";
  }

  if (slot.positionGroup === "Boczny obrońca") {
    return "wide-back";
  }

  if (slot.positionGroup === "Środkowy obrońca") {
    return "center-back";
  }

  if (slot.positionGroup === "Defensywny pomocnik") {
    return "defensive-midfielder";
  }

  if (slot.positionGroup === "Środkowy pomocnik") {
    return "central-midfielder";
  }

  if (slot.positionGroup === "Ofensywny pomocnik") {
    return "attacking-midfielder";
  }

  return "central-midfielder";
}

function blocksOppositeWideSide(
  profile: PlayerMobilityProfile,
  slot: FormationSlot
): boolean {
  const slotSide = getSlotSide(slot);
  const slotFamily = getSlotFamily(slot);

  if (slotSide === "center") {
    return false;
  }

  if (profile.side === "center") {
    return false;
  }

  if (profile.side === slotSide) {
    return false;
  }

  return (
    slotFamily === "wide-back" ||
    slotFamily === "wing-back" ||
    slotFamily === "wide-midfielder" ||
    slotFamily === "winger"
  );
}

function result(
  score: number,
  kind: Exclude<MobilityKind, "blocked">,
  reason: string
): MobilityResult {
  return { score, kind, reason };
}

function scoreWideBack(profile: PlayerMobilityProfile, slot: FormationSlot) {
  const slotFamily = getSlotFamily(slot);
  const slotSide = getSlotSide(slot);

  if (blocksOppositeWideSide(profile, slot)) {
    return BLOCKED;
  }

  if (slotFamily === "wide-back") {
    return result(100, "natural", "Boczny obrońca na swojej pozycji");
  }

  if (slotFamily === "wing-back") {
    return result(92, "natural", "Boczny obrońca jako wahadłowy");
  }

  if (slotFamily === "wide-midfielder") {
    return result(78, "close", "Boczny obrońca wyżej jako boczny pomocnik");
  }

  if (slotFamily === "winger") {
    return result(52, "conversion", "Boczny obrońca bardzo wysoko jako skrzydłowy");
  }

  if (
    slotFamily === "center-back" &&
    slotSide !== "center" &&
    profile.side === slotSide
  ) {
    return result(74, "close", "Boczny obrońca jako boczny ŚO w trójce");
  }

  return BLOCKED;
}

function scoreWingBack(profile: PlayerMobilityProfile, slot: FormationSlot) {
  const slotFamily = getSlotFamily(slot);
  const slotSide = getSlotSide(slot);

  if (blocksOppositeWideSide(profile, slot)) {
    return BLOCKED;
  }

  if (slotFamily === "wing-back") {
    return result(100, "natural", "Naturalny wahadłowy");
  }

  if (slotFamily === "wide-back") {
    return result(90, "natural", "Wahadłowy cofnięty na bocznego obrońcę");
  }

  if (slotFamily === "wide-midfielder") {
    return result(86, "natural", "Wahadłowy jako boczny pomocnik");
  }

  if (slotFamily === "winger") {
    return result(68, "close", "Wahadłowy bardzo wysoko");
  }

  if (
    slotFamily === "center-back" &&
    slotSide !== "center" &&
    profile.side === slotSide
  ) {
    return result(60, "conversion", "Wahadłowy awaryjnie jako boczny ŚO");
  }

  return BLOCKED;
}

function scoreCenterBack(_profile: PlayerMobilityProfile, slot: FormationSlot) {
  const slotFamily = getSlotFamily(slot);

  if (slotFamily === "center-back") {
    return result(100, "natural", "Naturalny środkowy obrońca");
  }

  if (slotFamily === "defensive-midfielder") {
    return result(44, "conversion", "ŚO awaryjnie jako defensywny pomocnik");
  }

  return BLOCKED;
}

function scoreDefensiveMidfielder(
  _profile: PlayerMobilityProfile,
  slot: FormationSlot
) {
  const slotFamily = getSlotFamily(slot);

  if (slotFamily === "defensive-midfielder") {
    return result(100, "natural", "Naturalny defensywny pomocnik");
  }

  if (slotFamily === "central-midfielder") {
    return result(86, "close", "DP jako środkowy pomocnik");
  }

  if (slotFamily === "center-back") {
    return result(52, "conversion", "DP awaryjnie jako środkowy obrońca");
  }

  return BLOCKED;
}

function scoreCentralMidfielder(
  _profile: PlayerMobilityProfile,
  slot: FormationSlot
) {
  const slotFamily = getSlotFamily(slot);

  if (slotFamily === "central-midfielder") {
    return result(100, "natural", "Naturalny środkowy pomocnik");
  }

  if (slotFamily === "defensive-midfielder") {
    return result(88, "close", "ŚP cofnięty na DP");
  }

  if (slotFamily === "attacking-midfielder") {
    return result(84, "close", "ŚP wyżej jako OP");
  }

  if (slotFamily === "wide-midfielder") {
    return result(54, "conversion", "ŚP przesunięty szerzej");
  }

  return BLOCKED;
}

function scoreAttackingMidfielder(
  profile: PlayerMobilityProfile,
  slot: FormationSlot
) {
  const slotFamily = getSlotFamily(slot);

  if (slotFamily === "attacking-midfielder") {
    return result(100, "natural", "Naturalny ofensywny pomocnik");
  }

  if (slotFamily === "central-midfielder") {
    return result(84, "close", "OP cofnięty na ŚP");
  }

  if (slotFamily === "striker") {
    return result(68, "close", "OP jako cofnięty napastnik");
  }

  if (slotFamily === "winger" || slotFamily === "wide-midfielder") {
    if (blocksOppositeWideSide(profile, slot)) {
      return BLOCKED;
    }

    return result(56, "conversion", "OP przesunięty szerzej");
  }

  return BLOCKED;
}

function scoreWideMidfielder(profile: PlayerMobilityProfile, slot: FormationSlot) {
  const slotFamily = getSlotFamily(slot);

  if (blocksOppositeWideSide(profile, slot)) {
    return BLOCKED;
  }

  if (slotFamily === "wide-midfielder") {
    return result(100, "natural", "Naturalny boczny pomocnik");
  }

  if (slotFamily === "winger") {
    return result(88, "natural", "Boczny pomocnik jako skrzydłowy");
  }

  if (slotFamily === "wing-back") {
    return result(76, "close", "Boczny pomocnik jako wahadłowy");
  }

  if (slotFamily === "wide-back") {
    return result(64, "conversion", "Boczny pomocnik głęboko jako BO");
  }

  if (slotFamily === "attacking-midfielder") {
    return result(54, "conversion", "Boczny pomocnik schodzi do środka");
  }

  return BLOCKED;
}

function scoreWinger(profile: PlayerMobilityProfile, slot: FormationSlot) {
  const slotFamily = getSlotFamily(slot);

  if (blocksOppositeWideSide(profile, slot)) {
    return BLOCKED;
  }

  if (slotFamily === "winger") {
    return result(100, "natural", "Naturalny skrzydłowy");
  }

  if (slotFamily === "wide-midfielder") {
    return result(90, "natural", "Skrzydłowy cofnięty na bocznego pomocnika");
  }

  if (slotFamily === "wing-back") {
    return result(62, "conversion", "Skrzydłowy jako ofensywny wahadłowy");
  }

  if (slotFamily === "attacking-midfielder") {
    return result(64, "conversion", "Skrzydłowy schodzi do środka");
  }

  if (slotFamily === "striker") {
    return result(46, "conversion", "Skrzydłowy awaryjnie jako napastnik");
  }

  return BLOCKED;
}

function scoreStriker(_profile: PlayerMobilityProfile, slot: FormationSlot) {
  const slotFamily = getSlotFamily(slot);

  if (slotFamily === "striker") {
    return result(100, "natural", "Naturalny napastnik");
  }

  if (slotFamily === "attacking-midfielder") {
    return result(66, "close", "Napastnik cofnięty na OP");
  }

  return BLOCKED;
}

function scoreProfileToSlot(
  profile: PlayerMobilityProfile,
  slot: FormationSlot
): MobilityResult {
  if (profile.family === "goalkeeper") {
    return BLOCKED;
  }

  if (profile.family === "wide-back") {
    return scoreWideBack(profile, slot);
  }

  if (profile.family === "wing-back") {
    return scoreWingBack(profile, slot);
  }

  if (profile.family === "center-back") {
    return scoreCenterBack(profile, slot);
  }

  if (profile.family === "defensive-midfielder") {
    return scoreDefensiveMidfielder(profile, slot);
  }

  if (profile.family === "central-midfielder") {
    return scoreCentralMidfielder(profile, slot);
  }

  if (profile.family === "attacking-midfielder") {
    return scoreAttackingMidfielder(profile, slot);
  }

  if (profile.family === "wide-midfielder") {
    return scoreWideMidfielder(profile, slot);
  }

  if (profile.family === "winger") {
    return scoreWinger(profile, slot);
  }

  if (profile.family === "striker") {
    return scoreStriker(profile, slot);
  }

  return BLOCKED;
}

export function scorePlayerMobilityToSlot(
  row: TableRow,
  slot: FormationSlot
): MobilityResult {
  const profiles = getPlayerMobilityProfiles(row);

  if (profiles.length === 0) {
    return BLOCKED;
  }

  return profiles
    .map((profile) => scoreProfileToSlot(profile, slot))
    .sort((left, right) => right.score - left.score)[0];
}