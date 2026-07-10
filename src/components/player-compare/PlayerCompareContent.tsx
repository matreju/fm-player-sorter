import { type CSSProperties, useEffect, useMemo, useState } from "react";
import {
  ROLE_DEFINITIONS,
  getRoleAttributeImportance,
  getRolePhaseLabel,
  type RoleDefinition,
  type RolePhase,
} from "../../constants/roles";
import { MoneyballCompare } from "../moneyball";
import type { TableRow } from "../../types/table";
import { getSortableNumber } from "../../utils/sortTable";
import { getPlayerKey } from "../../utils/playerIdentity";
import {
  calculateRoleScoreDetails,
  formatRoleScoreRange,
  formatRoleUncertainty,
} from "../../utils/roleScoring";
import { PlayerAttributeRadar } from "../charts";
import { AppButton, AppSelectField } from "../ui";
import { playerCompareStyles as styles } from "./PlayerCompare.styles";
import {
  areComparablePlayerTypes,
  getCompatiblePlayerOptions,
  getPlayerTypeLabel,
  getSortedPlayerSelectOptions,
  isGoalkeeper,
} from "../../utils/playerPositionType";

type PlayerCompareProps = {
  rows: TableRow[];
  requestedLeftPlayerKey?: string;
  compareRequestId?: number;
};

type AttributeGroup = {
  name: string;
  attributes: string[];
};

const COMPARE_PHASE_OPTIONS: { value: RolePhase; label: string }[] = [
  { value: "with-ball", label: "Przy piłce" },
  { value: "without-ball", label: "Bez piłki" },
];

const GOALKEEPER_ATTRIBUTE_GROUPS: AttributeGroup[] = [
  {
    name: "Bramkarskie",
    attributes: [
      "Chwytanie",
      "Gra na przedpolu",
      "Komunikacja",
      "Refleks",
      "Jeden na jednego",
      "Piąstkowanie",
      "Wychodzenie poza pole karne",
      "Wykopy",
      "Wyrzuty",
      "Zasięg wyskoku",
      "Ekscentryczność",
    ],
  },
  {
    name: "Bramkarz — mental/fizyczne",
    attributes: [
      "Koncentracja",
      "Ustawianie się",
      "Przewidywanie",
      "Decyzje",
      "Opanowanie",
      "Zwinność",
      "Przyspieszenie",
    ],
  },
];

const OUTFIELD_ATTRIBUTE_GROUPS: AttributeGroup[] = [
  {
    name: "Techniczne",
    attributes: [
      "Dośrodkowania",
      "Drybling",
      "Gra głową",
      "Krycie",
      "Odbiór piłki",
      "Podania",
      "Przyjęcie piłki",
      "Strzały z dystansu",
      "Technika",
      "Wykańczanie akcji",
    ],
  },
  {
    name: "Stałe fragmenty gry",
    attributes: ["Długie wrzuty", "Rzuty karne", "Rzuty rożne", "Rzuty wolne"],
  },
  {
    name: "Psychiczne",
    attributes: [
      "Agresja",
      "Błyskotliwość",
      "Decyzje",
      "Determinacja",
      "Gra bez piłki",
      "Koncentracja",
      "Opanowanie",
      "Pracowitość",
      "Przegląd sytuacji",
      "Przewidywanie",
      "Przywództwo",
      "Ustawianie się",
      "Waleczność",
      "Współpraca",
    ],
  },
  {
    name: "Fizyczne",
    attributes: [
      "Przyspieszenie",
      "Równowaga",
      "Siła",
      "Skoczność",
      "Sprawność",
      "Szybkość",
      "Wytrzymałość",
      "Zwinność",
    ],
  },
];

function getPlayerName(row: TableRow | undefined): string {
  return row?.["Nazwisko"] || "Brak zawodnika";
}

function getPlayerInfo(row: TableRow | undefined): string {
  if (!row) return "";

  const parts = [
    row["Klub"],
    row["Pozycja"],
    row["Wiek"] ? `${row["Wiek"]} lat` : null,
  ].filter(Boolean);

  return parts.join(" • ");
}

function getPlayerHeight(row: TableRow | undefined): string {
  return row?.["Wzrost"] && row["Wzrost"] !== "-" ? row["Wzrost"] : "—";
}

function getPlayerFoot(
  row: TableRow | undefined,
  foot: "Lewa noga" | "Prawa noga"
): string {
  return row?.[foot] && row[foot] !== "-" ? row[foot] : "—";
}

function getFootStyle(value: string): CSSProperties {
  const normalized = value.trim();

  if (normalized === "Bardzo mocna") {
    return {
      ...styles.footBadge,
      color: "#62ff5f",
      borderColor: "rgba(98, 255, 95, 0.5)",
      background: "rgba(98, 255, 95, 0.1)",
    };
  }

  if (normalized === "Wysoka") {
    return {
      ...styles.footBadge,
      color: "#9aff8f",
      borderColor: "rgba(154, 255, 143, 0.45)",
      background: "rgba(154, 255, 143, 0.08)",
    };
  }

  if (normalized === "Względnie mocna") {
    return {
      ...styles.footBadge,
      color: "#ffd84d",
      borderColor: "rgba(255, 216, 77, 0.45)",
      background: "rgba(255, 216, 77, 0.08)",
    };
  }

  if (normalized === "Przyzwoita") {
    return {
      ...styles.footBadge,
      color: "#b8beca",
      borderColor: "rgba(184, 190, 202, 0.35)",
      background: "rgba(184, 190, 202, 0.06)",
    };
  }

  if (normalized === "Słaba") {
    return {
      ...styles.footBadge,
      color: "#858b98",
      borderColor: "rgba(133, 139, 152, 0.28)",
      background: "rgba(133, 139, 152, 0.05)",
    };
  }

  if (normalized === "Bardzo słaba") {
    return {
      ...styles.footBadge,
      color: "#ff7c7c",
      borderColor: "rgba(255, 124, 124, 0.4)",
      background: "rgba(255, 124, 124, 0.08)",
    };
  }

  return styles.footBadge;
}

function getNumericValue(row: TableRow | undefined, attribute: string): number | null {
  if (!row) return null;
  return getSortableNumber(row[attribute] ?? "");
}

function getDisplayValue(row: TableRow | undefined, attribute: string): string {
  if (!row) return "—";
  const value = row[attribute];

  if (!value || value === "-") {
    return "—";
  }

  return value;
}

function formatNumber(value: number | null, digits = 1): string {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }

  return value.toFixed(digits);
}

function averageAttributes(row: TableRow | undefined, attributes: string[]): number | null {
  const values = attributes
    .map((attribute) => getNumericValue(row, attribute))
    .filter((value): value is number => value !== null);

  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getDiffText(leftValue: number | null, rightValue: number | null): string {
  if (leftValue === null || rightValue === null) {
    return "—";
  }

  const diff = rightValue - leftValue;

  if (diff === 0) {
    return "0";
  }

  if (diff > 0) {
    return `+${formatNumber(diff, 0)} →`;
  }

  return `← +${formatNumber(Math.abs(diff), 0)}`;
}

function getDiffStyle(leftValue: number | null, rightValue: number | null): CSSProperties {
  if (leftValue === null || rightValue === null) {
    return styles.diffNeutral;
  }

  const diff = rightValue - leftValue;

  if (diff > 0) {
    return styles.diffRight;
  }

  if (diff < 0) {
    return styles.diffLeft;
  }

  return styles.diffNeutral;
}

function getAttributeRowStyle(
  importance: ReturnType<typeof getRoleAttributeImportance>
): CSSProperties {
  if (importance === "core") {
    return {
      ...styles.attributeRow,
      background: "rgba(95, 255, 138, 0.20)",
      borderLeft: "3px solid #5fff8a",
    };
  }

  if (importance === "key") {
    return {
      ...styles.attributeRow,
      background: "rgba(95, 255, 138, 0.10)",
      borderLeft: "3px solid rgba(95, 255, 138, 0.75)",
    };
  }

  if (importance === "important") {
    return {
      ...styles.attributeRow,
      background: "rgba(54, 150, 252, 0.18)",
      borderLeft: "3px solid #5aa8ff",
    };
  }

  if (importance === "support") {
    return {
      ...styles.attributeRow,
      background: "rgba(62, 114, 199, 0.1)",
      borderLeft: "3px solid rgba(80, 145, 235, 0.55)",
    };
  }

  return styles.attributeRow;
}

function BalanceBar({
  leftValue,
  rightValue,
  scaleMaxDiff = 20,
}: {
  leftValue: number | null;
  rightValue: number | null;
  scaleMaxDiff?: number;
}) {
  if (leftValue === null || rightValue === null) {
    return (
      <div style={styles.balanceTrack}>
        <div style={styles.balanceCenterLine} />
      </div>
    );
  }

  const diff = rightValue - leftValue;
  const absDiff = Math.abs(diff);
  const fillWidth = Math.min(50, (absDiff / scaleMaxDiff) * 50);

  const fillStyle: CSSProperties =
    diff > 0
      ? {
          left: "50%",
          width: `${fillWidth}%`,
          background: "#9aff8f",
        }
      : {
          right: "50%",
          width: `${fillWidth}%`,
          background: "#6eb6ff",
        };

  return (
    <div style={styles.balanceTrack}>
      <div style={styles.balanceCenterLine} />
      {diff !== 0 && <div style={{ ...styles.balanceFill, ...fillStyle }} />}
    </div>
  );
}

type SectionComparison = {
  name: string;
  leftAverage: number | null;
  rightAverage: number | null;
};

type AttributeDifference = {
  attribute: string;
  groupName: string;
  leftValue: number;
  rightValue: number;
  diff: number;
};

function getAttributeGroupsForPlayers(
  leftPlayer: TableRow | undefined,
  rightPlayer: TableRow | undefined
): AttributeGroup[] {
  if (isGoalkeeper(leftPlayer) || isGoalkeeper(rightPlayer)) {
    return GOALKEEPER_ATTRIBUTE_GROUPS;
  }

  return OUTFIELD_ATTRIBUTE_GROUPS;
}

function getSectionComparisons(
  leftPlayer: TableRow | undefined,
  rightPlayer: TableRow | undefined
): SectionComparison[] {
  return getAttributeGroupsForPlayers(leftPlayer, rightPlayer).map((group) => ({
    name: group.name,
    leftAverage: averageAttributes(leftPlayer, group.attributes),
    rightAverage: averageAttributes(rightPlayer, group.attributes),
  }));
}

function getBiggestAttributeDifferences(
  leftPlayer: TableRow | undefined,
  rightPlayer: TableRow | undefined
): AttributeDifference[] {
  const differences: AttributeDifference[] = [];

  for (const group of getAttributeGroupsForPlayers(leftPlayer, rightPlayer)) {
    for (const attribute of group.attributes) {
      const leftValue = getNumericValue(leftPlayer, attribute);
      const rightValue = getNumericValue(rightPlayer, attribute);

      if (leftValue === null || rightValue === null) {
        continue;
      }

      const diff = rightValue - leftValue;

      if (diff === 0) {
        continue;
      }

      differences.push({
        attribute,
        groupName: group.name,
        leftValue,
        rightValue,
        diff,
      });
    }
  }

  return differences.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 6);
}

function getWinnerLabel(
  leftPlayer: TableRow | undefined,
  rightPlayer: TableRow | undefined,
  leftValue: number | null,
  rightValue: number | null
): string {
  if (leftValue === null || rightValue === null) {
    return "Brak danych";
  }

  if (Math.abs(leftValue - rightValue) < 0.1) {
    return "Remis";
  }

  return leftValue > rightValue ? getPlayerName(leftPlayer) : getPlayerName(rightPlayer);
}

function getInitialLeftIndex(rows: TableRow[]): string {
  const options = getSortedPlayerSelectOptions(rows);
  return String(options[0]?.index ?? 0);
}

function getInitialRightIndex(rows: TableRow[], leftIndex: string): string {
  const options = getSortedPlayerSelectOptions(rows);
  const leftPlayer = rows[Number(leftIndex)];
  const rightOption = getCompatiblePlayerOptions(options, leftPlayer).find(
    (option) => String(option.index) !== leftIndex
  );

  return String(rightOption?.index ?? options[1]?.index ?? options[0]?.index ?? 0);
}

const compareTypeInfoStyle: CSSProperties = {
  marginBottom: 14,
  padding: "9px 11px",
  border: "1px solid #26334a",
  borderRadius: 10,
  background: "#101827",
  color: "#bcd0ee",
  fontSize: 12,
  fontWeight: 700,
};

export function PlayerCompareContent({
  rows,
  requestedLeftPlayerKey = "",
  compareRequestId = 0,
}: PlayerCompareProps) {  
    const playerOptions = useMemo(() => getSortedPlayerSelectOptions(rows), [rows]);

    
  const [leftPlayerIndex, setLeftPlayerIndex] = useState(() => getInitialLeftIndex(rows));

  const [rightPlayerIndex, setRightPlayerIndex] = useState(() =>
    getInitialRightIndex(rows, getInitialLeftIndex(rows))
  );
useEffect(() => {
  if (!requestedLeftPlayerKey) {
    return;
  }

  const requestedOption = playerOptions.find(
    (option) => getPlayerKey(option.row) === requestedLeftPlayerKey
  );

  if (!requestedOption) {
    return;
  }

  const nextLeftIndex = String(requestedOption.index);

  setLeftPlayerIndex(nextLeftIndex);

  setRightPlayerIndex((currentRightPlayerIndex) => {
    const currentRightPlayer = rows[Number(currentRightPlayerIndex)];

    if (
      currentRightPlayer &&
      getPlayerKey(currentRightPlayer) !== requestedLeftPlayerKey &&
      areComparablePlayerTypes(requestedOption.row, currentRightPlayer)
    ) {
      return currentRightPlayerIndex;
    }

    const nextRightOption = getCompatiblePlayerOptions(
      playerOptions,
      requestedOption.row
    ).find((option) => String(option.index) !== nextLeftIndex);

    return String(nextRightOption?.index ?? "");
  });
}, [requestedLeftPlayerKey, compareRequestId, playerOptions, rows]);
  const [selectedPositionGroup, setSelectedPositionGroup] = useState("Napastnik");
  const [selectedPhase, setSelectedPhase] = useState<RolePhase>("with-ball");
  const [selectedRoleId, setSelectedRoleId] = useState("none");
  const [showMoneyballH2H, setShowMoneyballH2H] = useState(false);
const [showFullAttributes, setShowFullAttributes] = useState(false);

  const leftPlayer = rows[Number(leftPlayerIndex)];
  const rightPlayer = rows[Number(rightPlayerIndex)];

  const rightPlayerOptions = useMemo(() => {
    return getCompatiblePlayerOptions(playerOptions, leftPlayer).filter(
      (option) => String(option.index) !== leftPlayerIndex
    );
  }, [playerOptions, leftPlayer, leftPlayerIndex]);

  useEffect(() => {
    if (rows.length === 0) {
      return;
    }

    const leftExists = rows[Number(leftPlayerIndex)] !== undefined;

    if (!leftExists) {
      const nextLeft = getInitialLeftIndex(rows);
      setLeftPlayerIndex(nextLeft);
      setRightPlayerIndex(getInitialRightIndex(rows, nextLeft));
    }
  }, [rows, leftPlayerIndex]);

  useEffect(() => {
    if (!leftPlayer) {
      return;
    }

    const currentRightIsValid =
      rightPlayer &&
      areComparablePlayerTypes(leftPlayer, rightPlayer) &&
      leftPlayerIndex !== rightPlayerIndex;

    if (currentRightIsValid) {
      return;
    }

    const nextRight = rightPlayerOptions[0];

    if (nextRight) {
      setRightPlayerIndex(String(nextRight.index));
    }
  }, [
    leftPlayer,
    rightPlayer,
    leftPlayerIndex,
    rightPlayerIndex,
    rightPlayerOptions,
  ]);

  useEffect(() => {
    if (!leftPlayer) {
      return;
    }

    const nextGroup = isGoalkeeper(leftPlayer) ? "Bramkarz" : "Napastnik";

    if (selectedRoleId === "none" && selectedPositionGroup !== nextGroup) {
      setSelectedPositionGroup(nextGroup);
    }
  }, [leftPlayer, selectedPositionGroup, selectedRoleId]);

  const positionGroupOptions = useMemo(() => {
    return Array.from(new Set(ROLE_DEFINITIONS.map((role) => role.positionGroup)));
  }, []);

  const availableRoles = useMemo(() => {
    return ROLE_DEFINITIONS.filter((role) => {
      return role.positionGroup === selectedPositionGroup && role.phase === selectedPhase;
    });
  }, [selectedPositionGroup, selectedPhase]);

  const selectedRole: RoleDefinition | null =
    availableRoles.find((role) => role.id === selectedRoleId) ?? null;

  const leftRoleScoreResult =
    leftPlayer && selectedRole ? calculateRoleScoreDetails(leftPlayer, selectedRole) : null;

  const rightRoleScoreResult =
    rightPlayer && selectedRole ? calculateRoleScoreDetails(rightPlayer, selectedRole) : null;

  const leftRoleScore = leftRoleScoreResult?.score ?? null;
  const rightRoleScore = rightRoleScoreResult?.score ?? null;

  const sectionComparisons = useMemo(() => {
    return getSectionComparisons(leftPlayer, rightPlayer);
  }, [leftPlayer, rightPlayer]);

  const biggestAttributeDifferences = useMemo(() => {
    return getBiggestAttributeDifferences(leftPlayer, rightPlayer);
  }, [leftPlayer, rightPlayer]);

  const attributeGroups = useMemo(() => {
    return getAttributeGroupsForPlayers(leftPlayer, rightPlayer);
  }, [leftPlayer, rightPlayer]);

  const technicalComparison = sectionComparisons.find(
    (section) => section.name === "Techniczne" || section.name === "Bramkarskie"
  );

  const mentalComparison = sectionComparisons.find(
    (section) => section.name === "Psychiczne" || section.name === "Bramkarz — mental/fizyczne"
  );

  const physicalComparison = sectionComparisons.find(
    (section) => section.name === "Fizyczne" || section.name === "Bramkarz — mental/fizyczne"
  );

  function swapComparedPlayers() {
    setLeftPlayerIndex(rightPlayerIndex);
    setRightPlayerIndex(leftPlayerIndex);
  }

  function resetComparison() {
    const nextLeft = getInitialLeftIndex(rows);
    setLeftPlayerIndex(nextLeft);
    setRightPlayerIndex(getInitialRightIndex(rows, nextLeft));
    setSelectedPositionGroup("Napastnik");
    setSelectedPhase("with-ball");
    setSelectedRoleId("none");
  }

  if (!leftPlayer || !rightPlayer) {
  return (
    <section style={styles.wrapper}>
      <div style={styles.compareHeader}>
        <div>
          <h2 style={styles.title}>Porównanie zawodników</h2>

          <div style={styles.headerSubtitle}>
            Szybki raport H2H: wybór roli, profil sekcji, największe różnice,
            radary i opcjonalny Moneyball.
          </div>
        </div>

        <div style={styles.compareActions}>
          <AppButton
            type="button"
            variant="secondary"
            size="compact"
            onClick={swapComparedPlayers}
            disabled={!leftPlayer || !rightPlayer}
          >
            Zamień
          </AppButton>

          <AppButton
            type="button"
            variant="neutral"
            size="compact"
            onClick={resetComparison}
          >
            Reset
          </AppButton>
        </div>
      </div>

      <div style={styles.playerSelectors}>
        <AppSelectField
          label="Zawodnik po lewej"
          value={leftPlayerIndex}
          options={playerOptions.map((option) => ({
            value: String(option.index),
            label: option.label,
          }))}
          onChange={setLeftPlayerIndex}
          fieldStyle={styles.playerSelectField}
          labelStyle={styles.playerSelectLabel}
          selectStyle={styles.select}
        />

        <AppSelectField
          label="Zawodnik po prawej"
          value={rightPlayerIndex}
          options={rightPlayerOptions.map((option) => ({
            value: String(option.index),
            label: option.label,
          }))}
          onChange={setRightPlayerIndex}
          fieldStyle={styles.playerSelectField}
          labelStyle={styles.playerSelectLabel}
          selectStyle={styles.select}
        />
      </div>

      <div style={compareTypeInfoStyle}>
        Porównujesz: <strong>{getPlayerTypeLabel(leftPlayer)}</strong>. Lista po
        prawej pokazuje tylko zgodnych zawodników. Opcje są sortowane po
        pozycjach.
      </div>

      <div style={styles.compareRoleDock}>
        <AppSelectField
          label="Pozycja roli"
          value={selectedPositionGroup}
          options={positionGroupOptions.map((positionGroup) => ({
            value: positionGroup,
            label: positionGroup,
          }))}
          onChange={(value) => {
            setSelectedPositionGroup(value);
            setSelectedRoleId("none");
          }}
          fieldStyle={styles.roleControlField}
          labelStyle={styles.playerSelectLabel}
          selectStyle={styles.select}
        />

        <AppSelectField
          label="Faza"
          value={selectedPhase}
          options={COMPARE_PHASE_OPTIONS}
          onChange={(value) => {
            setSelectedPhase(value as RolePhase);
            setSelectedRoleId("none");
          }}
          fieldStyle={styles.roleControlField}
          labelStyle={styles.playerSelectLabel}
          selectStyle={styles.select}
        />

        <AppSelectField
          label="Rola"
          value={selectedRoleId}
          options={[
            { value: "none", label: "Nie oceniaj roli" },
            ...availableRoles.map((role) => ({
              value: role.id,
              label: role.name,
            })),
          ]}
          onChange={setSelectedRoleId}
          fieldStyle={styles.roleControlFieldWide}
          labelStyle={styles.playerSelectLabel}
          selectStyle={styles.select}
        />

        <div style={styles.compareRoleDockLegend}>
          <span>
            Analiza roli:{" "}
            <strong style={styles.phaseInfo}>
              {selectedRole
                ? `${selectedRole.name} · ${getRolePhaseLabel(selectedRole.phase)}`
                : "wybierz konkretną rolę, żeby porównać dopasowanie"}
            </strong>
          </span>
        </div>
      </div>

      <div style={styles.playerCards}>
        <article style={styles.playerCard}>
          <div style={styles.playerCardInfoColumn}>
            <div style={styles.playerName}>{getPlayerName(leftPlayer)}</div>
            <div style={styles.playerInfo}>{getPlayerInfo(leftPlayer)}</div>
            <div style={styles.heightInfo}>
              Wzrost: {getPlayerHeight(leftPlayer)}
            </div>

            <div style={styles.footInfo}>
              <span style={getFootStyle(getPlayerFoot(leftPlayer, "Lewa noga"))}>
                Lewa: {getPlayerFoot(leftPlayer, "Lewa noga")}
              </span>

              <span style={getFootStyle(getPlayerFoot(leftPlayer, "Prawa noga"))}>
                Prawa: {getPlayerFoot(leftPlayer, "Prawa noga")}
              </span>
            </div>

            <div style={styles.roleScorePill}>
              Rola:{" "}
              <strong>
                {selectedRole ? `${formatNumber(leftRoleScore)} / 100` : "—"}
              </strong>
            </div>

            {selectedRole && (
              <>
                <div style={styles.roleScoreRange}>
                  Zakres: {formatRoleScoreRange(leftRoleScoreResult)}
                </div>

                <div style={styles.roleScoreUncertainty}>
                  Niepewność: {formatRoleUncertainty(leftRoleScoreResult)}
                </div>
              </>
            )}
          </div>

          <div style={styles.compareCompactRadarShell}>
            <div style={styles.compareMiniRadar}>
              <PlayerAttributeRadar
                player={leftPlayer}
                showHeader={false}
                showAxisList={false}
                compact
              />
            </div>
          </div>
        </article>

        <div style={styles.vsBox}>VS</div>

        <article style={styles.playerCard}>
          <div style={styles.playerCardInfoColumn}>
            <div style={styles.playerName}>{getPlayerName(rightPlayer)}</div>
            <div style={styles.playerInfo}>{getPlayerInfo(rightPlayer)}</div>
            <div style={styles.heightInfo}>
              Wzrost: {getPlayerHeight(rightPlayer)}
            </div>

            <div style={styles.footInfo}>
              <span style={getFootStyle(getPlayerFoot(rightPlayer, "Lewa noga"))}>
                Lewa: {getPlayerFoot(rightPlayer, "Lewa noga")}
              </span>

              <span style={getFootStyle(getPlayerFoot(rightPlayer, "Prawa noga"))}>
                Prawa: {getPlayerFoot(rightPlayer, "Prawa noga")}
              </span>
            </div>

            <div style={styles.roleScorePill}>
              Rola:{" "}
              <strong>
                {selectedRole ? `${formatNumber(rightRoleScore)} / 100` : "—"}
              </strong>
            </div>

            {selectedRole && (
              <>
                <div style={styles.roleScoreRange}>
                  Zakres: {formatRoleScoreRange(rightRoleScoreResult)}
                </div>

                <div style={styles.roleScoreUncertainty}>
                  Niepewność: {formatRoleUncertainty(rightRoleScoreResult)}
                </div>
              </>
            )}
          </div>

          <div style={styles.compareCompactRadarShell}>
            <div style={styles.compareMiniRadar}>
              <PlayerAttributeRadar
                player={rightPlayer}
                showHeader={false}
                showAxisList={false}
                compact
              />
            </div>
          </div>
        </article>
      </div>

      <div style={styles.quickCompareGrid}>
        <div style={styles.quickCompareCard}>
          <div style={styles.quickCompareLabel}>Dopasowanie do roli</div>
          <div style={styles.quickCompareWinner}>
            {selectedRole
              ? getWinnerLabel(leftPlayer, rightPlayer, leftRoleScore, rightRoleScore)
              : "Wybierz rolę"}
          </div>

          <div style={styles.quickCompareValues}>
            <span>{formatNumber(leftRoleScore)}</span>
            <span>{formatNumber(rightRoleScore)}</span>
          </div>

          <div style={styles.quickCompareBar}>
            <BalanceBar
              leftValue={leftRoleScore}
              rightValue={rightRoleScore}
              scaleMaxDiff={100}
            />
          </div>
        </div>

        <div style={styles.quickCompareCard}>
          <div style={styles.quickCompareLabel}>
            {isGoalkeeper(leftPlayer) ? "Bramkarsko" : "Technicznie"}
          </div>
          <div style={styles.quickCompareWinner}>
            {getWinnerLabel(
              leftPlayer,
              rightPlayer,
              technicalComparison?.leftAverage ?? null,
              technicalComparison?.rightAverage ?? null
            )}
          </div>

          <div style={styles.quickCompareValues}>
            <span>{formatNumber(technicalComparison?.leftAverage ?? null)}</span>
            <span>{formatNumber(technicalComparison?.rightAverage ?? null)}</span>
          </div>

          <div style={styles.quickCompareBar}>
            <BalanceBar
              leftValue={technicalComparison?.leftAverage ?? null}
              rightValue={technicalComparison?.rightAverage ?? null}
            />
          </div>
        </div>

        <div style={styles.quickCompareCard}>
          <div style={styles.quickCompareLabel}>Mentalnie</div>
          <div style={styles.quickCompareWinner}>
            {getWinnerLabel(
              leftPlayer,
              rightPlayer,
              mentalComparison?.leftAverage ?? null,
              mentalComparison?.rightAverage ?? null
            )}
          </div>

          <div style={styles.quickCompareValues}>
            <span>{formatNumber(mentalComparison?.leftAverage ?? null)}</span>
            <span>{formatNumber(mentalComparison?.rightAverage ?? null)}</span>
          </div>

          <div style={styles.quickCompareBar}>
            <BalanceBar
              leftValue={mentalComparison?.leftAverage ?? null}
              rightValue={mentalComparison?.rightAverage ?? null}
            />
          </div>
        </div>

        <div style={styles.quickCompareCard}>
          <div style={styles.quickCompareLabel}>Fizycznie</div>
          <div style={styles.quickCompareWinner}>
            {getWinnerLabel(
              leftPlayer,
              rightPlayer,
              physicalComparison?.leftAverage ?? null,
              physicalComparison?.rightAverage ?? null
            )}
          </div>

          <div style={styles.quickCompareValues}>
            <span>{formatNumber(physicalComparison?.leftAverage ?? null)}</span>
            <span>{formatNumber(physicalComparison?.rightAverage ?? null)}</span>
          </div>

          <div style={styles.quickCompareBar}>
            <BalanceBar
              leftValue={physicalComparison?.leftAverage ?? null}
              rightValue={physicalComparison?.rightAverage ?? null}
            />
          </div>
        </div>
      </div>

      <div style={styles.compareSectionTogglePanel}>
        <div style={styles.compareSectionToggleHeader}>
          <div>
            <strong style={styles.compareSectionToggleTitle}>
              Moneyball H2H
            </strong>

            <div style={styles.compareSectionToggleText}>
              Porównanie statystyk klubowych. Przydatne, ale ciężkie, więc
              domyślnie zwinięte.
            </div>
          </div>

          <button
            type="button"
            style={{
              ...styles.compareSectionToggleButton,
              ...(showMoneyballH2H
                ? styles.compareSectionToggleButtonActive
                : {}),
            }}
            onClick={() => setShowMoneyballH2H((current) => !current)}
          >
            {showMoneyballH2H ? "Ukryj Moneyball" : "Pokaż Moneyball"}
          </button>
        </div>

        {showMoneyballH2H && (
          <MoneyballCompare
            leftPlayer={leftPlayer}
            rightPlayer={rightPlayer}
            rows={rows}
          />
        )}
      </div>

      <div style={styles.compareSectionTogglePanel}>
        <div style={styles.compareSectionToggleHeader}>
          <div>
            <strong style={styles.compareSectionToggleTitle}>
              Pełne atrybuty
            </strong>

            <div style={styles.compareSectionToggleText}>
              Szczegółowa tabela wszystkich atrybutów. Domyślnie schowana, bo
              jest długa.
            </div>
          </div>

          <button
            type="button"
            style={{
              ...styles.compareSectionToggleButton,
              ...(showFullAttributes
                ? styles.compareSectionToggleButtonActive
                : {}),
            }}
            onClick={() => setShowFullAttributes((current) => !current)}
          >
            {showFullAttributes ? "Ukryj atrybuty" : "Pokaż pełne atrybuty"}
          </button>
        </div>
      </div>

      <div
        style={
          showFullAttributes ? styles.compareBody : styles.compareBodySummaryOnly
        }
      >
        <div style={styles.compareLeftPanel}>
          <div style={styles.compareMiniBox}>
            <h3 style={styles.compareBoxTitle}>Profil sekcji</h3>

            <div style={styles.sectionVsList}>
              {sectionComparisons.map((section) => {
                const leftValue = section.leftAverage ?? 0;
                const rightValue = section.rightAverage ?? 0;
                const difference = leftValue - rightValue;

                const winner =
                  Math.abs(difference) < 0.1
                    ? "Remis"
                    : difference > 0
                      ? getPlayerName(leftPlayer)
                      : getPlayerName(rightPlayer);

                return (
                  <div key={section.name} style={styles.sectionVsCard}>
                    <div style={styles.sectionVsTop}>
                      <strong>{section.name}</strong>
                      <span>{winner}</span>
                    </div>

                    <div style={styles.sectionVsMiddle}>
                      <div style={styles.sectionVsPlayer}>
                        <span>{getPlayerName(leftPlayer)}</span>
                        <strong style={styles.leftValueBig}>
                          {formatNumber(section.leftAverage)}
                        </strong>
                      </div>

                      <div
                        style={{
                          ...styles.sectionVsDiff,
                          ...(difference > 0
                            ? styles.sectionVsDiffLeft
                            : difference < 0
                              ? styles.sectionVsDiffRight
                              : styles.sectionVsDiffNeutral),
                        }}
                      >
                        {Math.abs(difference) < 0.1
                          ? "0.0"
                          : `+${formatNumber(Math.abs(difference))}`}
                      </div>

                      <div style={styles.sectionVsPlayerRight}>
                        <span>{getPlayerName(rightPlayer)}</span>
                        <strong style={styles.rightValueBig}>
                          {formatNumber(section.rightAverage)}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={styles.compareMiniBox}>
            <h3 style={styles.compareBoxTitle}>Największe różnice</h3>

            <div style={styles.differenceCardsGrid}>
              {biggestAttributeDifferences.slice(0, 4).map((item) => {
                const leftBetter = item.leftValue > item.rightValue;
                const betterPlayer = leftBetter
                  ? getPlayerName(leftPlayer)
                  : getPlayerName(rightPlayer);
                const difference = Math.abs(item.leftValue - item.rightValue);

                return (
                  <div key={item.attribute} style={styles.differenceBigCard}>
                    <div style={styles.differenceCategoryPill}>
                      {item.groupName}
                    </div>

                    <div style={styles.differenceAttributeName}>
                      {item.attribute}
                    </div>

                    <div style={styles.differencePlayersRow}>
                      <div style={styles.differencePlayerSide}>
                        <span>{getPlayerName(leftPlayer)}</span>
                        <strong style={styles.leftValueBig}>
                          {item.leftValue}
                        </strong>
                      </div>

                      <div
                        style={{
                          ...styles.differenceDelta,
                          ...(leftBetter
                            ? styles.differenceDeltaLeft
                            : styles.differenceDeltaRight),
                        }}
                      >
                        +{difference}
                      </div>

                      <div style={styles.differencePlayerSideRight}>
                        <span>{getPlayerName(rightPlayer)}</span>
                        <strong style={styles.rightValueBig}>
                          {item.rightValue}
                        </strong>
                      </div>
                    </div>

                    <div style={styles.differenceWinnerText}>
                      Przewaga: <strong>{betterPlayer}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={styles.compareMiniBox}>
            <h3 style={styles.compareBoxTitle}>Wniosek</h3>

            <div style={styles.verdictCompactList}>
              <div style={styles.verdictRow}>
                <span>Dopasowanie do roli</span>
                <strong>
                  {selectedRole
                    ? getWinnerLabel(
                        leftPlayer,
                        rightPlayer,
                        leftRoleScore,
                        rightRoleScore
                      )
                    : "Wybierz rolę"}
                </strong>
              </div>

              <div style={styles.verdictRow}>
                <span>
                  {isGoalkeeper(leftPlayer) ? "Bramkarsko" : "Technicznie"}
                </span>
                <strong>
                  {getWinnerLabel(
                    leftPlayer,
                    rightPlayer,
                    technicalComparison?.leftAverage ?? null,
                    technicalComparison?.rightAverage ?? null
                  )}
                </strong>
              </div>

              <div style={styles.verdictRow}>
                <span>Mentalnie</span>
                <strong>
                  {getWinnerLabel(
                    leftPlayer,
                    rightPlayer,
                    mentalComparison?.leftAverage ?? null,
                    mentalComparison?.rightAverage ?? null
                  )}
                </strong>
              </div>

              <div style={styles.verdictRow}>
                <span>Fizycznie</span>
                <strong>
                  {getWinnerLabel(
                    leftPlayer,
                    rightPlayer,
                    physicalComparison?.leftAverage ?? null,
                    physicalComparison?.rightAverage ?? null
                  )}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {showFullAttributes && (
          <div style={styles.fullAttributesPanel}>
            <div style={styles.fullAttributesHeader}>
              <h3 style={styles.compareBoxTitle}>Pełne atrybuty</h3>

              <div style={styles.fullAttributesLegend}>
                <span style={styles.leftLegendDot} /> {getPlayerName(leftPlayer)}
                <span style={styles.rightLegendDot} />{" "}
                {getPlayerName(rightPlayer)}
              </div>
            </div>

            <div style={styles.fullAttributesScroll}>
              {attributeGroups.map((group) => {
                const leftAverage = averageAttributes(
                  leftPlayer,
                  group.attributes
                );
                const rightAverage = averageAttributes(
                  rightPlayer,
                  group.attributes
                );

                return (
                  <div key={group.name} style={styles.groupBox}>
                    <h3 style={styles.groupTitle}>{group.name}</h3>

                    {group.attributes.map((attribute) => {
                      const leftValue = getNumericValue(leftPlayer, attribute);
                      const rightValue = getNumericValue(rightPlayer, attribute);
                      const roleImportance = getRoleAttributeImportance(
                        selectedRole,
                        attribute
                      );

                      return (
                        <div
                          key={attribute}
                          style={getAttributeRowStyle(roleImportance)}
                        >
                          <div style={styles.attributeName}>{attribute}</div>

                          <div style={styles.valueLeft}>
                            {getDisplayValue(leftPlayer, attribute)}
                          </div>

                          <BalanceBar
                            leftValue={leftValue}
                            rightValue={rightValue}
                          />

                          <div style={styles.valueRight}>
                            {getDisplayValue(rightPlayer, attribute)}
                          </div>

                          <div style={getDiffStyle(leftValue, rightValue)}>
                            {getDiffText(leftValue, rightValue)}
                          </div>
                        </div>
                      );
                    })}

                    <div style={styles.sectionSummaryRow}>
                      <div style={styles.sectionSummaryName}>
                        Średnia sekcji
                      </div>

                      <div style={styles.valueLeft}>
                        {formatNumber(leftAverage)}
                      </div>

                      <BalanceBar
                        leftValue={leftAverage}
                        rightValue={rightAverage}
                        scaleMaxDiff={20}
                      />

                      <div style={styles.valueRight}>
                        {formatNumber(rightAverage)}
                      </div>

                      <div style={getDiffStyle(leftAverage, rightAverage)}>
                        {leftAverage !== null && rightAverage !== null
                          ? getDiffText(leftAverage, rightAverage)
                          : "—"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

  return (
    <section style={styles.wrapper}>
      <h2 style={styles.title}>Porównanie zawodników</h2>

      <div style={styles.playerSelectors}>
        <AppSelectField
          label="Zawodnik po lewej"
          value={leftPlayerIndex}
          options={playerOptions.map((option) => ({
            value: String(option.index),
            label: option.label,
          }))}
          onChange={setLeftPlayerIndex}
          fieldStyle={styles.playerSelectField}
          labelStyle={styles.playerSelectLabel}
          selectStyle={styles.select}
        />

        <AppSelectField
          label="Zawodnik po prawej"
          value={rightPlayerIndex}
          options={rightPlayerOptions.map((option) => ({
            value: String(option.index),
            label: option.label,
          }))}
          onChange={setRightPlayerIndex}
          fieldStyle={styles.playerSelectField}
          labelStyle={styles.playerSelectLabel}
          selectStyle={styles.select}
        />
      </div>

      <div style={styles.compareActions}>
        <AppButton
          type="button"
          variant="secondary"
          size="compact"
          onClick={swapComparedPlayers}
          disabled={!leftPlayer || !rightPlayer}
        >
          Zamień strony
        </AppButton>

        <AppButton type="button" variant="neutral" size="compact" onClick={resetComparison}>
          Reset porównania
        </AppButton>
      </div>

      <div style={compareTypeInfoStyle}>
        Porównujesz: <strong>{getPlayerTypeLabel(leftPlayer)}</strong>. Lista po prawej stronie
        pokazuje tylko zgodnych zawodników. Opcje są sortowane po pozycjach.
      </div>

<div style={styles.playerCards}>
  <article style={styles.playerCard}>
    <div style={styles.playerCardInfoColumn}>
      <div style={styles.playerName}>{getPlayerName(leftPlayer)}</div>
      <div style={styles.playerInfo}>{getPlayerInfo(leftPlayer)}</div>
      <div style={styles.heightInfo}>Wzrost: {getPlayerHeight(leftPlayer)}</div>

      <div style={styles.footInfo}>
        <span style={getFootStyle(getPlayerFoot(leftPlayer, "Lewa noga"))}>
          Lewa: {getPlayerFoot(leftPlayer, "Lewa noga")}
        </span>

        <span style={getFootStyle(getPlayerFoot(leftPlayer, "Prawa noga"))}>
          Prawa: {getPlayerFoot(leftPlayer, "Prawa noga")}
        </span>
      </div>
    </div>

    <div style={styles.compareCompactRadarShell}>
      <div style={styles.compareMiniRadar}>
        <PlayerAttributeRadar
          player={leftPlayer}
          showHeader={false}
          showAxisList={false}
          compact
        />
      </div>
    </div>
  </article>

  <div style={styles.vsBox}>VS</div>

  <article style={styles.playerCard}>
    <div style={styles.playerCardInfoColumn}>
      <div style={styles.playerName}>{getPlayerName(rightPlayer)}</div>
      <div style={styles.playerInfo}>{getPlayerInfo(rightPlayer)}</div>
      <div style={styles.heightInfo}>Wzrost: {getPlayerHeight(rightPlayer)}</div>

      <div style={styles.footInfo}>
        <span style={getFootStyle(getPlayerFoot(rightPlayer, "Lewa noga"))}>
          Lewa: {getPlayerFoot(rightPlayer, "Lewa noga")}
        </span>

        <span style={getFootStyle(getPlayerFoot(rightPlayer, "Prawa noga"))}>
          Prawa: {getPlayerFoot(rightPlayer, "Prawa noga")}
        </span>
      </div>
    </div>

    <div style={styles.compareCompactRadarShell}>
      <div style={styles.compareMiniRadar}>
        <PlayerAttributeRadar
          player={rightPlayer}
          showHeader={false}
          showAxisList={false}
          compact
        />
      </div>
    </div>
  </article>
</div>

      {selectedRole && (
        <div style={styles.roleScorePanel}>
          <div style={styles.roleScoreCard}>
            <div style={styles.roleScoreName}>{getPlayerName(leftPlayer)}</div>
            <div style={styles.roleScoreValue}>{formatNumber(leftRoleScore)} / 100</div>
            <div style={styles.roleScoreRange}>Zakres: {formatRoleScoreRange(leftRoleScoreResult)}</div>
            <div style={styles.roleScoreUncertainty}>
              Niepewność: {formatRoleUncertainty(leftRoleScoreResult)}
            </div>
          </div>

          <div style={styles.roleScoreBarBox}>
            <div style={styles.roleScoreTitle}>Dopasowanie do roli: {selectedRole.name}</div>
            <BalanceBar leftValue={leftRoleScore} rightValue={rightRoleScore} scaleMaxDiff={100} />
          </div>

          <div style={styles.roleScoreCard}>
            <div style={styles.roleScoreName}>{getPlayerName(rightPlayer)}</div>
            <div style={styles.roleScoreValue}>{formatNumber(rightRoleScore)} / 100</div>
            <div style={styles.roleScoreRange}>Zakres: {formatRoleScoreRange(rightRoleScoreResult)}</div>
            <div style={styles.roleScoreUncertainty}>
              Niepewność: {formatRoleUncertainty(rightRoleScoreResult)}
            </div>
          </div>
        </div>
      )}

<div style={styles.compareSectionTogglePanel}>
  <div style={styles.compareSectionToggleHeader}>
    <div>
      <strong style={styles.compareSectionToggleTitle}>Moneyball H2H</strong>

      <div style={styles.compareSectionToggleText}>
        Porównanie statystyk klubowych. Przydatne, ale ciężkie, więc domyślnie zwinięte.
      </div>
    </div>

    <button
      type="button"
      style={{
        ...styles.compareSectionToggleButton,
        ...(showMoneyballH2H ? styles.compareSectionToggleButtonActive : {}),
      }}
      onClick={() => setShowMoneyballH2H((current) => !current)}
    >
      {showMoneyballH2H ? "Ukryj Moneyball" : "Pokaż Moneyball"}
    </button>
  </div>

  {showMoneyballH2H && (
<div style={styles.compareSectionTogglePanel}>
  <div style={styles.compareSectionToggleHeader}>
    <div>
      <strong style={styles.compareSectionToggleTitle}>Moneyball H2H</strong>

      <div style={styles.compareSectionToggleText}>
        Klubowe liczby, xG, obrona strzałów, dystrybucja i próba minut.
      </div>
    </div>

    <button
      type="button"
      style={{
        ...styles.compareSectionToggleButton,
        ...(showMoneyballH2H ? styles.compareSectionToggleButtonActive : {}),
      }}
      onClick={() => setShowMoneyballH2H((current) => !current)}
    >
      {showMoneyballH2H ? "Ukryj Moneyball" : "Pokaż Moneyball"}
    </button>
  </div>

  {showMoneyballH2H && (
    <MoneyballCompare
      leftPlayer={leftPlayer}
      rightPlayer={rightPlayer}
      rows={rows}
    />
  )}
</div>  )}
</div>
      
<div style={styles.compareSectionTogglePanel}>
  <div style={styles.compareSectionToggleHeader}>
    <div>
      <strong style={styles.compareSectionToggleTitle}>Pełne atrybuty</strong>

      <div style={styles.compareSectionToggleText}>
        Szczegółowa tabela wszystkich atrybutów. Domyślnie schowana, bo jest długa i ciężka.
      </div>
    </div>

    <button
      type="button"
      style={{
        ...styles.compareSectionToggleButton,
        ...(showFullAttributes ? styles.compareSectionToggleButtonActive : {}),
      }}
      onClick={() => setShowFullAttributes((current) => !current)}
    >
      {showFullAttributes ? "Ukryj atrybuty" : "Pokaż pełne atrybuty"}
    </button>
  </div>
</div>
<div style={showFullAttributes ? styles.compareBody : styles.compareBodySummaryOnly}>
            <div style={styles.compareLeftPanel}>
          <div style={styles.compareMiniBox}>
            <h3 style={styles.compareBoxTitle}>Profil sekcji</h3>

            <div style={styles.sectionVsList}>
              {sectionComparisons.map((section) => {
                const leftValue = section.leftAverage ?? 0;
                const rightValue = section.rightAverage ?? 0;
                const difference = leftValue - rightValue;

                const winner =
                  Math.abs(difference) < 0.1
                    ? "Remis"
                    : difference > 0
                    ? getPlayerName(leftPlayer)
                    : getPlayerName(rightPlayer);

                return (
                  <div key={section.name} style={styles.sectionVsCard}>
                    <div style={styles.sectionVsTop}>
                      <strong>{section.name}</strong>
                      <span>{winner}</span>
                    </div>

                    <div style={styles.sectionVsMiddle}>
                      <div style={styles.sectionVsPlayer}>
                        <span>{getPlayerName(leftPlayer)}</span>
                        <strong style={styles.leftValueBig}>{formatNumber(section.leftAverage)}</strong>
                      </div>

                      <div
                        style={{
                          ...styles.sectionVsDiff,
                          ...(difference > 0
                            ? styles.sectionVsDiffLeft
                            : difference < 0
                            ? styles.sectionVsDiffRight
                            : styles.sectionVsDiffNeutral),
                        }}
                      >
                        {Math.abs(difference) < 0.1
                          ? "0.0"
                          : `+${formatNumber(Math.abs(difference))}`}
                      </div>

                      <div style={styles.sectionVsPlayerRight}>
                        <span>{getPlayerName(rightPlayer)}</span>
                        <strong style={styles.rightValueBig}>{formatNumber(section.rightAverage)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={styles.compareMiniBox}>
            <h3 style={styles.compareBoxTitle}>Największe różnice</h3>

            <div style={styles.differenceCardsGrid}>
              {biggestAttributeDifferences.map((item) => {
                const leftBetter = item.leftValue > item.rightValue;
                const betterPlayer = leftBetter ? getPlayerName(leftPlayer) : getPlayerName(rightPlayer);
                const difference = Math.abs(item.leftValue - item.rightValue);

                return (
                  <div key={item.attribute} style={styles.differenceBigCard}>
                    <div style={styles.differenceCategoryPill}>{item.groupName}</div>
                    <div style={styles.differenceAttributeName}>{item.attribute}</div>

                    <div style={styles.differencePlayersRow}>
                      <div style={styles.differencePlayerSide}>
                        <span>{getPlayerName(leftPlayer)}</span>
                        <strong style={styles.leftValueBig}>{item.leftValue}</strong>
                      </div>

                      <div
                        style={{
                          ...styles.differenceDelta,
                          ...(leftBetter ? styles.differenceDeltaLeft : styles.differenceDeltaRight),
                        }}
                      >
                        +{difference}
                      </div>

                      <div style={styles.differencePlayerSideRight}>
                        <span>{getPlayerName(rightPlayer)}</span>
                        <strong style={styles.rightValueBig}>{item.rightValue}</strong>
                      </div>
                    </div>

                    <div style={styles.differenceWinnerText}>
                      Przewaga: <strong>{betterPlayer}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={styles.compareMiniBox}>
            <h3 style={styles.compareBoxTitle}>Wniosek</h3>

            <div style={styles.verdictCompactList}>
<div style={styles.verdictRow}>
  <span>Dopasowanie do roli</span>
  <strong>
    {selectedRole
      ? getWinnerLabel(leftPlayer, rightPlayer, leftRoleScore, rightRoleScore)
      : "Wybierz rolę"}
  </strong>
</div>

              <div style={styles.verdictRow}>
                <span>{isGoalkeeper(leftPlayer) ? "Bramkarsko" : "Technicznie"}</span>
                <strong>
                  {getWinnerLabel(
                    leftPlayer,
                    rightPlayer,
                    technicalComparison?.leftAverage ?? null,
                    technicalComparison?.rightAverage ?? null
                  )}
                </strong>
              </div>

              <div style={styles.verdictRow}>
                <span>Mentalnie</span>
                <strong>
                  {getWinnerLabel(
                    leftPlayer,
                    rightPlayer,
                    mentalComparison?.leftAverage ?? null,
                    mentalComparison?.rightAverage ?? null
                  )}
                </strong>
              </div>

              <div style={styles.verdictRow}>
                <span>Fizycznie</span>
                <strong>
                  {getWinnerLabel(
                    leftPlayer,
                    rightPlayer,
                    physicalComparison?.leftAverage ?? null,
                    physicalComparison?.rightAverage ?? null
                  )}
                </strong>
              </div>
            </div>
          </div>
        </div>
{showFullAttributes && (
  <div style={styles.fullAttributesPanel}>
    <div style={styles.fullAttributesHeader}>
      <h3 style={styles.compareBoxTitle}>Pełne atrybuty</h3>

      <div style={styles.fullAttributesLegend}>
        <span style={styles.leftLegendDot} /> {getPlayerName(leftPlayer)}
        <span style={styles.rightLegendDot} /> {getPlayerName(rightPlayer)}
      </div>
    </div>

    <div style={styles.fullAttributesScroll}>
      {attributeGroups.map((group) => {
        const leftAverage = averageAttributes(leftPlayer, group.attributes);
        const rightAverage = averageAttributes(rightPlayer, group.attributes);

        return (
          <div key={group.name} style={styles.groupBox}>
            <h3 style={styles.groupTitle}>{group.name}</h3>

            {group.attributes.map((attribute) => {
              const leftValue = getNumericValue(leftPlayer, attribute);
              const rightValue = getNumericValue(rightPlayer, attribute);
              const roleImportance = getRoleAttributeImportance(
                selectedRole,
                attribute
              );

              return (
                <div key={attribute} style={getAttributeRowStyle(roleImportance)}>
                  <div style={styles.attributeName}>{attribute}</div>

                  <div style={styles.valueLeft}>
                    {getDisplayValue(leftPlayer, attribute)}
                  </div>

                  <BalanceBar leftValue={leftValue} rightValue={rightValue} />

                  <div style={styles.valueRight}>
                    {getDisplayValue(rightPlayer, attribute)}
                  </div>

                  <div style={getDiffStyle(leftValue, rightValue)}>
                    {getDiffText(leftValue, rightValue)}
                  </div>
                </div>
              );
            })}

            <div style={styles.sectionSummaryRow}>
              <div style={styles.sectionSummaryName}>Średnia sekcji</div>
              <div style={styles.valueLeft}>{formatNumber(leftAverage)}</div>

              <BalanceBar
                leftValue={leftAverage}
                rightValue={rightAverage}
                scaleMaxDiff={20}
              />

              <div style={styles.valueRight}>{formatNumber(rightAverage)}</div>

              <div style={getDiffStyle(leftAverage, rightAverage)}>
                {leftAverage !== null && rightAverage !== null
                  ? getDiffText(leftAverage, rightAverage)
                  : "—"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}
      </div>
    </section>
  );
}
