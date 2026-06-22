import { useEffect, useMemo, useState } from "react";
import type { Camp } from "../../types/camp";
import type { TableRow } from "../../types/table";
import { loadCamps } from "../../utils/campStorage";
import {
  formatAverageRatingValue,
  formatNationalCoreScore,
  formatNullableNumber,
  getNationalCorePlayers,
  type NationalCorePlayer,
} from "../../utils/nationalCore";
import { nationalCoreStyles as styles } from "./NationalCore.styles";

type NationalCoreView = "core" | "caps" | "callups" | "captains";
type PositionFilter = "all" | "goalkeepers" | "defenders" | "midfielders" | "attackers";
const moduleDockEventName = "fm-player-sorter-open-module";
type NationalCoreDrawerProps = {
  rows: TableRow[];
};

const VIEW_LABELS: Record<NationalCoreView, string> = {
  core: "Trzon kadry",
  caps: "Najwięcej meczów",
  callups: "Najwięcej powołań",
  captains: "Kandydaci na kapitana",
};

const POSITION_FILTERS: Array<{
  id: PositionFilter;
  label: string;
}> = [
  { id: "all", label: "Wszyscy" },
  { id: "goalkeepers", label: "BR" },
  { id: "defenders", label: "OBR" },
  { id: "midfielders", label: "POM" },
  { id: "attackers", label: "ATA" },
];

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function getViewDescription(view: NationalCoreView): string {
  if (view === "core") {
    return "Ogólny ranking znaczenia zawodnika dla reprezentacji.";
  }

  if (view === "caps") {
    return "Najbardziej doświadczeni reprezentanci według kolumny Wyst. Rep.";
  }

  if (view === "callups") {
    return "Najczęściej powoływani zawodnicy na podstawie zapisanych zgrupowań.";
  }

  return "Ranking kapitański: doświadczenie, wiek, przywództwo, współpraca i mental.";
}

function hasPositionCode(position: string, code: string): boolean {
  const normalizedPosition = normalizeText(position)
    .toUpperCase()
    .replace(/Ś/g, "S")
    .replace(/Ł/g, "L");

  const normalizedCode = normalizeText(code)
    .toUpperCase()
    .replace(/Ś/g, "S")
    .replace(/Ł/g, "L");

  const pattern = new RegExp(
    `(^|[^A-Z])${normalizedCode}([^A-Z]|$)`,
    "u"
  );

  return pattern.test(normalizedPosition);
}

function getPlayerPositionFilter(player: NationalCorePlayer): PositionFilter {
  const position = player.position;

  if (hasPositionCode(position, "BR")) {
    return "goalkeepers";
  }

  // Najpierw napastnik, bo zawodnik typu OP (Ś), N (Ś)
  // ma być widoczny w ATA, a nie zgubiony w POM.
  if (hasPositionCode(position, "N")) {
    return "attackers";
  }

  // Obrońcy: tylko realne O/WO/ŚO/LO/PO itd.
  // Nie łapiemy OP, bo OP to ofensywny pomocnik.
  if (
    hasPositionCode(position, "O") ||
    hasPositionCode(position, "WO") ||
    hasPositionCode(position, "SO") ||
    hasPositionCode(position, "ŚO") ||
    hasPositionCode(position, "LO") ||
    hasPositionCode(position, "PO") ||
    hasPositionCode(position, "LSO") ||
    hasPositionCode(position, "LŚO") ||
    hasPositionCode(position, "PSO") ||
    hasPositionCode(position, "PŚO")
  ) {
    return "defenders";
  }

  if (
    hasPositionCode(position, "DP") ||
    hasPositionCode(position, "P") ||
    hasPositionCode(position, "OP") ||
    hasPositionCode(position, "LP") ||
    hasPositionCode(position, "PP") ||
    hasPositionCode(position, "LSP") ||
    hasPositionCode(position, "LŚP") ||
    hasPositionCode(position, "PSP") ||
    hasPositionCode(position, "PŚP")
  ) {
    return "midfielders";
  }

  return "midfielders";
}
function getSortedPlayers(
  players: NationalCorePlayer[],
  view: NationalCoreView
): NationalCorePlayer[] {
  const sorted = [...players];

  if (view === "caps") {
    return sorted.sort((left, right) => {
      if (right.nationalCaps !== left.nationalCaps) {
        return right.nationalCaps - left.nationalCaps;
      }

      if (right.coreScore !== left.coreScore) {
        return right.coreScore - left.coreScore;
      }

      return left.name.localeCompare(right.name, "pl");
    });
  }

  if (view === "callups") {
    return sorted.sort((left, right) => {
      if (right.appCallUps !== left.appCallUps) {
        return right.appCallUps - left.appCallUps;
      }

      if (right.appMatches !== left.appMatches) {
        return right.appMatches - left.appMatches;
      }

      if (right.nationalCaps !== left.nationalCaps) {
        return right.nationalCaps - left.nationalCaps;
      }

      return left.name.localeCompare(right.name, "pl");
    });
  }

  if (view === "captains") {
    return sorted.sort((left, right) => {
      if (right.captainScore !== left.captainScore) {
        return right.captainScore - left.captainScore;
      }

      if (right.nationalCaps !== left.nationalCaps) {
        return right.nationalCaps - left.nationalCaps;
      }

      return left.name.localeCompare(right.name, "pl");
    });
  }

  return sorted.sort((left, right) => {
    if (right.coreScore !== left.coreScore) {
      return right.coreScore - left.coreScore;
    }

    if (right.nationalCaps !== left.nationalCaps) {
      return right.nationalCaps - left.nationalCaps;
    }

    if (right.appCallUps !== left.appCallUps) {
      return right.appCallUps - left.appCallUps;
    }

    return left.name.localeCompare(right.name, "pl");
  });
}

function getFilteredPlayers(
  players: NationalCorePlayer[],
  search: string,
  positionFilter: PositionFilter
): NationalCorePlayer[] {
  const normalizedSearch = normalizeText(search);

  return players.filter((player) => {
    if (
      positionFilter !== "all" &&
      getPlayerPositionFilter(player) !== positionFilter
    ) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const haystack = normalizeText(
      [
        player.name,
        player.club,
        player.position,
        player.coreStatus,
        player.captainStatus,
      ].join(" ")
    );

    return haystack.includes(normalizedSearch);
  });
}

function renderStat(label: string, value: string | number) {
  return (
    <div style={styles.statBox}>
      <span style={styles.statLabel}>{label}</span>
      <strong style={styles.statValue}>{value}</strong>
    </div>
  );
}

function getBadgeStyle(player: NationalCorePlayer, view: NationalCoreView) {
  if (view === "captains") {
    return styles.captainBadge;
  }

  if (player.coreStatus === "Trzon kadry") {
    return styles.badge;
  }

  if (player.coreStatus === "Regularny") {
    return {
      ...styles.badge,
      ...styles.regularBadge,
    };
  }

  if (player.coreStatus === "Rotacja") {
    return {
      ...styles.badge,
      ...styles.rotationBadge,
    };
  }

  return styles.badge;
}

function renderPlayerStats(player: NationalCorePlayer, view: NationalCoreView) {
  if (view === "captains") {
    return (
      <>
        {renderStat("Ocena kapitańska", formatNationalCoreScore(player.captainScore))}
        {renderStat("Przywództwo", formatNullableNumber(player.leadership))}
        {renderStat("Współpraca", formatNullableNumber(player.teamwork))}
        {renderStat("Presja", formatNullableNumber(player.pressure))}
        {renderStat("Występy w kadrze", player.nationalCaps)}
        {renderStat("Wiek", player.age ?? "-")}
      </>
    );
  }

  if (view === "caps") {
    return (
      <>
        {renderStat("Występy w kadrze", player.nationalCaps)}
        {renderStat("Gole w kadrze", player.nationalGoals)}
        {renderStat("Ocena trzonu", formatNationalCoreScore(player.coreScore))}
        {renderStat("Powołania", player.appCallUps)}
        {renderStat("Wiek", player.age ?? "-")}
        {renderStat("Obecne umiejętności", formatNullableNumber(player.overallAbility))}
              </>
    );
  }

  if (view === "callups") {
    return (
      <>
      {renderStat("Powołania", player.appCallUps)}
      {renderStat("Mecze ze zgrupowań", player.appMatches)}
      {renderStat("Występy w kadrze", player.nationalCaps)}
      {renderStat("Gole w kadrze", player.nationalGoals)}
      {renderStat("Gole + asysty", `${player.goals}+${player.assists}`)}
      {renderStat("Ocena trzonu", formatNationalCoreScore(player.coreScore))}
      </>
    );
  }

  return (
    <>
    {renderStat("Ocena trzonu", formatNationalCoreScore(player.coreScore))}
    {renderStat("Występy w kadrze", player.nationalCaps)}
    {renderStat("Gole w kadrze", player.nationalGoals)}
    {renderStat("Powołania", player.appCallUps)}
    {renderStat("Wiek", player.age ?? "-")}
    {renderStat("Obecne umiejętności", formatNullableNumber(player.overallAbility))}
    </>
  );
}

function PlayerCard({
  player,
  view,
  rank,
}: {
  player: NationalCorePlayer;
  view: NationalCoreView;
  rank: number;
}) {
  return (
    <article style={styles.playerCard}>
      <div style={styles.playerRank}>#{rank}</div>

      <div style={styles.playerMain}>
        <strong style={styles.playerName}>{player.name}</strong>

        <span style={styles.playerMeta}>
          {player.position} · {player.club}
          {player.age !== null ? ` · ${player.age} lat` : ""}
        </span>

        <span style={styles.playerSubMeta}>
OU: {formatNullableNumber(player.overallAbility)} · Występy w kadrze:{" "}
{player.nationalCaps}
          {view === "callups"
            ? ` · Śr. ocena: ${formatAverageRatingValue(player.avgRating)}`
            : ""}
        </span>

        <span style={getBadgeStyle(player, view)}>
          {view === "captains" ? player.captainStatus : player.coreStatus}
        </span>
      </div>

      {renderPlayerStats(player, view)}
    </article>
  );
}

function getNavMetric(
  view: NationalCoreView,
  players: NationalCorePlayer[]
): string {
  if (players.length === 0) {
    return "-";
  }

  if (view === "core") {
    return `${players.filter((player) => player.coreStatus === "Trzon kadry").length} w trzonie`;
  }

  if (view === "caps") {
    return `${Math.max(...players.map((player) => player.nationalCaps))} max występów`;
  }

  if (view === "callups") {
    return `${Math.max(...players.map((player) => player.appCallUps))} max powołań`;
  }

  const bestCaptain = [...players].sort(
    (left, right) => right.captainScore - left.captainScore
  )[0];

  return bestCaptain
    ? `${formatNationalCoreScore(bestCaptain.captainScore)} · ${bestCaptain.name}`
    : "-";
}

export function NationalCoreDrawer({ rows }: NationalCoreDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
  function handleOpenModule(event: Event) {
    const module = (event as CustomEvent<{ module?: string }>).detail?.module;

    if (module === "core") {
      setIsOpen(true);
    }
  }

  window.addEventListener(moduleDockEventName, handleOpenModule);

  return () => {
    window.removeEventListener(moduleDockEventName, handleOpenModule);
  };
}, []);
  const [camps, setCamps] = useState<Camp[]>([]);
  const [activeView, setActiveView] = useState<NationalCoreView>("core");
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setCamps(loadCamps());
  }, [isOpen]);

  const players = useMemo(
    () => getNationalCorePlayers(rows, camps),
    [rows, camps]
  );

  const sortedPlayers = useMemo(
    () => getSortedPlayers(players, activeView),
    [players, activeView]
  );

  const filteredPlayers = useMemo(
    () => getFilteredPlayers(sortedPlayers, search, positionFilter),
    [sortedPlayers, search, positionFilter]
  );

  return (
    <>
      {isOpen && (
        <div style={styles.overlay}>
          <section style={styles.drawer}>
            <header style={styles.header}>
              <div>
                <h2 style={styles.title}>Trzon reprezentacji</h2>

                <div style={styles.subtitle}>
                  Liderzy kadry, hierarchia szatni i kandydaci na kapitana.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={styles.closeButton}
                aria-label="Zamknij trzon reprezentacji"
              >
                ×
              </button>
            </header>

            <main style={styles.body}>
              <section style={styles.tilesGrid}>
                {(["core", "caps", "callups", "captains"] as NationalCoreView[]).map(
                  (view) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setActiveView(view)}
                      style={{
                        ...styles.navTile,
                        ...(activeView === view ? styles.navTileActive : {}),
                      }}
                    >
                      <span style={styles.navTileTitle}>
                        {VIEW_LABELS[view]}
                      </span>

                      <span style={styles.navTileText}>
                        {getViewDescription(view)}
                      </span>

                      <span style={styles.navTileMetric}>
                        {getNavMetric(view, players)}
                      </span>
                    </button>
                  )
                )}
              </section>

              <section style={styles.panel}>
                <div style={styles.panelHeader}>
                  <div>
                    <h3 style={styles.panelTitle}>{VIEW_LABELS[activeView]}</h3>

                    <div style={styles.panelHint}>
                      {getViewDescription(activeView)}
                    </div>
                  </div>

                  <div style={styles.toolbar}>
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Szukaj zawodnika, klubu, pozycji..."
                      style={styles.input}
                    />

                    <span style={styles.badge}>
                      Pokazano: {filteredPlayers.length} / {players.length}
                    </span>
                  </div>
                </div>

                <div style={styles.positionFilters}>
                  {POSITION_FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setPositionFilter(filter.id)}
                      style={{
                        ...styles.positionFilterButton,
                        ...(positionFilter === filter.id
                          ? styles.positionFilterButtonActive
                          : {}),
                      }}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <div style={styles.list}>
                  {filteredPlayers.length === 0 && (
                    <div style={styles.empty}>
                      Brak zawodników do pokazania.
                    </div>
                  )}

                  {filteredPlayers.slice(0, 60).map((player, index) => (
                    <PlayerCard
                      key={`${activeView}-${player.key}`}
                      player={player}
                      view={activeView}
                      rank={index + 1}
                    />
                  ))}
                </div>
              </section>
            </main>
          </section>
        </div>
      )}
    </>
  );
}