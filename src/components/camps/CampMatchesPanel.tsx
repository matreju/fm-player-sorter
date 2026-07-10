import { useMemo, useState, type CSSProperties } from "react";
import type {
  Camp,
  CampMatch,
  CampMatchAppearance,
  CampMatchType,
  CampPlayerSnapshot,
} from "../../types/camp";
import { MATCH_TYPES, getMatchTypeLabel } from "../../utils/campCore";
import {
  formatMatchScore,
  getAppearanceForPlayer,
  getMatchAppearancesSummary,
  getMatchResultTone,
} from "../../utils/campStats";
import { styles } from "./CampsDrawer.styles";

type MatchMetaPatch = Partial<
  Pick<CampMatch, "opponent" | "date" | "type" | "teamGoals" | "opponentGoals">
>;

type CampMatchesPanelProps = {
  camp: Camp;
  activeMatch: CampMatch | null;

  matchOpponent: string;
  matchDate: string;
  matchType: CampMatchType;
  teamGoals: string;
  opponentGoals: string;

  onMatchOpponentChange: (value: string) => void;
  onMatchDateChange: (value: string) => void;
  onMatchTypeChange: (value: CampMatchType) => void;
  onTeamGoalsChange: (value: string) => void;
  onOpponentGoalsChange: (value: string) => void;

  onCreateMatch: () => void;
  onSelectMatch: (matchId: string) => void;
  onDeleteMatch: (campId: string, matchId: string) => void;
  onUpdateMatch: (campId: string, matchId: string, patch: MatchMetaPatch) => void;
  onUpdateAppearance: (
    campId: string,
    matchId: string,
    playerKey: string,
    patch: Partial<CampMatchAppearance>
  ) => void;
};

const QUICK_MINUTES = [90, 75, 70, 60, 56, 45, 34, 30, 15];
type CampPlayerPositionGroup = {
  order: number;
  label: string;
};

function normalizePlayerPositionText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .replace(/\s+/g, " ");
}

function makePositionGroup(order: number, label: string): CampPlayerPositionGroup {
  return { order, label };
}

function getCallUpPositionGroup(
  callUpPosition: string | undefined
): CampPlayerPositionGroup | null {
  const position = normalizePlayerPositionText(callUpPosition);

  if (!position || position === "brak zapisanej pozycji") {
    return null;
  }

  if (position.includes("bramkarz")) {
    return makePositionGroup(0, "Bramkarze");
  }

  if (
    position.includes("boczny obronca") ||
    position.includes("wahadlowy") ||
    position.includes("wahadlo")
  ) {
    return makePositionGroup(10, "Boczni obrońcy / wahadła");
  }

  if (
    position.includes("srodkowy obronca") ||
    position.includes("stoper")
  ) {
    return makePositionGroup(20, "Środkowi obrońcy");
  }

  if (position.includes("defensywny pomocnik")) {
    return makePositionGroup(30, "Defensywni pomocnicy");
  }

  if (position.includes("srodkowy pomocnik")) {
    return makePositionGroup(40, "Środkowi pomocnicy");
  }

  if (position.includes("ofensywny pomocnik")) {
    return makePositionGroup(50, "Ofensywni pomocnicy");
  }

  if (
  position.includes("skrzydlowy") ||
  position.includes("skrzydlowi") ||
  position.includes("skrzydlo") ||
  position.includes("boczny pomocnik")
) {
  return makePositionGroup(60, "Skrzydłowi");
}

  if (position.includes("napastnik")) {
    return makePositionGroup(70, "Napastnicy");
  }

  return null;
}

function getFmPositionChunks(position: string): string[] {
  return normalizePlayerPositionText(position)
    .toUpperCase()
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function getFmPositionCodes(chunk: string): string[] {
  const codePart = chunk.split("(")[0] ?? "";

  return codePart
    .split(/[\/\s]+/g)
    .map((code) => code.trim())
    .filter(Boolean);
}

function getFmPositionSideText(chunk: string): string {
  const match = chunk.match(/\(([^)]*)\)/);

  return match?.[1] ?? "";
}

function hasFmCode(chunk: string, code: string): boolean {
  return getFmPositionCodes(chunk).includes(code);
}

function isCentralFmChunk(chunk: string): boolean {
  const sideText = getFmPositionSideText(chunk);

  return sideText.includes("S");
}

function isWideFmChunk(chunk: string): boolean {
  const sideText = getFmPositionSideText(chunk);

  return sideText.includes("L") || sideText.includes("P");
}

function getFmFallbackPositionGroup(
  fmPosition: string | undefined
): CampPlayerPositionGroup {
  const chunks = getFmPositionChunks(fmPosition ?? "");

  for (const chunk of chunks) {
    if (hasFmCode(chunk, "BR")) {
      return makePositionGroup(0, "Bramkarze");
    }
  }

  for (const chunk of chunks) {
    if (hasFmCode(chunk, "WO")) {
      return makePositionGroup(10, "Boczni obrońcy / wahadła");
    }

    if (hasFmCode(chunk, "O")) {
      if (isCentralFmChunk(chunk) && !isWideFmChunk(chunk)) {
        return makePositionGroup(20, "Środkowi obrońcy");
      }

      if (isWideFmChunk(chunk)) {
        return makePositionGroup(10, "Boczni obrońcy / wahadła");
      }
    }
  }

  for (const chunk of chunks) {
    if (hasFmCode(chunk, "DP")) {
      return makePositionGroup(30, "Defensywni pomocnicy");
    }
  }

  for (const chunk of chunks) {
    if (hasFmCode(chunk, "P")) {
      if (isCentralFmChunk(chunk) && !isWideFmChunk(chunk)) {
        return makePositionGroup(40, "Środkowi pomocnicy");
      }

      if (isWideFmChunk(chunk)) {
        return makePositionGroup(60, "Skrzydłowi");
      }
    }
  }

  for (const chunk of chunks) {
    if (hasFmCode(chunk, "OP")) {
      if (isWideFmChunk(chunk)) {
        return makePositionGroup(60, "Skrzydłowi");
      }

      return makePositionGroup(50, "Ofensywni pomocnicy");
    }
  }

  for (const chunk of chunks) {
    if (hasFmCode(chunk, "N")) {
      return makePositionGroup(70, "Napastnicy");
    }
  }

  return makePositionGroup(90, "Pozostali");
}

function getCampPlayerPositionGroup(
  player: CampPlayerSnapshot
): CampPlayerPositionGroup {
  const callUpGroup = getCallUpPositionGroup(player.callUpPosition);

  if (callUpGroup) {
    return callUpGroup;
  }

  return getFmFallbackPositionGroup(player.position);
}

function getCampPlayerPositionSortOrder(player: CampPlayerSnapshot): number {
  return getCampPlayerPositionGroup(player).order;
}

function getCampPlayerPositionGroupLabel(player: CampPlayerSnapshot): string {
  return getCampPlayerPositionGroup(player).label;
}

function sortCampMatchPlayers(
  players: CampPlayerSnapshot[]
): CampPlayerSnapshot[] {
  return [...players].sort((left, right) => {
    const leftGroup = getCampPlayerPositionGroup(left);
    const rightGroup = getCampPlayerPositionGroup(right);

    if (leftGroup.order !== rightGroup.order) {
      return leftGroup.order - rightGroup.order;
    }

    const leftCallUpPosition = normalizePlayerPositionText(
      left.callUpPosition || left.position
    );
    const rightCallUpPosition = normalizePlayerPositionText(
      right.callUpPosition || right.position
    );

    const callUpPositionDiff = leftCallUpPosition.localeCompare(
      rightCallUpPosition,
      "pl"
    );

    if (callUpPositionDiff !== 0) {
      return callUpPositionDiff;
    }

    return left.name.localeCompare(right.name, "pl");
  });
}
const liveEditorStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 1.2fr) 150px 170px 120px 120px",
  gap: 8,
  marginBottom: 12,
  padding: 10,
  border: "1px solid #263247",
  borderRadius: 12,
  background: "rgba(15, 23, 42, 0.72)",
};

const quickPanelStyle: CSSProperties = {
  display: "grid",
  gap: 9,
  marginBottom: 12,
  padding: 10,
  border: "1px solid #263247",
  borderRadius: 12,
  background: "rgba(11, 18, 32, 0.9)",
};

const quickTopRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
};

const quickButtonsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
};

const quickButtonStyle: CSSProperties = {
  height: 30,
  padding: "0 10px",
  borderRadius: 999,
  border: "1px solid #334155",
  background: "#0b1220",
  color: "#cbd5e1",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 950,
};

const quickButtonActiveStyle: CSSProperties = {
  borderColor: "#38bdf8",
  background: "rgba(14, 165, 233, 0.22)",
  color: "#e0f2fe",
  boxShadow: "0 0 0 3px rgba(56, 189, 248, 0.1)",
};

const quickDangerButtonStyle: CSSProperties = {
  ...quickButtonStyle,
  borderColor: "rgba(239, 68, 68, 0.55)",
  background: "rgba(239, 68, 68, 0.13)",
  color: "#fecaca",
};

const quickSuccessButtonStyle: CSSProperties = {
  ...quickButtonStyle,
  borderColor: "rgba(34, 197, 94, 0.55)",
  background: "rgba(34, 197, 94, 0.13)",
  color: "#bbf7d0",
};

const quickInputStyle: CSSProperties = {
  width: 62,
  height: 30,
  borderRadius: 9,
  border: "1px solid #334155",
  background: "#070b12",
  color: "#eef4ff",
  textAlign: "center",
  fontSize: 13,
  fontWeight: 950,
};

const appearanceGridStyle: CSSProperties = {
  gridTemplateColumns:
    "minmax(260px, 1fr) 62px 150px 135px 135px 120px 130px",
};

const playerClickButtonStyle: CSSProperties = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 2,
  border: "none",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  textAlign: "left",
  padding: 0,
};

const smallHintStyle: CSSProperties = {
  color: "#93c5fd",
  fontSize: 11,
  fontWeight: 850,
};

const stepperStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "28px minmax(0, 1fr) 28px",
  gap: 5,
  alignItems: "center",
};

const stepButtonStyle: CSSProperties = {
  height: 28,
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#101624",
  color: "#dbeafe",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 950,
};

const rowQuickButtonStyle: CSSProperties = {
  height: 30,
  width: "100%",
  borderRadius: 9,
  border: "1px solid rgba(56, 189, 248, 0.48)",
  background: "rgba(56, 189, 248, 0.12)",
  color: "#bae6fd",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 950,
};
const positionGroupHeaderStyle: CSSProperties = {
  marginTop: 8,
  padding: "5px 12px",
  border: "1px solid rgba(56, 189, 248, 0.22)",
  borderRadius: 10,
  background: "rgba(14, 165, 233, 0.10)",
  color: "#7dd3fc",
  fontSize: 11,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};
function clampMinutes(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(120, Math.round(value)));
}

function parseNumberInput(value: string): number {
  const parsed = Number(String(value || "0").replace(",", "."));

  return Number.isFinite(parsed) ? parsed : 0;
}

function numberToFieldValue(value: number): string {
  return value > 0 ? String(value) : "";
}

function changeNumericField(value: string, delta: number): string {
  const nextValue = Math.max(0, parseNumberInput(value) + delta);

  return numberToFieldValue(nextValue);
}

function getPlayersForMatch(
  camp: Camp,
  match: CampMatch
): CampPlayerSnapshot[] {
  return match.appearances.map((appearance) => {
    const player = camp.players.find(
      (campPlayer) => campPlayer.key === appearance.playerKey
    );

    if (player) {
      return player;
    }

    return {
      key: appearance.playerKey,
      name: "Usunięty zawodnik",
      club: "-",
      position: "-",
      age: "-",
      status: "released",
    };
  });
}

export function CampMatchesPanel({
  camp,
  activeMatch,
  matchOpponent,
  matchDate,
  matchType,
  onMatchOpponentChange,
  onMatchDateChange,
  onMatchTypeChange,
  onCreateMatch,
  onSelectMatch,
  onDeleteMatch,
  onUpdateMatch,
  onUpdateAppearance,
}: CampMatchesPanelProps) {
  const [quickMinutes, setQuickMinutes] = useState(90);
  const [defaultRating, setDefaultRating] = useState("6,8");
  const [showOnlyPlayed, setShowOnlyPlayed] = useState(false);

  function setPlayerMinutes(
    match: CampMatch,
    playerKey: string,
    minutes: number
  ) {
    const nextMinutes = clampMinutes(minutes);

    if (nextMinutes <= 0) {
      onUpdateAppearance(camp.id, match.id, playerKey, {
        played: false,
        minutes: "",
        goals: "",
        assists: "",
        rating: "",
      });
      return;
    }

    onUpdateAppearance(camp.id, match.id, playerKey, {
      played: true,
      minutes: String(nextMinutes),
    });
  }

  function clearPlayerAppearance(match: CampMatch, playerKey: string) {
    onUpdateAppearance(camp.id, match.id, playerKey, {
      played: false,
      minutes: "",
      goals: "",
      assists: "",
      rating: "",
    });
  }

  function updateStatValue(
    match: CampMatch,
    playerKey: string,
    field: "goals" | "assists",
    currentValue: string,
    delta: number
  ) {
    onUpdateAppearance(camp.id, match.id, playerKey, {
      played: true,
      [field]: changeNumericField(currentValue, delta),
    });
  }

  function setDefaultRatingForPlayed(match: CampMatch) {
    const rating = defaultRating.trim();

    if (!rating) {
      return;
    }

    for (const appearance of match.appearances) {
      if (!appearance.played || appearance.rating.trim()) {
        continue;
      }

      onUpdateAppearance(camp.id, match.id, appearance.playerKey, {
        rating,
      });
    }
  }

  function clearMatchAppearances(match: CampMatch) {
    const confirmed = confirm(
      "Wyczyścić wszystkie występy, minuty, gole, asysty i oceny w tym meczu?"
    );

    if (!confirmed) {
      return;
    }

    for (const appearance of match.appearances) {
      clearPlayerAppearance(match, appearance.playerKey);
    }
  }

  const sortedMatches = useMemo(() => {
    return [...camp.matches].sort((left, right) => {
      if (right.date !== left.date) {
        return right.date.localeCompare(left.date);
      }

      return right.id.localeCompare(left.id);
    });
  }, [camp.matches]);

  function renderLiveMatchEditor(match: CampMatch) {
    return (
      <div style={liveEditorStyle}>
        <label style={styles.field}>
          Rywal
          <input
            value={match.opponent}
            onChange={(event) =>
              onUpdateMatch(camp.id, match.id, {
                opponent: event.target.value,
              })
            }
            style={styles.input}
            placeholder="np. Irlandia"
          />
        </label>

        <label style={styles.field}>
          Data
          <input
            type="date"
            value={match.date}
            onChange={(event) =>
              onUpdateMatch(camp.id, match.id, {
                date: event.target.value,
              })
            }
            style={styles.input}
          />
        </label>

        <label style={styles.field}>
          Typ meczu
          <select
            value={match.type}
            onChange={(event) =>
              onUpdateMatch(camp.id, match.id, {
                type: event.target.value as CampMatchType,
              })
            }
            style={styles.input}
          >
            {MATCH_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.field}>
          Nasze gole
          <input
            type="number"
            min="0"
            value={match.teamGoals}
            onChange={(event) =>
              onUpdateMatch(camp.id, match.id, {
                teamGoals: event.target.value,
              })
            }
            style={styles.input}
            placeholder="po meczu"
          />
        </label>

        <label style={styles.field}>
          Gole rywala
          <input
            type="number"
            min="0"
            value={match.opponentGoals}
            onChange={(event) =>
              onUpdateMatch(camp.id, match.id, {
                opponentGoals: event.target.value,
              })
            }
            style={styles.input}
            placeholder="po meczu"
          />
        </label>
      </div>
    );
  }

  function renderQuickToolbar(match: CampMatch) {
    return (
      <div style={quickPanelStyle}>
        <div style={quickTopRowStyle}>
          <div style={quickButtonsStyle}>
            <strong style={{ color: "#eef4ff", fontSize: 13 }}>
              Szybkie minuty:
            </strong>

            {QUICK_MINUTES.map((minutes) => {
              const isActive = quickMinutes === minutes;

              return (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setQuickMinutes(minutes)}
                  style={{
                    ...quickButtonStyle,
                    ...(isActive ? quickButtonActiveStyle : {}),
                  }}
                >
                  {minutes}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setQuickMinutes(0)}
              style={{
                ...quickDangerButtonStyle,
                ...(quickMinutes === 0 ? quickButtonActiveStyle : {}),
              }}
            >
              Nie grał
            </button>
          </div>

          <div style={quickButtonsStyle}>
            <button
              type="button"
              onClick={() =>
                setQuickMinutes((current) => clampMinutes(current - 1))
              }
              style={stepButtonStyle}
              aria-label="Zmniejsz szybkie minuty"
            >
              −
            </button>

            <input
              type="number"
              min="0"
              max="120"
              value={quickMinutes}
              onChange={(event) =>
                setQuickMinutes(clampMinutes(Number(event.target.value)))
              }
              style={quickInputStyle}
              aria-label="Własna liczba minut"
            />

            <button
              type="button"
              onClick={() =>
                setQuickMinutes((current) => clampMinutes(current + 1))
              }
              style={stepButtonStyle}
              aria-label="Zwiększ szybkie minuty"
            >
              +
            </button>
          </div>
        </div>

        <div style={quickTopRowStyle}>
          <div style={quickButtonsStyle}>
            <button
              type="button"
              onClick={() => setDefaultRatingForPlayed(match)}
              style={quickSuccessButtonStyle}
            >
              {defaultRating || "6,8"} dla grających bez oceny
            </button>

            <input
              value={defaultRating}
              onChange={(event) => setDefaultRating(event.target.value)}
              style={quickInputStyle}
              placeholder="6,8"
              aria-label="Domyślna ocena"
            />

            <button
              type="button"
              onClick={() => setShowOnlyPlayed((current) => !current)}
              style={{
                ...quickButtonStyle,
                ...(showOnlyPlayed ? quickButtonActiveStyle : {}),
              }}
            >
              {showOnlyPlayed ? "Pokaż wszystkich" : "Tylko grający"}
            </button>

            <button
              type="button"
              onClick={() => clearMatchAppearances(match)}
              style={quickDangerButtonStyle}
            >
              Wyczyść występy
            </button>
          </div>

          <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 800 }}>
            Kliknij nazwisko zawodnika, żeby wpisać mu{" "}
            <strong style={{ color: "#e0f2fe" }}>{quickMinutes}</strong> min.
          </div>
        </div>
      </div>
    );
  }

  function renderStepperInput({
    value,
    disabled,
    min = 0,
    max,
    placeholder,
    onValueChange,
    onStep,
  }: {
    value: string;
    disabled: boolean;
    min?: number;
    max?: number;
    placeholder?: string;
    onValueChange: (value: string) => void;
    onStep: (delta: number) => void;
  }) {
    return (
      <div style={stepperStyle}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onStep(-1)}
          style={{
            ...stepButtonStyle,
            opacity: disabled ? 0.45 : 1,
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          −
        </button>

        <input
          type="number"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          style={{
            ...styles.appearanceInput,
            ...(disabled ? styles.appearanceInputDisabled : {}),
          }}
        />

        <button
          type="button"
          disabled={disabled}
          onClick={() => onStep(1)}
          style={{
            ...stepButtonStyle,
            opacity: disabled ? 0.45 : 1,
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          +
        </button>
      </div>
    );
  }

  function renderAppearancesPanel(match: CampMatch) {
    const summary = getMatchAppearancesSummary(match);
const playersForMatch = sortCampMatchPlayers(getPlayersForMatch(camp, match));
    const visiblePlayers = showOnlyPlayed
      ? playersForMatch.filter(
          (player) => getAppearanceForPlayer(match, player.key).played
        )
      : playersForMatch;
const groupedVisiblePlayers = visiblePlayers.reduce<
  Array<
    | {
        type: "group";
        label: string;
      }
    | {
        type: "player";
        player: CampPlayerSnapshot;
      }
  >
>((items, player) => {
  const groupLabel = getCampPlayerPositionGroupLabel(player);
  const previousItem = items[items.length - 1];

  const shouldAddGroup =
    !previousItem ||
    (previousItem.type === "group" && previousItem.label !== groupLabel) ||
    (previousItem.type === "player" &&
      getCampPlayerPositionGroupLabel(previousItem.player) !== groupLabel);

  if (shouldAddGroup) {
    items.push({
      type: "group",
      label: groupLabel,
    });
  }

  items.push({
    type: "player",
    player,
  });

  return items;
}, []);
    return (
      <section style={styles.appearancesPanel}>
        <div style={styles.appearancesHeader}>
          <div>
            <h3 style={styles.appearancesTitle}>
              Występy: nasza drużyna — {match.opponent || "bez rywala"}
            </h3>

            <div style={styles.appearancesMeta}>
              {getMatchTypeLabel(match.type)}
              {match.date ? ` · ${match.date}` : ""} · wynik:{" "}
              {formatMatchScore(match)}
            </div>
          </div>

          <div style={styles.appearancesSummary}>
            Zagrało: <strong>{summary.played}</strong> · Gole:{" "}
            <strong>{summary.goals}</strong> · Asysty:{" "}
            <strong>{summary.assists}</strong>
          </div>
        </div>

        {renderLiveMatchEditor(match)}
        {renderQuickToolbar(match)}

        <div style={styles.appearancesTable}>
          <div
            style={{
              ...styles.appearanceRow,
              ...styles.appearanceHeadRow,
              ...appearanceGridStyle,
            }}
          >
            <div>Zawodnik</div>
            <div>Grał</div>
            <div>Minuty</div>
            <div>Gole</div>
            <div>Asysty</div>
            <div>Ocena</div>
            <div>Szybko</div>
          </div>

          {visiblePlayers.length === 0 && (
            <div style={styles.empty}>Brak zawodników do pokazania.</div>
          )}

{groupedVisiblePlayers.map((item) => {
  if (item.type === "group") {
    return (
      <div key={`group-${item.label}`} style={positionGroupHeaderStyle}>
        {item.label}
      </div>
    );
  }

  const player = item.player;            const appearance = getAppearanceForPlayer(match, player.key);
            const isDisabled = !appearance.played;

            return (
              <div
                key={player.key}
                style={{
                  ...styles.appearanceRow,
                  ...appearanceGridStyle,
                  ...(appearance.played
                    ? {
                        borderColor: "rgba(34, 197, 94, 0.24)",
                        background: "rgba(20, 83, 45, 0.08)",
                      }
                    : {}),
                }}
              >
                <div style={styles.appearancePlayerCell}>
                  <button
                    type="button"
                    onClick={() =>
                      quickMinutes <= 0
                        ? clearPlayerAppearance(match, player.key)
                        : setPlayerMinutes(match, player.key, quickMinutes)
                    }
                    style={playerClickButtonStyle}
                    title={`Kliknij, żeby ustawić ${quickMinutes} minut`}
                  >
                    <strong>{player.name}</strong>
<span>
  {player.position} · {player.club}
</span>

{player.callUpPosition && (
  <span style={smallHintStyle}>
    powołany jako: {player.callUpPosition}
  </span>
)}
                    <span style={smallHintStyle}>
                      klik = {quickMinutes <= 0 ? "nie grał" : `${quickMinutes} min`}
                    </span>
                  </button>
                </div>

                <input
                  type="checkbox"
                  checked={appearance.played}
                  onChange={(event) => {
                    const played = event.target.checked;

                    onUpdateAppearance(camp.id, match.id, player.key, {
                      played,
                      minutes: played
                        ? appearance.minutes || String(quickMinutes || 90)
                        : "",
                      goals: played ? appearance.goals : "",
                      assists: played ? appearance.assists : "",
                      rating: played ? appearance.rating : "",
                    });
                  }}
                  style={styles.appearanceCheckbox}
                />

                {renderStepperInput({
                  value: appearance.minutes,
                  disabled: isDisabled,
                  min: 0,
                  max: 120,
                  placeholder: "min",
                  onValueChange: (value) =>
                    onUpdateAppearance(camp.id, match.id, player.key, {
                      minutes: value,
                      played: true,
                    }),
                  onStep: (delta) =>
                    setPlayerMinutes(
                      match,
                      player.key,
                      clampMinutes(parseNumberInput(appearance.minutes) + delta)
                    ),
                })}

                {renderStepperInput({
                  value: appearance.goals,
                  disabled: isDisabled,
                  min: 0,
                  placeholder: "0",
                  onValueChange: (value) =>
                    onUpdateAppearance(camp.id, match.id, player.key, {
                      goals: value,
                      played: true,
                    }),
                  onStep: (delta) =>
                    updateStatValue(
                      match,
                      player.key,
                      "goals",
                      appearance.goals,
                      delta
                    ),
                })}

                {renderStepperInput({
                  value: appearance.assists,
                  disabled: isDisabled,
                  min: 0,
                  placeholder: "0",
                  onValueChange: (value) =>
                    onUpdateAppearance(camp.id, match.id, player.key, {
                      assists: value,
                      played: true,
                    }),
                  onStep: (delta) =>
                    updateStatValue(
                      match,
                      player.key,
                      "assists",
                      appearance.assists,
                      delta
                    ),
                })}

                <input
                  type="text"
                  value={appearance.rating}
                  disabled={isDisabled}
                  onChange={(event) =>
                    onUpdateAppearance(camp.id, match.id, player.key, {
                      rating: event.target.value,
                      played: true,
                    })
                  }
                  placeholder="np. 7.2"
                  style={{
                    ...styles.appearanceInput,
                    ...(isDisabled ? styles.appearanceInputDisabled : {}),
                  }}
                />

                <button
                  type="button"
                  onClick={() =>
                    quickMinutes <= 0
                      ? clearPlayerAppearance(match, player.key)
                      : setPlayerMinutes(match, player.key, quickMinutes)
                  }
                  style={rowQuickButtonStyle}
                >
                  {quickMinutes <= 0 ? "Nie grał" : `${quickMinutes} min`}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section style={styles.matchPanel}>
      <div style={styles.matchHeader}>
        <h3 style={styles.sectionTitle}>Mecze</h3>

        <div style={styles.matchCounter}>{camp.matches.length} zapisanych</div>
      </div>

      <div
        style={{
          ...styles.matchFormGrid,
          gridTemplateColumns: "minmax(260px, 1fr) 170px 190px auto",
        }}
      >
        <label style={styles.field}>
          Rywal
          <input
            value={matchOpponent}
            onChange={(event) => onMatchOpponentChange(event.target.value)}
            style={styles.input}
            placeholder="np. Niemcy"
          />
        </label>

        <label style={styles.field}>
          Data
          <input
            type="date"
            value={matchDate}
            onChange={(event) => onMatchDateChange(event.target.value)}
            style={styles.input}
          />
        </label>

        <label style={styles.field}>
          Typ meczu
          <select
            value={matchType}
            onChange={(event) =>
              onMatchTypeChange(event.target.value as CampMatchType)
            }
            style={styles.input}
          >
            {MATCH_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <button type="button" onClick={onCreateMatch} style={styles.primaryButton}>
          Utwórz mecz
        </button>
      </div>

      {camp.matches.length === 0 && (
        <div style={styles.empty}>Brak zapisanych meczów.</div>
      )}

      {camp.matches.length > 0 && (
        <div style={styles.matchList}>
          {sortedMatches.map((match) => {
            const resultTone = getMatchResultTone(match);
            const isActiveMatch = activeMatch?.id === match.id;

            return (
              <div key={match.id}>
                <div
                  onClick={() => onSelectMatch(match.id)}
                  style={{
                    ...styles.matchCard,
                    ...(resultTone === "win" ? styles.matchCardWin : {}),
                    ...(resultTone === "draw" ? styles.matchCardDraw : {}),
                    ...(resultTone === "loss" ? styles.matchCardLoss : {}),
                    ...(isActiveMatch ? styles.matchCardActive : {}),
                  }}
                >
                  <div>
                    <strong style={styles.matchTitle}>
                      Nasza drużyna — {match.opponent || "bez rywala"}
                    </strong>

                    <div style={styles.matchMeta}>
                      {getMatchTypeLabel(match.type)}
                      {match.date ? ` · ${match.date}` : ""}
                    </div>
                  </div>

                  <strong style={styles.matchScore}>
                    {formatMatchScore(match)}
                  </strong>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteMatch(camp.id, match.id);
                    }}
                    style={styles.smallDangerButton}
                  >
                    Usuń mecz
                  </button>
                </div>

                {isActiveMatch && renderAppearancesPanel(match)}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}