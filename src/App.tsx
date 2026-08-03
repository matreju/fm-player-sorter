import {
  lazy,
  startTransition,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CANDIDATE_TYPE_COLUMN,
  CLUB_FORM_COLUMN,
  COMPACT_TABLE_COLUMNS,
  MONEYBALL_COLUMN,
  OVERALL_POSITION_COLUMN,
  OVERALL_ROLE_COLUMN,
  OVERALL_SCORE_COLUMN,
  PLAYER_MARK_COLUMN,
  ROLE_BEST_ROLE_COLUMN,
  ROLE_PHASE_COLUMN,
  ROLE_SCORE_COLUMN,
  ROLE_SCORE_RANGE_COLUMN,
  ROLE_SCORE_UNCERTAINTY_COLUMN,
  ROLE_SIDE_COLUMN,
  ROLE_SIDE_PROFILE_COLUMN,
  ROLE_SIDE_SCORE_COLUMN,
  insertRoleAnalysisColumns,
} from "./constants/appColumns";
import { HIDDEN_COLUMNS } from "./constants/columns";
import {
  ROLE_DEFINITIONS,
  getRolePhaseLabel,
} from "./constants/roles";
import { SELECTION_POSITION_ORDER } from "./constants/selection";
import { AppUpdater } from "./components/AppUpdater/AppUpdater";
import { FmConnectionPanel } from "./components/FmConnection/FmConnectionPanel";
import { AppSideDock } from "./components/app-shell";
import { MainToolbar } from "./components/main-toolbar";
import { PlayerCardGrid } from "./components/player-cards";
import { PlayerTable } from "./components/player-table";
import { RoleAnalysisToolbar } from "./components/role-analysis-toolbar";
import { SquadDepthDrawer } from "./components/squad-depth";
import { usePlayerSelection } from "./hooks/usePlayerSelection";
import { useSquadDepth } from "./hooks/useSquadDepth";
import type { FmDatabaseLoadResult } from "./services/fmConnection";
import type {
  FormationSlot,
  SlotCandidate,
  TacticalView,
} from "./types/squadBuilderTypes";
import type { SortConfig, TableRow } from "./types/table";
import { calculateClubFormImpact, formatClubFormImpact } from "./utils/clubForm";
import { matchesFootFilter, type FootFilter } from "./utils/filters";
import {
  loadFmSnapshot,
  saveFmSnapshot,
  type StoredFmSnapshot,
} from "./utils/fmSnapshotStorage";
import { getMoneyballTableSummary } from "./utils/moneyball";
import { getPlayerKey } from "./utils/playerIdentity";
import { getPlayerRoleAttributeInsights } from "./utils/playerRoleInsights";
import {
  calculatePositionFit,
  getPositionGroups,
} from "./utils/positionScoring";
import {
  formatRoleScore,
  formatRoleScoreRange,
  formatRoleUncertainty,
  getBestRoleMatch,
  type RolePhaseFilter,
} from "./utils/roleScoring";
import { scorePlayerForSlot } from "./utils/squadBuilderScoring";
import {
  formatRoleSide,
  formatSideProfile,
  formatSideScore,
  getRoleSideFit,
} from "./utils/sideFit";
import { compareValues, getSortableNumber } from "./utils/sortTable";
import { normalizeTextForSearch } from "./utils/textSearch";

const PlayerCompare = lazy(() =>
  import("./components/player-compare").then((module) => ({
    default: module.PlayerCompare,
  })),
);
const PlayerDetailsPanel = lazy(() =>
  import("./components/player-details").then((module) => ({
    default: module.PlayerDetailsPanel,
  })),
);
const SquadBuilder = lazy(() =>
  import("./components/squad-builder").then((module) => ({
    default: module.SquadBuilder,
  })),
);
const CampsDrawer = lazy(() =>
  import("./components/camps").then((module) => ({
    default: module.CampsDrawer,
  })),
);
const NationalCoreDrawer = lazy(() =>
  import("./components/national-core").then((module) => ({
    default: module.NationalCoreDrawer,
  })),
);

type PlayerViewMode = "table" | "cards";
type PlayerCardSortMode =
  | "current"
  | "score-desc"
  | "score-asc"
  | "name-asc"
  | "name-desc"
  | "form-desc"
  | "club-asc";

const SEARCH_COLUMNS = [
  "Nazwisko",
  "Imię",
  "Klub",
  "Liga",
  "Pozycja",
  "Narodowość",
] as const;

function getPrimaryAnalysisPhase(
  analysisPhase: RolePhaseFilter,
  analysisRoleId: string,
): TacticalView {
  const selectedRole = ROLE_DEFINITIONS.find(
    (role) => role.id === analysisRoleId,
  );

  if (selectedRole) return selectedRole.phase;
  return analysisPhase === "without-ball" ? "without-ball" : "with-ball";
}

function makeTableAnalysisSlot(
  positionGroup: string,
  phase: TacticalView,
  roleId: string,
): FormationSlot {
  return {
    id: `table-${positionGroup}`,
    label: positionGroup,
    line: "Pomoc",
    positionGroup,
    phase,
    roleId: roleId === "any" ? "best" : roleId,
    footRequirement: "any",
  };
}

function getCandidateRoleScore(candidate: SlotCandidate): number {
  return candidate.roleScore ?? candidate.roleResult.score ?? candidate.finalScore;
}

function getBestOverallTableCandidate(row: TableRow, phase: TacticalView) {
  let bestCandidate: ReturnType<typeof scorePlayerForSlot> = null;

  for (const positionGroup of getPositionGroups()) {
    const candidate = scorePlayerForSlot(
      row,
      makeTableAnalysisSlot(positionGroup, phase, "any"),
    );
    if (
      candidate &&
      (!bestCandidate ||
        getCandidateRoleScore(candidate) >
          getCandidateRoleScore(bestCandidate))
    ) {
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

export default function App() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [snapshot, setSnapshot] = useState<StoredFmSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [error, setError] = useState("");

  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [footFilter, setFootFilter] = useState<FootFilter>("any");
  const [analysisPositionGroup, setAnalysisPositionGroup] = useState("any");
  const [analysisPhase, setAnalysisPhase] =
    useState<RolePhaseFilter>("any");
  const [analysisRoleId, setAnalysisRoleId] = useState("any");
  const [minRoleScore, setMinRoleScore] = useState("60");
  const [onlyRoleMatches, setOnlyRoleMatches] = useState(true);
  const [showOnlySelectedPlayers, setShowOnlySelectedPlayers] = useState(false);
  const [hideMarkedPlayers, setHideMarkedPlayers] = useState(false);
  const [compactTableMode, setCompactTableMode] = useState(true);
  const [playerViewMode, setPlayerViewMode] =
    useState<PlayerViewMode>("table");
  const [compactCardMode, setCompactCardMode] = useState(false);
  const [cardSortMode, setCardSortMode] =
    useState<PlayerCardSortMode>("score-desc");
  const [selectedPlayerKey, setSelectedPlayerKey] = useState<string | null>(
    null,
  );
  const [squadDepthOpen, setSquadDepthOpen] = useState(false);
  const [comparePlayerKey, setComparePlayerKey] = useState("");
  const [compareRequestId, setCompareRequestId] = useState(0);

  const {
    playerMarks,
    playerSelectionPositions,
    selectedPlayersCount,
    rejectedPlayersCount,
    selectedPlayersWithPositionCount,
    getPlayerMark,
    getPlayerSelectionPosition,
    setPlayerSelectionPosition,
    togglePlayerMark,
    clearPlayerSelection,
    getMarkedCellStyle,
  } = usePlayerSelection({ analysisPositionGroup });

  const {
    selectedPlayersWithoutPositionCount,
    squadDepthByPosition,
    squadDepthWarnings,
  } = useSquadDepth({
    rows,
    playerMarks,
    playerSelectionPositions,
  });

  useEffect(() => {
    let cancelled = false;

    void loadFmSnapshot()
      .then((saved) => {
        if (cancelled || !saved) return;
        startTransition(() => {
          setSnapshot(saved);
          setHeaders(saved.headers);
          setRows(saved.rows);
        });
      })
      .catch((unknownError) => {
        if (!cancelled) {
          setError(
            unknownError instanceof Error
              ? unknownError.message
              : String(unknownError),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setSnapshotLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const rolePositionOptions = useMemo(
    () =>
      Array.from(
        new Set(ROLE_DEFINITIONS.map((role) => role.positionGroup)),
      ),
    [],
  );

  const availableAnalysisRoles = useMemo(
    () =>
      ROLE_DEFINITIONS.filter((role) => {
        if (
          analysisPositionGroup !== "any" &&
          role.positionGroup !== analysisPositionGroup
        ) {
          return false;
        }
        return analysisPhase === "any" || role.phase === analysisPhase;
      }),
    [analysisPhase, analysisPositionGroup],
  );

  const visibleHeaders = useMemo(
    () => headers.filter((header) => !HIDDEN_COLUMNS.has(header)),
    [headers],
  );
  const availableTableHeaders = useMemo(
    () => insertRoleAnalysisColumns(visibleHeaders),
    [visibleHeaders],
  );
  const tableHeaders = useMemo(() => {
    if (headers.length === 0) return [];
    if (!compactTableMode) return availableTableHeaders;
    return availableTableHeaders.filter((header) =>
      COMPACT_TABLE_COLUMNS.has(header),
    );
  }, [availableTableHeaders, compactTableMode, headers.length]);

  const searchIndex = useMemo(
    () =>
      rows.map((row) =>
        normalizeTextForSearch(
          SEARCH_COLUMNS.map((column) => row[column] ?? "").join("\u0000"),
        ),
      ),
    [rows],
  );
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const baseFilteredRows = useMemo(() => {
    const normalizedSearch = normalizeTextForSearch(deferredSearchTerm);
    const minAgeNumber = minAge.trim() ? Number(minAge) : null;
    const maxAgeNumber = maxAge.trim() ? Number(maxAge) : null;

    return rows.filter((row, rowIndex) => {
      const matchesSearch =
        !normalizedSearch || searchIndex[rowIndex]?.includes(normalizedSearch);
      const age = getSortableNumber(row["Wiek"] ?? "");
      const matchesMinAge =
        minAgeNumber === null ||
        !Number.isFinite(minAgeNumber) ||
        (age !== null && age >= minAgeNumber);
      const matchesMaxAge =
        maxAgeNumber === null ||
        !Number.isFinite(maxAgeNumber) ||
        (age !== null && age <= maxAgeNumber);

      return (
        matchesSearch &&
        matchesMinAge &&
        matchesMaxAge &&
        matchesFootFilter(row, footFilter)
      );
    });
  }, [
    deferredSearchTerm,
    footFilter,
    maxAge,
    minAge,
    rows,
    searchIndex,
  ]);

  const scoredRows = useMemo<TableRow[]>(() => {
    const effectivePhase = getPrimaryAnalysisPhase(
      analysisPhase,
      analysisRoleId,
    );
    const selectedRoleDefinition = ROLE_DEFINITIONS.find(
      (role) => role.id === analysisRoleId,
    );
    const selectedPositionGroup =
      analysisPositionGroup !== "any"
        ? analysisPositionGroup
        : selectedRoleDefinition?.positionGroup;

    return baseFilteredRows.map((row) => {
      const clubFormImpact = calculateClubFormImpact(row);
      const bestOverallCandidate = getBestOverallTableCandidate(
        row,
        effectivePhase,
      );
      const selectedCandidate = selectedPositionGroup
        ? scorePlayerForSlot(
            row,
            makeTableAnalysisSlot(
              selectedPositionGroup,
              effectivePhase,
              analysisRoleId,
            ),
          )
        : bestOverallCandidate;
      const selectedRoleResult = selectedCandidate?.roleResult ?? null;
      const selectedSideFit = selectedRoleResult
        ? getRoleSideFit(row, selectedRoleResult.role)
        : null;

      return {
        ...row,
        [ROLE_SCORE_COLUMN]: selectedCandidate
          ? formatRoleScore(getCandidateRoleScore(selectedCandidate))
          : "-",
        [CLUB_FORM_COLUMN]: formatClubFormImpact(clubFormImpact),
        [MONEYBALL_COLUMN]: getMoneyballTableSummary(row, rows),
        [CANDIDATE_TYPE_COLUMN]:
          selectedCandidate?.candidateKindLabel ?? "-",
        [ROLE_SCORE_RANGE_COLUMN]: formatRoleScoreRange(selectedRoleResult),
        [ROLE_SCORE_UNCERTAINTY_COLUMN]:
          formatRoleUncertainty(selectedRoleResult),
        [ROLE_BEST_ROLE_COLUMN]:
          selectedRoleResult?.role.name ?? "-",
        [ROLE_PHASE_COLUMN]: selectedRoleResult
          ? getRolePhaseLabel(selectedRoleResult.role.phase)
          : "-",
        [ROLE_SIDE_COLUMN]: formatRoleSide(selectedSideFit),
        [ROLE_SIDE_SCORE_COLUMN]: formatSideScore(selectedSideFit),
        [ROLE_SIDE_PROFILE_COLUMN]: formatSideProfile(selectedSideFit),
        [OVERALL_POSITION_COLUMN]:
          bestOverallCandidate?.roleResult.role.positionGroup ?? "-",
        [OVERALL_ROLE_COLUMN]:
          bestOverallCandidate?.roleResult.role.name ?? "-",
        [OVERALL_SCORE_COLUMN]: bestOverallCandidate
          ? formatRoleScore(getCandidateRoleScore(bestOverallCandidate))
          : "-",
      };
    });
  }, [
    analysisPhase,
    analysisPositionGroup,
    analysisRoleId,
    baseFilteredRows,
    rows,
  ]);

  const roleFilteredRows = useMemo(() => {
    if (!onlyRoleMatches) return scoredRows;
    const minimumScore = getSortableNumber(minRoleScore) ?? 0;
    return scoredRows.filter((row) => {
      const score = getSortableNumber(row[ROLE_SCORE_COLUMN] ?? "");
      return score !== null && score >= minimumScore;
    });
  }, [minRoleScore, onlyRoleMatches, scoredRows]);

  const analyzedRows = useMemo(() => {
    if (!showOnlySelectedPlayers && !hideMarkedPlayers) {
      return roleFilteredRows;
    }

    return roleFilteredRows.filter((row) => {
      const mark = getPlayerMark(row);
      if (showOnlySelectedPlayers) {
        return (
          mark === "selected" &&
          getPlayerSelectionPosition(row).trim() !== ""
        );
      }
      return !hideMarkedPlayers || (mark !== "selected" && mark !== "rejected");
    });
  }, [
    getPlayerMark,
    getPlayerSelectionPosition,
    hideMarkedPlayers,
    roleFilteredRows,
    showOnlySelectedPlayers,
  ]);

  const sortedRows = useMemo(() => {
    if (showOnlySelectedPlayers) {
      return [...analyzedRows].sort((a, b) => {
        const orderA =
          SELECTION_POSITION_ORDER[getPlayerSelectionPosition(a)] ?? 999;
        const orderB =
          SELECTION_POSITION_ORDER[getPlayerSelectionPosition(b)] ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return compareValues(
          a["Nazwisko"] ?? "",
          b["Nazwisko"] ?? "",
          "asc",
        );
      });
    }

    if (!sortConfig) return analyzedRows;
    return [...analyzedRows].sort((a, b) =>
      compareValues(
        a[sortConfig.column],
        b[sortConfig.column],
        sortConfig.direction,
      ),
    );
  }, [
    analyzedRows,
    getPlayerSelectionPosition,
    showOnlySelectedPlayers,
    sortConfig,
  ]);

  const selectedPlayer = useMemo(() => {
    if (!selectedPlayerKey) return null;
    return (
      analyzedRows.find((row) => getPlayerKey(row) === selectedPlayerKey) ??
      rows.find((row) => getPlayerKey(row) === selectedPlayerKey) ??
      null
    );
  }, [analyzedRows, rows, selectedPlayerKey]);

  const selectedPlayerTopPositions = useMemo(() => {
    if (!selectedPlayer) return [];
    return getPositionGroups()
      .map((positionGroup) =>
        calculatePositionFit(selectedPlayer, positionGroup),
      )
      .filter((result) => result !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [selectedPlayer]);

  const selectedPlayerCurrentRoleMatch = useMemo(() => {
    if (!selectedPlayer) return null;
    return getBestRoleMatch(selectedPlayer, {
      positionGroup:
        analysisPositionGroup === "any"
          ? undefined
          : analysisPositionGroup,
      phase: getPrimaryAnalysisPhase(analysisPhase, analysisRoleId),
      roleId: analysisRoleId,
    });
  }, [
    analysisPhase,
    analysisPositionGroup,
    analysisRoleId,
    selectedPlayer,
  ]);

  const selectedPlayerRoleInsights = useMemo(() => {
    if (!selectedPlayer || !selectedPlayerCurrentRoleMatch) {
      return { strengths: [], weaknesses: [] };
    }
    return getPlayerRoleAttributeInsights(
      selectedPlayer,
      selectedPlayerCurrentRoleMatch.role,
    );
  }, [selectedPlayer, selectedPlayerCurrentRoleMatch]);

  const playerCardsAnalysisLabel = useMemo(() => {
    const positionLabel =
      analysisPositionGroup === "any" ? "Wszyscy" : analysisPositionGroup;
    const phaseLabel =
      analysisPhase === "with-ball"
        ? "Przy piłce"
        : analysisPhase === "without-ball"
          ? "Bez piłki"
          : "Dowolna faza";
    const roleLabel =
      analysisRoleId === "any"
        ? "Dowolna rola"
        : availableAnalysisRoles.find((role) => role.id === analysisRoleId)
            ?.name ?? "Wybrana rola";
    return `${positionLabel} · ${phaseLabel} · ${roleLabel}`;
  }, [
    analysisPhase,
    analysisPositionGroup,
    analysisRoleId,
    availableAnalysisRoles,
  ]);

  const cardRows = useMemo(() => {
    const result = [...sortedRows];
    switch (cardSortMode) {
      case "score-desc":
        return result.sort((a, b) =>
          compareValues(b[ROLE_SCORE_COLUMN], a[ROLE_SCORE_COLUMN], "asc"),
        );
      case "score-asc":
        return result.sort((a, b) =>
          compareValues(a[ROLE_SCORE_COLUMN], b[ROLE_SCORE_COLUMN], "asc"),
        );
      case "name-asc":
        return result.sort((a, b) =>
          compareValues(a["Nazwisko"], b["Nazwisko"], "asc"),
        );
      case "name-desc":
        return result.sort((a, b) =>
          compareValues(a["Nazwisko"], b["Nazwisko"], "desc"),
        );
      case "form-desc":
        return result.sort((a, b) =>
          compareValues(b[CLUB_FORM_COLUMN], a[CLUB_FORM_COLUMN], "asc"),
        );
      case "club-asc":
        return result.sort((a, b) =>
          compareValues(a["Klub"], b["Klub"], "asc"),
        );
      default:
        return result;
    }
  }, [cardSortMode, sortedRows]);

  const handleFmDatabaseLoaded = useCallback(
    (result: FmDatabaseLoadResult) => {
      startTransition(() => {
        setHeaders(result.headers);
        setRows(result.rows);
        setSortConfig(null);
        setSearchTerm("");
        setMinAge("");
        setMaxAge("");
        setFootFilter("any");
        setSelectedPlayerKey(null);
        setError("");
      });

      void saveFmSnapshot(result)
        .then(setSnapshot)
        .catch((unknownError) => {
          setError(
            unknownError instanceof Error
              ? unknownError.message
              : String(unknownError),
          );
        });
    },
    [],
  );

  const handleSort = useCallback((column: string) => {
    setSortConfig((current) => {
      if (!current || current.column !== column) {
        return { column, direction: "desc" };
      }
      return {
        column,
        direction: current.direction === "desc" ? "asc" : "desc",
      };
    });
  }, []);

  const handleComparePlayer = useCallback((playerKey: string) => {
    setComparePlayerKey(playerKey);
    setCompareRequestId((current) => current + 1);
  }, []);

  const handleSquadBuilderSelectPlayer = useCallback(
    (row: TableRow, selectionPosition: string) => {
      const isAlreadySelected = getPlayerMark(row) === "selected";
      togglePlayerMark(row, "selected");
      setPlayerSelectionPosition(
        row,
        isAlreadySelected ? "" : selectionPosition,
      );
    },
    [getPlayerMark, setPlayerSelectionPosition, togglePlayerMark],
  );

  const dataLabel =
    snapshot?.managedNation ??
    snapshot?.managedTeam ??
    (rows.length > 0 ? "Reprezentacja" : "Brak danych");

  return (
    <main className="desktop-app" aria-labelledby="app-title">
      <header className="desktop-header">
        <div className="desktop-brand">
          <span className="desktop-brand__mark" aria-hidden="true">
            FM
          </span>
          <span>
            <strong id="app-title">FM Player Sorter</strong>
            <small>National Team Intelligence · v0.4.0</small>
          </span>
        </div>

        <AppSideDock />

        <div className="desktop-header__actions">
          <AppUpdater />
          <FmConnectionPanel
            loadedNation={snapshot?.managedNation ?? null}
            loadedPlayerCount={rows.length}
            onDatabaseLoaded={handleFmDatabaseLoaded}
          />
        </div>
      </header>

      <section className="desktop-workspace" aria-label="Baza zawodników">
        <MainToolbar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          minAge={minAge}
          setMinAge={setMinAge}
          maxAge={maxAge}
          setMaxAge={setMaxAge}
          footFilter={footFilter}
          setFootFilter={setFootFilter}
          showOnlySelectedPlayers={showOnlySelectedPlayers}
          setShowOnlySelectedPlayers={setShowOnlySelectedPlayers}
          hideMarkedPlayers={hideMarkedPlayers}
          setHideMarkedPlayers={setHideMarkedPlayers}
          compactTableMode={compactTableMode}
          setCompactTableMode={setCompactTableMode}
          selectedPlayersCount={selectedPlayersCount}
          selectedPlayersWithPositionCount={
            selectedPlayersWithPositionCount
          }
          rejectedPlayersCount={rejectedPlayersCount}
          onClearPlayerSelection={clearPlayerSelection}
        />

        {rows.length > 0 && (
          <RoleAnalysisToolbar
            rolePositionOptions={rolePositionOptions}
            availableAnalysisRoles={availableAnalysisRoles}
            analysisPositionGroup={analysisPositionGroup}
            setAnalysisPositionGroup={setAnalysisPositionGroup}
            analysisPhase={analysisPhase}
            setAnalysisPhase={setAnalysisPhase}
            analysisRoleId={analysisRoleId}
            setAnalysisRoleId={setAnalysisRoleId}
            minRoleScore={minRoleScore}
            setMinRoleScore={setMinRoleScore}
            onlyRoleMatches={onlyRoleMatches}
            setOnlyRoleMatches={setOnlyRoleMatches}
          />
        )}

        <div className="desktop-context-bar" role="status">
          <span>
            <strong>{dataLabel}</strong>
            {snapshot?.managedTeam &&
              snapshot.managedTeam !== snapshot.managedNation && (
                <> · {snapshot.managedTeam}</>
              )}
          </span>
          <span>
            Pokazano{" "}
            <strong>{sortedRows.length.toLocaleString("pl-PL")}</strong> z{" "}
            {rows.length.toLocaleString("pl-PL")} kandydatów
          </span>
          {snapshot?.databasePlayerCount ? (
            <span>
              Baza FM:{" "}
              {snapshot.databasePlayerCount.toLocaleString("pl-PL")}
            </span>
          ) : null}
          {snapshot?.gameDate && <span>Dane: {snapshot.gameDate}</span>}
          {error && <span className="desktop-context-bar__error">{error}</span>}
        </div>

        {rows.length > 0 ? (
          <section className="desktop-data-panel">
            <div className="desktop-viewbar">
              <span className="desktop-viewbar__analysis">
                Analiza: <strong>{playerCardsAnalysisLabel}</strong>
              </span>

              <div className="desktop-viewbar__actions">
                {playerViewMode === "cards" && (
                  <>
                    <select
                      value={cardSortMode}
                      onChange={(event) =>
                        setCardSortMode(
                          event.target.value as PlayerCardSortMode,
                        )
                      }
                      aria-label="Sortowanie kafelków"
                    >
                      <option value="score-desc">Wynik malejąco</option>
                      <option value="score-asc">Wynik rosnąco</option>
                      <option value="name-asc">Nazwisko A–Z</option>
                      <option value="name-desc">Nazwisko Z–A</option>
                      <option value="form-desc">Forma klubu</option>
                      <option value="club-asc">Klub A–Z</option>
                      <option value="current">Jak tabela</option>
                    </select>
                    <label>
                      <input
                        type="checkbox"
                        checked={compactCardMode}
                        onChange={(event) =>
                          setCompactCardMode(event.target.checked)
                        }
                      />
                      Kompaktowe
                    </label>
                  </>
                )}

                <div className="desktop-viewbar__switch" role="group">
                  <button
                    type="button"
                    data-active={playerViewMode === "table" || undefined}
                    onClick={() => setPlayerViewMode("table")}
                  >
                    Tabela
                  </button>
                  <button
                    type="button"
                    data-active={playerViewMode === "cards" || undefined}
                    onClick={() => setPlayerViewMode("cards")}
                  >
                    Kafelki
                  </button>
                </div>
              </div>
            </div>

            <div className="desktop-data-panel__body">
              {playerViewMode === "table" ? (
                <PlayerTable
                  tableHeaders={tableHeaders}
                  availableHeaders={availableTableHeaders}
                  sortedRows={sortedRows}
                  sortConfig={sortConfig}
                  selectedPlayerKey={selectedPlayerKey}
                  playerMarkColumn={PLAYER_MARK_COLUMN}
                  getPlayerMark={getPlayerMark}
                  getPlayerSelectionPosition={getPlayerSelectionPosition}
                  onTogglePlayerMark={togglePlayerMark}
                  onSetPlayerSelectionPosition={setPlayerSelectionPosition}
                  onSort={handleSort}
                  onSelectPlayer={setSelectedPlayerKey}
                  getMarkedCellStyle={getMarkedCellStyle}
                />
              ) : (
                <PlayerCardGrid
                  rows={cardRows}
                  analysisLabel={playerCardsAnalysisLabel}
                  compact={compactCardMode}
                  getPlayerMark={getPlayerMark}
                  onTogglePlayerMark={togglePlayerMark}
                  onOpenDetails={setSelectedPlayerKey}
                  onComparePlayer={handleComparePlayer}
                />
              )}
            </div>
          </section>
        ) : (
          <section className="desktop-empty-state">
            <span aria-hidden="true">◎</span>
            <h2>
              {snapshotLoading
                ? "Odtwarzanie ostatniej kadry…"
                : "Połącz aplikację z Football Managerem"}
            </h2>
            <p>
              Otwórz zapis reprezentacji w FM26, a następnie użyj przycisku
              „Połącz z grą”. Aplikacja wczyta tylko zawodników uprawnionych do
              gry dla prowadzonej reprezentacji.
            </p>
          </section>
        )}
      </section>

      <footer className="desktop-statusbar">
        <span>
          <i data-online={rows.length > 0 || undefined} />
          {rows.length > 0
            ? `${dataLabel}: ${rows.length.toLocaleString("pl-PL")} zawodników`
            : "Oczekiwanie na dane FM26"}
        </span>
        <span>
          {snapshot?.savedAt
            ? `Snapshot ${new Date(snapshot.savedAt).toLocaleString("pl-PL")}`
            : "Odczyt tylko do odczytu"}
        </span>
      </footer>

      <Suspense fallback={null}>
        {rows.length > 1 && (
          <PlayerCompare
            rows={rows}
            requestedLeftPlayerKey={comparePlayerKey}
            compareRequestId={compareRequestId}
          />
        )}
        {rows.length > 0 && (
          <SquadBuilder
            rows={rows}
            playerMarks={playerMarks}
            selectedPositionByPlayerKey={playerSelectionPositions}
            getPlayerMark={getPlayerMark}
            selectedPlayersCount={selectedPlayersCount}
            onClearCallUps={clearPlayerSelection}
            onSelectPlayer={handleSquadBuilderSelectPlayer}
          />
        )}
        {selectedPlayer && (
          <PlayerDetailsPanel
            player={selectedPlayer}
            rows={rows}
            roleMatch={selectedPlayerCurrentRoleMatch}
            roleInsights={selectedPlayerRoleInsights}
            topPositions={selectedPlayerTopPositions}
            rolePositionOptions={rolePositionOptions}
            availableAnalysisRoles={availableAnalysisRoles}
            analysisPositionGroup={analysisPositionGroup}
            setAnalysisPositionGroup={setAnalysisPositionGroup}
            analysisPhase={analysisPhase}
            setAnalysisPhase={setAnalysisPhase}
            analysisRoleId={analysisRoleId}
            setAnalysisRoleId={setAnalysisRoleId}
            getPlayerMark={getPlayerMark}
            getPlayerSelectionPosition={getPlayerSelectionPosition}
            onClose={() => setSelectedPlayerKey(null)}
          />
        )}
        <CampsDrawer
          rows={rows}
          getPlayerMark={getPlayerMark}
          getPlayerSelectionPosition={getPlayerSelectionPosition}
        />
        <NationalCoreDrawer rows={rows} />
      </Suspense>

      <SquadDepthDrawer
        selectedPlayersCount={selectedPlayersCount}
        selectedPlayersWithPositionCount={selectedPlayersWithPositionCount}
        selectedPlayersWithoutPositionCount={
          selectedPlayersWithoutPositionCount
        }
        rejectedPlayersCount={rejectedPlayersCount}
        squadDepthOpen={squadDepthOpen}
        setSquadDepthOpen={setSquadDepthOpen}
        squadDepthWarnings={squadDepthWarnings}
        squadDepthByPosition={squadDepthByPosition}
      />
    </main>
  );
}
